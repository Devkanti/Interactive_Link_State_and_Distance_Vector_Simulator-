# Cloud-Native Kubernetes & Docker Deployment Guide

This guide documents the enterprise containerization and Kubernetes orchestration architecture for the **Interactive Link State & Distance Vector Simulator with Mininet L3 Network Emulation**.

---

## 1. Architecture Overview

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

---

## 2. Docker Compose (1-Command Full-Stack Setup)

### Prerequisites
* Docker & Docker Compose (Docker Desktop on Windows/Mac, or Docker CE on Linux).

### Launching the Stack
From the project root directory, run:
```bash
docker compose up --build
```

### Accessing the System
* **Web Telemetry Dashboard:** [`http://localhost:5173`](http://localhost:5173)
* **Mininet REST Bridge Status:** [`http://localhost:8080/api/status`](http://localhost:8080/api/status)
* **Linux Kernel FIB Routes:** [`http://localhost:8080/api/routes`](http://localhost:8080/api/routes)

### Stopping the Stack
```bash
docker compose down
```

---

## 3. Kubernetes Deployment (Minikube / Kind / Production Cluster)

### Prerequisites
* `kubectl` CLI installed.
* An active Kubernetes cluster (Minikube, Kind, k3s, GKE, EKS, or AKS).

### Step 1: Build & Tag Container Images
```bash
# Build the Mininet L3 Engine
docker build -t routing-simulator/mininet:latest ./mininet

# Build the Web Dashboard
docker build -t routing-simulator/dashboard:latest .
```

*(If using Minikube, run `eval $(minikube docker-env)` before building so the images are loaded directly into Minikube's Docker daemon).*

### Step 2: Deploy All Manifests
```bash
kubectl apply -f k8s/
```

This automatically deploys:
1. `namespace/routing-simulator`: Dedicated namespace.
2. `configmap/routing-simulator-config`: Topology & protocol settings.
3. `deployment/mininet-engine`: Privileged Mininet pod with `NET_ADMIN` capabilities.
4. `service/mininet`: ClusterIP service exposing port 8080.
5. `deployment/web-dashboard`: 2 replicas of the frontend dashboard.
6. `service/web-dashboard`: NodePort service exposing port 80 on `30573`.
7. `ingress/routing-simulator-ingress`: Ingress routing rules.

### Step 3: Verify Pod Health
```bash
kubectl get pods -n routing-simulator
```
**Expected Output:**
```text
NAME                              READY   STATUS    RESTARTS   AGE
mininet-engine-67b7f94d4d-x9q8w   1/1     Running   0          45s
web-dashboard-769b59c445-4j2k1    1/1     Running   0          45s
web-dashboard-769b59c445-m7x9p    1/1     Running   0          45s
```

### Step 4: Access the Dashboard
* **Minikube:**
  ```bash
  minikube service web-dashboard -n routing-simulator
  ```
* **NodePort Access:** Open `http://<node-ip>:30573`
* **Port Forwarding (Quick Test):**
  ```bash
  kubectl port-forward svc/web-dashboard 5173:80 -n routing-simulator
  ```
  Open `http://localhost:5173` in your browser.

---

## 4. Why Containerization Matters for Course Evaluations

1. **Host-Independent Linux Kernel Emulation:** Mininet requires Linux virtual ethernet pairs (`veth`) and kernel network namespaces. Evaluators on Windows or macOS can run real Mininet without installing WSL or manual VMs.
2. **Zero Manual Package Installation:** Eliminates dependencies on `sudo apt install mininet openvswitch-switch`.
3. **Enterprise Grade Separation:** The visual web dashboard and the network simulation engine run as decoupled microservices adhering to 12-factor application standards.
