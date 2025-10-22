// CommonJS to avoid ESM flags
const { Gpio } = require('pigpio');

const RELAY_GPIO = Number(process.env.RELAY_GPIO || 5); // set to your jumper pin
const PULSE_MS   = Number(process.env.PULSE_MS || 500); // how long to open

console.log('Using GPIO', RELAY_GPIO, 'Pulse', PULSE_MS, 'ms');
const relay = new Gpio(RELAY_GPIO, { mode: Gpio.OUTPUT });
relay.digitalWrite(0); // idle OFF (board is active-HIGH)

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

console.log('SPACE = pulse relay, q = quit');

let busy = false;
process.stdin.on('data', (key) => {
console.log('key pressed:', JSON.stringify(key));
  if (key === 'q' || key === '\u0003') { // q or Ctrl-C
    relay.digitalWrite(0);
    process.exit(0);
  }
  if (key === ' ') {
    if (busy) return; // debounce auto-repeat
    busy = true;
    relay.digitalWrite(1);                // ON
    setTimeout(() => {
      relay.digitalWrite(0);              // OFF
      busy = false;
    }, PULSE_MS);
  }
});
