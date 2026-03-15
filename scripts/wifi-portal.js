// wifi-portal.js — tiny captive portal for configuring WiFi from a phone.
// Runs on port 80 when the Pi is in hotspot mode.
// No external dependencies — uses only Node.js built-ins.

const http = require('http');
const { execSync, exec } = require('child_process');
const { writeFileSync } = require('fs');
const url = require('url');
const querystring = require('querystring');

const PORT = 80;

function getSSIDs() {
  try {
    // Scan for available networks
    execSync('nmcli device wifi rescan 2>/dev/null || true');
    const raw = execSync('nmcli -t -f SSID device wifi list 2>/dev/null', { encoding: 'utf8' });
    const ssids = [...new Set(raw.split('\n').map(s => s.trim()).filter(Boolean))];
    return ssids;
  } catch {
    return [];
  }
}

function renderPage(ssids, message) {
  const options = ssids.map(s => `<option value="${s}">${s}</option>`).join('');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SelfBeer WiFi Setup</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #1a1a2e; color: #eee;
           display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #16213e; border-radius: 16px; padding: 32px; width: 90%; max-width: 380px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p { color: #aaa; margin-bottom: 24px; font-size: 14px; }
    label { display: block; font-size: 14px; margin-bottom: 6px; color: #ccc; }
    select, input { width: 100%; padding: 12px; border: 1px solid #333; border-radius: 8px;
                    background: #0f3460; color: #fff; font-size: 16px; margin-bottom: 16px; }
    button { width: 100%; padding: 14px; border: none; border-radius: 8px;
             background: #e94560; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; }
    button:active { background: #c73a52; }
    .msg { background: #0f3460; padding: 12px; border-radius: 8px; margin-bottom: 16px;
           text-align: center; font-size: 14px; }
    .msg.ok { border: 1px solid #4caf50; color: #4caf50; }
    .msg.err { border: 1px solid #e94560; color: #e94560; }
  </style>
</head>
<body>
  <div class="card">
    <h1>SelfBeer</h1>
    <p>Connect the beer dispenser to WiFi</p>
    ${message ? `<div class="msg ${message.type}">${message.text}</div>` : ''}
    <form method="POST" action="/connect">
      <label for="ssid">WiFi Network</label>
      <select name="ssid" id="ssid">${options}</select>
      <label for="password">Password</label>
      <input type="password" name="password" id="password" placeholder="WiFi password" required>
      <button type="submit">Connect</button>
    </form>
  </div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    const ssids = getSSIDs();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderPage(ssids, null));
    return;
  }

  if (req.method === 'POST' && req.url === '/connect') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const params = querystring.parse(body);
      const ssid = params.ssid;
      const password = params.password;

      if (!ssid || !password) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(renderPage(getSSIDs(), { type: 'err', text: 'SSID and password are required.' }));
        return;
      }

      // Try to connect
      exec(`nmcli device wifi connect "${ssid.replace(/"/g, '\\"')}" password "${password.replace(/"/g, '\\"')}"`, (err) => {
        if (err) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(renderPage(getSSIDs(), { type: 'err', text: `Failed to connect: ${err.message}` }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(renderPage([], { type: 'ok', text: `Connected to ${ssid}! The hotspot will shut down in a few seconds.` }));

        // Signal the fallback script that WiFi was configured
        writeFileSync('/tmp/wifi-configured', 'ok');

        // Give the response time to reach the phone, then exit
        setTimeout(() => process.exit(0), 3000);
      });
    });
    return;
  }

  // Captive portal redirect — any unknown request goes to the main page
  res.writeHead(302, { Location: 'http://10.42.0.1/' });
  res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[wifi-portal] Captive portal running on http://10.42.0.1:${PORT}`);
});
