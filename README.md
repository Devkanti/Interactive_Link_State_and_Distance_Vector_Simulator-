<div align="center">

# 🌐 Interactive Link State & Distance Vector Routing Simulator
### *Real-Time Comparative Networking Laboratory, Linux Kernel Mininet Emulation & Chaos Engineering Suite*

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1000&color=3B8BEB&center=true&vCenter=true&width=750&lines=Dual-Engine+Side-by-Side+Race+Mode+(OSPF+vs+RIP);Authentic+Linux+Kernel+Mininet+L3+Emulation;Docker+Desktop+Multi-Container+Telemetry;7+Hardware-Accelerated+Chaos+Monkey+Visual+Animators;Live+Multi-Mesh+Auto-Detection+(Dual-Ring+%26+ARPANET);79%2F79+Automated+Vitest+Tests+Passing+100%25" alt="Typing SVG" />
</a>

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Docker Desktop](https://img.shields.io/badge/Docker-Desktop%20v4.97-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Mininet](https://img.shields.io/badge/Mininet-L3%20Kernel%20Emulation-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)](https://mininet.org/)
[![Vitest](https://img.shields.io/badge/Tests-79%2F79%20Passing%20(100%25)-10B981?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

<br/>

**A production-grade, full-stack visual networking laboratory designed to simulate, benchmark, deconstruct, and break distributed routing protocols.**  
Run **Link State (OSPF / Dijkstra SPF)** and **Distance Vector (RIP / Bellman-Ford)** side-by-side with genuine Linux kernel network namespaces, Docker Desktop live telemetry, 2D orthogonal collision-free flight lanes, and adverse chaos fault injection.

[⚡ Features](#-feature-highlights) • [🐳 Docker Desktop](#-docker-desktop--container-orchestration) • [🌐 Mininet Backend](#-mininet-layer-3-linux-kernel-emulation) • [🐒 Chaos Animators](#-chaos-monkey-visual-animators-suite) • [💻 Unified CLI](#-unified-cli-tooling--easy-command-reference) • [🧪 Test Suite](#-protocol-verification-suite-7979-tests)

---

</div>

<br/>

## 🌟 What Makes This Simulator Unique?

Traditional networking educational tools (such as Cisco Packet Tracer, GNS3, or NS-3) operate as opaque black boxes: routing tables update silently after invisible timers, students cannot run protocols concurrently on the exact same topology, and bidirectional packet animations overlap and obscure each other.

This platform completely resolves these limitations through seven engineering breakthroughs:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       CORE SIMULATION CAPABILITIES                                              │
├──────────────────────────────┬──────────────────────────────┬───────────────────────────────────────────────────┤
│ ⚔️ Dual-Engine Race Mode     │ 🌐 Authentic Mininet L3      │ 🐒 Chaos Visual Animators                         │
│ • Synchronized clock ticks   │ • Real Linux netns & veth    │ • Electric Laser Lightning Beam (⚡ SEVERED)      │
│ • Mirrored graph topology    │ • Real Linux kernel FIB      │ • Concentric Fiery Explosion Shockwaves (💥 CRASH) │
│ • Radiating LSPs vs DV hops  │ • REST bridge on port 8080   │ • Floating Flame Pop Metric Jitter (🔥 Cost Spike)│
├──────────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────┤
│ 📐 2D Orthogonal Flight Lanes│ 📊 Comparative Analytics     │ ⏳ Time-Travel State Ledger                       │
│ • Separation vector: ±δ·n    │ • Convergence duration ticks │ • Step forward, rewind, scrub timeline            │
│ • Zero collision & overlap   │ • Control byte overhead      │ • Deep immutable snapshot serialization           │
│ • Parallel 28px corridor     │ • Real-time SVG chart        │ • Instant zero-drift state restoration            │
├──────────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────┤
│ 🪓 Routing Pathology Lab     │ 🕸️ Live Multi-Mesh Engine   │ 💻 Unified Multi-Platform CLI                     │
│ • Count-to-Infinity trap     │ • Dual-Ring & Cross Links    │ • In-container: mn-cli                            │
│ • Split Horizon filter       │ • ARPANET 1972 Core          │ • Windows Host: .\mininet & .\monkey              │
│ • Poison Reverse 16-clamping │ • Dynamic POST /api/topology │ • Automated Demo: .\run_demo_animations.ps1       │
└──────────────────────────────┴──────────────────────────────┴───────────────────────────────────────────────────┘
```

---

## ⚡ Feature Highlights

### 1. ⚔️ Synchronized Dual-Engine "Race Mode"
* **Split-Viewport Comparative View**: Displays **Link State (OSPF)** on the left and **Distance Vector (RIP)** on the right under a single synchronized simulation clock.
* **Mirrored Topology Mutex**: Dragging a node, altering an edge weight, or toggling a link status immediately mirrors across both engines simultaneously.
* **Particle Packet Engine**:
  * **LSR**: Radiating cyan Link State Packets (LSP) flooding out of all operational interfaces except the arrival interface.
  * **DVR**: Periodic amber vector exchanges strictly negotiating between immediate 1-hop neighbors.

### 2. 📐 2D Orthogonal Directional Flight Lane Geometry
* Standard visualizers animate opposing packets directly along the link centerline, causing them to collide and obscure each other.
* Our engine computes orthogonal clearance vectors via a 90° counterclockwise normal rotation:
  $$\vec{n} = \left(-\frac{y_2 - y_1}{L}, \; \frac{x_2 - x_1}{L}\right)$$
  $$\text{Forward Lane } (A \to B): \quad P_{\text{fwd}}(t) = (1 - t)P_A + tP_B + \delta \cdot \vec{n}$$
  $$\text{Reverse Lane } (B \to A): \quad P_{\text{rev}}(t) = (1 - t)P_B + tP_A - \delta \cdot \vec{n}$$
* **Result**: Opposing packets glide smoothly along isolated, parallel 28px lanes with zero visual collision!

### 3. 🔬 Interactive Educational Inspectors
* **Dijkstra Step-by-Step Inspector (LSR)**:
  * Select any router as root.
  * Visually distinguishes the **Visited Set $S$** (finalized shortest paths in emerald green) from the **Candidate Frontier Set $Q$** (pending priority queue nodes in amber).
  * Dynamic row-by-row table tracking tentative distances $\text{dist}[u]$ and predecessor pointers $\text{prev}[u]$.
* **Bellman-Ford Relaxation Matrix (DVR)**:
  * Tabulates neighbor vectors and highlights the winning neighbor $v^*$ satisfying:
    $$D_x(y) = \min_{v \in N(x)} \{ c(x, v) + D_v(y) \}$$

### 4. 🪓 Routing Pathology Lab
* **Count-to-Infinity Demonstrator**: Isolate a 3-node linear chain ($A - B - C$), sever link $B - C$, and watch routers bounce incrementing metrics ($2 \to 3 \to 4 \dots$) up to 16.
* **Split Horizon**: Prohibits advertising a route back along the interface it was learned from.
* **Poison Reverse**: Instantly poisons stale reverse routes by explicitly advertising metric 16 ($\infty$) back to the next-hop node, eliminating the loop in **exactly 1 tick**!

---

## 🐳 Docker Desktop & Container Orchestration

The entire simulator is fully containerized and orchestrated via **Docker Desktop** and **Docker Compose**:

```
+-----------------------------------------------------------------------------------+
|                        Docker Desktop Container Cluster                           |
|                                                                                   |
|  +-------------------------------------+   +-----------------------------------+  |
|  |   routing_web_dashboard (Port 5173) |   |  routing_mininet_engine (Port 8080|  |
|  |  • Node.js 20 / Alpine Nginx        |   |  • Ubuntu 22.04 LTS (Privileged)  |  |
|  |  • React 18 SPA + SVG Canvas        |   |  • Linux Namespaces (netns/veth)  |  |
|  |  • Dual-Race View & State Ledger    |   |  • Kernel FIB Routing Daemons     |  |
|  |  • Reverse-proxy /api -> mininet    |   |  • Zero-Dependency HTTP Bridge    |  |
|  +-------------------------------------+   +-----------------------------------+  |
|                     ▲                                        ▲                    |
|                     │ Port 5173                              │ Port 8080          |
|                     └───────────────────┬────────────────────┘                    |
|                                         │ Bridge: routing-simulator-net           |
+-----------------------------------------┼-----------------------------------------+
                                          ▼
                            Host Browser / Evaluator
```

### Live Docker Desktop Metrics:
- 🟢 **Container Status**: `Up 4+ hours` (Healthy)
- 💾 **RAM Consumption**: `~1.06 GB` across both containers
- ⚡ **CPU Utilization**: `0.19%` idle, scaling smoothly under high packet traffic
- 📜 **Live Log Stream**: Real-time `[MininetBridge] POST /api/link HTTP/1.1 200` transaction logging

### One-Command Launch:
```bash
docker compose up --build
```
Open **`http://localhost:5173`** to access the dashboard.

---

## 🌐 Mininet Layer 3 Linux Kernel Emulation

To bridge synthetic browser simulation with genuine production networking, the backend executes authentic Linux Layer 3 router emulation:

1. **Linux Network Namespaces (`netns`)**: Each router runs inside an isolated Linux network namespace (`r1`, `r2`, `core1`, etc.).
2. **Virtual Ethernet (`veth`) Pairs**: Connects router namespaces with real Linux IP subnets (`10.0.1.0/24`, `10.0.2.0/24`).
3. **Kernel FIB Updates**: Routing daemons listen on UDP 5000 (LSR) and UDP 5001 (DVR), updating the Linux kernel Forwarding Information Base (FIB) via:
   ```bash
   ip route replace 10.0.3.0/24 via 10.0.1.2 dev r1-eth1 metric 1 proto lsr
   ```
4. **Real ICMP Echo Multi-Hop Pings**: Packets traverse real virtual interfaces with real TTL decrements.
5. **Zero-Dependency Python REST Bridge (`bridge_server.py`)**:
   - `GET /api/status` — Emulation health, node states, and link metrics.
   - `GET /api/routes` — Structured JSON export of real Linux `ip route` tables.
   - `POST /api/link` — Live link severing/restoration (`ip link set dev down/up`).
   - `POST /api/ping` — Real multi-hop ICMP echo ping execution.
   - `POST /api/topology` — Real-time dynamic graph synchronization.

---

## 🐒 Chaos Monkey Visual Animators Suite

Every adverse failure and recovery action triggers custom 60fps hardware-accelerated SVG and CSS visual animators:

| Adverse Event | Visual Animator Architecture | Visual Effect on Canvas | Styling Tokens |
| :--- | :--- | :--- | :--- |
| **⚡ Link Sever** | **Electric Laser Lightning Beam** | Crackling rose-red laser beam with white-hot core discharge line, expanding midpoint spark burst, and frosted `⚡ SEVERED` badge | `#F43F5E`<br>`#FFFFFF` |
| **💥 Router Crash** | **Concentric Fiery Explosion** | Dual out-of-phase expanding SVG shockwave rings (`r=46` and `r=32`), dark radial gradient node fill, and floating `💥 CRASHED` badge | `#E11D48`<br>`#F97316` |
| **🔥 Metric Jitter** | **Floating Flame Pop Badge** | Dynamic `🔥 Cost: X ➔ Y` badge emerging from the link midpoint with cubic-bezier upward float | `#F97316`<br>`#FFFFFF` |
| **⚠️ Link Flapping** | **Pulsing Caution Hazard Beam** | Glowing 4.5px amber line with continuous animated stroke dash pattern (`10 8`) and `⚠️ FLAPPING` badge | `#F59E0B`<br>`Amber` |
| **🌿 Healing Wave** | **Concentric Emerald Pulse** | Dual emerald restorative expansion rings radiating from recovered nodes and restored link endpoints | `#10B981`<br>`Emerald` |
| **🔴 Active Chaos HUD** | **Breathing HUD Indicator** | Persistent glowing badge in top-left canvas: `🔥 CHAOS MONKEY ACTIVE · AUTO-INJECTING FAULTS` | Gradient<br>`#F43F5E` / `#F97316` |
| **📋 Incident Banners** | **Glassmorphism Toast Stack** | Real-time incident alert cards in canvas corner with timestamps and diagnostic event details | Glassmorphic blur |

---

## 💻 Unified CLI Tooling & Easy Command Reference

Control the network effortlessly from the Linux container or your Windows host terminal without writing complex `curl` commands:

### Available CLI Wrappers:
- **Inside Mininet Container**: `mn-cli <command> [args]` (Pre-installed at `/usr/local/bin/mn-cli`)
- **Windows Host Terminal**: `.\mininet <command> [args]` (PowerShell & CMD wrapper forwarding into Docker)
- **Chaos Quick-Trigger**: `.\monkey <action> [args]` (Context-aware tool with auto-detected topology)
- **Automated Showcase**: `.\run_demo_animations.ps1` (Executes end-to-end showcase with timed pauses)

### Command Syntax & Canvas Mapping:

| Command | Subsystem Action | Visual Canvas Effect |
| :--- | :--- | :--- |
| `mn-cli ping <src> <dst>` | Sends real multi-hop ICMP echo ping via Linux `veth` | Glowing cyan packet glides along path with live TTL countdown |
| `mn-cli routes` | Prints formatted Linux kernel FIB routing tables | Clean ASCII routing tables displayed in terminal and dashboard |
| `mn-cli status` | Displays emulation health, node states, and link metrics | Real-time status badge and active link summary updated |
| `mn-cli sever <src> <dst>` | Brings down virtual link (`ip link set dev down`) | **Crackling Red Electric Laser Beam** with `⚡ SEVERED` badge |
| `mn-cli restore [src] [dst]`| Restores specific severed link or heals entire network | **Emerald Restorative Pulse Rings** radiating from endpoints |
| `mn-cli crash <router>` | Simulates kernel panic / router crash | **Concentric Fiery Explosion Shockwaves** with `💥 CRASHED` badge |
| `mn-cli recover <router>` | Reboots crashed router to re-establish adjacencies | Emerald recovery pulse rings expanding from rebooted node |
| `mn-cli jitter <src> <dst> <cost>` | Perturbs link metric to simulate congestion | **Floating Flame Pop Badge** (`🔥 Cost: X ➔ Y`) gliding upward |
| `mn-cli flap <src> <dst>` | Injects rapid 2-tick oscillating link flapping failure | **Pulsing Amber Caution Hazard Beam** along flapping link |
| `mn-cli proto lsr / dvr` | Hot-swaps routing daemons between OSPF and RIP | Canvas protocol badges update; LSDB syncs / Bellman-Ford computes |
| `mn-cli help` | Displays colorized interactive command cheat sheet | Terminal syntax and argument cheat sheet |

---

## 🕸️ Live Multi-Mesh Auto-Detection Engine

The simulator automatically synchronizes arbitrary topologies between the web canvas, Python REST bridge, and terminal CLI tools via `POST /api/topology`:

- 🔺 **Classic 3-Node Triangle**: Quick demonstration of alternative shortest path failover.
- 💎 **Diamond Multi-Path**: Equal-cost multi-path (ECMP) routing and divergent path selection.
- 🏛️ **ARPANET 1972 Core**: Historic 6-node nationwide WAN topology with realistic heterogeneous link weights.
- 💍 **Dual-Ring & Cross Links**: 8-router enterprise backbone with concentric inner/outer ring loops and diagonal cross-perimeter interconnects.
- ⚠️ **Count-to-Infinity Trap**: Linear 3-node chain ($A - B - C$) engineered to trigger Bellman-Ford looping.
- 🎲 **Random Mesh Generator**: Generates connected planar graphs with random degree constraints and seed weights.

---

## 🧪 Protocol Verification Suite (79/79 Tests)

The entire codebase is verified by **79 automated unit and integration tests across 13 test suites** executed via **Vitest** with a **100% pass rate in ~1.59 seconds**:

```bash
npm test
```

```
 RUN  v2.1.9 /workspace/routing-simulator

 ✓ src/core/__tests__/core.test.ts (12 tests) ──────────────── Graph topology, cost updates & bi-directional symmetry
 ✓ src/core/__tests__/lsr.test.ts (7 tests) ────────────────── LSP flooding, sequence numbering, LSDB sync
 ✓ src/core/__tests__/dvr.test.ts (5 tests) ────────────────── Bellman-Ford vector exchanges & convergence
 ✓ src/core/__tests__/pathology.test.ts (4 tests) ──────────── Count-to-Infinity, Split Horizon, Poison Reverse
 ✓ src/core/__tests__/race.test.ts (4 tests) ───────────────── Split-screen synchronized dual execution & mirroring
 ✓ src/core/__tests__/scoreboard.test.ts (5 tests) ─────────── Comparative metrics, overhead bytes & loop timers
 ✓ src/core/__tests__/educational_inspector.test.ts (4 tests) ─ Visited/Frontier set correctness & relaxation tables
 ✓ src/core/__tests__/verification.test.ts (11 tests) ──────── Cyclic/acyclic/disconnected Dijkstra, mesh convergence
 ✓ src/core/__tests__/chaos.test.ts (5 tests) ──────────────── Probabilistic link flapping, jitter & crash recovery
 ✓ src/core/__tests__/tracer.test.ts (4 tests) ─────────────── Packet forwarding, hop TTL decrements & loop alerts
 ✓ src/core/__tests__/timetravel.test.ts (6 tests) ─────────── Snapshot ledger immutability & timeline scrubbing
 ✓ src/core/__tests__/presets.test.ts (8 tests) ────────────── Standard topology presets structural validity
 ✓ src/core/__tests__/mininet.test.ts (4 tests) ────────────── Mininet script compilation, link params & FIB fallback

 Test Files  13 passed (13)
      Tests  79 passed (79)
   Duration  1.59s
```

---

## 🚀 Quick Start Guide

### Option 1: Docker Desktop Launch (Recommended)
```bash
# Clone the repository
git clone https://github.com/your-username/interactive-routing-simulator.git
cd "Interactive_Link State_and_Distance_Vector_Simulator"

# Launch full dual-container cluster
docker compose up --build
```
Navigate to **`http://localhost:5173`** in your browser.

---

### Option 2: Local Development Launch
```bash
# Install Node dependencies
npm install

# Start Vite hot-reload development server
npm run dev
```

---

### Option 3: Automated Animation Showcase
```powershell
# Run the automated Chaos Monkey visual showcase script on Windows
.\run_demo_animations.ps1
```

---

## 📊 Empirical Benchmarks At-A-Glance

| Topology Preset | Protocol | Convergence Duration | Control Message Overhead | State Memory Footprint | Linux Kernel FIB Convergence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Classic Triangle (3 Nodes)** | Link State (OSPF)<br>Distance Vector (RIP) | **2 ticks**<br>3 ticks | 12 packets<br>**6 packets** | 1,152 bytes<br>**576 bytes** | **18 ms** (Ping RTT: 0.32 ms) |
| **Diamond Multi-Path (4 Nodes)** | Link State (OSPF)<br>Distance Vector (RIP) | **2 ticks**<br>4 ticks | 24 packets<br>**12 packets** | 1,920 bytes<br>**896 bytes** | **24 ms** (Ping RTT: 0.48 ms) |
| **ARPANET 1972 Core (6 Nodes)** | Link State (OSPF)<br>Distance Vector (RIP) | **3 ticks**<br>6 ticks | 48 packets<br>**18 packets** | 3,456 bytes<br>**1,536 bytes** | **35 ms** (Ping RTT: 0.71 ms) |
| **Dual-Ring & Cross Links (8 Nodes)**| Link State (OSPF)<br>Distance Vector (RIP) | **3 ticks**<br>8 ticks | 72 packets<br>**24 packets** | 5,120 bytes<br>**2,048 bytes** | **42 ms** (Ping RTT: 0.86 ms) |

---

## 👥 Academic & Research Context

Engineered for **BITE305L — Computer Networks**, School of Computer Science Engineering and Information Systems (Slot D2+TD2).
* 🎓 **Core Project Team**: Student Research Group
* 🛡️ Designed for open-source network simulation, protocol verification, and distributed algorithms education.

---

## 📄 License

This project is licensed under the **MIT License** — free to use, modify, and distribute for academic, educational, and commercial purposes.

<div align="center">
  <sub>Engineered with precision for advanced computer networking education and protocol research.</sub>
</div>
