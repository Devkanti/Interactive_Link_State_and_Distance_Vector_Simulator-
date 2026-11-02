#!/usr/bin/env bash
# ==============================================================================
# Mininet & Linux Routing Environment Setup Script
# ==============================================================================
# This script configures a Linux machine (Ubuntu, Debian, or WSL2) with
# Mininet, Open vSwitch, Python 3, and networking utilities needed for real
# kernel-level routing protocol emulation (Link State / OSPF & Distance Vector / RIP).
#
# Usage:
#   chmod +x setup.sh
#   sudo ./setup.sh
# ==============================================================================

set -e

echo "================================================================="
echo "  Setting up Mininet & Linux Kernel Routing Emulation Environment"
echo "================================================================="

if [ "$EUID" -ne 0 ]; then
    echo "[-] Error: Please run this script with root privileges (sudo ./setup.sh)"
    exit 1
fi

echo "[1/5] Updating APT package repositories..."
apt-get update -y

echo "[2/5] Installing Mininet, Open vSwitch, and Linux Networking Utilities..."
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    mininet \
    openvswitch-switch \
    openvswitch-common \
    iproute2 \
    net-tools \
    iputils-ping \
    traceroute \
    tcpdump \
    iptables \
    python3 \
    python3-pip \
    curl

echo "[3/5] Starting & Enabling Open vSwitch Service..."
service openvswitch-switch start || systemctl start openvswitch-switch || true

echo "[4/5] Enabling Kernel IPv4 Forwarding..."
sysctl -w net.ipv4.ip_forward=1
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf || true

echo "[5/5] Testing Mininet Installation..."
mn --clean
mn --test pingall

echo "================================================================="
echo "  Mininet Environment Setup Completed Successfully!"
echo "================================================================="
echo ""
echo "Quick Start Commands:"
echo "  1. Run Diamond Topology (Default):"
echo "     sudo python3 topology_runner.py --topo diamond"
echo ""
echo "  2. Run with REST Bridge for the Web Dashboard:"
echo "     sudo python3 topology_runner.py --topo diamond --bridge-port 8080"
echo ""
echo "  3. In Mininet CLI:"
echo "     mininet> r1 ping -c 2 r3"
echo "     mininet> link r1 r2 down"
echo "     mininet> r1 ip route show"
echo "================================================================="
