# SelfBeer

**A Raspberry Pi beer dispenser that verifies you're 21+ using zero-knowledge proofs.**

Scan. Prove your age. Pour a beer. No ID shown, no data stored.

---

## How It Works

```
┌──────────┐   ZK Proof    ┌─────────────┐  GPIO 26  ┌───────┐  24V   ┌──────────┐
│ Self App │ ──────────────►│ Pi / Express ├──────────►│ Relay ├───────►│ Solenoid │
│ (phone)  │   (tunnel)    │   :3000      │           │ Board │ valve  │  Valve   │
└──────────┘               └──────┬───────┘           └───────┘        └──────────┘
                                  │
                           ┌──────┴───────┐
                           │  I2C LCD     │
                           │  16x2 status │
                           └──────────────┘
```

1. User scans the printed QR code with the **Self** app
2. Self generates a zero-knowledge proof that age >= 21 (no personal data leaves the phone)
3. Proof is sent to the Pi server via a Cloudflare Tunnel
4. Server verifies proof, opens relay for 15 seconds, beer pours. LCD shows countdown.

---

## Hardware — Bill of Materials

| Component | Notes | Buy |
|---|---|---|
| Raspberry Pi 3 Model B | Any Pi with 40-pin GPIO header works | [Buy]() |
| Electronics-Salon RPi Relay Board | Plugs directly onto Pi GPIO header (HAT-style) | [Buy]() |
| I2C 16x2 LCD Display | SunFounder IIC 1602, 4-pin I2C (VCC/GND/SDA/SCL) | [Buy]() |
| 24V DC Solenoid Valve | Normally closed, food-safe (Brewtools) | [Buy]() |
| 24V DC Power Supply | 1A+ recommended | [Buy]() |
| MicroSD Card | 16 GB or larger | [Buy]() |
| Silicone tubing + barb fittings | Match the valve bore diameter | [Buy]() |
| Jumper wires / barrel connectors | For 24V wiring and LCD hookup | [Buy]() |

---

## Wiring

> **WARNING**: The 24V DC circuit can damage components if wired incorrectly. Double-check polarity before powering on. Never work on wiring while the PSU is plugged in.

### Full Layout

```
                  I2C LCD (16x2)
                 ┌───────────────┐
                 │ SelfBeer v1   │
                 │ Ready...      │
                 └──┬──┬──┬──┬──┘
                    │  │  │  │
               VCC──┘  │  │  └──SCL
                      GND SDA
                    │  │  │  │
                    ▼  ▼  ▼  ▼   wire to relay board pass-through pins
                 ┌──────────────────┐
                 │   Relay Board    │   ← HAT: plugs onto Pi header
                 │   Ch1 = GPIO 26  │
  ┌──────────┐   │                  │          ┌──────────────┐
  │  24V DC  ├───┤► C1        NO1 ◄─┼──────────┤  Solenoid    │
  │  Power   │(+)│                  │    (+)   │  Valve       │
  │  Supply  ├───┼──────────────────┼──────────┤  (N.C.)      │
  └──────────┘(-)└──────────────────┘    (-)   └──────────────┘
                 ▲ plugs onto ▼
                 ┌──────────────────┐
                 │  Raspberry Pi 3  │
                 └──────────────────┘
```

### LCD Wiring (I2C)

The LCD has 4 pins. Connect them to the **relay board's pass-through pins** (the relay HAT sits on top of the Pi but exposes the unused pins). Look for these labels on your board:

| LCD Pin | Connect to | What it does |
|---------|------------|--------------|
| **VCC** | **5V** | Powers the LCD |
| **GND** | **GND** | Ground |
| **SDA** | **SDA** | I2C data (GPIO 2) |
| **SCL** | **SCL** | I2C clock (GPIO 3) |

> **Tip**: On the Pi's 40-pin header, 5V is the top-right pin, GND is two pins below it, and SDA/SCL are the two pins right below 5V on the left column. Here's the corner of the header for reference:
>
> ```
> Physical pin layout (top-left corner of Pi header):
>
>    Left column    Right column
>    ┌──────────┐  ┌──────────┐
>  1 │  3.3V    │  │  5V      │ 2   ← use this for VCC
>  3 │  SDA     │  │  5V      │ 4
>  5 │  SCL     │  │  GND     │ 6   ← use this for GND
>  7 │  GPIO 4  │  │  GPIO 14 │ 8
>  9 │  GND     │  │  GPIO 15 │ 10
>    └──────────┘  └──────────┘
>    ... (continues to pin 40)
> ```

### 24V Circuit (simplified)

```
24V(+) ──► C1 ─┤relay├─ NO1 ──► Valve(+)
                                 Valve(-) ──► 24V(-)
```

- **C1** = Common (24V positive in)
- **NO1** = Normally Open (connects to C1 only when relay is energized)
- The valve is **closed by default**. When GPIO 26 goes HIGH, the relay energizes, C1 connects to NO1, and the valve opens.

---

## Setup Guide (macOS → Raspberry Pi)

### 1. Flash Raspberry Pi OS Lite

1. Download and install [Raspberry Pi Imager](https://www.raspberrypi.com/software/) on your Mac
2. Insert a microSD card
3. In Imager, select:
   - **Device**: Raspberry Pi 3
   - **OS**: Raspberry Pi OS Lite (64-bit, Bookworm)
4. Click the **gear icon** (⚙) to configure:
   - Hostname: `selfbeer`
   - Enable SSH (use password authentication)
   - Set username: `gianluk` (or your preference)
   - Set password
   - Configure WiFi: enter your network SSID and password
   - Set locale/timezone
5. Flash the card, insert it into the Pi, and power on

### 2. Connect via SSH

```bash
ssh gianluk@selfbeer.local
```

If `.local` doesn't resolve, find the Pi's IP on your router and use:

```bash
ssh gianluk@<PI_IP_ADDRESS>
```

### 3. System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install build tools and pigpio
sudo apt install -y git build-essential python3

# Enable I2C for the LCD
sudo raspi-config nonint do_i2c 0
```

### 4. Install pigpio from Source

The `pigpio` npm package requires the C library, which may not be available via apt:

```bash
cd ~
git clone https://github.com/joan2937/pigpio.git
cd pigpio
make
sudo make install
sudo ldconfig
```

### 5. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify: `node --version` should show v20.x.

### 6. Clone and Install

```bash
cd ~
git clone https://github.com/GianlucaMinoprio/selfbeer.git
cd selfbeer
npm install
```

### 7. Configure Environment

```bash
cp .env.example .env
nano .env
```

Fill in your values:

```bash
PORT=3000
RELAY_GPIO=26
POUR_MS=15000
CONFIG_ID=0xd38655ad3441438e768552b40f8e068ff26a04343093483b3872a3bacfc50173
ENDPOINT_URL=https://selfbeer.yourdomain.com/api/verify
STATUS_WEBHOOK_URL=https://self-beer-semaphore.vercel.app/api/status
LCD_ADDRESS=0x27
```

### 8. Verify LCD Connection

Check that the LCD is detected on the I2C bus:

```bash
sudo apt install -y i2c-tools
i2cdetect -y 1
```

You should see `27` (or `3f`) in the grid. If not, check your wiring.

### 9. Test the Relay

```bash
sudo node manual.js
```

Press **SPACE** to pulse the relay (you should hear a click and the valve opens briefly). Press **q** to quit.

### 10. Run the Server

```bash
sudo node index.js
```

You should see `listening on 3000 (GPIO 26, pour 15000ms)` and the LCD should display "SelfBeer v1 / Ready...".

---

## Tunnel Setup

The Self app needs a public HTTPS URL to send the ZK proof to your Pi. Two options:

### Option A: Cloudflare Tunnel (recommended — free)

```bash
# Install cloudflared
curl -sSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 \
  -o /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# Authenticate (opens a browser link — copy/paste the URL)
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel create selfbeer

# Route your subdomain (you need a domain on Cloudflare)
cloudflared tunnel route dns selfbeer selfbeer.yourdomain.com

# Create config
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: selfbeer
credentials-file: /home/gianluk/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: selfbeer.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Test it
cloudflared tunnel run selfbeer
```

### Option B: ngrok (quick setup for testing)

```bash
# Install
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok-v3-stable-linux-arm64.tgz \
  | sudo tar xz -C /usr/local/bin

# Authenticate
ngrok config add-authtoken <YOUR_TOKEN>

# Run (use a reserved domain if you have one)
ngrok http --url=selfbeer.ngrok.app 3000
```

> Update `ENDPOINT_URL` in your `.env` to match whichever tunnel URL you're using.

---

## systemd Services (Auto-Start on Boot)

### SelfBeer Server

```bash
sudo tee /etc/systemd/system/selfbeer.service << 'EOF'
[Unit]
Description=SelfBeer GPIO server
After=network-online.target
Wants=network-online.target

[Service]
User=root
WorkingDirectory=/home/gianluk/selfbeer
EnvironmentFile=/home/gianluk/selfbeer/.env
ExecStart=/usr/bin/node /home/gianluk/selfbeer/index.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF
```

### Cloudflare Tunnel

```bash
sudo tee /etc/systemd/system/cloudflared-selfbeer.service << 'EOF'
[Unit]
Description=Cloudflare Tunnel for SelfBeer
After=network-online.target selfbeer.service

[Service]
User=gianluk
ExecStart=/usr/local/bin/cloudflared tunnel run selfbeer
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now selfbeer cloudflared-selfbeer
```

### Useful Commands

```bash
# Check status
systemctl status selfbeer cloudflared-selfbeer --no-pager

# Live logs
sudo journalctl -u selfbeer -u cloudflared-selfbeer -f

# Restart after editing code
sudo systemctl restart selfbeer
sudo journalctl -u selfbeer -n 50 --no-pager

# Reboot
sudo reboot
```

---

## Printed QR Code

The Self.xyz QR code encodes fixed parameters (scope, endpoint, minimum age). Since these don't change, you can **print the QR code once** and reuse it permanently.

Generate the QR using the [`@selfxyz/qrcode`](https://docs.self.xyz) package or the Self developer dashboard with these parameters:

- **Scope**: `beer`
- **Endpoint**: your tunnel URL (e.g., `https://selfbeer.yourdomain.com/api/verify`)
- **Disclosures**: `minimumAge: 21`

Print the QR and place it next to the tap. Users scan it with the Self app on their phone.

> The tunnel must be running for the QR to work — it still points to your Pi's public endpoint.

---

## Self.xyz Configuration

1. Go to [Self.xyz](https://self.xyz) and create a developer account
2. Create a new verification configuration:
   - **Scope**: `beer`
   - **Callback URL**: your tunnel endpoint (e.g., `https://selfbeer.yourdomain.com/api/verify`)
   - **Minimum Age**: `21`
3. Copy the **Config ID** and set it as `CONFIG_ID` in your `.env`
4. Generate a QR code for the verification flow

See the [Self.xyz docs](https://docs.self.xyz) for detailed integration instructions.

---

## WiFi Configuration

### Changing Networks

If you need to connect the Pi to a different WiFi network (e.g., when SSH'd in):

```bash
# List available networks
sudo nmcli device wifi list

# Connect to a new network
sudo nmcli device wifi connect "SSID" password "PASSWORD"

# Check connection
ip addr show wlan0
```

Saved connections persist across reboots.

### Portable WiFi Setup (Phone-Based)

When you move the Pi to a new venue where it can't find any known WiFi, you need a way to configure it **without a keyboard or monitor**. The included WiFi fallback scripts solve this.

**How it works:**
1. Pi boots and waits 60 seconds for a WiFi connection
2. If no connection, it creates a hotspot called **`SelfBeer-Setup`** (password: `pourme123`)
3. Connect to the hotspot from your phone
4. Open a browser → you'll see a WiFi configuration page
5. Select the venue's WiFi, enter the password, submit
6. The Pi connects to the new WiFi and the hotspot shuts down

**Install the fallback service:**

```bash
# Copy the service file
sudo cp ~/selfbeer/scripts/wifi-fallback.service /etc/systemd/system/
sudo chmod +x ~/selfbeer/scripts/wifi-fallback.sh

# Enable it
sudo systemctl daemon-reload
sudo systemctl enable wifi-fallback
```

The service runs once at boot. If WiFi connects normally, it does nothing.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Express server port |
| `RELAY_GPIO` | `26` | BCM GPIO pin controlling the relay |
| `POUR_MS` | `15000` | How long the valve stays open (ms) |
| `CONFIG_ID` | `0xd386...0173` | Self.xyz verification config ID |
| `ENDPOINT_URL` | `https://selfbeer.ngrok.app/api/verify` | Public callback URL (set to your tunnel domain) |
| `STATUS_WEBHOOK_URL` | *(empty)* | Optional: URL to POST open/closed/underage status |
| `LCD_ADDRESS` | `0x27` | I2C address of LCD display (try `0x3F` if not detected) |

---

## Manual Testing

`manual.js` lets you test the relay without the full verification flow:

```bash
sudo node manual.js
```

- **SPACE** = pulse relay (500ms default)
- **q** = quit

Customize: `POUR_MS=2000 sudo node manual.js` for a longer pulse.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Error: pigpio requires root` | Run with `sudo`: `sudo node index.js` |
| Relay clicks but valve doesn't open | Check 24V PSU is powered on. Verify C1/NO1 wiring (not NC1). |
| LCD shows nothing | Run `i2cdetect -y 1` — if no address shows, check SDA/SCL wiring. Try `LCD_ADDRESS=0x3F`. |
| Tunnel not connecting | Check `systemctl status cloudflared-selfbeer`. Verify internet. Check credentials. |
| Proof verification fails | Ensure `CONFIG_ID` matches Self.xyz dashboard. Ensure `ENDPOINT_URL` matches tunnel URL. |
| WiFi hotspot doesn't appear | Ensure `wifi-fallback.service` is enabled. Check `journalctl -u wifi-fallback`. |
| Server works but LCD doesn't | That's fine — the server runs with or without the LCD. Check I2C is enabled: `sudo raspi-config nonint do_i2c 0`. |

---

## License

ISC
