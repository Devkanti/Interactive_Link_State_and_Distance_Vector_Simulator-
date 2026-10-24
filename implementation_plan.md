# Implementation Plan: RoutingSimulator - Interactive Link State & Distance Vector Convergence Simulator

## 1. Project Overview & Vision
**RoutingSimulator** is an advanced, interactive computer networking visualization and simulation platform designed to demonstrate, analyze, and compare **Link State Routing (LSR - Dijkstra / OSPF-style)** and **Distance Vector Routing (DVR - Bellman-Ford / RIP-style)** algorithms in real time.

Unlike static or basic graph calculators, RoutingSimulator models **actual protocol packet dynamics, asynchronous exchange ticks, transient states during convergence, and pathological failure scenarios**.

---

## 2. Novelty Pillars (What Makes This Project Stand Out)

To ensure this project scores top marks in academic evaluation and provides unique research/portfolio value, we propose 5 specific novelty pillars:

```
+--------------------------------------------------------------------------------------------------+
|                                  ROUTINGSIMULATOR NOVELTIES                                      |
+-----------------------------+----------------------------------+---------------------------------+
|  1. Synchronous "Race" Mode |  2. "Chaos Monkey" & Flapping   |  3. Live In-Flight Packet Tracer|
|     Side-by-Side LSR vs DVR |     Dynamic Metric & Link Churn  |     TTL Expiry & Loop Tracer    |
+-----------------------------+----------------------------------+---------------------------------+
|  4. Time-Travel Step Engine |  5. Pathology Deep-Dive Studio   |                                 |
|     Scrub forward/backward  |     Count-to-Infinity & Poison   |                                 |
+-----------------------------+----------------------------------+---------------------------------+
```

### Novelty 1: Dual-Engine Synchronous "Race" Mode (Side-by-Side Benchmark)
* **The Concept**: Run Link State and Distance Vector algorithms simultaneously on identical network topologies and identical failure events.
* **Live Convergence Scoreboard**:
  * **Convergence Time / Ticks**: Exact number of steps to reach steady state.
  * **Bandwidth / Message Overhead**: LSP flood count vs. periodic distance vector advertisements.
  * **Memory Footprint**: Full link-state database (LSDB) size vs. local vector table size.
  * **Inconsistency Window**: Time duration during which forwarding tables contain loops or black holes.

### Novelty 2: Interactive "Chaos Monkey" & Link-Flapping Simulator
* Allow user to inject realistic network faults:
  * Single/multi-link failure, router crash/recovery, dynamic cost changes (congestion simulation).
  * **Link Flap Generator**: Rapidly alternates link status between up/down to showcase OSPF LSA throttling/hold-down timers vs. RIP route oscillation and instability.

### Novelty 3: Live In-Flight Packet Tracer & Loop Visualizer
* Drop a test data packet from Node S to Node D **during active convergence** or **during a routing loop**:
  * Watch the packet travel hop-by-hop using each router's current local routing table.
  * If a loop exists (e.g., $A \to B \to A$), animate the packet cycling until its **TTL (Time-To-Live) decrements to 0**, triggering an animated `ICMP Time Exceeded` packet drop!

### Novelty 4: Deterministic Time-Travel Scrubber (State Stepper)
* Record every simulation discrete tick into a state ledger.
* Users can pause, step forward, or **scrub backwards** to pinpoint the exact moment a sub-optimal route or loop was adopted during Bellman-Ford relaxation or Dijkstra SPF tree recomputation.

### Novelty 5: Educational Pathology Deep-Dive Studio
* **Distance Vector Pathology Lab**:
  * Toggle **Split Horizon** and **Poison Reverse** ON/OFF.
  * Visual counter showing **Count-to-Infinity** progressing to metric $\infty$ (e.g., 16), highlighting why naive Distance Vector fails when links sever.
* **Link State SPF Inspector**:
  * Step-by-step visual Dijkstra Shortest Path Tree (SPT) construction from any selected node's perspective with Candidate ($Q$) and Finalized ($S$) sets.

---

## 3. Recommended Tech Stack Architecture

To achieve maximum visual polish, responsiveness, zero-install presentation, and cross-platform portability:

### Option A: Modern Web SPA (Recommended)
* **Frontend**: React 18 / Vite + TypeScript + Tailwind CSS
* **Graph Visualization Engine**: Canvas / Cytoscape.js or Vis-Network (custom styled for glowing packet transfers, router nodes, link metrics, and animated loop rings).
* **Simulation Core**: Pure TypeScript simulation engine running either directly on the main thread or in a Web Worker (for buttery-smooth 60fps animations without UI lag).
* **Export / Report Generator**: Export topology as JSON, export convergence charts as PNG/CSV, and generate an automated Academic Lab Summary Report.
* **Advantages**:
  * Runs anywhere (laptops, browser, phone, projector) with zero dependency installation.
  * Instant interactive drag-and-drop graph editing.
  * Can be hosted live on GitHub Pages / Vercel for your resume/submission.

### Option B: Full-Stack (Python Backend + Web Frontend)
* **Backend**: Python (FastAPI + WebSockets / NetworkX)
* **Frontend**: React / Vite / Tailwind
* **Use Case**: If your university curriculum strictly mandates Python code submission for networking simulations.

### Option C: Standalone Python Desktop (PyQt6 / CustomTkinter / Pygame)
* **GUI**: PyQt6 with QGraphicsView or Pygame
* **Use Case**: If offline native desktop GUI is required.

> **Recommendation**: **Option A (React + Vite + TypeScript + Tailwind CSS)** provides the highest visual standard, smoothest packet animations, instant interactive topology building, and zero installation headaches for evaluators. (We can also provide Python algorithm verification scripts alongside it if your instructor requests Python code).

---

## 4. System Architecture & Components

```
+------------------------------------------------------------------------------------+
|                                    USER INTERFACE                                  |
|  +--------------------+  +--------------------------------+  +------------------+  |
|  | Topology Canvas    |  | Comparative Metrics Scoreboard |  | Inspector Panel  |  |
|  | - Drag & drop node |  | - Convergence Time (ticks)     |  | - LSDB / Routing |  |
|  | - Add / edit links |  | - Message Overhead (Packets)   |  |   Tables         |  |
|  | - Animated packets |  | - Packet Drop & Loop Counter   |  | - Dijkstra Step  |  |
|  +--------------------+  +--------------------------------+  +------------------+  |
+-----------------------------------------+------------------------------------------+
                                          |
                                          v
+------------------------------------------------------------------------------------+
|                                 SIMULATION ENGINE                                  |
|  +-----------------------------+               +--------------------------------+  |
|  |    Link State Engine        |               |    Distance Vector Engine      |  |
|  | - LSP Flooding & Ageing     |               | - Bellman-Ford Relaxation      |  |
|  | - Dijkstra SPF Tree Calc    |               | - Split Horizon / Poison Rev.  |  |
|  | - Forwarding Table Gen      |               | - Count-to-Infinity Detector   |  |
|  +-----------------------------+               +--------------------------------+  |
|                                         |                                          |
|                                         v                                          |
|  +------------------------------------------------------------------------------+  |
|  | Event Timeline & State Ledger (Time-Travel: Step Forward / Step Backward)    |  |
|  +------------------------------------------------------------------------------+  |
|  | Chaos Engine: Link Failure, Node Crash, Metric Jitter, Flapping Generator    |  |
|  +------------------------------------------------------------------------------+  |
|  | Packet Forwarding Simulator: S -> D Trace, TTL decrement, Loop Detection     |  |
+------------------------------------------------------------------------------------+
```

---

## 5. Detailed Component Breakdown

### 5.1 Topology Builder & Network Graph
* **Interactive Canvas**: Click to spawn routers, drag links between routers, edit link weights (costs) inline.
* **Pre-baked Benchmark Topologies**:
  * *Classic 3-Node Count-to-Infinity Scenario* ($A-B-C$)
  * *ARPANET 1972 Core Topology*
  * *Fish Network Topology* (Classic multi-path test)
  * *Ring / Dual-Ring Topology* (Evaluates convergence speed & flapping)
  * *Random Mesh Generator* (Customizable nodes $N$ and edge probability $P$)

### 5.2 Link State Routing (LSR) Engine
* **Protocol Emulation**:
  * Neighbor discovery & Link Cost assignment.
  * Link State Packet (LSP) generation: Sequence numbers, Age, Cost vectors.
  * Reliable Flooding: Controlled broadcast, duplicate suppression via sequence number cache.
  * Synchronized LSDB (Link State Database) across all operational nodes.
  * Dijkstra's Shortest Path First (SPF) algorithm executed on synchronized LSDB.
  * Generation of final Forwarding Table (`Destination`, `Next Hop`, `Total Cost`).

### 5.3 Distance Vector Routing (DVR) Engine
* **Protocol Emulation**:
  * Local Distance Vector initialization ($D_i(j) = \text{cost}$ for direct neighbors, $\infty$ otherwise).
  * Iterative exchange ticks: Routers send vectors only to direct immediate neighbors.
  * Bellman-Ford formula relaxation:
    $$D_x(y) = \min_v \{ c(x, v) + D_v(y) \}$$
  * Convergence detection: System halts when no router's distance vector changes across an iteration.
* **Pathology Controls**:
  * Toggle: *Standard RIP* (No loop prevention, $\infty = 16$).
  * Toggle: *Split Horizon* (Do not advertise route back to neighbor learned from).
  * Toggle: *Poison Reverse* (Advertise route as $\infty$ back to neighbor).

### 5.4 Comparison Analytics Engine
* Generates real-time side-by-side performance charts:
  * **Convergence Iterations**: LSR vs DVR
  * **Total Control Packets Exchanged**: Highlighting the flooding burst of LSR vs the prolonged multi-tick chatter of DVR
  * **Routing Table Inconsistency Duration**: Time window during which loops or path errors occur

---

## 6. Implementation Roadmap

### Phase 1: Core Engine & Data Structures
- Graph and topology data structures (Nodes, Edges, Weights, Status).
- Discrete-event simulation clock / step manager.
- Implement Link State Protocol Engine (LSP flooding + Dijkstra algorithm).
- Implement Distance Vector Protocol Engine (Bellman-Ford + Split Horizon + Poison Reverse).

### Phase 2: Interactive UI & Topology Canvas
- Visual graph rendering (interactive nodes, curved edge connections, weight labels).
- Visual editor: Add/delete nodes, add/delete edges, update weights, toggle link/node offline.
- Preset scenario loaders (Count-to-Infinity, Diamond, Mesh, ARPANET).

### Phase 3: Animations & Pathology Deep-Dive
- LSP flooding packet animation on edges.
- Distance vector advertisement animations between adjacent nodes.
- Packet Tracer with TTL decrement & loop detection animations.
- Dijkstra Step-by-Step SPT visualizer & Bellman-Ford matrix inspector.

### Phase 4: Comparative Analytics & Export
- Dual-Engine Race mode view (synchronized execution on duplicate topology).
- Convergence metrics dashboard (charting packets exchanged, convergence ticks).
- Scenario export/import (JSON) & Report Generator (Markdown/PDF-ready lab summary).

---

## 7. Verification & Testing Plan

### Automated Logic Verification
- **Unit Tests**:
  - Dijkstra correctness on known benchmark graphs.
  - Bellman-Ford convergence on acyclic and cyclic graphs.
  - Split Horizon & Poison Reverse validation on 3-node linear topology.
  - Count-to-Infinity validation (confirm metric increments until 16 when split horizon is off).
  - Loop detection in packet tracer.

### Manual / Visual Verification
- Interactive testing of link breaks and metric updates during running simulation.
- Verified packet animations across different zoom levels and browser viewport sizes.
- Verification of time-travel rewind and step-by-step playback.

---

## User Review Required

> [!IMPORTANT]
> Please confirm your preferences on the following:
> 1. **Tech Stack**: Do you prefer **Option A (Interactive Modern Web App in React/TypeScript)** which provides rich animations, zero installation, and GitHub Pages deployment, or **Option B (Python backend / desktop app)**?
> 2. **Submission Scope**: Do you need exportable academic lab reports, or specific RIP/OSPF protocol packet formats (RFC 2453 / RFC 2328 emulation)?
