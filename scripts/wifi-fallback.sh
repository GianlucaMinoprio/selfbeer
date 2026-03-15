#!/usr/bin/env bash
# wifi-fallback.sh — starts a hotspot if no WiFi connection is found after boot.
# Used so you can configure WiFi from your phone when moving the Pi to a new venue.

HOTSPOT_SSID="SelfBeer-Setup"
HOTSPOT_PASS="pourme123"
WAIT_SECONDS=60
PORTAL_SCRIPT="$(dirname "$0")/wifi-portal.js"

echo "[wifi-fallback] Waiting ${WAIT_SECONDS}s for WiFi connection..."
sleep "$WAIT_SECONDS"

# Check if wlan0 has an IP address
IP=$(ip -4 addr show wlan0 2>/dev/null | grep -oP 'inet \K[\d.]+')

if [ -n "$IP" ]; then
  echo "[wifi-fallback] WiFi connected ($IP). No action needed."
  exit 0
fi

echo "[wifi-fallback] No WiFi connection. Starting hotspot '$HOTSPOT_SSID'..."
nmcli device wifi hotspot ifname wlan0 ssid "$HOTSPOT_SSID" password "$HOTSPOT_PASS"

# Start the captive portal so the user can configure WiFi from a browser
if [ -f "$PORTAL_SCRIPT" ]; then
  echo "[wifi-fallback] Starting WiFi portal on port 80..."
  node "$PORTAL_SCRIPT" &
  PORTAL_PID=$!

  # Wait for the portal to signal that WiFi was configured (it creates a flag file)
  FLAG="/tmp/wifi-configured"
  rm -f "$FLAG"
  while [ ! -f "$FLAG" ]; do
    sleep 2
  done

  echo "[wifi-fallback] WiFi configured. Tearing down hotspot..."
  kill "$PORTAL_PID" 2>/dev/null
  rm -f "$FLAG"

  # Stop the hotspot — NetworkManager will reconnect to the configured WiFi
  nmcli device disconnect wlan0
  sleep 2
  nmcli device connect wlan0
  echo "[wifi-fallback] Done."
else
  echo "[wifi-fallback] Portal script not found. Hotspot is up — SSH in to configure WiFi manually."
  echo "[wifi-fallback]   Connect to '$HOTSPOT_SSID' (password: $HOTSPOT_PASS)"
  echo "[wifi-fallback]   Then: ssh $(whoami)@10.42.0.1"
fi
