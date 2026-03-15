// index.js (CommonJS)
require('dotenv').config();

const express = require('express');
const { Gpio } = require('pigpio');
const {
  SelfBackendVerifier,
  DefaultConfigStore,
  AllIds,
} = require('@selfxyz/core');

const PORT = process.env.PORT || 3000;
const RELAY_GPIO = Number(process.env.RELAY_GPIO || 26);
const POUR_MS = Number(process.env.POUR_MS || 15000);
const MINIMUM_AGE = Number(process.env.MINIMUM_AGE || 21); // 21 for US, 18 for Europe
const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://selfbeer.ngrok.app/api/verify';
const STATUS_WEBHOOK_URL = process.env.STATUS_WEBHOOK_URL || '';
const LCD_ADDRESS = parseInt(process.env.LCD_ADDRESS || '0x27', 16);

// --- LCD setup (graceful fallback if not connected) ---
let lcd = null;
async function initLcd() {
  try {
    const LCD = require('raspberrypi-liquid-crystal');
    lcd = new LCD(1, LCD_ADDRESS, 16, 2);
    await lcd.begin();
    await lcd.clearAsync();
    await lcd.printLineAsync(0, 'SelfBeer v1');
    await lcd.printLineAsync(1, 'Ready...');
    console.log(`LCD initialised at 0x${LCD_ADDRESS.toString(16)}`);
  } catch (e) {
    console.log('LCD not available, running without display:', e.message);
  }
}
initLcd();

function lcdWrite(line1, line2) {
  if (!lcd) return;
  try {
    lcd.clearAsync().then(() => {
      if (line1) lcd.printLineAsync(0, line1.slice(0, 16));
      if (line2) lcd.printLineAsync(1, line2.slice(0, 16));
    });
  } catch (_) {}
}

// --- Relay setup ---
const relay = new Gpio(RELAY_GPIO, { mode: Gpio.OUTPUT });
relay.digitalWrite(0); // idle

// --- Pour lock ---
let pouring = false;

// --- Status webhook (fire-and-forget) ---
function postStatus(status) {
  if (!STATUS_WEBHOOK_URL) return;
  fetch(STATUS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }).catch(() => {});
}

// --- Self verifier ---
const verifier = new SelfBackendVerifier(
  'beer',
  ENDPOINT_URL,
  false,
  AllIds,
  new DefaultConfigStore({ minimumAge: MINIMUM_AGE }),
  'uuid'
);

const app = express();
app.use(express.json({ limit: '1mb' }));

app.post('/api/verify', async (req, res) => {
  try {
    if (pouring) {
      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'Already pouring! Wait your turn.',
      });
    }

    const { attestationId, proof, publicSignals, userContextData } = req.body;
    if (!attestationId || !proof || !publicSignals || !userContextData) {
      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'Missing fields. Even your beer needs all ingredients.',
      });
    }

    lcdWrite('Verifying...', 'Please wait');

    const r = await verifier.verify(attestationId, proof, publicSignals, userContextData);

    const hasAge = !!r?.discloseOutput?.minimumAge;
    const ok =
      r?.isValidDetails?.isValid &&
      r?.isValidDetails?.isMinimumAgeValid &&
      !r?.isValidDetails?.isOfacValid &&
      hasAge;

    if (!ok) {
      lcdWrite('Access denied', `Must be ${MINIMUM_AGE}+`);
      postStatus('underage');
      setTimeout(() => lcdWrite('SelfBeer v1', 'Ready...'), 5000);
      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'You are too young for a beer',
      });
    }

    const cid = String(r?.configId || '').toLowerCase();
    if (cid && cid !== CONFIG_ID) {
      lcdWrite('Config error', 'Wrong keg!');
      setTimeout(() => lcdWrite('SelfBeer v1', 'Ready...'), 5000);
      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'Config mismatch! Someone tried to open a different keg.',
      });
    }

    // --- Open valve ---
    pouring = true;
    relay.digitalWrite(1);
    postStatus('open');
    lcdWrite('Pouring beer!', 'Enjoy!');

    // LCD countdown
    const totalSteps = 8;
    const stepMs = POUR_MS / totalSteps;
    let step = 0;
    const countdownInterval = setInterval(() => {
      step++;
      if (step >= totalSteps) {
        clearInterval(countdownInterval);
        return;
      }
      const filled = '\u2588'.repeat(totalSteps - step);
      const empty = '\u2591'.repeat(step);
      const secsLeft = Math.ceil((POUR_MS - step * stepMs) / 1000);
      lcdWrite('Pouring beer!', `${filled}${empty} ${secsLeft}s`);
    }, stepMs);

    setTimeout(() => {
      relay.digitalWrite(0);
      pouring = false;
      clearInterval(countdownInterval);
      postStatus('closed');
      lcdWrite('SelfBeer v1', 'Ready...');
    }, POUR_MS);

    return res.status(200).json({
      status: 'success',
      result: true,
      message: 'Valve open! Enjoy your drink.',
      credentialSubject: r.discloseOutput,
      verificationOptions: { ofac: false, excludedCountries: [] },
    });
  } catch (e) {
    lcdWrite('Error', String(e?.message || '').slice(0, 16));
    setTimeout(() => lcdWrite('SelfBeer v1', 'Ready...'), 5000);
    return res.status(200).json({
      status: 'error',
      result: false,
      reason: `System hiccup: ${String(e?.message || e)}`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`listening on ${PORT} (GPIO ${RELAY_GPIO}, pour ${POUR_MS}ms)`);
});
