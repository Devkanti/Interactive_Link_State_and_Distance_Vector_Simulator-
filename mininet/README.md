# Mininet Layer 3 Routing Emulation & Web Visualization Dashboard
 
> **Enterprise Network Emulation & Protocol Validation Guide**  
> **Architecture:** Distributed L3 Kernel Routing with Interactive Telemetry Control Plane  
> **Protocols:** Linux Kernel Forwarding Information Base (FIB), Link State (OSPF/Dijkstra) & Distance Vector (RIP/Bellman-Ford)

---

## 1. Architecture Overview

This project is **not** a purely synthetic web animation. It is a **dual-layer network routing system**:

1. **Core Emulation Engine (Linux / Mininet):**  
   Runs inside **Mininet network namespaces (`netns`)** using virtual ethernet (`veth`) pairs. Each router is an isolated Linux namespace with real IP forwarding enabled (`net.ipv4.ip_forward=1`). Real Python routing daemons (`mininet/routing_daemons.py`) bind to UDP sockets, transmit periodic routing protocol packets, compute shortest paths (Dijkstra or Bellman-Ford), and dynamically update the **Linux kernel Forwarding Information Base (FIB)** using `ip route replace`.
   
2. **Telemetry & Visual Control Plane (Dashboard):**  
   A modern web dashboard that connects to the live Mininet process via a lightweight REST bridge (`mininet/bridge_server.py`). The dashboard allows real-time packet tracing, visual topology manipulation, one-click link failure injection, and side-by-side protocol comparison, reflecting the true kernel routing states of the Mininet nodes.

```
+-------------------------------------------------------------------------------+
|                    Interactive Web Dashboard (Visual UI)                      |
|          Topology Canvas | Protocol Metrics | Live Route Inspector            |
+-------------------------------------------------------------------------------+
                                      ▲
                                      │ HTTP REST API (JSON)
                                      ▼
+-------------------------------------------------------------------------------+
|                      Mininet REST Bridge Server (:8080)                       |
|           /api/status | /api/routes | /api/link | /api/ping                   |
+-------------------------------------------------------------------------------+
                                      ▲
                                      │ Python API / Namespace IPC
                                      ▼
+-------------------------------------------------------------------------------+
|                   Mininet Real Linux Emulation Environment                    |
|                                                                               |
|   +---------------------+                   +---------------------+           |
|   |   Router R1 (netns) |   veth (10.0.1.0) |   Router R2 (netns) |           |
|   |  - Linux FIB        |<=================>|  - Linux FIB        |           |
|   |  - LSR/DVR Daemon   |                   |  - LSR/DVR Daemon   |           |
|   +---------------------+                   +---------------------+           |
|              ▲                                         ▲                      |
|              ║ veth (10.0.2.0)                         ║ veth (10.0.3.0)      |
|              ▼                                         ▼                      |
|   +---------------------+                   +---------------------+           |
|   |   Router R4 (netns) |   veth (10.0.4.0) |   Router R3 (netns) |           |
|   |  - Linux FIB        |<=================>|  - Linux FIB        |           |
|   |  - LSR/DVR Daemon   |                   |  - LSR/DVR Daemon   |           |
|   +---------------------+                   +---------------------+           |
+-------------------------------------------------------------------------------+
```

---

## 2. Mininet File Structure

All Mininet backend files are located in the `mininet/` directory:

| File | Purpose |
| :--- | :--- |
| `setup.sh` | Automated Bash installation script for Ubuntu/WSL2 (installs Mininet, Open vSwitch, iproute2, and sets permissions). |
| `topology_runner.py` | Master Mininet topology orchestrator. Supports CLI presets (`diamond`, `triangle`, `mesh`, `linear`) and spawns the background bridge server. |
| `routing_daemons.py` | Standalone Python socket routing daemons (`LinkStateRouterDaemon` on UDP 5000 and `DistanceVectorRouterDaemon` on UDP 5001) that manipulate kernel routes via `ip route`. |
| `bridge_server.py` | Zero-dependency HTTP REST bridge with full CORS support. Exposes kernel routing tables, link control, and ICMP ping tests to the web UI. |
| `export_generator.py` | Python module that converts arbitrary web canvas topologies into executable, standalone Mininet `.py` scripts. |

---

## 3. Quick Start (Linux / Ubuntu / WSL2)

### Step 1: Install Dependencies
Run the automated setup script on your Ubuntu / WSL2 terminal with root privileges:
```bash
cd mininet
chmod +x setup.sh
sudo ./setup.sh
```

### Step 2: Launch the Mininet Emulation
Start the Diamond topology with the REST bridge server enabled:
```bash
sudo python3 topology_runner.py --topo diamond --bridge-port 8080
```
This will:
- Spin up 4 Linux routers (`r1`, `r2`, `r3`, `r4`).
- Create point-to-point subnets (`10.0.1.0/24`, `10.0.2.0/24`, `10.0.3.0/24`, `10.0.4.0/24`).
- Launch routing daemons inside each router's network namespace.
- Start the REST Bridge on `http://0.0.0.0:8080`.
- Open an interactive `mininet>` prompt.

---

## 4. Operational Verification & Network Diagnostics

### Verification 1: Linux Kernel Routing Table Inspection (FIB)
In the `mininet>` terminal, inspect the active Linux kernel routing table of router `r1`:
```bash
mininet> r1 ip route show
```
**Expected Output:**
```
10.0.1.0/24 dev r1-eth0 proto kernel scope link src 10.0.1.1
10.0.2.0/24 dev r1-eth1 proto kernel scope link src 10.0.2.1
10.3.0.0/16 via 10.0.1.2 dev r1-eth0 proto lsr metric 10
```
*(The `proto lsr` tag verifies that our Link State routing daemon dynamically programmed the route directly into the Linux kernel FIB.)*

### Verification 2: ICMP End-to-End Diagnostics
Execute an end-to-end ICMP ping across multiple hops (from router `r1` to `r3`):
```bash
mininet> r1 ping -c 3 10.3.0.1
```
**Expected Output:**
```
PING 10.3.0.1 (10.3.0.1) 56(84) bytes of data.
64 bytes from 10.3.0.1: icmp_seq=1 ttl=63 time=0.082 ms
64 bytes from 10.3.0.1: icmp_seq=2 ttl=63 time=0.045 ms
64 bytes from 10.3.0.1: icmp_seq=3 ttl=63 time=0.047 ms
```
The packets traverse intermediate Linux namespaces, decrementing TTL (`ttl=63`).

### Verification 3: Dynamic Link Failure & Convergence Validation
Sever the primary link between `r1` and `r2` live:
```bash
mininet> link r1 r2 down
```
Observe the router daemons detecting the link failure:
1. Daemons detect missing heartbeats or interface down events.
2. Link State Advertisements (LSAs) are flooded across alternate interfaces.
3. Dijkstra's algorithm recalculates shortest paths.
4. Kernel routes automatically update to route through `r4`:
```bash
mininet> r1 ip route show
```
The route to `10.3.0.0/16` now points `via 10.0.2.2 dev r1-eth1` (failover complete!).
```bash
mininet> r1 ping -c 2 10.3.0.1
```
Ping succeeds across the backup path without manual intervention.

### Verification 4: Web Visual Control Plane Integration
1. Open the dashboard in your browser (`http://localhost:5173`).
2. Click the **"Mininet Status"** indicator in the top navbar.
3. Observe the green **"Connected"** status indicator.
4. Click **"Kernel Routing (FIB)"** to view the live Linux kernel routing tables of all routers fetched directly from the Mininet namespaces.
5. Click **"Export .py"** on any canvas topology to export an executable Mininet script.

---

## 5. Protocol Comparison Implemented in Daemons

| Feature | Link State (OSPF / Dijkstra) | Distance Vector (RIP / Bellman-Ford) |
| :--- | :--- | :--- |
| **Port** | UDP 5000 | UDP 5001 |
| **Information Shared** | Local link states (LSA flood) | Complete distance vectors to neighbors |
| **Algorithm** | Dijkstra's Single Source Shortest Path | Distributed Bellman-Ford equation |
| **Convergence Speed** | Fast ($O(V^2)$ / $O(E \log V)$) | Slower ($O(V \cdot E)$), subject to counting to infinity |
| **Loop Prevention** | Global topology map prevent loops | Split Horizon with Poison Reverse |
| **Kernel Updates** | `ip route replace ... proto lsr` | `ip route replace ... proto dvr` |

---

## 6. Standalone Script Generation
Any topology drawn on the web canvas can be exported as a standalone Mininet Python file.
To run the generated topology independently:
```bash
sudo python3 custom_mininet_topo.py
```
This generates the full virtual network, configures point-to-point subnets, activates IP forwarding, and launches the Mininet CLI.

---

## 7. Containerized Deployment (Docker & Kubernetes)

To run the complete network emulation stack on any operating system without installing Ubuntu/WSL natively:

### Option A: Docker Compose (1-Command Full Stack)
```bash
docker compose up --build
```
Spins up both the Mininet L3 Linux kernel engine and the Web Telemetry Dashboard on a shared bridge network.

### Option B: Kubernetes Cluster (Minikube / Kind / Cloud)
```bash
kubectl apply -f k8s/
```
Deploys the complete microservices architecture into the `routing-simulator` namespace with `NET_ADMIN` kernel capabilities. Refer to [`k8s/README.md`](../k8s/README.md) for comprehensive deployment and verification details.
