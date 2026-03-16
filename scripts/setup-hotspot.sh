#!/usr/bin/env bash
# setup-hotspot.sh — Pre-configures a phone hotspot for auto-connect.
# Run once on the Pi: sudo bash scripts/setup-hotspot.sh

SSID="Iphone GL"
PASS="1234567890"

echo "[setup-hotspot] Adding '$SSID' to NetworkManager..."
nmcli connection add \
  type wifi \
  con-name "phone-hotspot" \
  ssid "$SSID" \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "$PASS" \
  connection.autoconnect yes \
  connection.autoconnect-priority 10

echo "[setup-hotspot] Done. The Pi will auto-connect to '$SSID' when available."
echo "[setup-hotspot] To verify: nmcli connection show phone-hotspot"
