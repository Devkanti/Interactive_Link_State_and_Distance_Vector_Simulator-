#!/bin/bash
set -e

echo "===================================================================="
echo "  Starting Containerized Mininet L3 Network Emulation"
echo "===================================================================="

# 1. Clean up any stale Mininet / Open vSwitch locks
service openvswitch-switch start || /etc/init.d/openvswitch-switch start || true
mn -c 2>/dev/null || true

# 2. Ensure IPv4 forwarding is enabled in container kernel
sysctl -w net.ipv4.ip_forward=1 2>/dev/null || true

# 3. Determine topology preset from environment variable (default: diamond)
TOPO_NAME="${MININET_TOPO:-diamond}"
PORT="${BRIDGE_PORT:-8080}"
PROTOCOL="${ROUTING_PROTOCOL:-LSR}"

echo "[*] Topology Preset : ${TOPO_NAME}"
echo "[*] Initial Protocol: ${PROTOCOL}"
echo "[*] REST Bridge Port: ${PORT}"
echo "===================================================================="

# 4. Launch master topology runner and REST bridge
exec python3 -u topology_runner.py --topo "${TOPO_NAME}" --proto "${PROTOCOL}" --port "${PORT}"
