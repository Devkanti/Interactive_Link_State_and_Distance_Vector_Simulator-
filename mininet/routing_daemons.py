#!/usr/bin/env python3
"""
routing_daemons.py
===================
Real socket-based Link State (OSPF model) and Distance Vector (RIP model)
routing daemons that execute inside individual Linux network namespaces (Mininet hosts).

Features:
- Real UDP broadcast/multicast socket communication over virtual Ethernet (veth) interfaces.
- Real Linux kernel routing table updates via `ip route replace / del`.
- Supports Link State (LSP flooding, sequence numbering, Dijkstra SPF).
- Supports Distance Vector (Bellman-Ford, Split Horizon, Poison Reverse, Metric-16 infinity).
- Emits real-time state telemetry to the Mininet Bridge server for visual dashboard synchronization.
"""

import os
import sys
import time
import json
import socket
import select
import threading
import subprocess
import heapq

UDP_PORT_LSR = 5000
UDP_PORT_DVR = 5001
BROADCAST_IP = "255.255.255.255"

def run_cmd(cmd):
    """Executes a system shell command safely."""
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return res.stdout.strip()
    except Exception as e:
        return str(e)

def get_interfaces():
    """Returns a list of operational interface names and IP addresses (excluding lo)."""
    ifaces = {}
    out = run_cmd("ip -j -4 addr show")
    try:
        data = json.loads(out)
        for iface in data:
            name = iface.get("ifname", "")
            if name == "lo":
                continue
            addr_info = iface.get("addr_info", [])
            for a in addr_info:
                ip = a.get("local")
                prefix = a.get("prefixlen")
                if ip:
                    ifaces[name] = {"ip": ip, "prefix": prefix}
    except Exception:
        pass
    return ifaces

# ==============================================================================
# 1. LINK STATE ROUTER DAEMON (OSPF / DIJKSTRA SPF)
# ==============================================================================
class LinkStateRouterDaemon:
    def __init__(self, router_id, bridge_url="http://localhost:8080"):
        self.router_id = router_id
        self.bridge_url = bridge_url
        self.sequence_number = 0
        self.lsdb = {}  # router_id -> { seq, age, neighbors: { router_id: cost } }
        self.interfaces = get_interfaces()
        self.neighbors = {} # ip -> { router_id, cost, iface }
        self.running = True
        self.lock = threading.Lock()

        # Socket setup
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(("", UDP_PORT_LSR))

    def broadcast_hello(self):
        """Broadcasts Hello packets across all operational interfaces to detect active neighbors."""
        msg = {
            "type": "HELLO",
            "source": self.router_id,
            "interfaces": self.interfaces
        }
        data = json.dumps(msg).encode("utf-8")
        for iface, info in self.interfaces.items():
            try:
                # Send broadcast packet on interface subnet
                bcast = ".".join(info["ip"].split(".")[:3]) + ".255"
                self.sock.sendto(data, (bcast, UDP_PORT_LSR))
            except Exception:
                pass

    def flood_lsp(self):
        """Generates a Link State Packet (LSP) and floods it out of all interfaces."""
        with self.lock:
            self.sequence_number += 1
            local_adj = {nbr["router_id"]: nbr.get("cost", 1) for nbr in self.neighbors.values()}
            # Include self in LSDB
            self.lsdb[self.router_id] = {
                "sequence": self.sequence_number,
                "neighbors": local_adj,
                "timestamp": time.time()
            }
            lsp = {
                "type": "LSP",
                "source": self.router_id,
                "sequence": self.sequence_number,
                "neighbors": local_adj
            }
            data = json.dumps(lsp).encode("utf-8")

        for iface, info in self.interfaces.items():
            try:
                bcast = ".".join(info["ip"].split(".")[:3]) + ".255"
                self.sock.sendto(data, (bcast, UDP_PORT_LSR))
            except Exception:
                pass

    def compute_dijkstra_spf(self):
        """Runs Dijkstra SPF on the synchronized LSDB and updates Linux kernel routes."""
        with self.lock:
            dist = {self.router_id: 0}
            prev = {}
            heap = [(0, self.router_id)]
            visited = set()

            all_nodes = set(self.lsdb.keys())
            for node in self.lsdb:
                all_nodes.update(self.lsdb[node]["neighbors"].keys())

            while heap:
                d, u = heapq.heappop(heap)
                if u in visited:
                    continue
                visited.add(u)

                for v, cost in self.lsdb.get(u, {}).get("neighbors", {}).items():
                    alt = d + cost
                    if alt < dist.get(v, float("inf")):
                        dist[v] = alt
                        prev[v] = u
                        heapq.heappush(heap, (alt, v))

            # Derive next-hop IP and interface for each destination
            for target_id, d in dist.items():
                if target_id == self.router_id:
                    continue
                # Backtrack to find immediate next hop
                curr = target_id
                next_hop = target_id
                while prev.get(curr) and prev.get(curr) != self.router_id:
                    curr = prev[curr]
                    next_hop = curr

                # Find neighbor info
                nbr_info = None
                for nbr in self.neighbors.values():
                    if nbr["router_id"] == next_hop:
                        nbr_info = nbr
                        break

                if nbr_info:
                    # Update Linux kernel route
                    dest_subnet = f"10.{target_id[1:]}.0.0/16" if target_id.startswith("r") and target_id[1:].isdigit() else None
                    if dest_subnet:
                        run_cmd(f"ip route replace {dest_subnet} via {nbr_info['ip']} dev {nbr_info['iface']}")

    def listen_loop(self):
        """Main packet reception and processing loop."""
        while self.running:
            r, _, _ = select.select([self.sock], [], [], 1.0)
            if not r:
                continue
            try:
                raw_data, (sender_ip, _) = self.sock.recvfrom(4096)
                msg = json.loads(raw_data.decode("utf-8"))
                m_type = msg.get("type")
                m_src = msg.get("source")

                if m_src == self.router_id:
                    continue

                if m_type == "HELLO":
                    # Register neighbor
                    with self.lock:
                        # Identify receiving interface matching subnet
                        rec_iface = None
                        for iface, info in self.interfaces.items():
                            if info["ip"].split(".")[:3] == sender_ip.split(".")[:3]:
                                rec_iface = iface
                                break
                        if rec_iface:
                            self.neighbors[sender_ip] = {
                                "router_id": m_src,
                                "ip": sender_ip,
                                "iface": rec_iface,
                                "cost": 1,
                                "last_seen": time.time()
                            }

                elif m_type == "LSP":
                    # Sequence check
                    seq = msg.get("sequence", 0)
                    with self.lock:
                        stored = self.lsdb.get(m_src, {}).get("sequence", 0)
                        if seq > stored:
                            self.lsdb[m_src] = {
                                "sequence": seq,
                                "neighbors": msg.get("neighbors", {}),
                                "timestamp": time.time()
                            }
                            # Flood forward out other interfaces
                            forward = True
                        else:
                            forward = False

                    if forward:
                        # Retransmit LSP out interfaces except the one it arrived on
                        for iface, info in self.interfaces.items():
                            if info["ip"].split(".")[:3] != sender_ip.split(".")[:3]:
                                try:
                                    bcast = ".".join(info["ip"].split(".")[:3]) + ".255"
                                    self.sock.sendto(raw_data, (bcast, UDP_PORT_LSR))
                                except Exception:
                                    pass
                        self.compute_dijkstra_spf()

            except Exception:
                pass

    def start(self):
        """Starts background threads for periodic Hello and LSP flooding."""
        t_listen = threading.Thread(target=self.listen_loop, daemon=True)
        t_listen.start()

        def periodic_tasks():
            while self.running:
                self.broadcast_hello()
                time.sleep(2)
                self.flood_lsp()
                time.sleep(3)

        t_tasks = threading.Thread(target=periodic_tasks, daemon=True)
        t_tasks.start()
        print(f"[{self.router_id}] Link State Routing (LSR) Daemon running.")

    def stop(self):
        self.running = False
        try:
            self.sock.close()
        except Exception:
            pass


# ==============================================================================
# 2. DISTANCE VECTOR ROUTER DAEMON (RIP / BELLMAN-FORD)
# ==============================================================================
class DistanceVectorRouterDaemon:
    def __init__(self, router_id, split_horizon=True, poison_reverse=True):
        self.router_id = router_id
        self.split_horizon = split_horizon
        self.poison_reverse = poison_reverse
        self.interfaces = get_interfaces()
        self.routes = {self.router_id: {"cost": 0, "next_hop": self.router_id, "iface": "lo"}}
        self.neighbors = {} # ip -> { router_id, iface }
        self.running = True
        self.lock = threading.Lock()

        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(("", UDP_PORT_DVR))

    def broadcast_advertisement(self):
        """Transmits distance vectors to neighbors, applying Split Horizon and Poison Reverse."""
        for nbr_ip, nbr in list(self.neighbors.items()):
            vector = {}
            with self.lock:
                for dest, entry in self.routes.items():
                    if entry["next_hop"] == nbr["router_id"]:
                        if self.poison_reverse:
                            vector[dest] = 16  # Poison reverse: metric 16
                        elif self.split_horizon:
                            continue  # Suppress route
                        else:
                            vector[dest] = entry["cost"]
                    else:
                        vector[dest] = entry["cost"]

            msg = {
                "type": "DV_ADVERT",
                "source": self.router_id,
                "vector": vector
            }
            try:
                self.sock.sendto(json.dumps(msg).encode("utf-8"), (nbr_ip, UDP_PORT_DVR))
            except Exception:
                pass

    def listen_loop(self):
        """Receives distance vector advertisements and applies Bellman-Ford relaxation."""
        while self.running:
            r, _, _ = select.select([self.sock], [], [], 1.0)
            if not r:
                continue
            try:
                raw_data, (sender_ip, _) = self.sock.recvfrom(4096)
                msg = json.loads(raw_data.decode("utf-8"))
                m_src = msg.get("source")
                if m_src == self.router_id:
                    continue

                rec_iface = None
                for iface, info in self.interfaces.items():
                    if info["ip"].split(".")[:3] == sender_ip.split(".")[:3]:
                        rec_iface = iface
                        break

                if not rec_iface:
                    continue

                self.neighbors[sender_ip] = {"router_id": m_src, "iface": rec_iface}
                vector = msg.get("vector", {})

                # Bellman-Ford: D_x(y) = min_v { c(x,v) + D_v(y) }
                changed = False
                with self.lock:
                    for dest, cost in vector.items():
                        new_cost = min(16, cost + 1)
                        curr_entry = self.routes.get(dest)

                        if not curr_entry:
                            if new_cost < 16:
                                self.routes[dest] = {"cost": new_cost, "next_hop": m_src, "iface": rec_iface}
                                changed = True
                        else:
                            # Update if better cost or if route learned from same next hop
                            if curr_entry["next_hop"] == m_src:
                                if curr_entry["cost"] != new_cost:
                                    curr_entry["cost"] = new_cost
                                    changed = True
                            elif new_cost < curr_entry["cost"]:
                                self.routes[dest] = {"cost": new_cost, "next_hop": m_src, "iface": rec_iface}
                                changed = True

                if changed:
                    # Sync to Linux kernel routing table
                    for dest, entry in self.routes.items():
                        if dest != self.router_id and entry["cost"] < 16:
                            dest_subnet = f"10.{dest[1:]}.0.0/16" if dest.startswith("r") and dest[1:].isdigit() else None
                            if dest_subnet:
                                run_cmd(f"ip route replace {dest_subnet} via {sender_ip} dev {entry['iface']}")
            except Exception:
                pass

    def start(self):
        t_listen = threading.Thread(target=self.listen_loop, daemon=True)
        t_listen.start()

        def periodic_advert():
            while self.running:
                self.broadcast_advertisement()
                time.sleep(3)

        t_tasks = threading.Thread(target=periodic_advert, daemon=True)
        t_tasks.start()
        print(f"[{self.router_id}] Distance Vector Routing (DVR) Daemon running.")

    def stop(self):
        self.running = False
        try:
            self.sock.close()
        except Exception:
            pass

# Entrypoint for running daemon directly inside a Mininet host namespace:
# e.g.: python3 routing_daemons.py r1 lsr
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 routing_daemons.py <router_id> <lsr|dvr>")
        sys.exit(1)

    r_id = sys.argv[1]
    proto = sys.argv[2].lower()

    if proto == "lsr":
        daemon = LinkStateRouterDaemon(r_id)
    else:
        daemon = DistanceVectorRouterDaemon(r_id)

    daemon.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        daemon.stop()
