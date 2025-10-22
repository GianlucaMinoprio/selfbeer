// index.js (CommonJS)
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
const CONFIG_ID = (process.env.CONFIG_ID || '0xd38655ad3441438e768552b40f8e068ff26a04343093483b3872a3bacfc50173').toLowerCase();

const relay = new Gpio(RELAY_GPIO, { mode: Gpio.OUTPUT });
relay.digitalWrite(0); // idle

// mock MUST be false for real proofs
const verifier = new SelfBackendVerifier(
  'beer',                                   // scope
  'https://selfbeer.ngrok.app/api/verify',  // your public endpoint
  false,                                    // mock = false
  AllIds,                                   // allow any doc type
  new DefaultConfigStore({ minimumAge: 21 }),
  'uuid'
);

const app = express();
app.use(express.json({ limit: '1mb' }));

app.post('/api/verify', async (req, res) => {
  try {
    const { attestationId, proof, publicSignals, userContextData } = req.body;
    if (!attestationId || !proof || !publicSignals || !userContextData) {
      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'Missing fields. Even your beer needs all ingredients 🍺',
      });
    }

    const r = await verifier.verify(attestationId, proof, publicSignals, userContextData);

    const hasAge = !!r?.discloseOutput?.minimumAge;
    const ok =
      r?.isValidDetails?.isValid &&
      r?.isValidDetails?.isMinimumAgeValid &&
      !r?.isValidDetails?.isOfacValid &&
      hasAge;

    if (!ok) {
      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'You are too young for a beer',
      });
    }

    const cid = String(r?.configId || '').toLowerCase();
    if (cid && cid !== CONFIG_ID) {
      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'Config mismatch! Someone tried to open a different keg. 🚫',
      });
    }

    // open valve
    relay.digitalWrite(1);
    setTimeout(() => relay.digitalWrite(0), POUR_MS);

    return res.status(200).json({
      status: 'success',
      result: true,
      message: 'Valve open! Enjoy your drink 🍺',
      credentialSubject: r.discloseOutput,
      verificationOptions: { ofac: false, excludedCountries: [] },
    });
  } catch (e) {
    return res.status(200).json({
      status: 'error',
      result: false,
      reason: `System hiccup: ${String(e?.message || e)} 🤖`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`listening on ${PORT} (GPIO ${RELAY_GPIO})`);
});
