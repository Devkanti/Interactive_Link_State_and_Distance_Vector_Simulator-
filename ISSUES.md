# RoutingSimulator: Phased Engineering Issues & Milestone Roadmap

This document outlines the complete breakdown of tasks and GitHub-ready issues for **RoutingSimulator (Interactive Link State & Distance Vector Convergence Simulator)**. Issues are organized into sequential phases with explicit acceptance criteria, labels, and architectural dependencies.

---

## 📌 Phase Summary & Milestone Map

| Phase | Milestone Name | Objective | Target Issues |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Core Simulation Engine & Data Models** | Pure protocol algorithms, discrete-event clock, and state ledger | `#1` to `#4` |
| **Phase 2** | **Interactive Topology Canvas & Visual Editor** | Interactive graph canvas, preset topologies, and routing table inspectors | `#5` to `#7` |
| **Phase 3** | **Novelty Simulation Features & Chaos Engine** | In-flight packet tracer, loop visualizer, chaos monkey, time-travel scrubber | `#8` to `#10` |
| **Phase 4** | **Dual-Engine Race Mode & Comparative Analytics** | Synchronized side-by-side LSR vs DVR benchmark and metrics dashboard | `#11` to `#12` |
| **Phase 5** | **Educational Deep-Dive, Testing & Lab Export** | Step-by-step algorithm inspectors, test suite, and academic report generator | `#13` to `#15` |

---

## 🚀 Phase 1: Core Simulation Engine & Data Models

### Issue #1: Network Topology Data Model & Discrete-Event Clock Engine
* **Labels**: `core-engine`, `data-structures`, `phase-1`
* **Description**:  
  Establish the foundation data models for network topologies (nodes, directed/undirected edges, weights, interface state UP/DOWN) and a deterministic discrete-event simulation clock that records historical state snapshots.
* **Acceptance Criteria**:
  - [x] Implement `NetworkGraph` class supporting dynamic addition/removal of nodes and weighted links.
  - [x] Implement node statuses (`ACTIVE`, `CRASHED`) and edge statuses (`UP`, `DOWN`, `FLAPPING`).
  - [x] Implement `SimulationClock` supporting tick-based increments, pause, reset, and step execution.
  - [x] Implement `StateLedger` which captures an immutable snapshot of all routing tables and graph states at every tick $t$.
  - [x] Provide comprehensive unit tests verifying graph mutation and snapshot integrity.

---

### Issue #2: Link State Routing (LSR / OSPF-style) Protocol Engine
* **Labels**: `core-engine`, `algorithm`, `link-state`, `phase-1`
* **Description**:  
  Implement the full Link State Routing protocol pipeline, including Link State Packet (LSP) generation, reliable flooding with sequence numbers and age, synchronized Link State Database (LSDB), and Dijkstra's Shortest Path First (SPF) algorithm.
* **Acceptance Criteria**:
  - [x] Define `LinkStatePacket` structure: `(senderId, sequenceNumber, age, neighborsWithCosts)`.
  - [x] Implement controlled flooding algorithm with duplicate suppression and sequence number tracking.
  - [x] Implement synchronized `LSDB` (Link State Database) per node.
  - [x] Implement Dijkstra's SPF algorithm computing the shortest-path tree from any root node.
  - [x] Generate standard Forwarding Table (`Destination`, `NextHop`, `TotalCost`, `Path`) for each router.
  - [x] Handle link cost dynamic changes and edge down events by triggering incremental LSP floods.

---

### Issue #3: Distance Vector Routing (DVR / RIP-style) Protocol Engine
* **Labels**: `core-engine`, `algorithm`, `distance-vector`, `phase-1`
* **Description**:  
  Implement the Distance Vector protocol modeling Bellman-Ford iterative exchanges. Routers exchange distance vectors exclusively with direct operational neighbors during exchange ticks.
* **Acceptance Criteria**:
  - [x] Define `DistanceVector` message payload: array of `(destNodeId, cost)`.
  - [x] Implement local routing table for each node: `(destination, cost, nextHop)`.
  - [x] Implement Bellman-Ford relaxation step on tick update:
    $$D_x(y) = \min_v \{ c(x,v) + D_v(y) \}$$
  - [x] Implement convergence detector that flags the network as `STABLE` when no vector changes occur across a full iteration.
  - [x] Track message exchange overhead (count of vectors transmitted per tick).

---

### Issue #4: Distance Vector Pathology Engine (Count-to-Infinity & Mitigations)
* **Labels**: `core-engine`, `pathology`, `distance-vector`, `novelty`, `phase-1`
* **Description**:  
  Implement configurable switches for routing pathologies and mitigations, including standard Count-to-Infinity ($\infty = 16$), Split Horizon, and Poison Reverse.
* **Acceptance Criteria**:
  - [x] Add global/per-node toggles:
    - `splitHorizonEnabled: boolean`
    - `poisonReverseEnabled: boolean`
    - `infinityThreshold: number` (default: 16)
  - [x] Implement standard Count-to-Infinity behavior when Split Horizon is disabled and a critical link breaks.
  - [x] Implement Split Horizon logic: omit routes learned via neighbor $V$ when advertising to $V$.
  - [x] Implement Poison Reverse logic: advertise routes learned via neighbor $V$ to $V$ with metric $\infty$.
  - [x] Unit tests verifying that Count-to-Infinity halts at $\infty = 16$ or converges cleanly with Poison Reverse on standard 3-node linear topologies.

---

## 🎨 Phase 2: Interactive Topology Canvas & Visual Editor

### Issue #5: Interactive Canvas & Drag-and-Drop Node/Edge Editor
* **Labels**: `ui/ux`, `canvas`, `visualization`, `phase-2`
* **Description**:  
  Build a high-performance interactive network topology canvas supporting router drag-and-drop, link creation, metric editing, and instant visual status indicators.
* **Acceptance Criteria**:
  - [x] Interactive Canvas rendering nodes as clean router glyphs with labels (`R1`, `R2`, etc.).
  - [x] Drag-to-move nodes with automatic dynamic line re-anchoring.
  - [x] Click-and-drag between two nodes to create an edge.
  - [x] Inline click or modal on an edge to edit metric/weight in real time.
  - [x] Context menu / buttons to delete nodes, delete links, or toggle link state (`UP` / `DOWN`).
  - [x] Responsive canvas controls: Pan, Zoom to fit, and Reset view.

---

### Issue #6: Benchmark Preset Topology Library
* **Labels**: `ui/ux`, `templates`, `education`, `phase-2`
* **Description**:  
  Provide 1-click loading of standard academic and benchmark networking topologies to immediately demonstrate routing behaviors.
* **Acceptance Criteria**:
  - [x] **Preset 1: Linear 3-Node Topology ($A - B - C$)**: Specifically tuned to demonstrate Count-to-Infinity and Poison Reverse.
  - [x] **Preset 2: Diamond / Multi-Path Topology**: Demonstrates alternate path failover and load distribution.
  - [x] **Preset 3: ARPANET 1972 Core Subnet**: Classic historical benchmark topology.
  - [x] **Preset 4: Ring & Dual-Ring Topology**: Evaluates convergence speed and flapping behaviors.
  - [x] **Preset 5: Random Mesh Generator**: Customizable sliders for Node Count ($N$) and Link Probability ($P$) with guaranteed connectivity.

---

### Issue #7: Live Routing Table & LSDB Inspector Panels
* **Labels**: `ui/ux`, `inspectors`, `phase-2`
* **Description**:  
  Build interactive side drawers/panels that update in real time when any router is selected on the canvas.
* **Acceptance Criteria**:
  - [x] Clicking any router displays its active **Forwarding / Routing Table** (`Destination`, `Next Hop`, `Metric`, `Interface Status`).
  - [x] In Link State mode: render the synchronized **Link State Database (LSDB)** matrix.
  - [x] In Distance Vector mode: render the complete **Distance Vector Matrix** ($D_x(y)$ for all neighbors $v$).
  - [x] Visual color-coding: highlight newly updated routes or relaxed rows in green, invalidated routes in red.

---

## ⚡ Phase 3: Novelty Simulation Features & Chaos Engine

### Issue #8: Interactive "Chaos Monkey" Network Flapper & Fault Injector
* **Labels**: `novelty`, `chaos-engineering`, `simulation`, `phase-3`
* **Description**:  
  Implement an automated fault injection suite to test network resilience and visualize instability under adverse conditions.
* **Acceptance Criteria**:
  - [x] **Random Link Sever**: Randomly severs 1 or more links with configurable probability.
  - [x] **Router Crash**: Induces router crash (all incident links dropped, ceases LSP/DV transmission).
  - [x] **Metric Jitter / Congestion**: Randomly mutates edge weights by $\pm \Delta$ to simulate dynamic latency changes.
  - [x] **Link Flap Generator**: Rapidly cycles a selected link between `UP` and `DOWN` at a configurable interval (e.g., every 2 ticks) to demonstrate route flapping, route dampening, and OSPF hold-down timers.

---

### Issue #9: Live In-Flight Packet Tracer & Routing Loop Visualizer
* **Labels**: `novelty`, `packet-tracing`, `animation`, `phase-3`
* **Description**:  
  Enable users to inject test data packets into the network while routing is converging or while loops exist, visually showing the packet's path, TTL decrement, and drop animations.
* **Acceptance Criteria**:
  - [x] UI to select **Source Router $S$** and **Destination Router $D$** and click "Send Ping Packet".
  - [x] Packet object contains: `(packetId, src, dest, currentHop, ttl = 15, payload)`.
  - [x] Animated glowing particle moves across links according to the current router's forwarding table.
  - [x] **Loop Detection & TTL Expiry**:
    - If forwarding forms a cycle (e.g. $A \to B \to A$), the packet cycles along the loop.
    - Each hop decrements TTL.
    - When TTL reaches 0, animate a red "burst / packet dropped" effect with `ICMP Time Exceeded` notification.
  - [x] Success state: Packet reaching destination triggers green checkmark and latency/hop count badge.

---

### Issue #10: Deterministic Time-Travel Scrubber (State Stepper)
* **Labels**: `novelty`, `time-travel`, `ui/ux`, `phase-3`
* **Description**:  
  Implement a temporal playback toolbar allowing users to pause, step forward, step backward, or scrub back to any historical tick to debug convergence dynamics.
* **Acceptance Criteria**:
  - [x] Player controls: **Play**, **Pause**, **Step Forward (+1 tick)**, **Step Backward (-1 tick)**, **Speed Slider (0.5x, 1x, 2x, 5x)**.
  - [x] Interactive timeline scrubber slider spanning from tick $0$ to current tick $T_{max}$.
  - [x] Restoring tick $t$ completely restores:
    - Node & edge visual statuses
    - Forwarding tables across all routers
    - LSDB / Distance Vector matrices
    - Active packets in flight
  - [x] Visual indicators on timeline showing key events (e.g., "Link B-C Severed at tick 4").

---

## 🏁 Phase 4: Dual-Engine Race Mode & Comparative Analytics

### Issue #11: Side-by-Side Dual-Engine "Race" Mode View
* **Labels**: `novelty`, `comparative`, `split-screen`, `phase-4`
* **Description**:  
  Build a dedicated split-screen view running Link State Routing on the left and Distance Vector Routing on the right over identical topology and identical injected failure events.
* **Acceptance Criteria**:
  - [x] Dual-panel canvas layout: **Left = Link State (OSPF-style)**, **Right = Distance Vector (RIP-style)**.
  - [x] Synchronized graph updates: Editing a link or injecting a failure in either view automatically mirrors to both engines.
  - [x] Synchronized simulation clock: Single Play/Pause/Step controls both engines simultaneously.
  - [x] Distinct visual packet representations:
    - LSR shows LSP flood packets radiating outward.
    - DVR shows periodic vector exchanges between immediate neighbors.

---

### Issue #12: Real-Time Comparative Metrics Scoreboard
* **Labels**: `analytics`, `metrics`, `dashboard`, `phase-4`
* **Description**:  
  Display real-time side-by-side performance metrics comparing LSR and DVR throughout the simulation.
* **Acceptance Criteria**:
  - [x] **Convergence Time Metric**: Number of ticks required for all routing tables to stabilize after initialization or topology change.
  - [x] **Control Packet Overhead Metric**: Cumulative count of protocol messages exchanged (LSPs vs DV advertisements).
  - [x] **Memory / State Size**: Total database size stored across all routers (LSDB bytes vs Distance Vector bytes).
  - [x] **Inconsistency / Loop Duration**: Exact duration (in ticks) where forwarding tables harbored loops or stale routes.
  - [x] Real-time convergence comparison line chart (Chart.js / SVG) plotting convergence progress over time.

---

## 🔬 Phase 5: Educational Deep-Dive, Testing & Lab Export

### Issue #13: Step-by-Step Algorithm Educational Inspector
* **Labels**: `education`, `inspectors`, `algorithms`, `phase-5`
* **Description**:  
  Provide educational walkthrough inspectors explaining exactly how Dijkstra and Bellman-Ford perform calculations at the mathematical level.
* **Acceptance Criteria**:
  - [ ] **Dijkstra Step-by-Step Inspector**:
    - For any selected root node, step through the algorithm iteration by iteration.
    - Visually highlight **Visited Set $S$** (finalized nodes in green) and **Unvisited Set $Q$** (candidate frontier in orange).
    - Table showing Tentative Distances $dist[u]$ and Predecessors $prev[u]$ updating row-by-row.
  - [ ] **Bellman-Ford Relaxation Matrix**:
    - Visual table of the formula $D_x(y) = \min_v \{ c(x,v) + D_v(y) \}$.
    - Highlights which neighbor $v^*$ offered the lower cost path that caused a table update.

---

### Issue #14: Automated Unit & Protocol Verification Test Suite
* **Labels**: `testing`, `verification`, `ci`, `phase-5`
* **Description**:  
  Implement automated test suites covering algorithm correctness, convergence guarantees, and edge cases.
* **Acceptance Criteria**:
  - [ ] Unit tests for Dijkstra on cyclic, acyclic, and disconnected graphs.
  - [ ] Unit tests for Bellman-Ford convergence on classic 3-node, 5-node, and mesh graphs.
  - [ ] Tests for Split Horizon & Poison Reverse preventing 2-node routing loops.
  - [ ] Verification that Count-to-Infinity reaches 16 and marks routes unreachable when Split Horizon is disabled.
  - [ ] Packet tracer tests verifying loop detection and TTL decrement.
  - [ ] All tests run and pass via single command (`npm test` / `vitest`).

---

### Issue #15: Academic Lab Report & Scenario Export/Import Generator
* **Labels**: `export`, `documentation`, `academic`, `phase-5`
* **Description**:  
  Enable students and evaluators to save/load simulation topologies and export an academic lab report summarizing convergence performance.
* **Acceptance Criteria**:
  - [ ] **Export / Import Topology**: Save complete graph and configuration as clean `.json` file and restore it with 1 click.
  - [ ] **Academic Lab Summary Generator**:
    - Generates a formatted summary report (Markdown or printable PDF-friendly view).
    - Includes: Topology summary, convergence ticks for both algorithms, packet overhead comparison, failure response analysis, and conclusions.
  - [ ] 1-click "Download Report" button for academic assignment submission.

---

## 🎯 Implementation Sequence Recommendation

```
[Phase 1: Engines & Clock] ──> [Phase 2: Canvas & UI] ──> [Phase 3: Chaos & Loops] ──> [Phase 4: Race Mode] ──> [Phase 5: Inspector & Report]
        (Issues #1-#4)                 (Issues #5-#7)               (Issues #8-#10)            (Issues #11-#12)             (Issues #13-#15)
```

With this issue plan, each phase is self-contained, testable, and directly contributes to a standout academic networking project.
