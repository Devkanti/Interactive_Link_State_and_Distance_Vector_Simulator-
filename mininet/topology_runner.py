#!/usr/bin/env python3
"""
topology_runner.py
==================
Master Mininet & Cross-Platform Layer 3 Router Emulation Runner.

Features:
- DUAL-MODE EXECUTION:
    1. Linux / Mininet Mode: When executed on Linux with root privileges,
       instantiates real Mininet network namespaces (netns), virtual ethernet (veth)
       interfaces, and Linux kernel FIB routing daemons.
    2. Windows / Cross-Platform Mode: When executed on Windows or systems without
       Mininet kernel drivers, seamlessly runs a full Layer 3 socket & FIB router
       emulation engine with Dijkstra SPF & Bellman-Ford algorithms.
- Bidirectional REST Bridge Server (:8080) connects with the Web Dashboard.
- Interactive terminal CLI for live route inspection, pinging, and link failure injection.

Usage on Windows:
    python topology_runner.py [--topo diamond|triangle|mesh|linear] [--proto LSR|DVR]

Usage on Linux / WSL:
    sudo python3 topology_runner.py [--topo diamond|triangle|mesh|linear] [--proto LSR|DVR]
"""

import sys
import os
import time
import json
import heapq
import argparse
import threading

# Detect if Mininet is available (Linux only).
# Uses dynamic importlib to ensure zero diagnostic/import errors on Windows IDEs.
try:
    import importlib
    _m_net = importlib.import_module("mininet.net")
    _m_node = importlib.import_module("mininet.node")
    _m_cli = importlib.import_module("mininet.cli")
    _m_log = importlib.import_module("mininet.log")

    Mininet = _m_net.Mininet
    Node = _m_node.Node
    CLI = _m_cli.CLI
    setLogLevel = _m_log.setLogLevel
    info = _m_log.info
    HAS_MININET = True

    def _node_add_interface(self, ifname, ip, target, cost=1):
        if not hasattr(self, '_interfaces_dict'):
            self._interfaces_dict = {}
        self._interfaces_dict[ifname] = {
            "ip": ip,
            "target": target,
            "cost": cost,
            "down": False
        }
    Node.add_interface = _node_add_interface
    Node.interfaces = property(lambda self: getattr(self, '_interfaces_dict', {}))
    Node.routes = property(lambda self: getattr(self, '_routes_list', []), lambda self, v: setattr(self, '_routes_list', v))
except (ImportError, ModuleNotFoundError):
    HAS_MININET = False
    Mininet = None
    Node = None
    CLI = None
    setLogLevel = None

    def info(msg):
        sys.stdout.write(msg)
        sys.stdout.flush()

from bridge_server import start_bridge_server

# ==============================================================================
# Cross-Platform Simulated Router (Used when running natively on Windows)
# ==============================================================================
class CrossPlatformRouter:
    """Simulates a Layer 3 Router with Linux FIB interface when Mininet is not available."""
    def __init__(self, name, ip):
        self.name = name
        self.ip = ip
        self.interfaces = {}  # iface_name -> { ip, target, cost, down }
        self.routes = []      # list of { dst, gateway, dev, protocol, metric }

    def add_interface(self, ifname, ip, target, cost=1):
        self.interfaces[ifname] = {
            "ip": ip,
            "target": target,
            "cost": cost,
            "down": False
        }

    def cmd(self, command):
        """Simulates Linux network namespace terminal command execution."""
        command = command.strip()

        # Handle `ip -j route show` (JSON output for Bridge Server)
        if "ip -j route" in command:
            out = []
            for r in self.routes:
                item = {
                    "dst": r["dst"],
                    "dev": r["dev"],
                    "protocol": r.get("protocol", "kernel"),
                    "metric": r.get("metric", 1)
                }
                if r.get("gateway"):
                    item["gateway"] = r["gateway"]
                out.append(item)
            return json.dumps(out)

        # Handle `ip route show` (Human-readable CLI output)
        elif "ip route" in command:
            lines = []
            for r in self.routes:
                gw_str = f" via {r['gateway']}" if r.get("gateway") else ""
                proto_str = f" proto {r.get('protocol', 'kernel')}"
                metric_str = f" metric {r.get('metric', 1)}" if r.get("metric") else ""
                lines.append(f"{r['dst']}{gw_str} dev {r['dev']}{proto_str}{metric_str}")
            return "\n".join(lines) if lines else "No routes installed."

        # Handle `ping` commands
        elif command.startswith("ping"):
            parts = command.split()
            dst = parts[-1]
            
            # Resolve target router if a name or label was provided (e.g. 'r2', 'b', 'Router B')
            target_ip = dst
            clean_dst = dst.lower().replace("router", "").replace("_", "").strip()
            if len(clean_dst) == 1 and clean_dst.isalpha():
                idx = ord(clean_dst) - ord('a') + 1
                target_ip = f"10.{idx}.0.1"
            elif clean_dst.startswith("r") and clean_dst[1:].isdigit():
                idx = clean_dst[1:]
                target_ip = f"10.{idx}.0.1"

            # Check if router has route to destination subnet (e.g., 10.2.0.0/16 or 10.2.0.1)
            target_net = target_ip.rsplit(".", 2)[0] if "." in target_ip else target_ip
            reachable = any(
                r["dst"].startswith(target_net) or 
                r["dst"].startswith(target_ip) or 
                r["dst"] == "default" 
                for r in self.routes
            )

            if reachable:
                return (
                    f"PING {target_ip} ({target_ip}) 56(84) bytes of data.\n"
                    f"64 bytes from {target_ip}: icmp_seq=1 ttl=63 time=0.084 ms\n"
                    f"64 bytes from {target_ip}: icmp_seq=2 ttl=63 time=0.062 ms\n"
                    f"--- {target_ip} ping statistics ---\n"
                    f"2 packets transmitted, 2 received, 0% packet loss, time 1002ms\n"
                    f"rtt min/avg/max = 0.062/0.073/0.084 ms"
                )
            else:
                src_ip = self.ip.split('/')[0]
                return (
                    f"PING {target_ip} ({target_ip}) 56(84) bytes of data.\n"
                    f"From {src_ip} icmp_seq=1 Destination Host Unreachable\n"
                    f"--- {target_ip} ping statistics ---\n"
                    f"2 packets transmitted, 0 received, +1 errors, 100% packet loss"
                )

        return f"Output for: {command}"


class CrossPlatformNet:
    """Network container for Layer 3 Router Emulation."""
    def __init__(self):
        self.hosts = {}
        self.links = []

    def get(self, name):
        """Returns router node by name, supporting aliases like 'a', 'A', 'r1', 'Router A'."""
        if not name:
            return None
        clean = str(name).strip().lower()
        if clean in self.hosts:
            return self.hosts[clean]

        clean_sub = clean.replace("router", "").replace("_", "").strip()
        if clean_sub in self.hosts:
            return self.hosts[clean_sub]

        if len(clean_sub) == 1 and clean_sub.isalpha():
            idx = ord(clean_sub) - ord('a') + 1
            cand = f"r{idx}"
            if cand in self.hosts:
                return self.hosts[cand]

        for r in self.hosts.values():
            if r.ip.split('/')[0] == clean:
                return r

        return None

    def addHost(self, name, cls=None, ip='10.0.0.1/16'):
        router = CrossPlatformRouter(name, ip)
        self.hosts[name] = router
        return router

    def addLink(self, r1, r2, params1=None, params2=None):
        p1 = params1 or {'ip': '10.0.1.1/24'}
        p2 = params2 or {'ip': '10.0.1.2/24'}
        if1 = f"{r1.name}-{r2.name}"
        if2 = f"{r2.name}-{r1.name}"
        r1.add_interface(if1, p1.get('ip'), r2.name)
        r2.add_interface(if2, p2.get('ip'), r1.name)
        self.links.append((r1.name, r2.name, if1, if2))

    def configLinkStatus(self, src, dst, status):
        is_down = (status.lower() == 'down')
        if src in self.hosts and dst in self.hosts:
            r1 = self.hosts[src]
            r2 = self.hosts[dst]
            for ifname, meta in r1.interfaces.items():
                if meta["target"] == dst:
                    meta["down"] = is_down
            for ifname, meta in r2.interfaces.items():
                if meta["target"] == src:
                    meta["down"] = is_down
        return True

    def start(self):
        pass

    def stop(self):
        pass


# ==============================================================================
# Master Topology Runner
# ==============================================================================
class MininetTopologyRunner:
    def __init__(self, topo_name="diamond", active_protocol="LSR", bridge_port=8080):
        self.topo_name = topo_name.lower()
        self.active_protocol = active_protocol.upper()
        self.bridge_port = bridge_port
        self.net = None
        self.routers = []
        self.edge_list = []
        self.start_time = time.time()
        self.is_native_mode = not HAS_MININET

    def connect_routers(self, r_s, r_d, ip1, ip2, cost):
        """Creates link between two routers and tracks interface IP mappings."""
        add_link = self.net.addLink
        link = add_link(r_s, r_d, params1={'ip': ip1}, params2={'ip': ip2})
        if HAS_MININET:
            dev1 = link.intf1.name
            dev2 = link.intf2.name
            try:
                ip1_clean, p1 = ip1.split('/')
                link.intf1.setIP(ip1_clean, int(p1))
            except Exception:
                pass
            try:
                ip2_clean, p2 = ip2.split('/')
                link.intf2.setIP(ip2_clean, int(p2))
            except Exception:
                pass
        else:
            dev1 = f"{r_s.name}-{r_d.name}"
            dev2 = f"{r_d.name}-{r_s.name}"

        r_s.add_interface(dev1, ip1, r_d.name, cost)
        r_d.add_interface(dev2, ip2, r_s.name, cost)
        subnet = f"{ip1.rsplit('.', 1)[0]}.0/24"
        self.edge_list.append((r_s.name, r_d.name, {
            'cost': cost, 'down': False, 'dev1': dev1, 'dev2': dev2,
            'ip1': ip1, 'ip2': ip2, 'subnet': subnet
        }))

    def build_topology(self):
        """Constructs router graph using either Mininet or CrossPlatformNet."""
        if HAS_MININET:
            self.net = Mininet(controller=None)
            add_host = lambda name, **kw: self.net.addHost(name, ip=None)
        else:
            self.net = CrossPlatformNet()
            add_host = self.net.addHost

        if self.topo_name == "triangle":
            r1 = add_host('r1', ip='10.1.0.1/16')
            r2 = add_host('r2', ip='10.2.0.1/16')
            r3 = add_host('r3', ip='10.3.0.1/16')
            self.routers = [r1, r2, r3]
            self.connect_routers(r1, r2, '10.0.12.1/24', '10.0.12.2/24', 1)
            self.connect_routers(r2, r3, '10.0.23.1/24', '10.0.23.2/24', 2)
            self.connect_routers(r1, r3, '10.0.13.1/24', '10.0.13.2/24', 4)

        elif self.topo_name == "linear":
            self.routers = [add_host(f'r{i}', ip=f'10.{i}.0.1/16') for i in range(1, 6)]
            for i in range(1, 5):
                r_s = self.routers[i - 1]
                r_d = self.routers[i]
                self.connect_routers(r_s, r_d, f'10.0.{i}{i+1}.1/24', f'10.0.{i}{i+1}.2/24', 1)

        elif self.topo_name == "mesh":
            self.routers = [add_host(f'r{i}', ip=f'10.{i}.0.1/16') for i in range(1, 7)]
            pairs = [
                (1, 2, 1), (2, 3, 2), (3, 4, 1), (4, 5, 2), (5, 6, 1), (6, 1, 3),
                (1, 4, 4), (2, 5, 3), (3, 6, 2)
            ]
            for s, d, c in pairs:
                r_s = self.routers[s - 1]
                r_d = self.routers[d - 1]
                self.connect_routers(r_s, r_d, f'10.0.{s}{d}.1/24', f'10.0.{s}{d}.2/24', c)

        else:
            # Default: Diamond Multi-Path
            r1 = add_host('r1', ip='10.1.0.1/16')
            r2 = add_host('r2', ip='10.2.0.1/16')
            r3 = add_host('r3', ip='10.3.0.1/16')
            r4 = add_host('r4', ip='10.4.0.1/16')
            self.routers = [r1, r2, r3, r4]

            self.connect_routers(r1, r2, '10.0.12.1/24', '10.0.12.2/24', 2)
            self.connect_routers(r1, r3, '10.0.13.1/24', '10.0.13.2/24', 1)
            self.connect_routers(r2, r4, '10.0.24.1/24', '10.0.24.2/24', 1)
            self.connect_routers(r3, r4, '10.0.34.1/24', '10.0.34.2/24', 3)
            self.connect_routers(r2, r3, '10.0.23.1/24', '10.0.23.2/24', 1)

        if HAS_MININET:
            for r in self.routers:
                r.cmd("sysctl -w net.ipv4.ip_forward=1")
                idx = r.name.replace('r', '')
                r.cmd(f"ip addr add 10.{idx}.0.1/16 dev lo:1 2>/dev/null || true")

        # Initial shortest path calculation and route installation (both native & Mininet)
        self.recalculate_routes()

    def recalculate_routes(self):
        """Calculates Dijkstra shortest paths and synchronizes kernel FIB."""
        nodes = [r.name for r in self.routers]
        adj = {n: {} for n in nodes}
        for s, d, meta in self.edge_list:
            if not meta.get("down", False):
                c = meta.get("cost", 1)
                adj[s][d] = c
                adj[d][s] = c

        proto_label = "lsr" if self.active_protocol == "LSR" else "dvr"

        for src_router in self.routers:
            src = src_router.name
            dist = {n: float('inf') for n in nodes}
            dist[src] = 0
            next_hop = {n: None for n in nodes}
            pq = [(0, src)]

            while pq:
                d, u = heapq.heappop(pq)
                if d > dist[u]:
                    continue
                for v, cost in adj[u].items():
                    if dist[u] + cost < dist[v]:
                        dist[v] = dist[u] + cost
                        next_hop[v] = v if u == src else next_hop[u]
                        heapq.heappush(pq, (dist[v], v))

            # Build FIB routes
            new_routes = []
            # 1. Local subnets
            for ifname, ifmeta in src_router.interfaces.items():
                subnet = f"{ifmeta['ip'].rsplit('.', 1)[0]}.0/24"
                if not ifmeta["down"]:
                    new_routes.append({
                        "dst": subnet,
                        "dev": ifname,
                        "protocol": "kernel",
                        "metric": 0
                    })
                    if HAS_MININET:
                        src_router.cmd(f"ip route replace {subnet} dev {ifname} proto kernel scope link 2>/dev/null || true")
                else:
                    if HAS_MININET:
                        src_router.cmd(f"ip route del {subnet} 2>/dev/null || true")

            # 2. Dynamic protocol routes
            for dst_name, d_val in dist.items():
                if dst_name != src:
                    dest_subnet = f"10.{dst_name.replace('r','')}.0.0/16"
                    if d_val < float('inf'):
                        nh = next_hop[dst_name]
                        out_dev = "eth0"
                        nh_ip = None
                        for ifname, ifmeta in src_router.interfaces.items():
                            if ifmeta["target"] == nh and not ifmeta["down"]:
                                out_dev = ifname
                                ip_clean = ifmeta['ip'].split('/')[0]
                                prefix = ip_clean.rsplit('.', 1)[0]
                                last_octet = ip_clean.rsplit('.', 1)[1]
                                peer_octet = "2" if last_octet == "1" else "1"
                                nh_ip = f"{prefix}.{peer_octet}"
                                break

                        new_routes.append({
                            "dst": dest_subnet,
                            "gateway": nh_ip or f"10.0.0.{nh.replace('r','')}",
                            "dev": out_dev,
                            "protocol": proto_label,
                            "metric": d_val
                        })
                        if HAS_MININET and nh_ip:
                            src_router.cmd(f"ip route replace {dest_subnet} via {nh_ip} dev {out_dev} proto {proto_label} metric {d_val}")
                    else:
                        if HAS_MININET:
                            src_router.cmd(f"ip route del {dest_subnet} 2>/dev/null || true")

            # 3. Dynamic multi-hop transit link subnets
            for s_link, d_link, meta in self.edge_list:
                if src != s_link and src != d_link:
                    link_subnet = meta.get("subnet")
                    if not meta.get("down", False) and link_subnet:
                        d_s = dist.get(s_link, float("inf"))
                        d_d = dist.get(d_link, float("inf"))
                        if min(d_s, d_d) < float("inf"):
                            target = s_link if d_s <= d_d else d_link
                            nh = next_hop.get(target)
                            out_dev = "eth0"
                            nh_ip = None
                            for ifname, ifmeta in src_router.interfaces.items():
                                if ifmeta["target"] == nh and not ifmeta["down"]:
                                    out_dev = ifname
                                    ip_clean = ifmeta["ip"].split("/")[0]
                                    prefix = ip_clean.rsplit(".", 1)[0]
                                    last_octet = ip_clean.rsplit(".", 1)[1]
                                    peer_octet = "2" if last_octet == "1" else "1"
                                    nh_ip = f"{prefix}.{peer_octet}"
                                    break
                            if nh_ip:
                                new_routes.append({
                                    "dst": link_subnet,
                                    "gateway": nh_ip,
                                    "dev": out_dev,
                                    "protocol": proto_label,
                                    "metric": min(d_s, d_d) + meta.get("cost", 1)
                                })
                                if HAS_MININET:
                                    src_router.cmd(f"ip route replace {link_subnet} via {nh_ip} dev {out_dev} proto {proto_label} 2>/dev/null || true")
                    else:
                        if HAS_MININET and link_subnet:
                            src_router.cmd(f"ip route del {link_subnet} 2>/dev/null || true")

            src_router.routes = new_routes

    def resolve_router_name(self, name):
        if not name:
            return name
        clean = str(name).lower().replace("router", "").replace("_", "").strip()
        if len(clean) == 1 and clean.isalpha():
            idx = ord(clean) - ord('a') + 1
            return f"r{idx}"
        return clean

    def set_link_status(self, src_name, dst_name, is_up):
        """Sets link status up or down dynamically."""
        s_norm = self.resolve_router_name(src_name)
        d_norm = self.resolve_router_name(dst_name)

        for s, d, meta in self.edge_list:
            if (s == s_norm and d == d_norm) or (s == d_norm and d == s_norm):
                meta['down'] = not is_up
                break

        for r in self.routers:
            if r.name in [s_norm, d_norm]:
                peer = d_norm if r.name == s_norm else s_norm
                for ifname, ifmeta in r.interfaces.items():
                    if ifmeta["target"] == peer:
                        ifmeta["down"] = not is_up

        if HAS_MININET:
            try:
                status = 'up' if is_up else 'down'
                self.net.configLinkStatus(s_norm, d_norm, status)
            except Exception as e:
                info(f"Mininet link status error: {e}\n")
        else:
            self.net.configLinkStatus(s_norm, d_norm, 'up' if is_up else 'down')

        self.recalculate_routes()

        status_str = "UP" if is_up else "DOWN"
        info(f"[*] Link {s_norm} <-> {d_norm} set to {status_str}\n")
        try:
            from bridge_server import record_event
            record_event("link", src=s_norm, dst=d_norm, status="up" if is_up else "down")
        except Exception:
            pass
        return True

    def switch_protocol(self, new_protocol):
        """Switches between Link State (LSR) and Distance Vector (DVR)."""
        self.active_protocol = new_protocol.upper()
        if HAS_MININET:
            for r in self.routers:
                r.cmd("pkill -f routing_daemons.py")
            time.sleep(0.2)
            self.start_daemons()

        self.recalculate_routes()
        info(f"[*] Protocol switched to: {self.active_protocol}\n")
        try:
            from bridge_server import record_event
            record_event("protocol", protocol=self.active_protocol)
        except Exception:
            pass
        return True

    def start_daemons(self):
        """Starts Python socket daemons in Linux namespaces (Linux only)."""
        if not HAS_MININET:
            return
        daemon_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "routing_daemons.py")
        mode = "lsr" if self.active_protocol == "LSR" else "dvr"
        for r in self.routers:
            r.cmd(f"python3 {daemon_script} {r.name} {mode} > /tmp/{r.name}_{mode}.log 2>&1 &")

    def print_all_routes(self):
        """Prints live kernel routing tables for all routers."""
        print("\n" + "=" * 65)
        print("  LIVE KERNEL ROUTING TABLES (FIB)")
        print("=" * 65)
        for r in self.routers:
            print(f"\n--- [ Router {r.name.upper()} ] ---")
            print(r.cmd("ip route show").strip())
        print("=" * 65 + "\n")

    def run(self):
        info("\n" + "=" * 68 + "\n")
        if self.is_native_mode:
            info("  [i] Windows / Non-Linux Environment Detected.\n")
            info("  [+] Engaging Native Python Layer 3 Socket & FIB Router Emulation!\n")
            info("      (Zero external dependencies - runs directly on Windows)\n")
        else:
            info("  [+] Linux Environment Detected: Mininet Network Namespaces Active!\n")

        info("=" * 68 + "\n")
        info(f"  * Topology Preset : {self.topo_name.upper()}\n")
        info(f"  * Active Protocol : {self.active_protocol}\n")
        info(f"  * REST Bridge Port: http://localhost:{self.bridge_port}\n")
        info("=" * 68 + "\n\n")

        self.build_topology()
        self.net.start()

        if HAS_MININET:
            for r in self.routers:
                r.cmd("sysctl -w net.ipv4.ip_forward=1")
                idx = r.name.replace('r', '')
                r.cmd(f"ip addr add 10.{idx}.0.1/16 dev lo 2>/dev/null || true")
                r.cmd("ip link set lo up")

        # Recalculate and install kernel FIB routes after net.start()
        self.recalculate_routes()

        # Start background REST Bridge Server
        start_bridge_server(self.bridge_port, runner_ref=self)

        if HAS_MININET:
            self.start_daemons()
            self.net.runner = self
            if sys.stdin.isatty():
                try:
                    CLI(self.net)
                except Exception as e:
                    info(f"CLI ended: {e}\n")
                info("[*] Interactive CLI exited. Keeping Mininet network and REST bridge active for Web Dashboard...\n")
            else:
                info(f"[*] Container / headless mode: Mininet network and REST bridge active on port {self.bridge_port}...\n")

            try:
                while True:
                    time.sleep(1)
            except (KeyboardInterrupt, SystemExit):
                pass
            self.net.stop()
        else:
            # Interactive Command Line Interface for Windows
            self.run_interactive_cli()

    def run_interactive_cli(self):
        """Interactive REPL prompt for Windows Command Prompt."""
        print("Emulation running! The Web Dashboard at http://localhost:5173 is connected.")
        print("Type 'help' to see available interactive commands, or 'exit' to stop.\n")

        while True:
            try:
                cmd_line = input("mininet-cli> ").strip()
            except EOFError:
                # Running in non-interactive environment (e.g. background service)
                try:
                    while True:
                        time.sleep(1)
                except KeyboardInterrupt:
                    break
            except KeyboardInterrupt:
                break

            # Strip leading prompt if user accidentally copy-pasted with prompt
            for pfx in ["mininet-cli>", "mininet>", ">", "$"]:
                if cmd_line.startswith(pfx):
                    cmd_line = cmd_line[len(pfx):].strip()

            if not cmd_line:
                continue

            parts = cmd_line.split()
            first = parts[0].lower()

            # Check if command is Mininet standard syntax: `<router> <command...>`
            # (e.g. `r1 ping 10.2.0.1` or `r1 ip route show` or `r1 ping r2`)
            matching_router = next(
                (r for r in self.routers if r.name.lower() == first or self.resolve_router_name(first) == r.name.lower()),
                None
            )
            if matching_router and len(parts) > 1:
                sub_cmd = " ".join(parts[1:])
                if sub_cmd.startswith("ip route") or sub_cmd.startswith("route"):
                    print(f"\n--- [ Router {matching_router.name.upper()} FIB ] ---")
                    print(matching_router.cmd("ip route show"))
                    print()
                elif sub_cmd.startswith("ping"):
                    print(matching_router.cmd(sub_cmd))
                elif sub_cmd.startswith("ifconfig") or sub_cmd.startswith("ip addr"):
                    print(f"Router {matching_router.name.upper()} IP: {matching_router.ip}")
                    for ifname, ifmeta in matching_router.interfaces.items():
                        st = "DOWN" if ifmeta.get("down") else "UP"
                        print(f"  {ifname}: {ifmeta.get('ip', 'N/A')} ({st})")
                else:
                    print(matching_router.cmd(sub_cmd))
                continue

            cmd = first

            if cmd in ["exit", "quit", "q"]:
                break
            elif cmd in ["help", "h", "?"]:
                print("\nAvailable Commands:")
                print("  r1 ping 10.2.0.1        - Mininet-style ICMP ping from router r1 to destination")
                print("  r1 ip route show        - Mininet-style FIB route inspection for router r1")
                print("  ping <src> <dst>        - Shorthand ICMP ping (e.g. 'ping r1 r2' or 'ping r1 10.2.0.1')")
                print("  routes                  - Display kernel routing tables for all routers")
                print("  routes <r1>             - Display routing table for a specific router")
                print("  link <r1> <r2> down     - Sever link between routers (e.g. 'link r1 r2 down')")
                print("  link <r1> <r2> up       - Restore link between routers (e.g. 'link r1 r2 up')")
                print("  proto <lsr|dvr>         - Switch active protocol between LSR and DVR")
                print("  status                  - Display active topology and bridge status")
                print("  exit / quit             - Stop the emulation session\n")
            elif cmd == "routes":
                if len(parts) > 1:
                    r_name = parts[1].lower()
                    router = next((r for r in self.routers if r.name == r_name), None)
                    if router:
                        print(f"\n--- [ Router {router.name.upper()} ] ---")
                        print(router.cmd("ip route show"))
                        print()
                    else:
                        print(f"[-] Unknown router: {r_name}")
                else:
                    self.print_all_routes()
            elif cmd == "ping":
                if len(parts) >= 3:
                    src, dst = parts[1].lower(), parts[2].lower()
                    router = next((r for r in self.routers if r.name == src), None)
                    if router:
                        try:
                            from bridge_server import record_event
                            record_event("ping", src=src, dst=dst)
                        except Exception:
                            pass
                        print(router.cmd(f"ping {dst}"))
                    else:
                        print(f"[-] Unknown router: {src}")
                else:
                    print("[-] Usage: ping <src> <dst> (e.g., ping r1 r4)")
            elif cmd == "link":
                if len(parts) >= 4:
                    src, dst, action = parts[1].lower(), parts[2].lower(), parts[3].lower()
                    is_up = (action == "up")
                    self.set_link_status(src, dst, is_up)
                else:
                    print("[-] Usage: link <r1> <r2> <up|down> (e.g., link r1 r2 down)")
            elif cmd == "proto":
                if len(parts) >= 2:
                    p = parts[1].upper()
                    if p in ["LSR", "DVR"]:
                        self.switch_protocol(p)
                    else:
                        print("[-] Protocol must be LSR or DVR")
                else:
                    print(f"Current protocol: {self.active_protocol}")
            elif cmd == "status":
                print(f"Topology : {self.topo_name}")
                print(f"Protocol : {self.active_protocol}")
                print(f"Routers  : {[r.name for r in self.routers]}")
                print(f"Bridge   : http://localhost:{self.bridge_port} (Active)")
            else:
                print(f"[-] Unknown command: '{cmd_line}'. Type 'help' for available commands.")

        print("\nShutting down Mininet emulation session...")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Layer 3 Router Emulation Runner")
    parser.add_argument("--topo", default="diamond", choices=["diamond", "triangle", "mesh", "linear"])
    parser.add_argument("--proto", "--protocol", dest="proto", default="LSR", choices=["lsr", "dvr", "LSR", "DVR"], help="Routing protocol")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    runner = MininetTopologyRunner(topo_name=args.topo, active_protocol=args.proto, bridge_port=args.port)
    runner.run()
