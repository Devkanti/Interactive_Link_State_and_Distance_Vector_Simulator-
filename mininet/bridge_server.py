#!/usr/bin/env python3
"""
bridge_server.py
================
HTTP REST Bridge Server connecting Mininet's real Linux kernel network emulation
with the Interactive Web Dashboard running in the browser.

Features:
- Zero external dependencies: Uses Python standard library (http.server, json, urllib).
- Full CORS support for browser communication (http://localhost:5173).
- REST Endpoints for live Mininet query and control:
    - GET  /api/status     -> Mininet operational state & topology
    - GET  /api/routes     -> Real Linux kernel routing tables (`ip -j route`)
    - POST /api/link       -> Cut or restore virtual link (`configLinkStatus`)
    - POST /api/protocol   -> Switch live routing daemons (LSR vs DVR)
    - POST /api/ping       -> Execute real ICMP ping across namespaces
    - POST /api/export     -> Export custom Mininet topology script
"""

import os
import sys
import json
import time
import subprocess
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Global state reference to Mininet instance (set by topology_runner.py)
MININET_RUNNER = None

# Event tracking for live terminal/API triggers streaming to Web Dashboard
RECENT_EVENTS = []
EVENT_LOCK = threading.Lock()

# Synchronized Active Dashboard Topology state (auto-detected from live browser canvas)
ACTIVE_TOPOLOGY = {
    "preset": "Diamond Multi-Path",
    "nodes": [
        {"id": "A", "label": "Router A", "status": "ACTIVE"},
        {"id": "B", "label": "Router B", "status": "ACTIVE"},
        {"id": "C", "label": "Router C", "status": "ACTIVE"},
        {"id": "D", "label": "Router D", "status": "ACTIVE"},
    ],
    "edges": [
        {"id": "A<->B", "source": "A", "target": "B", "cost": 1, "status": "UP"},
        {"id": "A<->C", "source": "A", "target": "C", "cost": 4, "status": "UP"},
        {"id": "B<->D", "source": "B", "target": "D", "cost": 5, "status": "UP"},
        {"id": "C<->D", "source": "C", "target": "D", "cost": 1, "status": "UP"},
    ],
    "lastUpdated": time.time()
}
TOPOLOGY_LOCK = threading.Lock()

def record_event(event_type, **kwargs):
    global RECENT_EVENTS
    with EVENT_LOCK:
        event = {
            "id": f"evt-{int(time.time()*1000)}-{len(RECENT_EVENTS)}",
            "type": event_type,
            "timestamp": time.time(),
            **kwargs
        }
        RECENT_EVENTS.append(event)
        if len(RECENT_EVENTS) > 50:
            RECENT_EVENTS = RECENT_EVENTS[-50:]
        return event

class MininetBridgeHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        # Enable CORS for browser access
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        """Handles CORS preflight requests."""
        self._set_headers(200)

    def do_GET(self):
        url = urlparse(self.path)
        path = url.path

        if path == "/api/status":
            self.handle_get_status()
        elif path == "/api/routes":
            self.handle_get_routes()
        elif path == "/api/topology":
            self.handle_get_topology()
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def do_POST(self):
        url = urlparse(self.path)
        path = url.path
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if path == "/api/link":
            self.handle_post_link(payload)
        elif path == "/api/chaos":
            self.handle_post_chaos(payload)
        elif path == "/api/protocol":
            self.handle_post_protocol(payload)
        elif path == "/api/ping":
            self.handle_post_ping(payload)
        elif path == "/api/export":
            self.handle_post_export(payload)
        elif path == "/api/topology":
            self.handle_post_topology(payload)
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def handle_get_topology(self):
        """Returns the synchronized live dashboard topology."""
        global ACTIVE_TOPOLOGY
        with TOPOLOGY_LOCK:
            data = dict(ACTIVE_TOPOLOGY)
        self._set_headers(200)
        self.wfile.write(json.dumps(data, indent=2).encode("utf-8"))

    def handle_post_topology(self, payload):
        """Receives live graph topology updates directly from browser canvas."""
        global ACTIVE_TOPOLOGY
        with TOPOLOGY_LOCK:
            if "preset" in payload and payload["preset"]:
                ACTIVE_TOPOLOGY["preset"] = payload["preset"]
            if "nodes" in payload and isinstance(payload["nodes"], list):
                ACTIVE_TOPOLOGY["nodes"] = payload["nodes"]
            if "edges" in payload and isinstance(payload["edges"], list):
                ACTIVE_TOPOLOGY["edges"] = payload["edges"]
            ACTIVE_TOPOLOGY["lastUpdated"] = time.time()
        self._set_headers(200)
        self.wfile.write(json.dumps({
            "success": True,
            "preset": ACTIVE_TOPOLOGY["preset"],
            "nodeCount": len(ACTIVE_TOPOLOGY["nodes"]),
            "edgeCount": len(ACTIVE_TOPOLOGY["edges"])
        }).encode("utf-8"))

    def handle_get_status(self):
        """Returns Mininet emulation status, node count, and link topology."""
        global MININET_RUNNER
        if MININET_RUNNER and MININET_RUNNER.net:
            data = {
                "status": "online",
                "engine": "Mininet (Linux Kernel Emulation)",
                "mode": MININET_RUNNER.active_protocol,
                "nodes": [
                    {
                        "id": node.name,
                        "label": f"Router {node.name.upper()}",
                        "status": "ACTIVE"
                    }
                    for node in MININET_RUNNER.routers
                ],
                "links": [
                    {
                        "id": f"{e[0]}-{e[1]}",
                        "source": e[0],
                        "target": e[1],
                        "cost": e[2].get("cost", 1),
                        "status": "DOWN" if e[2].get("down", False) else "UP"
                    }
                    for e in MININET_RUNNER.edge_list
                ],
                "recentEvents": list(RECENT_EVENTS[-15:]),
                "uptime": time.time() - MININET_RUNNER.start_time
            }
        else:
            data = {
                "status": "standby",
                "engine": "Mininet Bridge Server Standalone",
                "mode": "LSR",
                "recentEvents": list(RECENT_EVENTS[-15:]),
                "message": "Start topology_runner.py to attach active Mininet session."
            }
        self._set_headers(200)
        self.wfile.write(json.dumps(data, indent=2).encode("utf-8"))

    def handle_get_routes(self):
        """Retrieves actual routing tables from all Mininet router namespaces."""
        global MININET_RUNNER
        tables = {}
        if MININET_RUNNER and MININET_RUNNER.net:
            active_proto = getattr(MININET_RUNNER, "active_protocol", "LSR").lower()
            for idx, r in enumerate(MININET_RUNNER.routers):
                routes_list = []
                try:
                    # Execute `ip -j route show` directly inside router's Linux namespace
                    raw_routes = r.cmd("ip -j route show")
                    parsed = json.loads(raw_routes)
                    for rt in parsed:
                        dst = rt.get("dst", "default")
                        dev = rt.get("dev", "veth")
                        gateway = rt.get("gateway", None)
                        metric = rt.get("metric", 1)
                        protocol = rt.get("protocol", active_proto if gateway else "kernel")
                        routes_list.append({
                            "dst": dst,
                            "destination": dst,
                            "gateway": gateway,
                            "nextHop": gateway,
                            "dev": dev,
                            "interface": dev,
                            "metric": metric,
                            "cost": metric,
                            "protocol": protocol,
                            "scope": rt.get("scope", "global" if gateway else "link")
                        })
                except Exception:
                    # Fallback text parsing
                    raw_text = r.cmd("ip route show")
                    for line in raw_text.splitlines():
                        parts = line.strip().split()
                        if len(parts) >= 3:
                            dst = parts[0]
                            gw = parts[2] if "via" in parts else None
                            dev = parts[parts.index("dev") + 1] if "dev" in parts else "eth0"
                            routes_list.append({
                                "dst": dst,
                                "destination": dst,
                                "gateway": gw,
                                "nextHop": gw,
                                "dev": dev,
                                "interface": dev,
                                "metric": 1,
                                "cost": 1,
                                "protocol": active_proto if gw else "kernel",
                                "scope": "global" if gw else "link"
                            })
                if not routes_list and hasattr(r, 'routes') and r.routes:
                    for rt in r.routes:
                        dst = rt.get("dst", "default")
                        routes_list.append({
                            "dst": dst,
                            "destination": dst,
                            "gateway": rt.get("gateway"),
                            "nextHop": rt.get("gateway"),
                            "dev": rt.get("dev", "eth0"),
                            "interface": rt.get("dev", "eth0"),
                            "metric": rt.get("metric", 1),
                            "cost": rt.get("metric", 1),
                            "protocol": rt.get("protocol", active_proto),
                            "scope": "global" if rt.get("gateway") else "link"
                        })
                tables[r.name] = routes_list
                # Provide standard router letter aliases (A, B, C, D)
                letter = chr(ord('A') + idx)
                tables[letter] = routes_list
                tables[letter.lower()] = routes_list
                tables[f"Router {letter}"] = routes_list

        response_payload = {
            "routes": tables,
            **tables
        }
        self._set_headers(200)
        self.wfile.write(json.dumps(response_payload, indent=2).encode("utf-8"))

    def handle_post_link(self, payload):
        """Dynamically cuts or restores a link in the active Mininet network."""
        global MININET_RUNNER
        src = payload.get("source") or payload.get("src")
        dst = payload.get("target") or payload.get("dst") or payload.get("destination")
        status = payload.get("status", "down").lower()

        if not MININET_RUNNER or not MININET_RUNNER.net:
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": "Mininet is not actively running"}).encode("utf-8"))
            return

        success = MININET_RUNNER.set_link_status(src, dst, status == "up")
        if success:
            record_event("link", src=src, dst=dst, status=status)
        self._set_headers(200 if success else 400)
        self.wfile.write(json.dumps({
            "success": success,
            "source": src,
            "target": dst,
            "status": status.upper()
        }).encode("utf-8"))

    def handle_post_protocol(self, payload):
        """Switches routing daemons across all Mininet router namespaces."""
        global MININET_RUNNER
        protocol = payload.get("protocol", "LSR").upper()
        if not MININET_RUNNER or not MININET_RUNNER.net:
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": "Mininet is not actively running"}).encode("utf-8"))
            return

        success = MININET_RUNNER.switch_protocol(protocol)
        if success:
            record_event("protocol", protocol=protocol)
        self._set_headers(200)
        self.wfile.write(json.dumps({
            "success": success,
            "activeProtocol": protocol
        }).encode("utf-8"))

    def handle_post_ping(self, payload):
        """Executes ICMP ping diagnostic between emulated router nodes."""
        global MININET_RUNNER, ACTIVE_TOPOLOGY
        try:
            active_nodes = [n["id"] for n in ACTIVE_TOPOLOGY.get("nodes", [])]
            src_raw = payload.get("source") or payload.get("src") or (active_nodes[0] if active_nodes else "r1")
            dst_raw = payload.get("destination") or payload.get("dst") or payload.get("destinationIp") or (active_nodes[-1] if len(active_nodes) > 1 else "r2")
            count = int(payload.get("count", 2))

            if not MININET_RUNNER or not MININET_RUNNER.net:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Emulation engine is not actively running"}).encode("utf-8"))
                return

            src_node = None
            clean_src = str(src_raw).lower().replace("router", "").replace("_", "").strip()
            for r in MININET_RUNNER.routers:
                if r.name.lower() in [clean_src, str(src_raw).lower()]:
                    src_node = r
                    break
            if not src_node and hasattr(MININET_RUNNER.net, "get"):
                try:
                    src_node = MININET_RUNNER.net.get(clean_src)
                except Exception:
                    src_node = None
            if not src_node and len(MININET_RUNNER.routers) > 0:
                src_node = MININET_RUNNER.routers[0]

            if not src_node:
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "success": False,
                    "src": str(src_raw),
                    "dst": str(dst_raw),
                    "output": f"Node '{src_raw}' not found in emulation topology."
                }).encode("utf-8"))
                return

            # Resolve source router identity IP
            src_num = "".join(filter(str.isdigit, src_node.name))
            src_ip = f"10.{src_num}.0.1" if src_num else None

            # Resolve destination IP or target
            dst_str = str(dst_raw).strip()
            dst_parts = dst_str.split(".")
            if len(dst_parts) == 4 and all(p.isdigit() for p in dst_parts):
                dst_ip = dst_str
            else:
                clean_dst = dst_str.lower().replace("router", "").replace("_", "").strip()
                if clean_dst.startswith("r") and clean_dst[1:].isdigit():
                    dst_ip = f"10.{clean_dst[1:]}.0.1"
                elif len(clean_dst) == 1 and clean_dst.isalpha():
                    idx = ord(clean_dst) - ord('a') + 1
                    dst_ip = f"10.{idx}.0.1"
                else:
                    dst_ip = dst_str

            if src_ip and not getattr(MININET_RUNNER, "is_native_mode", False):
                ping_cmd = f"ping -c {count} -W 1 -I {src_ip} {dst_ip}"
            else:
                ping_cmd = f"ping -c {count} -W 1 {dst_ip}"

            ping_output = src_node.cmd(ping_cmd)

            success = "bytes from" in ping_output and "100% packet loss" not in ping_output and "Unreachable" not in ping_output

            # Record ping event so connected Web Dashboard plays live packet animation
            record_event("ping", src=src_node.name, dst=dst_str, success=success)

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "success": success,
                "src": src_node.name.upper(),
                "dst": dst_ip,
                "output": ping_output,
                "rawOutput": ping_output
            }).encode("utf-8"))
        except Exception as e:
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "success": False,
                "src": str(payload.get("src", "r1")),
                "dst": str(payload.get("dst", "r2")),
                "output": f"Diagnostic error: {str(e)}"
            }).encode("utf-8"))

    def handle_post_chaos(self, payload):
        """Triggers Chaos Monkey faults (sever, crash, jitter, flap) in the network."""
        global MININET_RUNNER, ACTIVE_TOPOLOGY
        action = payload.get("action", "sever").lower()
        target = payload.get("target") or payload.get("node") or payload.get("edge")

        active_nodes = [n["id"] for n in ACTIVE_TOPOLOGY.get("nodes", [])]
        active_edges = ACTIVE_TOPOLOGY.get("edges", [])

        if action == "sever":
            src = payload.get("src") or payload.get("source") or (target.split("-")[0] if target and "-" in target else None)
            dst = payload.get("dst") or payload.get("target") or (target.split("-")[1] if target and "-" in target else None)
            if not src or not dst:
                up_edges = [e for e in active_edges if e.get("status") != "DOWN"]
                chosen = up_edges[0] if up_edges else (active_edges[0] if active_edges else None)
                if chosen:
                    src, dst = chosen["source"], chosen["target"]
                else:
                    src, dst = "r1", "r2"
            if MININET_RUNNER and MININET_RUNNER.net:
                MININET_RUNNER.set_link_status(src, dst, False)
            record_event("chaos", action="sever", src=src, dst=dst, status="down")
            record_event("link", src=src, dst=dst, status="down")
            self._set_headers(200)
            self.wfile.write(json.dumps({"success": True, "action": "sever", "src": src, "dst": dst}).encode("utf-8"))
        elif action == "crash":
            node = payload.get("node") or target
            if not node:
                online_nodes = [n["id"] for n in ACTIVE_TOPOLOGY.get("nodes", []) if n.get("status") != "CRASHED"]
                node = online_nodes[min(1, len(online_nodes)-1)] if online_nodes else (active_nodes[0] if active_nodes else "r2")
            record_event("chaos", action="crash", node=node, status="CRASHED")
            record_event("crash", node=node, status="CRASHED")
            self._set_headers(200)
            self.wfile.write(json.dumps({"success": True, "action": "crash", "node": node}).encode("utf-8"))
        elif action == "recover":
            node = payload.get("node") or target
            if not node:
                crashed_nodes = [n["id"] for n in ACTIVE_TOPOLOGY.get("nodes", []) if n.get("status") == "CRASHED"]
                node = crashed_nodes[0] if crashed_nodes else (active_nodes[0] if active_nodes else "r2")
            record_event("chaos", action="recover", node=node, status="ACTIVE")
            record_event("crash", node=node, status="ACTIVE")
            self._set_headers(200)
            self.wfile.write(json.dumps({"success": True, "action": "recover", "node": node}).encode("utf-8"))
        elif action == "jitter":
            src = payload.get("src") or payload.get("source") or (target.split("-")[0] if target and "-" in target else None)
            dst = payload.get("dst") or payload.get("target") or (target.split("-")[1] if target and "-" in target else None)
            if not src or not dst:
                chosen = active_edges[0] if active_edges else None
                if chosen:
                    src, dst = chosen["source"], chosen["target"]
                else:
                    src, dst = "r1", "r3"
            cost = int(payload.get("cost", 9))
            record_event("chaos", action="jitter", src=src, dst=dst, cost=cost)
            self._set_headers(200)
            self.wfile.write(json.dumps({"success": True, "action": "jitter", "src": src, "dst": dst, "cost": cost}).encode("utf-8"))
        elif action == "flap":
            src = payload.get("src") or payload.get("source") or (target.split("-")[0] if target and "-" in target else None)
            dst = payload.get("dst") or payload.get("target") or (target.split("-")[1] if target and "-" in target else None)
            if not src or not dst:
                chosen = active_edges[-1] if active_edges else None
                if chosen:
                    src, dst = chosen["source"], chosen["target"]
                else:
                    src, dst = "r3", "r4"
            interval = int(payload.get("interval", 2))
            record_event("chaos", action="flap", src=src, dst=dst, interval=interval)
            self._set_headers(200)
            self.wfile.write(json.dumps({"success": True, "action": "flap", "src": src, "dst": dst, "interval": interval}).encode("utf-8"))
        else:
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": f"Unknown chaos action: {action}"}).encode("utf-8"))

    def handle_post_export(self, payload):
        """Generates a standalone custom Mininet Python script from canvas JSON."""
        from export_generator import generate_mininet_script
        nodes = payload.get("nodes", [])
        edges = payload.get("edges", [])
        script = generate_mininet_script(nodes, edges)
        self._set_headers(200, content_type="text/x-python")
        self.wfile.write(script.encode("utf-8"))

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[MininetBridge] {args[0]} {args[1]} -> {args[2]}\n")


def start_bridge_server(port=8080, runner_ref=None):
    """Starts the Mininet HTTP Bridge server on the specified port."""
    global MININET_RUNNER
    if runner_ref:
        MININET_RUNNER = runner_ref

    server = HTTPServer(("0.0.0.0", port), MininetBridgeHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    print(f"[*] Mininet Bridge Server listening on http://0.0.0.0:{port}")
    return server

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print(f"Starting standalone Mininet Bridge Server on port {port}...")
    server = HTTPServer(("0.0.0.0", port), MininetBridgeHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping bridge server.")
        server.server_close()
