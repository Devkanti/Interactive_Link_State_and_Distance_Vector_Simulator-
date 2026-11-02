# 🌐 Master Implementation Guide: Interactive Link State & Distance Vector Simulator
### *Comprehensive A-to-Z Technical Architecture, Algorithmic Mechanics, Codebase Inventory, and Demonstration Guide*

> **📅 Implementation Date**: November 2, 2026 | **Build Version**: v2.4.0 (Production Release)  
> **🎓 Course**: BITE305L - Computer Networks (Slot D2+TD2)  
> **👥 Core Team**: Student Research Group (Distributed Systems & Network Protocols Lab)  
> **🧪 Test Coverage**: 13/13 Test Suites Passing (79/79 Tests, 100% Pass Rate in ~1.59s)  
> **🐳 Orchestration**: Docker Desktop (v4.97+) Multi-Container (Ports 5173 & 8080) + Kubernetes K8s Manifests  

---

## 📑 Table of Contents
1. [Executive Summary & Purpose](#1-executive-summary--purpose)
2. [Complete Technology Stack](#2-complete-technology-stack)
3. [System Architecture & Data-Flow Pipeline](#3-system-architecture--data-flow-pipeline)
4. [Discrete Simulation Kernel & Time-Travel Engine](#4-discrete-simulation-kernel--time-travel-engine)
5. [Routing Protocol Engines (LSR & DVR)](#5-routing-protocol-engines-lsr--dvr)
   - 5.1 [Link State Engine (OSPF / Dijkstra SPF)](#51-link-state-engine-ospf--dijkstra-spf)
   - 5.2 [Distance Vector Engine (RIP / Bellman-Ford)](#52-distance-vector-engine-rip--bellman-ford)
6. [Directional Flight Lane Coordinate Mathematics](#6-directional-flight-lane-coordinate-mathematics)
7. [Routing Pathology Lab (Count-to-Infinity & Defenses)](#7-routing-pathology-lab-count-to-infinity--defenses)
8. [Chaos Disruption Engine & Visual Animators Suite](#8-chaos-disruption-engine--visual-animators-suite)
   - 8.1 [Mathematical Fault Models](#81-mathematical-fault-models)
   - 8.2 [Complete Visual Animators Catalog (SVG & CSS)](#82-complete-visual-animators-catalog-svg--css)
   - 8.3 [Live Dashboard Mesh Auto-Detection Engine](#83-live-dashboard-mesh-auto-detection-engine)
9. [Educational Algorithm Inspectors](#9-educational-algorithm-inspectors)
10. [Comparative Analytics Scoreboard & Live Chart](#10-comparative-analytics-scoreboard--live-chart)
11. [Design System & UI/UX Aesthetics](#11-design-system--uiux-aesthetics)
12. [Complete File-by-File Codebase Inventory](#12-complete-file-by-file-codebase-inventory)
13. [Verification & Testing Suite (79/79 Tests)](#13-verification--testing-suite-7979-tests)
14. [Academic Course Project Report Specification](#14-academic-course-project-report-specification)
15. [Live Demonstration & Viva Defense Guide](#15-live-demonstration--viva-defense-guide)
16. [Mininet Layer 3 Network Emulation Backend & Web Bridge](#16-mininet-layer-3-network-emulation-backend--web-bridge)
17. [Cloud-Native Docker & Kubernetes Containerization Architecture](#17-cloud-native-docker--kubernetes-containerization-architecture)
18. [Unified CLI Tooling & Easy Command Reference (mn-cli & mininet.ps1)](#18-unified-cli-tooling--easy-command-reference-mn-cli--mininetps1)
19. [Implementation Timeline, Dates & Milestone Log](#19-implementation-timeline-dates--milestone-log)

---

## 1. Executive Summary & Purpose

### What is this project?
The **Interactive Link State and Distance Vector Routing Simulator** is a full-stack, browser-native networking laboratory engineered in **React 18.3**, **TypeScript 5.5**, and **HTML5 SVG**. It allows students, network engineers, and researchers to simulate, visualize, benchmark, and mathematically deconstruct the two foundational Interior Gateway Protocols (IGPs):
1. **Link State Routing (LSR / OSPF / IS-IS)**: Powered by reliable Link State Packet (LSP) flooding and Dijkstra's Shortest Path First (SPF) algorithm.
2. **Distance Vector Routing (DVR / RIP / EIGRP)**: Powered by distributed Bellman-Ford relaxation and neighbor vector exchanges.

### Why was it built?
Traditional computer networking tools (such as Cisco Packet Tracer, NS-3, and GNS3) suffer from critical educational bottlenecks:
- **Black-box execution**: In Packet Tracer, routing tables update after invisible timers without exposing the underlying candidate priority queues or neighbor relaxation matrices.
- **No side-by-side comparative mode**: Students cannot run OSPF and RIP simultaneously on the exact same topology under identical fault conditions.
- **No time travel**: When a routing loop or Count-to-Infinity anomaly occurs, users cannot pause and scrub backward in time to inspect the root cause.
- **Visual occlusion**: Traditional tools animate packets along straight edge centerlines, causing opposing packets to collide and obscure each other.

This simulator solves **every single one of these problems** through:
- **Synchronized Dual-Engine "Race Mode"** running both protocols concurrently.
- **Deterministic Time-Travel State Ledger** enabling bidirectional scrubbing across discrete clock ticks.
- **Step-by-step educational inspectors** for Dijkstra ($S$ vs $Q$ sets) and Bellman-Ford ($D_x(y)$ neighbor matrices).
- **2D orthogonal flight lane geometry** that offsets opposing packets into collision-free flight lanes.
- **Chaos Disruption Engine** for stress-testing protocols with link flapping, jitter, and node crashes.

---

## 2. Complete Technology Stack

| Layer / Tool | Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript | `^5.5.3` | Provides compile-time type safety for complex graph state trees, routing tables, and packet data structures. |
| **Frontend Framework** | React | `^18.3.1` | Component-based UI with declarative state synchronization, hooks (`useMemo`, `useCallback`, `useEffect`), and virtual DOM diffing. |
| **Bundler & Dev Server**| Vite | `^5.4.2` | Sub-millisecond Hot Module Replacement (HMR) and optimized Rollup production bundling. |
| **Test Runner** | Vitest | `^2.1.9` | Blazing-fast unit and integration testing; executes all 79 tests across 13 test suites in ~1.59 seconds with 100% pass rate. |
| **Vector Graphics** | HTML5 SVG Canvas | Native | Resolution-independent rendering of network nodes, curved directional flight lanes, animated packet capsules, and link status borders. |
| **Styling & Theme** | Vanilla CSS Tokens | Custom | Bespoke design system utilizing curated Peach (`#FEE2CF`), Cream (`#FEEFE5`), and Sky Blue (`#94C8FD` / `#3B8BEB`) tones with glassmorphism. |
| **Iconography** | Lucide React | `^0.344.0` | Lightweight, scalable vector icons for simulation controls, node status, and diagnostic panels. |
| **Layer 3 Emulation** | Mininet + Linux Kernel | `2.3.0` | Real Linux network namespaces (`ip netns`), `veth` pairs, UDP routing daemons (5000/5001), and kernel FIB updates via `iproute2`. |
| **Container Engine** | Docker Desktop & Compose | `v4.97+` | Multi-container isolation running web dashboard (Port 5173) and privileged Mininet engine (Port 8080) with live telemetry. |
| **Cloud Orchestration**| Kubernetes (K8s) | Native | Production manifests for Deployments, NodePort Services, Ingress, and ConfigMaps in `k8s/`. |
| **Host CLI Tooling** | PowerShell & Shell | Cross-Platform | Native wrapper scripts (`mininet.ps1`, `monkey.ps1`, `run_demo_animations.ps1`) forwarding host commands into Docker. |

---

## 3. System Architecture & Data-Flow Pipeline

The simulator adheres to a strict multi-tier, decoupled architecture where presentation is isolated from discrete protocol execution and state persistence:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   PRESENTATION & VISUALIZATION LAYER (React 18.3 + SVG)                │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ TopologyCanvas.tsx       │ DualRaceView.tsx            │ ComparativeScoreboard.tsx     │
│ • SVG Node Dragging      │ • Synchronized Dual Views   │ • Convergence Ticks           │
│ • Link Modals & Status   │ • Mirrored Topology Mutex   │ • Cumulative Byte Overhead    │
│ • Flight Lane Geometry   │ • LSP Flood vs DV Hops      │ • SVG Real-Time Chart         │
├──────────────────────────┴─────────────────────────────┴───────────────────────────────┤
│ AlgorithmEducationalInspector.tsx   │ RouterInspector.tsx      │ TimelineScrubber.tsx  │
│ • Dijkstra Visited S / Frontier Q   │ • Node-Specific Tables   │ • Undo / Rewind / Jump│
│ • Bellman-Ford Neighbor Matrix      │ • LSDB & Neighbor Vectors│ • Event Marker Nodes  │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Dispatches User Actions & State Scrubbing
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DISCRETE SIMULATION KERNEL LAYER                                │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ SimulationClock.ts                       │ StateLedger.ts                              │
│ • Discrete Tick Manager (0, 1, 2, ...)   │ • Deep Immutable Snapshot Serialization     │
│ • Play / Pause / Step Forward            │ • Indexed Circular History Buffer           │
│ • Speed Slider (100ms - 2000ms per tick) │ • Zero-Drift Instant State Restoration      │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Synchronized Tick Distribution
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       PROTOCOL EXECUTION ENGINE LAYER                                  │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ LinkStateEngine.ts (OSPF Model)          │ DistanceVectorEngine.ts (RIP Model)         │
│ • Link State Packet (LSP) Generation     │ • Distributed Bellman-Ford Iteration        │
│ • Reliable Flooding & Sequence Check     │ • Periodic vs Triggered Updates             │
│ • Link State Database (LSDB) Sync        │ • Split Horizon Filtering                   │
│ • Dijkstra Priority-Queue SPF Execution  │ • Poison Reverse (Metric 16 Clamping)       │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Monitored & Stress-Tested by
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       FAULT INJECTION & DIAGNOSTICS LAYER                              │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ ChaosEngine.ts (Chaos Monkey)            │ PacketTracer.ts                             │
│ • Bernoulli Link Flapping                │ • Real-time Data Packet Forwarding          │
│ • Gaussian Transmission Latency Jitter   │ • Hop TTL Decrement & Drop Tracking         │
│ • Catastrophic Router Crash & Reboot     │ • Circular Forwarding Loop Detection        │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Mutates & Queries
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       CORE GRAPH & DOMAIN DATA MODELS                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ NetworkGraph.ts: Nodes (V), Links (E), Adjacencies, Link Weights, Topology Snapshot    │
│ Presets Library: Triangle (3), Diamond (4), Dense Mesh (6), Ring (5), Linear (5)       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### The 7-Stage Discrete Tick Lifecycle
Every time the simulation advances by 1 discrete tick, the kernel executes seven sequential phases:
1. **Clock Trigger**: `SimulationClock` increments the global tick counter (`currentTick++`).
2. **Packet Flight Propagation**: In-flight packets advance along their directional flight lanes. Arriving packets reach their destination interfaces.
3. **Message Ingestion**: Arriving LSPs are validated against stored sequence numbers and merged into the LSDB; arriving Distance Vectors are processed via Bellman-Ford relaxation.
4. **Shortest Path Recalculation**:
   - LSR runs Dijkstra SPF from each node's perspective to update the Forwarding Information Base (FIB).
   - DVR updates next-hop pointers and tentative costs based on neighbor advertisements.
5. **Packet Generation & Outbound Flooding**: If state changed, LSR floods new LSPs out of eligible interfaces; DVR emits triggered vector updates.
6. **Pathology & Loop Auditing**: `PacketTracer` and `MetricsCollector` scan all routing tables for loops, blackholes, and metric-16 count-to-infinity states.
7. **Immutable Snapshot Capture**: `StateLedger` deep-clones the complete simulation state tree and stores it in the history buffer, triggering a seamless React UI re-render.

---

## 4. Discrete Simulation Kernel & Time-Travel Engine

### SimulationClock.ts
- **Decoupled Architecture**: Algorithmic state updates are completely decoupled from browser animation frame rates (`requestAnimationFrame`). The simulation progresses in discrete integer ticks ($t = 0, 1, 2, \dots$).
- **Controllable Execution Modes**:
  - `play()`: Automatically triggers ticks at configurable intervals (100ms to 2000ms).
  - `pause()`: Freezes simulation progression instantly.
  - `step()`: Advances the simulation by exactly one tick.
  - `setSpeed(multiplier)`: Dynamic playback adjustment (1x to 10x).

### StateLedger.ts (Time-Travel Engine)
- **Deep Structural Cloning**: At every tick $t$, the ledger captures a complete, immutable snapshot $S_t$:
  ```typescript
  export interface StateSnapshot {
    tick: number;
    timestamp: number;
    graph: GraphSnapshot;
    routingTables: Map<NodeId, RoutingTable>;
    eventDescription?: string;
    isEventMarker: boolean;
    activePacketsCount: number;
    metadata?: Record<string, any>;
  }
  ```
- **Timeline Scrubbing**: Users can drag the bottom timeline scrubber to any historical tick $k \le \text{maxTick}$. The ledger restores $S_k$ instantly without recalculating or causing state corruption.
- **Event Markers**: Significant topological occurrences (e.g., link severed, link cost altered, router rebooted) are flagged with distinct visual marker dots along the timeline.

---

## 5. Routing Protocol Engines (LSR & DVR)

### 5.1 Link State Engine (OSPF / Dijkstra SPF)
Located in `src/core/lsr/LinkStateEngine.ts` and `src/core/lsr/Dijkstra.ts`.

#### 1. Link State Packet (LSP) Generation
When a router detects a local interface state change (cost update, link up/down), it constructs a Link State Packet:
```typescript
export interface LinkStatePacket {
  id: string;
  sourceRouterId: string;
  sequenceNumber: number;
  age: number;
  neighbors: Record<string, number>; // { neighborId: cost }
}
```

#### 2. Reliable Flooding Algorithm (RFC 2328 §13.1)
When router $v$ receives an LSP originating from router $u$ with sequence number $s$:
- **Duplicate Check**: If $s \le \text{storedSeq}(u)$, the packet is outdated or duplicate and is **silently dropped**.
- **Database Update**: If $s > \text{storedSeq}(u)$, router $v$ updates its LSDB: $\text{storedSeq}(u) \leftarrow s$, and updates the adjacency list.
- **Split-Horizon Flooding**: Router $v$ retransmits the LSP out of **all active operational interfaces except the incoming interface**.
- **Age Decrement**: The LSP age field is decremented at each hop to eliminate zombie packets.

#### 3. Dijkstra Shortest Path First (SPF) Computation
Once the LSDB is synchronized, each router independently executes Dijkstra's algorithm:
- Initializes $\text{dist}[\text{root}] = 0$ and $\text{dist}[v] = \infty$ for all $v \neq \text{root}$.
- Maintains a Visited Set $S$ and Candidate Frontier $Q$.
- Iteratively extracts vertex $u \in Q$ with minimum $\text{dist}[u]$, transfers $u$ to $S$, and relaxes adjacent edges:
  $$\text{if } \text{dist}[u] + c(u, v) < \text{dist}[v] \implies \text{dist}[v] = \text{dist}[u] + c(u, v), \quad \text{prev}[v] = u$$
- Backtracks predecessor pointers to identify the immediate next-hop outgoing interface.

---

### 5.2 Distance Vector Engine (RIP / Bellman-Ford)
Located in `src/core/dvr/DistanceVectorEngine.ts`.

#### 1. Distributed Bellman-Ford Relaxation
Each router $x$ maintains a distance vector $D_x = [D_x(y) : y \in V]$. Upon receiving distance vector advertisements $D_v$ from adjacent neighbors $v \in N(x)$, router $x$ updates its tentative costs:
$$D_x(y) = \min_{v \in N(x)} \left\{ c(x, v) + D_v(y) \right\}$$
If neighbor $v^*$ yields a strictly lower metric, router $x$ updates its routing table:
$$\text{Cost} = c(x, v^*) + D_{v^*}(y), \quad \text{NextHop} = v^*$$

#### 2. Periodic vs. Triggered Updates
- **Periodic Updates**: Routers exchange full vector advertisements at fixed tick intervals.
- **Triggered Updates**: When a link metric changes or a link goes down, the affected router broadcasts an immediate update without waiting for the next periodic cycle.

---

## 6. Directional Flight Lane Coordinate Mathematics

### The Problem of Packet Collision
In standard network visualizers, packets traveling between Router A and Router B animate directly along the straight line connecting $(x_1, y_1)$ and $(x_2, y_2)$. When packets travel simultaneously in opposite directions (A $\to$ B and B $\to$ A), they overlap and occlude each other, confusing students.

### The Mathematical Solution
Located in `src/components/canvas/TopologyCanvas.tsx`. We implement 2D orthogonal vector coordinate geometry:

```
                  +δ·n (Forward Flight Lane: A → B)
Router A  ──────────────────────────────────────────► Router B
 (x1, y1) ------------------ Link Axis --------------- (x2, y2)
          ◄──────────────────────────────────────────
                  -δ·n (Reverse Flight Lane: B → A)
```

1. **Link Axis Vector**:
   $$\vec{d} = (x_2 - x_1, \; y_2 - y_1)$$
2. **Euclidean Link Length**:
   $$L = \|\vec{d}\| = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$
3. **Unit Normal Vector ($\vec{n}$)**:
   Computed via a 90° counterclockwise rotation of the normalized link vector:
   $$\vec{n} = \left(-\frac{y_2 - y_1}{L}, \; \frac{x_2 - x_1}{L}\right)$$
4. **Separated Packet Trajectories**:
   Using an orthogonal clearance offset $\delta = 14\text{ pixels}$:
   $$\text{Forward Flight }(A \to B): \quad P_{\text{forward}}(t) = (1 - t) P_A + t P_B + \delta \cdot \vec{n}$$
   $$\text{Reverse Flight }(B \to A): \quad P_{\text{reverse}}(t) = (1 - t) P_B + t P_A - \delta \cdot \vec{n}$$
   *(where $t \in [0, 1]$ represents normalized packet flight progress).*

**Result**: Opposing packet capsules glide smoothly along parallel, non-overlapping lanes separated by a clear 28px corridor!

---

## 7. Routing Pathology Lab (Count-to-Infinity & Defenses)

Located in `src/core/dvr/DistanceVectorEngine.ts` and `src/core/__tests__/pathology.test.ts`.

### 1. How Count-to-Infinity Occurs
Consider a 3-node linear topology: `A ─── B ─── C` (all link costs = 1).
- Steady State:
  - Router B reaches C with cost 1 (Next-hop: C).
  - Router A reaches C with cost 2 (Next-hop: B).
- Link B ─── C Fails:
  - Router B detects the failure and sets its cost to C as $\infty$.
  - However, before B can propagate this, Router A transmits its periodic vector advertising $D_A(C) = 2$.
  - Router B receives this and falsely deduces: *"A can reach C with cost 2! Therefore, I can reach C through A with cost $1 + 2 = 3$!"*
  - Router B updates its routing table: $D_B(C) = 3$ (Next-hop: A).
  - On the next tick, B advertises $D_B(C) = 3$ to A. Router A updates: $D_A(C) = 1 + 3 = 4$ (Next-hop: B).
  - Both routers bounce incrementing metrics back and forth in mutual deception until the metric reaches infinity.

### 2. Three Defenses Implemented in the Simulator

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ROUTING PATHOLOGY DEFENSES                                │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ 1. Metric 16 Clamping    │ 2. Split Horizon            │ 3. Poison Reverse             │
│ • Defines ∞ = 16 hops    │ • Prohibits advertising a   │ • Explicitly advertises       │
│ • Bounds the loop to 16  │   route back out of the     │   metric 16 (∞) back to the   │
│   iterations instead of  │   interface it was learned  │   next-hop router.            │
│   running forever.       │   from.                     │ • Instantly poisons stale     │
│ • Standardized in RIP.   │ • Breaks 2-node loops.      │   reverse paths in 1 tick!    │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

In `DistanceVectorEngine.ts`:
```typescript
if (entry.nextHop === neighborId) {
  if (this.config.poisonReverseEnabled) {
    // Poison Reverse: Explicitly advertise 16 (Infinity)
    vector.set(dest, 16);
  } else if (this.config.splitHorizonEnabled) {
    // Split Horizon: Suppress advertising route back to next-hop
    continue;
  } else {
    // No defense: Vulnerable to Count-to-Infinity
    vector.set(dest, entry.cost);
  }
}
```

---

## 8. Chaos Disruption Engine & Visual Animators Suite

Located in `src/core/chaos/ChaosEngine.ts`, `src/components/chaos/ChaosPanel.tsx`, `src/components/canvas/TopologyCanvas.tsx`, and `src/index.css`.

### 8.1 Mathematical Fault Models

The Chaos Engine introduces four deterministic and stochastic network failure models:

1. **Bernoulli & Deterministic Link Flapping**:
   - In automated mode, for every active link $e \in E$, a failure trial is executed each tick:
     $$\text{Status}(e) = \begin{cases} \text{DOWN} & \text{with probability } p_{\text{flap}} \\ \text{UP} & \text{with probability } 1 - p_{\text{flap}} \end{cases}$$
   - In deterministic oscillator mode, links oscillate state every $k$ ticks ($T_{\text{period}} = 2k$), causing severe route flapping, continuous SPF recalculations, and Distance Vector poisoned advertisements.

2. **Metric Jitter (Cost Perturbation)**:
   - Simulates dynamic congestion and queuing delay by shifting link weights:
     $$c'(u, v) = \max\left(1, c(u, v) + \Delta\right), \quad \Delta \in [-\delta, +\delta]$$
   - Triggers dynamic path migration in Dijkstra SPF without physically taking links down.

3. **Catastrophic Router Crash & Reboot**:
   - Simulates power supply failure or kernel panics by setting router state to `CRASHED`.
   - All incident edges are treated as non-traversable ($c(u, v) = \infty$), and in-flight packets targeting or traversing the crashed router are dropped with `TTL_EXPIRED` or `UNREACHABLE` status.

4. **Instant Link Severing**:
   - Immediately cuts the physical connection between two endpoints, forcing immediate LSP origination in Link-State and poisoned vector advertisements in Distance-Vector.

---

### 8.2 Complete Visual Animators Catalog (SVG & CSS)

Every adverse fault and restorative action features custom 60fps hardware-accelerated visual animators rendered natively in HTML5 SVG:

| Adverse Event | Animator Architecture & Visual Effect | CSS Class / Keyframe | Styling Tokens |
| :--- | :--- | :--- | :--- |
| **1. Link Sever (`LINK_SEVER`)** | **Electric Laser Lightning Beam**: Outer crackling laser line (`#F43F5E`, stroke-width: 5) + core white-hot discharge line (`#FFFFFF`, stroke-width: 2.2).<br>**Midpoint Spark Burst**: Concentric expanding SVG circle `<animate attributeName="r" from="8" to="34" dur="0.6s" repeatCount="indefinite" />` + frosted glass `⚡ SEVERED` pill badge.<br>**Dashed Link State**: Edge transitions to dashed stroke (`6 6`) in crimson. | `.chaos-lightning-line`<br>`@keyframes chaosLightningStrike`<br>`.sever-spark-anim` | `#F43F5E`<br>`#FB7185`<br>`#FFFFFF` |
| **2. Router Crash (`ROUTER_CRASH`)** | **Dual Fiery Explosion Shockwaves**: Two concentric expanding SVG rings (`r=46` and `r=32` with a 0.12s phase offset).<br>**Floating Crash Badge**: High-contrast `💥 CRASHED` frosted badge floating overhead with `#E11D48` drop shadow.<br>**Radial Node Transformation**: Router body switches to `#routerCrashedGrad` with rose-red Cisco glyph arrows. | `.chaos-explosion-ring`<br>`@keyframes chaosExplosionBurst`<br>`#routerCrashedGrad` | `#F43F5E`<br>`#F97316`<br>`#E11D48` |
| **3. Metric Jitter (`METRIC_SPIKE`)** | **Floating Flame Pop Badge**: `🔥 Cost: X ➔ Y` badge emerges from the link midpoint and glides upwards with ease-out cubic-bezier easing.<br>**Live Metric Update**: Link metric badge immediately reflects the new perturbed weight. | `.flame-pop-anim`<br>`@keyframes flamePop` | `rgba(249, 115, 22, 0.96)`<br>`#FFFFFF` |
| **4. Link Flapping (`FLAP`)** | **Oscillating Hazard Caution Beam**: 4.5px thick glowing amber line with animated stroke dashes (`10 8`) pulsing continuously along the flapping link.<br>**Midpoint Warning Badge**: High-contrast `⚠️ FLAPPING` badge pinned at midpoint. | `chaosBadgePulse`<br>`@keyframes chaosBadgePulse` | `#F59E0B`<br>`var(--accent-amber)` |
| **5. Restoration (`LINK_UP` / `ACTIVE`)** | **Dual Concentric Emerald Healing Wave**: `#10B981` expansion rings radiating outwards from recovered routers and link endpoints.<br>**Restored Banner**: Emerald toast notification confirming link/router operational restoration. | `setNodePulseRings`<br>`#10B981` | `#10B981` (Emerald) |
| **6. Active Chaos Monkey HUD** | **Breathing HUD Indicator Pill**: Persistent indicator floating at top-left of canvas:<br>`🔥 CHAOS MONKEY ACTIVE · AUTO-INJECTING FAULTS (LIVE)`. | `.chaos-active-hud`<br>`linear-gradient(135deg, #F43F5E, #F97316)` | `#F43F5E`, `#F97316` |
| **7. Real-Time Incident Banners** | **Glassmorphism Toast Stack**: Floating banner cards in top-right corner with flame icons, custom colored accent borders, and live event descriptions. | `.canvas-action-banner` | Glassmorphic blur |

---

### 8.3 Live Dashboard Mesh Auto-Detection Engine

To support seamless transitions between arbitrary topologies without manual reconfiguration:
1. **Bidirectional Topology Sync**: Whenever any topology preset is loaded (`Linear 3-Node`, `Diamond Multi-Path`, `ARPANET 1972 Core`, `Dual-Ring & Cross Links`, or `Random Mesh Generator`), the web dashboard automatically publishes the live node and edge inventory to the bridge server via `POST /api/topology`.
2. **Dynamic Terminal Auto-Detection**: Terminal CLI tools (`mn-cli` and `.\monkey`) query `GET /api/topology` on execution, automatically detecting the active mesh name, node count, link inventory, and available router labels.
3. **Context-Aware Fault Injection**: Commands like `.\monkey sever` or `.\monkey crash` intelligently pick active links and routers from whichever topology is currently displayed on the canvas.

---

## 9. Educational Algorithm Inspectors

Located in `src/components/education/AlgorithmEducationalInspector.tsx` and `src/components/inspector/RouterInspector.tsx`.

### 1. Dijkstra Step-by-Step Inspector (LSR Mode)
- **Visited Set ($S$)**: Highlights finalized shortest path nodes in **emerald green**.
- **Candidate Frontier Set ($Q$)**: Highlights pending frontier nodes in **amber**.
- **Dynamic Relaxation Table**: Displays tentative distances $\text{dist}[u]$ and predecessor pointers $\text{prev}[u]$ updating row-by-row during priority queue extractions.

### 2. Bellman-Ford Neighbor Relaxation Matrix (DVR Mode)
- Renders an interactive matrix displaying every adjacent neighbor's advertised distance $D_v(y)$.
- Computes $c(x, v) + D_v(y)$ for all $v \in N(x)$ and **visually highlights the winning neighbor $v^*$** that established the minimum-cost route.

---

## 10. Comparative Analytics Scoreboard & Live Chart

Located in `src/core/analytics/MetricsCollector.ts` and `src/components/analytics/ComparativeScoreboard.tsx`.

The Scoreboard computes four real-time quantitative metrics under synchronized clock execution:
1. **Convergence Duration (Ticks)**: Discrete ticks required to achieve global routing table stability.
2. **Protocol Message Overhead**: Cumulative control packets exchanged ($\text{LSPs flooded}$ vs $\text{DVs exchanged}$).
3. **State Memory Footprint (Bytes)**: Total memory consumed across all routers:
   $$\text{LSR Memory} = \mathcal{O}(|V| + |E|) \quad \text{vs} \quad \text{DVR Memory} = \mathcal{O}(|V|)$$
4. **Routing Loop Persistence**: Total ticks where temporary forwarding loops or blackholes existed.
5. **Interactive SVG Convergence Chart**: A real-time line graph plotting convergence progression over time.

---

## 11. Design System & UI/UX Aesthetics

The simulator features a bespoke design system engineered to look visually stunning, high-contrast, and professional:
- **Palette Foundation**:
  - **Peach Band** (`--bg-tertiary: #FEE2CF`): Used for header accents, badge borders, and selected nodes.
  - **Cream Band** (`--bg-secondary: #FEEFE5`): Used for panel backgrounds and canvas canvas ambient surfaces.
  - **Sky Blue Band** (`--accent-cyan: #3B8BEB`, `--accent-sky: #94C8FD`): Used for primary interactive buttons, active links, and forward packet capsules.
- **Glassmorphism Panels**: `backdrop-filter: blur(14px)` with subtle semi-transparent white fills (`rgba(255, 255, 255, 0.88)`).
- **Luminous Particle Packets**: Forward LSP capsules emit a soft cyan glow (`box-shadow: 0 0 12px rgba(59, 139, 235, 0.6)`), while Distance Vector capsules emit an amber glow.
- **Typography**: Clean modern typography using `Plus Jakarta Sans` for UI labels and `Fira Code` for numerical metrics and routing tables.

---

## 12. Complete File-by-File Codebase Inventory

### Core Engine (`src/core/`)
| File Path | Functional Description |
| :--- | :--- |
| `src/core/types.ts` | Foundational TypeScript interfaces (`NodeId`, `LinkId`, `RouterNode`, `NetworkLink`, `Packet`, `RoutingTableEntry`, `StateSnapshot`). |
| `src/core/NetworkGraph.ts` | Graph data structure managing nodes, edges, adjacency matrices, weight mutations, and snapshot exports. |
| `src/core/SimulationClock.ts` | Discrete simulation clock managing play, pause, single-step forward, tick scheduling, and speed multipliers. |
| `src/core/StateLedger.ts` | Immutable snapshot ledger providing circular history buffers and instant time-travel rollback. |
| `src/core/lsr/LinkStateEngine.ts` | Link State protocol engine executing LSP generation, sequence checks, duplicate suppression, and LSDB synchronization. |
| `src/core/lsr/Dijkstra.ts` | Priority-queue Dijkstra SPF implementation instrumented with Visited ($S$) and Frontier ($Q$) set tracking. |
| `src/core/dvr/DistanceVectorEngine.ts` | Distance Vector protocol engine executing Bellman-Ford relaxation, Split Horizon, and Poison Reverse. |
| `src/core/chaos/ChaosEngine.ts` | Fault injection engine simulating Bernoulli link flapping, transmission delay jitter, and router crash/reboots. |
| `src/core/tracer/PacketTracer.ts` | Packet tracer tracking hop-by-hop forwarding, TTL decrements, routing loop detection, and packet drop reasons. |
| `src/core/analytics/MetricsCollector.ts`| Real-time analytics engine computing convergence ticks, message overhead counts, and memory footprint. |
| `src/core/presets/library.ts` | Topology preset definitions: Classic Triangle, Diamond Multi-Path, 6-Node Dense Mesh, Ring, Linear Chain, ARPANET 1972 Core, and Dual-Ring & Cross Links. |
| `src/core/mininet/MininetBridgeClient.ts` | TypeScript REST client communicating with Mininet bridge on port 8080 with offline fallback and standalone Python script generator. |
| `src/core/mininet/mininetTypes.ts` | Type definitions for Mininet status, kernel routes, ping results, and export configuration. |

### UI & Visualization Components (`src/components/`)
| File Path | Functional Description |
| :--- | :--- |
| `src/components/canvas/TopologyCanvas.tsx` | SVG topology canvas with node drag-and-drop physics, link modal, orthogonal flight lanes, and Chaos animators. |
| `src/components/canvas/EdgeModal.tsx` | Interactive modal dialog for editing link costs, latency, and operational status (Up / Down). |
| `src/components/race/DualRaceView.tsx` | Split-viewport container for synchronized side-by-side Link State vs Distance Vector execution. |
| `src/components/analytics/ComparativeScoreboard.tsx` | Metrics scoreboard comparing convergence speed, packet counts, memory footprint, and loop timers. |
| `src/components/analytics/ConvergenceChart.tsx` | Interactive SVG line chart plotting real-time convergence dynamics over simulation ticks. |
| `src/components/education/AlgorithmEducationalInspector.tsx` | Step-by-step educational inspector displaying Dijkstra $S/Q$ sets and Bellman-Ford neighbor relaxation tables. |
| `src/components/inspector/RouterInspector.tsx` | Router inspector drawer displaying node-specific routing tables, LSDB entries, and neighbor distance vectors. |
| `src/components/toolbar/SimulationBar.tsx` | Bottom control bar housing Play, Pause, Step Forward, Reset, and Speed Slider. |
| `src/components/timetravel/TimelineScrubber.tsx` | Interactive timeline scrubber allowing users to drag backward and forward across historical ticks. |
| `src/components/chaos/ChaosPanel.tsx` | Chaos Monkey control drawer for triggering link flaps, latency jitter, and router crashes. |
| `src/components/tracer/PacketTracerBar.tsx` | Ping / packet transmission tool allowing users to send test datagrams between any two nodes. |
| `src/components/presets/PresetModal.tsx` | Modal dialog for loading pre-configured standard network topologies. |
| `src/components/mininet/MininetModal.tsx` | Interactive Mininet modal featuring live connection status, Linux kernel FIB viewer, ping console, and Python export. |

### Host Scripts & CLI Tooling (Root)
| File Path | Functional Description |
| :--- | :--- |
| `mininet.ps1` / `mininet.bat` | Windows PowerShell & CMD wrapper forwarding commands seamlessly into the active Mininet Docker container. |
| `monkey.ps1` / `monkey.bat` | Dedicated Chaos Monkey tool featuring automatic live mesh topology detection and dynamic target resolution. |
| `run_demo_animations.ps1` / `.bat` | Automated end-to-end animation showcase script exercising all 7 visual animators with timed intervals. |

### Application Shell & Root (`src/`)
| File Path | Functional Description |
| :--- | :--- |
| `src/App.tsx` | Main application orchestrator managing state synchronization, layout toggles (Single vs Race), and modal states. |
| `src/main.tsx` | React 18 DOM mount point. |
| `src/index.css` | Complete Vanilla CSS design tokens, Peach/Cream/Sky Blue palette, animations, and glassmorphism styles. |

---

## 13. Verification & Testing Suite (79/79 Tests)

The entire codebase is verified by **79 automated tests across 13 test suites** executed via **Vitest** with a **100% pass rate in ~1.59s**:

```
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

## 14. Academic Course Project Report Specification

For academic submission (**VIT - School of Computer Science Engineering and Information Systems, B.Tech IT, BITE305L - Computer Networks, Slot D2+TD2**), the project includes a formal **42-page technical report specification**:

### Report Structure & Key Chapters:
1. **Front Matter**: Official Course Project Cover Page, Student Declaration of Originality, and Repaginated Table of Contents.
2. **Chapter 5 (Literature Review)**: In-depth analytical review of **15 peer-reviewed papers (2023–2026)** across IEEE/ACM/Elsevier, synthesized with a comparative feature matrix.
3. **Chapter 6 (Architecture)**: 5 core subsystems, unidirectional tick lifecycle, 2D orthogonal flight lane geometry ($P(t) \pm \delta \cdot \vec{n}$), and containerized Mininet dual-plane architecture.
4. **Chapter 7 & 8 (Methodologies & Implementation)**: Link State flooding & sequence check, Distance Vector Bellman-Ford relaxation, Split Horizon & Poison Reverse (metric 16 clamping), time-travel ledger, Mininet REST bridge, unified CLI tooling, and SVG visual animators.
5. **Chapter 9 & 10 (Results & Benchmarks)**: 8 empirical benchmark tables comparing convergence ticks, control packet overhead, router state memory footprint, loop durations, and Linux kernel FIB convergence latencies.
6. **Repository Decoupling**: Build scripts and compiled documents are maintained modularly outside the active development workspace to keep the runtime clean and production-focused.

---

---

## 15. Live Demonstration & Viva Defense Guide

When demonstrating the project to an evaluator, professor, or peer, follow this structured walkthrough:

### Demo Step 1: Launch the Simulator
```bash
npm run dev
```
Open `http://localhost:5173`. The application opens with the **Diamond Multi-Path** topology in the Peach & Cream theme.

### Demo Step 2: Show Synchronized Dual-Engine "Race Mode"
1. Click the **Race Mode** button (`⚔️ Race View`) in the top navigation bar.
2. The screen splits into two synchronized viewports: **Link State (OSPF)** on the left and **Distance Vector (RIP)** on the right.
3. Click **Step** (`⏭`):
   - On the left (LSR), observe radiating cyan LSP capsules flooding outward to all nodes.
   - On the right (DVR), observe amber vector packets exchanging strictly between 1-hop neighbors.
4. Point out the **Directional Flight Lanes**: Opposing packets glide on separate parallel tracks without colliding.

### Demo Step 3: Demonstrate Real-Time Comparative Scoreboard
1. Click the **Scoreboard** button (`📊 Scoreboard`).
2. Show the live metrics comparing:
   - Convergence speed (LSR converges in 2 ticks vs DVR in 4 ticks).
   - Control packet counts (LSR transmits more initial packets due to flooding).
   - Memory footprint (LSR stores full $O(V+E)$ graph vs DVR storing $O(V)$ vectors).
3. Show the real-time SVG convergence curve.

### Demo Step 4: Demonstrate Count-to-Infinity in the Pathology Lab
1. Load the **Linear Chain** preset from the Presets modal (`📁 Presets`).
2. Switch to **Distance Vector** mode.
3. Click on the link between Router B and Router C, and set its status to **Down**.
4. Step forward without Split Horizon:
   - Observe Router A and B incrementing metrics ($2 \to 3 \to 4 \dots$) up to 16.
5. Toggle **Poison Reverse**:
   - Observe that Router B instantly advertises metric 16 back to A, terminating the loop in **exactly 1 tick**!

### Demo Step 5: Demonstrate Time-Travel Scrubbing
1. After running 10 ticks, pause the simulation.
2. Drag the bottom **Timeline Scrubber** backward from tick 10 to tick 3.
3. Notice that the entire canvas, routing tables, and in-flight packets instantly revert to their exact historical state at tick 3 with zero latency.
4. Scrub forward to tick 10 to resume.

### Demo Step 6: Demonstrate Educational Inspectors
1. Click **Inspect Algorithm** (`🔬 Inspector`).
2. Select any router (e.g., Router A):
   - In **LSR mode**, show the **Visited Set $S$** (green) and **Candidate Frontier $Q$** (amber) updating row-by-row with predecessor pointers.
   - In **DVR mode**, show the **Bellman-Ford relaxation matrix** highlighting the specific neighbor $v^*$ that gave the best route.

### Demo Step 7: Run Automated Verification Suite
```bash
npm test
```
Show that all **79 tests across 13 test files pass with 100% success** in ~1 second.

---

## 16. Mininet Layer 3 Network Emulation Backend & Web Bridge

### 16.1 Why Mininet is Required
In academic environments and lab evaluations, professors require proof of real packet forwarding and network stack operation rather than purely synthetic in-browser animations. To satisfy this requirement, the project implements a **complete dual-plane architecture**:
1. **Emulation Data Plane (Mininet / Linux Kernel)**: Runs real Linux network namespaces (`netns`), real virtual ethernet (`veth`) pairs, kernel IP forwarding (`net.ipv4.ip_forward=1`), and real Python routing daemons exchanging packets over UDP sockets.
2. **Telemetry & Control Plane (Web Dashboard)**: Visualizes the live Mininet network, streams real Linux kernel routing tables (`ip route`), allows 1-click link failure injection, and triggers real ICMP pings.

### 16.2 Mininet Subsystem Architecture

```
+-----------------------------------------------------------------------------------+
|                        Web Dashboard Control Plane                                |
|   - Topology Canvas | Mininet Modal | Packet Tracer | Dual Race View              |
+-----------------------------------------------------------------------------------+
                                          ▲
                                          │ HTTP REST API (JSON / CORS enabled)
                                          ▼
+-----------------------------------------------------------------------------------+
|               Mininet REST Bridge Server (`mininet/bridge_server.py`)             |
|   GET  /api/status   -> Emulation health, node count, link states                 |
|   GET  /api/routes   -> Real Linux kernel routing tables (`ip -j route show`)     |
|   POST /api/link     -> Live virtual link cut / restore (`configLinkStatus`)      |
|   POST /api/protocol -> Switch daemons between Link State (OSPF) & DV (RIP)       |
|   POST /api/ping     -> Execute real multi-hop ICMP echo across namespaces        |
|   POST /api/export   -> Export active topology as custom standalone Mininet code  |
+-----------------------------------------------------------------------------------+
                                          ▲
                                          │ Python IPC / Linux Namespaces
                                          ▼
+-----------------------------------------------------------------------------------+
|                     Mininet Real Linux Router Emulation                           |
|                                                                                   |
|   [ Router R1 Namespace ]                     [ Router R2 Namespace ]             |
|   - Kernel FIB (`ip route`)                   - Kernel FIB (`ip route`)           |
|   - UDP 5000/5001 Daemon                      - UDP 5000/5001 Daemon              |
|   - veth: 10.0.1.1/24  <====================> - veth: 10.0.1.2/24                 |
|             ▲                                           ▲                         |
|             ║ veth (10.0.2.0/24)                        ║ veth (10.0.3.0/24)      |
|             ▼                                           ▼                         |
|   [ Router R4 Namespace ]                     [ Router R3 Namespace ]             |
|   - Kernel FIB (`ip route`)                   - Kernel FIB (`ip route`)           |
|   - UDP 5000/5001 Daemon                      - UDP 5000/5001 Daemon              |
|   - veth: 10.0.4.1/24  <====================> - veth: 10.0.4.2/24                 |
+-----------------------------------------------------------------------------------+
```

### 16.3 Mininet Codebase Inventory

| File | Path | Description |
| :--- | :--- | :--- |
| `setup.sh` | `mininet/setup.sh` | Automated Ubuntu/Debian/WSL installer for Mininet, Open vSwitch, Python, and networking tools. |
| `topology_runner.py` | `mininet/topology_runner.py` | Master Mininet orchestrator. Initializes Linux routers, sets subnets, spawns bridge server, and drops into Mininet CLI. |
| `routing_daemons.py` | `mininet/routing_daemons.py` | Python socket routing daemons for LSR (UDP 5000) and DVR (UDP 5001). Modifies real Linux FIB via `ip route replace ... proto lsr/dvr`. |
| `bridge_server.py` | `mininet/bridge_server.py` | Zero-dependency HTTP REST bridge with CORS support for seamless web browser telemetry. |
| `export_generator.py` | `mininet/export_generator.py` | Python module converting arbitrary JSON graphs into standalone, executable Mininet `.py` scripts. |
| `README.md` | `mininet/README.md` | Complete academic submission guide and step-by-step viva presentation script for professors. |
| `MininetBridgeClient.ts` | `src/core/mininet/MininetBridgeClient.ts` | TypeScript bridge client with offline graceful fallback and browser-side Python script generator. |
| `mininetTypes.ts` | `src/core/mininet/mininetTypes.ts` | Type definitions for Mininet status, kernel routes, and ping telemetry. |
| `MininetModal.tsx` | `src/components/mininet/MininetModal.tsx` | Interactive UI modal featuring live status badge, kernel FIB table viewer, ping console, and 1-click Python export. |
| `mininet.test.ts` | `src/core/__tests__/mininet.test.ts` | Unit tests validating Mininet script generation, link parameters, router definitions, and bridge fallback. |

### 16.4 How to Demonstrate to Your Professor

1. **Step 1: Start Mininet in Ubuntu or WSL**
   ```bash
   sudo python3 mininet/topology_runner.py --topo diamond --bridge-port 8080
   ```
2. **Step 2: Inspect Real Linux Routing Table in Mininet CLI**
   ```bash
   mininet> r1 ip route show
   ```
   *Show the professor the `proto lsr` or `proto dvr` entries installed into the Linux kernel by our daemons!*
3. **Step 3: Execute Real Multi-Hop Ping**
   ```bash
   mininet> r1 ping -c 3 10.3.0.1
   ```
   *Packets traverse real Linux veth interfaces with TTL decrementing at each hop.*
4. **Step 4: Demonstrate Live Link Failure & Dynamic Failover**
   ```bash
   mininet> link r1 r2 down
   mininet> r1 ip route show
   ```
   *The routing daemons detect the link loss, recalculate the shortest paths via Dijkstra / Bellman-Ford, and immediately update the kernel route through Router 4!*
5. **Step 5: Inspect Live State on the Web Dashboard**
   Open `http://localhost:5173`, click the **Mininet** button in the top navbar, and show:
   - Green **Connected** status badge.
   - Live Linux Kernel Routing Table (FIB) synchronized with Mininet.
   - 1-Click **Download Mininet Script (.py)** for any topology drawn on the canvas.

---

## 17. Cloud-Native Docker & Kubernetes Containerization Architecture

To meet enterprise and academic production standards, the entire simulation stack is fully containerized and orchestrated via **Docker Compose** and **Kubernetes (K8s)** manifests.

```
+-----------------------------------------------------------------------------------+
|                           Kubernetes Cluster (or Docker)                          |
|                                                                                   |
|  +-------------------------------------+   +-----------------------------------+  |
|  |     web-dashboard (Pod Replicas)    |   |     mininet-engine (Pod)          |  |
|  |  - Node.js 20 / Nginx Alpine        |   |  - Ubuntu 22.04                   |  |
|  |  - Telemetry Canvas & Route Visual  |   |  - Linux Kernel Namespaces (netns)|  |
|  |  - Port 80 (NodePort 30573)         |   |  - Open vSwitch & veth pairs      |  |
|  |  - Reverse-proxy /api -> mininet    |   |  - Socket Daemons (LSR/DVR)       |  |
|  |                                     |   |  - Port 8080 (REST Bridge)        |  |
|  +-------------------------------------+   +-----------------------------------+  |
|                     ▲                                        ▲                    |
|                     │ Service: web-dashboard                 │ Service: mininet   |
|                     └───────────────────┬────────────────────┘                    |
|                                         │ Ingress                                 |
+-----------------------------------------┼-----------------------------------------+
                                          ▼
                                Client Browser / Evaluator
```

### 17.1 Docker Architecture & Compose Orchestration

* **`mininet/Dockerfile`**: High-performance Ubuntu 22.04 container pre-configured with Mininet, Open vSwitch, iproute2, iptables, and Python 3. Runs in `privileged` mode with `NET_ADMIN` and `SYS_ADMIN` capabilities to enable genuine Linux kernel network namespaces (`netns`) and virtual Ethernet pairs (`veth`).
* **`Dockerfile` (Root)**: Multi-stage build for the Web Dashboard:
  * *Stage 1 (Builder):* Compiles the React 18 + TypeScript 5.5 SPA bundle using Vite in `node:20-alpine`.
  * *Stage 2 (Runner):* Serves static assets with `nginx:alpine` and reverse-proxies `/api/` traffic directly to the Mininet service on port 8080.
* **`docker-compose.yml`**: One-command full-stack orchestration:
  ```bash
  docker compose up --build
  ```
  Spins up `routing_mininet_engine` and `routing_web_dashboard` on a shared bridge network (`routing-simulator-net`).

### 17.2 Kubernetes Manifests (`k8s/` Directory)

For university clusters, Minikube, or cloud environments (GKE, EKS, AKS):

| Manifest File | Kind | Purpose |
| :--- | :--- | :--- |
| `k8s/namespace.yaml` | `Namespace` | Creates isolated `routing-simulator` namespace. |
| `k8s/configmap.yaml` | `ConfigMap` | Stores environment configuration (`MININET_TOPO`, `ROUTING_PROTOCOL`, `BRIDGE_PORT`). |
| `k8s/mininet-deployment.yaml` | `Deployment` | Runs Mininet with `securityContext.privileged: true` and `NET_ADMIN` capabilities with host `/lib/modules` mount. |
| `k8s/mininet-service.yaml` | `Service` | Internal ClusterIP service exposing the REST bridge on port `8080`. |
| `k8s/dashboard-deployment.yaml` | `Deployment` | Highly available 2-replica deployment of the Nginx-backed web telemetry dashboard. |
| `k8s/dashboard-service.yaml` | `Service` | NodePort service exposing the dashboard on port `30573`. |
| `k8s/ingress.yaml` | `Ingress` | Ingress resource with Nginx rewrite annotations routing `/` to the dashboard and `/api/` to Mininet. |
| `k8s/README.md` | Documentation | Complete step-by-step deployment and verification guide. |

### 17.4 Docker Desktop Graphical Telemetry & Container Inspection

Users running the simulator in Docker Desktop can inspect hardware usage, live server logs, and Linux bash shells directly:

1. **Containers Overview**:
   - `routing_web_dashboard` (Port `5173`): Serves the React 18 UI and SVG canvas.
   - `routing_mininet_engine` (Port `8080`): Privileged Linux kernel container running the emulation engine and HTTP bridge.
2. **Docker Desktop Tabs**:
   - **`Logs` Tab**: Live streaming output showing every `POST /api/chaos`, `POST /api/ping`, and `POST /api/link` action executed by the simulator or CLI.
   - **`Terminal / Exec` Tab**: Direct root Linux shell inside the emulated network (`root@...:/app/mininet#`).
   - **`Stats` Tab**: Real-time graphs of CPU, memory, and network throughput under heavy packet flooding and link flapping.

---

## 18. Unified CLI Tooling & Easy Command Reference (`mn-cli` & `mininet.ps1`)

To eliminate the need for complex, error-prone `curl` commands, the simulator provides dedicated, human-friendly CLI tooling accessible both inside the Linux container and from the Windows PowerShell host.

### 18.1 Dual Execution Environments

| Execution Environment | Tool Invocation | Description |
| :--- | :--- | :--- |
| **Inside Mininet Container** | `mn-cli <command> [args]` | Pre-installed at `/usr/local/bin/mn-cli`. Direct execution in Linux bash. |
| **Windows Host Terminal** | `.\mininet <command> [args]` | PowerShell & CMD wrapper forwarding commands seamlessly into Docker. |
| **Chaos Monkey Quick-Trigger** | `.\monkey <action> [args]` | Dedicated Chaos tool with automatic live mesh topology detection. |
| **Automated Demonstration** | `.\run_demo_animations.ps1` | Full end-to-end automated animation showcase script with timed pauses. |

---

### 18.2 Complete Command Reference & Action Mapping

| Command Syntax | Action Description | Visual Canvas Effect |
| :--- | :--- | :--- |
| `mn-cli ping <src> <dst>` | Sends real multi-hop ICMP echo ping packets across virtual Linux interfaces. | **Glowing Cyan Packet** physically glides along the shortest path with TTL countdown and Echo Reply. |
| `mn-cli routes` | Formats and prints real Linux kernel FIB routing tables for all routers in clean ASCII tables. | Displays Destination, Gateway, Interface, Metric, and Protocol (`LSR` or `DVR`). |
| `mn-cli status` | Displays live emulation status, router health (ACTIVE/CRASHED), and link metrics. | Summary table of the active topology. |
| `mn-cli sever <src> <dst>` | Cuts the virtual ethernet link between two router endpoints. | **Crackling Red Electric Laser Beam** across the link with a glowing `⚡ SEVERED` badge. |
| `mn-cli restore [src] [dst]` | Restores a specific severed link, or restores **all** links and routers when run without arguments. | **Emerald Restorative Pulse Rings** radiating outward from restored endpoints. |
| `mn-cli crash <router>` | Forces a router node completely offline, dropping all transit packets. | **Concentric Fiery Explosion Shockwaves** around the router with a `💥 CRASHED` badge. |
| `mn-cli recover <router>` | Brings a crashed router back online to re-establish neighbor adjacencies. | Emerald recovery wave expanding from the recovered router. |
| `mn-cli jitter <src> <dst> <cost>` | Perturbs the link metric to simulate congestion. | **Floating Flame Pop Badge** (`🔥 Cost: X ➔ Y`) rising above the link midpoint. |
| `mn-cli flap <src> <dst>` | Injects rapid link flapping oscillation every 2 ticks. | **Pulsing Amber Caution Hazard Beam** glowing continuously along the flapping link. |
| `mn-cli proto lsr` | Switches network daemons to Link State Routing (OSPF / Dijkstra SPF). | Protocol badges update, LSDB synchronizes, and SPF trees recompute. |
| `mn-cli proto dvr` | Switches network daemons to Distance Vector (RIP / Bellman-Ford). | Distance Vector exchange matrices activate and poison reverse rules apply. |
| `mn-cli help` | Prints the built-in colorized cheat sheet and syntax reference. | Interactive terminal guide. |

---

## 19. Implementation Timeline, Dates & Milestone Log

The simulator was engineered in structured chronological milestones, each with dedicated functional scope, unit test suites, and operational deliverables:

| Date | Phase / Milestone | Features & Systems Implemented | Artifacts / Components | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Oct 26, 2026** | **Phase 1: Simulation Core & Dual Race Engine** | Discrete tick manager, deep immutable state ledger, Link State (OSPF) engine with reliable LSP flooding, Distance Vector (RIP) engine with Bellman-Ford relaxation, synchronized split-viewport DualRaceView. | `SimulationClock.ts`, `StateLedger.ts`, `LinkStateEngine.ts`, `DistanceVectorEngine.ts`, `DualRaceView.tsx` | 33 Unit Tests PASS |
| **Oct 27, 2026** | **Phase 2: Pathology Lab & Educational Inspectors** | Count-to-Infinity isolation, toggleable Split Horizon and Poison Reverse (metric 16 clamping), step-by-step educational Dijkstra inspector ($S$ vs $Q$ sets), Bellman-Ford neighbor relaxation matrix. | `pathology.test.ts`, `AlgorithmEducationalInspector.tsx`, `RouterInspector.tsx` | 45 Unit Tests PASS |
| **Oct 28, 2026** | **Phase 3: 2D Orthogonal Flight Lane Geometry** | Closed-form vector coordinate math ($P(t) \pm \delta \cdot \vec{n}$) separating opposing bidirectional packet capsules into parallel 28px corridors without collision. | `TopologyCanvas.tsx`, `fig_flight_lanes.png` | 60 Unit Tests PASS |
| **Oct 29, 2026** | **Phase 4: Comparative Analytics & Timeline Scrubbing** | Real-time Comparative Scoreboard tracking convergence duration, packet counts, memory footprint, and loop timers; interactive SVG convergence line chart; bidirectional historical timeline scrubber. | `MetricsCollector.ts`, `ComparativeScoreboard.tsx`, `ConvergenceChart.tsx`, `TimelineScrubber.tsx` | 75 Unit Tests PASS |
| **Oct 30, 2026** | **Phase 5: Mininet Layer 3 Kernel Emulation** | Real Linux network namespaces (`ip netns`), virtual Ethernet (`veth`) pairs, Python socket routing daemons (UDP 5000/5001), kernel FIB route installation (`ip route replace ... proto lsr`), zero-dependency REST bridge (`bridge_server.py`). | `mininet/topology_runner.py`, `mininet/routing_daemons.py`, `mininet/bridge_server.py`, `MininetBridgeClient.ts`, `mininet.test.ts` | 79 Unit Tests PASS |
| **Oct 31, 2026** | **Phase 6: Cloud-Native Container Orchestration** | High-performance multi-container Docker Compose setup (`routing_web_dashboard` on port 5173, `routing_mininet_engine` on port 8080 with `NET_ADMIN`), complete Kubernetes manifests (`k8s/`). | `Dockerfile`, `docker-compose.yml`, `k8s/` | Containers Healthy (Up 4+ hours) |
| **Nov 1, 2026** | **Phase 7: Chaos Monkey Visual Animators Suite** | Hardware-accelerated SVG/CSS visual animators: Electric Laser Lightning Beam (`#F43F5E` + `#FFFFFF`), Midpoint Spark Burst (`⚡ SEVERED`), Fiery Explosion Shockwaves (`💥 CRASHED`), Flame Pop Metric Jitter (`🔥 Cost: X ➔ Y`), Pulsing Caution Hazard Flapping Beam (`⚠️ FLAPPING`), Concentric Emerald Healing Waves (`#10B981`), Breathing HUD indicator. | `TopologyCanvas.tsx`, `ChaosEngine.ts`, `ChaosPanel.tsx`, `index.css` | 79 Unit Tests PASS |
| **Nov 2, 2026** | **Phase 8: Multi-Mesh Auto-Detection & Unified CLI** | Live two-way mesh synchronization (`POST /api/topology`) supporting Linear, Diamond, ARPANET 1972 Core, Dual-Ring & Cross Links, and Random Mesh; unified CLI tooling (`mn-cli` in Linux container, `mininet.ps1` and `monkey.ps1` on Windows host); automated demonstration script (`run_demo_animations.ps1`). | `mn-cli`, `mininet.ps1`, `monkey.ps1`, `run_demo_animations.ps1`, `library.ts` | 79/79 PASS (100% Success in 1.59s) |

---
*Updated automatically for the Interactive Link State and Distance Vector Simulator repository — November 2, 2026.*


