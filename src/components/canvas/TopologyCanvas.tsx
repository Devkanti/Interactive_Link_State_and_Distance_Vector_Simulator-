import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NetworkGraph } from '../../core/NetworkGraph';
import { NetworkEdge, NetworkNode, NodeId } from '../../core/types';
import { EdgeModal } from './EdgeModal';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Plus,
  Link2,
  Trash2,
  Power,
  Activity,
  Hand,
  Target,
  Flame,
  X,
} from 'lucide-react';

import { TracePacket } from '../../core/tracer/types';
import { InFlightLSPPacket } from '../../core/lsr/types';
import { InFlightDVMessage } from '../../core/dvr/types';
import {
  findShortestPath,
  normalizeNodeId,
  ActiveAnimatedPing,
  CanvasActionBanner,
  NodePulseRing,
  ChaosStrikeEffect,
} from '../../core/animation/PingAnimationEngine';

interface TopologyCanvasProps {
  graph: NetworkGraph;
  selectedNodeId?: NodeId | null;
  onSelectNode?: (nodeId: NodeId | null) => void;
  activeTracePackets?: TracePacket[];
  inFlightLSPs?: InFlightLSPPacket[];
  inFlightDVMessages?: InFlightDVMessage[];
  canvasTheme?: 'default' | 'lsr' | 'dvr';
  readOnly?: boolean;
  showControls?: boolean;
  isChaosActive?: boolean;
  pingTriggerSignal?: { sourceId: string; destId: string; timestamp: number } | null;
  onTriggerPing?: (sourceId: string, destId: string) => void;
}

interface DraggingState {
  nodeId: NodeId;
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
}

interface ConnectingState {
  sourceNodeId: NodeId;
  currentX: number;
  currentY: number;
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  graph,
  selectedNodeId,
  onSelectNode,
  activeTracePackets = [],
  inFlightLSPs = [],
  inFlightDVMessages = [],
  canvasTheme = 'default',
  readOnly = false,
  showControls = true,
  isChaosActive = false,
  pingTriggerSignal,
  onTriggerPing,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Graph state listener to trigger re-renders & detect action events
  const [, setVersion] = useState(0);

  // Chaos Monkey Strikes & Animations
  const [chaosStrikes, setChaosStrikes] = useState<ChaosStrikeEffect[]>([]);

  // Action Banners State
  const [actionBanners, setActionBanners] = useState<CanvasActionBanner[]>([]);
  const addActionBanner = useCallback(
    (type: CanvasActionBanner['type'], title: string, subtitle?: string, color?: string) => {
      const banner: CanvasActionBanner = {
        id: `banner-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        title,
        subtitle,
        color: color || (type.includes('DOWN') || type.includes('DROP') ? '#F43F5E' : '#10B981'),
        timestamp: Date.now(),
        durationMs: 3200,
      };
      setActionBanners((prev) => [...prev.slice(-3), banner]);
      setTimeout(() => {
        setActionBanners((prev) => prev.filter((b) => b.id !== banner.id));
      }, 3300);
    },
    []
  );

  // Track previous graph elements to detect actions (sever, restore, crash, recover, jitter, flap)
  const prevEdgeStatesRef = useRef<Map<string, string>>(new Map());
  const prevEdgeCostsRef = useRef<Map<string, number>>(new Map());
  const prevNodeStatesRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    // Initialize tracking maps
    graph.getEdges().forEach((e) => {
      prevEdgeStatesRef.current.set(e.id, e.status);
      prevEdgeCostsRef.current.set(e.id, e.cost);
    });
    graph.getNodes().forEach((n) => prevNodeStatesRef.current.set(n.id, n.status));

    return graph.subscribe(() => {
      setVersion((v) => v + 1);

      // Detect edge state transitions
      const currentEdges = graph.getEdges();
      for (const edge of currentEdges) {
        const prevStatus = prevEdgeStatesRef.current.get(edge.id);
        const srcNode = graph.getNode(edge.source);
        const dstNode = graph.getNode(edge.target);
        const srcLbl = srcNode?.label || edge.source;
        const dstLbl = dstNode?.label || edge.target;

        if (prevStatus && prevStatus !== edge.status) {
          prevEdgeStatesRef.current.set(edge.id, edge.status);

          if (edge.status === 'DOWN') {
            if (srcNode && dstNode) {
              setChaosStrikes((prev) => [
                ...prev,
                {
                  id: `sever-${Date.now()}-${edge.id}`,
                  type: 'LINK_SEVER',
                  sourceX: srcNode.x,
                  sourceY: srcNode.y,
                  targetX: dstNode.x,
                  targetY: dstNode.y,
                  color: '#F43F5E',
                  label: '⚡ SEVERED',
                  startTime: Date.now(),
                  durationMs: 2500,
                },
              ]);
            }
            addActionBanner(
              'CHAOS_STRIKE',
              '🔥 Link Severed!',
              `Link [${srcLbl} ⟷ ${dstLbl}] is set to DOWN`,
              '#F43F5E'
            );
          } else if (edge.status === 'FLAPPING') {
            if (srcNode && dstNode) {
              setChaosStrikes((prev) => [
                ...prev,
                {
                  id: `flap-${Date.now()}-${edge.id}`,
                  type: 'FLAP',
                  sourceX: srcNode.x,
                  sourceY: srcNode.y,
                  targetX: dstNode.x,
                  targetY: dstNode.y,
                  color: '#F59E0B',
                  label: '⚠️ FLAPPING',
                  startTime: Date.now(),
                  durationMs: 3000,
                },
              ]);
            }
            addActionBanner(
              'LINK_FLAP',
              '⚠️ Chaos Flap Storm!',
              `Link [${srcLbl} ⟷ ${dstLbl}] oscillating rapidly`,
              '#F59E0B'
            );
          } else if (edge.status === 'UP') {
            if (srcNode && dstNode) {
              setNodePulseRings((prev) => [
                ...prev,
                {
                  id: `pulse-src-${Date.now()}-${srcNode.id}`,
                  nodeId: srcNode.id,
                  color: '#10B981',
                  startTime: Date.now(),
                  durationMs: 900,
                },
                {
                  id: `pulse-dst-${Date.now()}-${dstNode.id}`,
                  nodeId: dstNode.id,
                  color: '#10B981',
                  startTime: Date.now(),
                  durationMs: 900,
                },
              ]);
            }
            addActionBanner(
              'LINK_UP',
              'Link Restored!',
              `Link [${srcLbl} ⟷ ${dstLbl}] is restored to UP`,
              '#10B981'
            );
          }
        } else if (!prevStatus) {
          prevEdgeStatesRef.current.set(edge.id, edge.status);
        }

        // Detect cost shifts (metric jitter)
        const prevCost = prevEdgeCostsRef.current.get(edge.id);
        if (prevCost !== undefined && prevCost !== edge.cost) {
          prevEdgeCostsRef.current.set(edge.id, edge.cost);
          if (srcNode && dstNode) {
            const midX = (srcNode.x + dstNode.x) / 2;
            const midY = (srcNode.y + dstNode.y) / 2;
            setChaosStrikes((prev) => [
              ...prev,
              {
                id: `jitter-${Date.now()}-${edge.id}`,
                type: 'METRIC_SPIKE',
                sourceX: midX,
                sourceY: midY,
                color: '#F97316',
                label: `🔥 Cost: ${prevCost} ➔ ${edge.cost}`,
                startTime: Date.now(),
                durationMs: 2400,
              },
            ]);
            addActionBanner(
              'METRIC_JITTER',
              '🎲 Metric Jitter Injected!',
              `Link [${srcLbl} ⟷ ${dstLbl}] cost: ${prevCost} ➔ ${edge.cost}`,
              '#F97316'
            );
          }
        } else if (prevCost === undefined) {
          prevEdgeCostsRef.current.set(edge.id, edge.cost);
        }
      }

      // Detect node status transitions
      const currentNodes = graph.getNodes();
      for (const node of currentNodes) {
        const prevStatus = prevNodeStatesRef.current.get(node.id);
        if (prevStatus && prevStatus !== node.status) {
          prevNodeStatesRef.current.set(node.id, node.status);
          const nodeLbl = node.label || `Router ${node.id}`;
          if (node.status === 'CRASHED') {
            setChaosStrikes((prev) => [
              ...prev,
              {
                id: `crash-${Date.now()}-${node.id}`,
                type: 'ROUTER_CRASH',
                sourceX: node.x,
                sourceY: node.y,
                color: '#F43F5E',
                label: '💥 CRASHED',
                startTime: Date.now(),
                durationMs: 2600,
              },
            ]);
            addActionBanner(
              'ROUTER_CRASH',
              '💥 Router Crashed!',
              `${nodeLbl} forced OFFLINE by Chaos Monkey`,
              '#F43F5E'
            );
          } else if (node.status === 'ACTIVE') {
            setNodePulseRings((prev) => [
              ...prev,
              {
                id: `pulse-recover-${Date.now()}-${node.id}`,
                nodeId: node.id,
                color: '#10B981',
                startTime: Date.now(),
                durationMs: 900,
              },
            ]);
            addActionBanner(
              'LINK_UP',
              'Router Active!',
              `${nodeLbl} restored ONLINE`,
              '#10B981'
            );
          }
        } else if (!prevStatus) {
          prevNodeStatesRef.current.set(node.id, node.status);
        }
      }
    });
  }, [graph, addActionBanner]);

  // Viewport Pan & Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

  // Tool Modes: 'select' | 'link' | 'ping'
  const [toolMode, setToolMode] = useState<'select' | 'link' | 'ping'>('select');
  const [pingToolSource, setPingToolSource] = useState<NodeId | null>(null);

  // Ping Animations & Router Shockwave Rings
  const [activePings, setActivePings] = useState<ActiveAnimatedPing[]>([]);
  const [nodePulseRings, setNodePulseRings] = useState<NodePulseRing[]>([]);

  // Dragging and Connecting states with refs to prevent stale closure lockups
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [connecting, setConnecting] = useState<ConnectingState | null>(null);

  const draggingRef = useRef<DraggingState | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const connectingRef = useRef<ConnectingState | null>(null);

  // Active Edge Modal
  const [editingEdge, setEditingEdge] = useState<NetworkEdge | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  // Ping Trigger Engine
  const triggerPingAnimation = useCallback(
    (sourceId: string, destId: string) => {
      const allNodes = graph.getNodes();
      const nodeIds = allNodes.map((n) => n.id);
      const normSrc = normalizeNodeId(sourceId, nodeIds);
      const normDst = normalizeNodeId(destId, nodeIds);

      const srcNode = graph.getNode(normSrc);
      const dstNode = graph.getNode(normDst);
      if (!srcNode || !dstNode) return;

      const { path, reachable } = findShortestPath(graph, normSrc, normDst);

      const srcLabel = srcNode.label || srcNode.id;
      const dstLabel = dstNode.label || dstNode.id;

      if (!reachable || path.length < 2) {
        // Unreachable: animate drop at source
        const droppedPing: ActiveAnimatedPing = {
          id: `ping-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sourceId: normSrc,
          destId: normDst,
          sourceLabel: srcLabel,
          destLabel: dstLabel,
          forwardPath: [normSrc],
          returnPath: [],
          activePath: [normSrc],
          currentHopIndex: 0,
          progress: 0,
          phase: 'DROPPED',
          ttl: 64,
          initialTtl: 64,
          color: '#F43F5E',
          label: 'ICMP Unreachable',
          statusText: 'No Route to Host',
          isComplete: false,
          startTime: Date.now(),
          hopDurationMs: 800,
        };
        setActivePings((prev) => [...prev, droppedPing]);
        addActionBanner(
          'PING_DROP',
          'ICMP Host Unreachable',
          `No active route from ${srcLabel} to ${dstLabel} (100% loss)`,
          '#F43F5E'
        );
        return;
      }

      const forwardPath = [...path];
      const returnPath = [...path].reverse();

      const newPing: ActiveAnimatedPing = {
        id: `ping-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sourceId: normSrc,
        destId: normDst,
        sourceLabel: srcLabel,
        destLabel: dstLabel,
        forwardPath,
        returnPath,
        activePath: forwardPath,
        currentHopIndex: 0,
        progress: 0,
        phase: 'REQUEST',
        ttl: 64,
        initialTtl: 64,
        color: '#00F2FE',
        label: 'ICMP Echo Req',
        statusText: `Hop 1 of ${forwardPath.length - 1}`,
        isComplete: false,
        startTime: Date.now(),
        hopDurationMs: 800,
      };

      setActivePings((prev) => [...prev, newPing]);
      addActionBanner(
        'PING_SUCCESS',
        'ICMP Ping Dispatched',
        `${srcLabel} ➔ ${dstLabel} via ${forwardPath.join(' ➔ ')}`,
        '#00F2FE'
      );

      // Source router initial pulse
      setNodePulseRings((prev) => [
        ...prev,
        {
          id: `pulse-${Date.now()}-${normSrc}`,
          nodeId: normSrc,
          color: '#00F2FE',
          startTime: Date.now(),
          durationMs: 700,
        },
      ]);
    },
    [graph, addActionBanner]
  );

  // React to external ping triggers (e.g. from Mininet modal or Packet Tracer bar)
  const lastSignalRef = useRef<number>(0);
  useEffect(() => {
    if (pingTriggerSignal && pingTriggerSignal.timestamp > lastSignalRef.current) {
      lastSignalRef.current = pingTriggerSignal.timestamp;
      triggerPingAnimation(pingTriggerSignal.sourceId, pingTriggerSignal.destId);
    }
  }, [pingTriggerSignal, triggerPingAnimation]);

  // Real-time 60fps Animation Loop for Packets and Shockwaves
  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = currentTime - lastTime;
      lastTime = currentTime;

      // Clean up expired pulse rings
      setNodePulseRings((prev) =>
        prev.filter((r) => currentTime - r.startTime < r.durationMs)
      );

      // Clean up expired chaos strike visual effects
      setChaosStrikes((prev) =>
        prev.filter((c) => currentTime - c.startTime < c.durationMs)
      );

      // Advance active in-flight pings
      setActivePings((prevPings) => {
        if (prevPings.length === 0) return prevPings;

        let hasCompletedAny = false;
        const nextPings = prevPings.map((ping) => {
          if (ping.isComplete) return ping;

          const step = dt / ping.hopDurationMs;
          const nextProg = ping.progress + step;

          if (nextProg < 1.0) {
            return { ...ping, progress: nextProg };
          }

          // Arrived at next node in path
          const nextHopIdx = ping.currentHopIndex + 1;
          const arrivedNodeId = ping.activePath[nextHopIdx];

          // Trigger pulse shockwave at arrived router
          if (arrivedNodeId) {
            setNodePulseRings((rings) => [
              ...rings,
              {
                id: `pulse-${Date.now()}-${arrivedNodeId}`,
                nodeId: arrivedNodeId,
                color: ping.phase === 'REQUEST' ? '#00F2FE' : '#10B981',
                startTime: Date.now(),
                durationMs: 700,
              },
            ]);
          }

          // Case 1: Arrived at destination in REQUEST phase
          if (ping.phase === 'REQUEST' && nextHopIdx >= ping.activePath.length - 1) {
            return {
              ...ping,
              phase: 'REPLY' as const,
              activePath: ping.returnPath,
              currentHopIndex: 0,
              progress: 0,
              ttl: ping.ttl - 1,
              color: '#10B981',
              label: 'ICMP Echo Reply',
              statusText: 'Echo Reply returning...',
            };
          }

          // Case 2: Arrived back at source in REPLY phase
          if (ping.phase === 'REPLY' && nextHopIdx >= ping.activePath.length - 1) {
            hasCompletedAny = true;
            addActionBanner(
              'PING_SUCCESS',
              'ICMP Echo Reply Received!',
              `${ping.sourceLabel} ⟷ ${ping.destLabel} (0% Packet Loss, 0.088ms RTT)`,
              '#10B981'
            );
            return { ...ping, isComplete: true, progress: 1.0 };
          }

          // Case 3: Dropped packet finished
          if (ping.phase === 'DROPPED') {
            hasCompletedAny = true;
            return { ...ping, isComplete: true, progress: 1.0 };
          }

          // Continue along path
          return {
            ...ping,
            currentHopIndex: nextHopIdx,
            progress: 0,
            ttl: Math.max(1, ping.ttl - 1),
            statusText: `Hop ${nextHopIdx + 1} of ${ping.activePath.length - 1}`,
          };
        });

        // Filter out completed pings
        return hasCompletedAny ? nextPings.filter((p) => !p.isComplete) : nextPings;
      });

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [addActionBanner]);

  // Screen to SVG graph coordinates translation
  const screenToGraphCoords = useCallback(
    (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: screenX, y: screenY };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (screenX - rect.left - pan.x) / zoom;
      const y = (screenY - rect.top - pan.y) / zoom;
      return { x, y };
    },
    [pan, zoom]
  );

  // Zoom Controls: Zooms smoothly around a focal point (or viewport center if invoked via button)
  const handleZoom = useCallback((delta: number, clientX?: number, clientY?: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // Default focal point to the center of the viewport when clicking Zoom In / Zoom Out buttons
    const focalX = clientX !== undefined ? clientX - rect.left : rect.width / 2;
    const focalY = clientY !== undefined ? clientY - rect.top : rect.height / 2;

    setZoom((prevZoom) => {
      const newZoom = Math.min(2.5, Math.max(0.3, Number((prevZoom + delta).toFixed(2))));
      if (newZoom === prevZoom) return prevZoom;

      const factor = newZoom / prevZoom;
      setPan((prevPan) => ({
        x: focalX - (focalX - prevPan.x) * factor,
        y: focalY - (focalY - prevPan.y) * factor,
      }));

      return newZoom;
    });
  }, []);

  const handleZoomToFit = useCallback(() => {
    if (nodes.length === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    }

    const padding = 120;
    const graphWidth = Math.max(200, maxX - minX + padding * 2);
    const graphHeight = Math.max(200, maxY - minY + padding * 2);

    const fitZoom = Math.min(
      rect.width / graphWidth,
      rect.height / graphHeight,
      1.3
    );
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(Number(fitZoom.toFixed(2)));
    setPan({
      x: rect.width / 2 - centerX * fitZoom,
      y: rect.height / 2 - centerY * fitZoom,
    });
  }, [nodes]);

  const handleResetView = () => {
    if (!containerRef.current || nodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(1.0);
    setPan({
      x: rect.width / 2 - centerX,
      y: rect.height / 2 - centerY,
    });
  };

  // Center once on initial mount if nodes exist
  useEffect(() => {
    if (nodes.length > 0) {
      handleZoomToFit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta, e.clientX, e.clientY);
  };

  // Canvas Mouse Down: background pan
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'svg' || target.tagName === 'rect') {
        e.preventDefault();
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        setIsPanning(true);
        if (onSelectNode) onSelectNode(null);
      }
    }
  };

  const handleGlobalMouseUp = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
    draggingRef.current = null;
    setDragging(null);
    connectingRef.current = null;
    setConnecting(null);
  }, []);

  // Global mouse move & up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanningRef.current) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
      } else if (draggingRef.current) {
        const coords = screenToGraphCoords(e.clientX, e.clientY);
        graph.setNodePosition(draggingRef.current.nodeId, Math.round(coords.x), Math.round(coords.y));
      } else if (connectingRef.current) {
        const coords = screenToGraphCoords(e.clientX, e.clientY);
        const updated = {
          ...connectingRef.current,
          currentX: coords.x,
          currentY: coords.y,
        };
        connectingRef.current = updated;
        setConnecting(updated);
      }
    };

    const handleMouseUpCapture = () => {
      handleGlobalMouseUp();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleGlobalMouseUp();
        setContextMenu(null);
        setEditingEdge(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    // Crucial: Use capture: true so mouseup is intercepted regardless of any element stopping propagation
    window.addEventListener('mouseup', handleMouseUpCapture, { capture: true });
    window.addEventListener('blur', handleGlobalMouseUp);
    document.addEventListener('mouseleave', handleGlobalMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUpCapture, { capture: true });
      window.removeEventListener('blur', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [graph, screenToGraphCoords, handleGlobalMouseUp]);

  // Start Node Drag, Connect, or Ping
  const handleNodeMouseDown = (e: React.MouseEvent, node: NetworkNode) => {
    if (e.button !== 0) return;
    // Crucial: Prevent native browser ghost drag and text selection
    e.preventDefault();
    e.stopPropagation();

    if (toolMode === 'ping') {
      if (!pingToolSource) {
        setPingToolSource(node.id);
        setNodePulseRings((prev) => [
          ...prev,
          {
            id: `pulse-select-${Date.now()}-${node.id}`,
            nodeId: node.id,
            color: '#00F2FE',
            startTime: Date.now(),
            durationMs: 900,
          },
        ]);
        addActionBanner(
          'PING_SUCCESS',
          'Ping: Source Selected',
          `${node.label || node.id} selected as Source. Now click Destination router.`,
          '#00F2FE'
        );
      } else if (pingToolSource !== node.id) {
        triggerPingAnimation(pingToolSource, node.id);
        if (onTriggerPing) onTriggerPing(pingToolSource, node.id);
        setPingToolSource(null);
        setToolMode('select');
      } else {
        // Clicked same node: cancel selection
        setPingToolSource(null);
      }
      return;
    }

    if (toolMode === 'link') {
      const coords = screenToGraphCoords(e.clientX, e.clientY);
      const conn = {
        sourceNodeId: node.id,
        currentX: coords.x,
        currentY: coords.y,
      };
      connectingRef.current = conn;
      setConnecting(conn);
    } else {
      const drag = {
        nodeId: node.id,
        startX: e.clientX,
        startY: e.clientY,
        originalX: node.x,
        originalY: node.y,
      };
      draggingRef.current = drag;
      setDragging(drag);
    }
    if (onSelectNode) onSelectNode(node.id);
  };

  // Complete Connection on MouseUp over Target Node
  const handleNodeMouseUp = (targetNode: NetworkNode) => {
    const activeConnecting = connectingRef.current || connecting;
    if (activeConnecting && activeConnecting.sourceNodeId !== targetNode.id) {
      const sourceId = activeConnecting.sourceNodeId;
      const targetId = targetNode.id;
      // Check if edge already exists
      const existing = graph.getEdgeBetween(sourceId, targetId);
      if (!existing) {
        const newEdge = graph.addEdge(sourceId, targetId, 1);
        setEditingEdge(newEdge);
      }
    }
    // Always release dragging, connecting, and panning states on node release
    handleGlobalMouseUp();
  };

  // Node Context Menu
  const handleNodeContextMenu = (e: React.MouseEvent, node: NetworkNode) => {
    e.preventDefault();
    e.stopPropagation();
    const items: ContextMenuItem[] = [
      {
        label: 'Send ICMP Ping from here...',
        icon: <Target size={14} />,
        action: () => {
          setToolMode('ping');
          setPingToolSource(node.id);
          addActionBanner(
            'PING_SUCCESS',
            'Ping Source Selected',
            `Click destination router to dispatch ICMP packet`,
            '#00F2FE'
          );
        },
      },
      {
        label: node.status === 'ACTIVE' ? 'Crash Router' : 'Recover Router',
        icon: <Power size={14} />,
        danger: node.status === 'ACTIVE',
        action: () => {
          graph.setNodeStatus(node.id, node.status === 'ACTIVE' ? 'CRASHED' : 'ACTIVE');
        },
      },
      {
        label: 'Connect Link from here',
        icon: <Link2 size={14} />,
        action: () => {
          setToolMode('link');
          setConnecting({
            sourceNodeId: node.id,
            currentX: node.x,
            currentY: node.y,
          });
        },
      },
      {
        label: 'Delete Router',
        icon: <Trash2 size={14} />,
        danger: true,
        action: () => {
          graph.removeNode(node.id);
          if (selectedNodeId === node.id && onSelectNode) {
            onSelectNode(null);
          }
        },
      },
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  // Edge Context Menu
  const handleEdgeContextMenu = (e: React.MouseEvent, edge: NetworkEdge) => {
    e.preventDefault();
    e.stopPropagation();
    const items: ContextMenuItem[] = [
      {
        label: 'Edit Weight',
        icon: <Activity size={14} />,
        action: () => setEditingEdge(edge),
      },
      {
        label: edge.status === 'UP' ? 'Sever Link (DOWN)' : 'Restore Link (UP)',
        icon: <Power size={14} />,
        danger: edge.status === 'UP',
        action: () => graph.toggleEdgeStatus(edge.id),
      },
      {
        label: 'Delete Link',
        icon: <Trash2 size={14} />,
        danger: true,
        action: () => graph.removeEdge(edge.id),
      },
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  // Canvas Background Context Menu
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const coords = screenToGraphCoords(e.clientX, e.clientY);
    const items: ContextMenuItem[] = [
      {
        label: 'Add Router Here',
        icon: <Plus size={14} />,
        action: () => {
          const nextIndex = nodes.length + 1;
          const label = `R${nextIndex}`;
          graph.addNode(label, label, Math.round(coords.x), Math.round(coords.y));
        },
      },
      {
        label: 'Reset Viewport',
        icon: <RotateCcw size={14} />,
        action: handleResetView,
      },
      {
        label: 'Zoom to Fit',
        icon: <Maximize2 size={14} />,
        action: handleZoomToFit,
      },
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  // Add new router button handler
  const handleAddRouter = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerCoords = screenToGraphCoords(
      rect.left + rect.width / 2 + (Math.random() * 80 - 40),
      rect.top + rect.height / 2 + (Math.random() * 80 - 40)
    );
    const nextIndex = nodes.length + 1;
    const label = `R${nextIndex}`;
    graph.addNode(label, label, Math.round(centerCoords.x), Math.round(centerCoords.y));
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseUp={handleGlobalMouseUp}
      onContextMenu={handleCanvasContextMenu}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background:
          canvasTheme === 'lsr'
            ? 'radial-gradient(circle at 50% 50%, #FAF6F0 0%, #F5ECE3 60%, #EFE1D3 100%)'
            : canvasTheme === 'dvr'
            ? 'radial-gradient(circle at 50% 50%, #FAF4EE 0%, #F8EBE0 60%, #EFE0D2 100%)'
            : 'radial-gradient(circle at 50% 50%, #FAF5EF 0%, #F7EDE3 60%, #EFE1D4 100%)',
        cursor: isPanning ? 'grabbing' : dragging ? 'grabbing' : connecting ? 'crosshair' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Background Grid */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <pattern
            id={`canvas-grid-${canvasTheme}`}
            width={40 * zoom}
            height={40 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x}, ${pan.y})`}
          >
            <circle
              cx="2"
              cy="2"
              r="1"
              fill={
                canvasTheme === 'lsr'
                  ? 'rgba(59, 139, 235, 0.25)'
                  : canvasTheme === 'dvr'
                  ? 'rgba(232, 122, 80, 0.25)'
                  : 'rgba(210, 145, 110, 0.25)'
              }
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#canvas-grid-${canvasTheme})`} />
      </svg>

      {/* Main Graph SVG Scene */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <defs>
          {/* Router Node Radial Gradients */}
          <radialGradient id="routerGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FEE2CF" />
          </radialGradient>
          <radialGradient id="routerCrashedGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FEE2E2" />
            <stop offset="100%" stopColor="#FCA5A5" />
          </radialGradient>
          <radialGradient id="routerSelectedGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#94C8FD" />
            <stop offset="100%" stopColor="#3B8BEB" />
          </radialGradient>

          {/* Packet streaming linear gradients */}
          <linearGradient id="packetStreamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B8BEB" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="packetStreamGradDvr" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E87A50" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#F97316" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FED7AA" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges Layer */}
          {edges.map((edge) => {
            const source = graph.getNode(edge.source);
            const target = graph.getNode(edge.target);
            if (!source || !target) return null;

            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            const isDown = edge.status === 'DOWN';
            const isFlapping = edge.status === 'FLAPPING';
            const strokeColor = isDown
              ? 'var(--accent-rose)'
              : isFlapping
              ? 'var(--accent-amber)'
              : 'rgba(59, 139, 235, 0.75)';

            // Detect if this edge has active in-flight traffic
            const hasInFlightLSR = inFlightLSPs.some(
              (p) =>
                p.edgeId === edge.id ||
                (p.sourceNodeId === edge.source && p.targetNodeId === edge.target) ||
                (p.sourceNodeId === edge.target && p.targetNodeId === edge.source)
            );
            const hasInFlightDVR = inFlightDVMessages.some(
              (p) =>
                p.edgeId === edge.id ||
                (p.sourceNodeId === edge.source && p.targetNodeId === edge.target) ||
                (p.sourceNodeId === edge.target && p.targetNodeId === edge.source)
            );
            const hasInFlight = hasInFlightLSR || hasInFlightDVR;

            return (
              <g key={edge.id} onContextMenu={(e) => handleEdgeContextMenu(e, edge)}>
                {/* Clickable wider hover/hit area */}
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="transparent"
                  strokeWidth="24"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEditingEdge(edge)}
                />

                {/* Visible Edge Line */}
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeDasharray={isDown ? '6 6' : isFlapping ? '8 4' : undefined}
                  style={{
                    filter: isDown ? 'none' : isFlapping ? 'drop-shadow(0 0 10px #F59E0B)' : 'drop-shadow(0 0 5px rgba(148, 200, 253, 0.55))',
                    transition: 'stroke 0.2s',
                  }}
                />

                {/* Oscillating Flapping Caution Beam */}
                {isFlapping && (
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="#F59E0B"
                    strokeWidth="4.5"
                    strokeDasharray="10 8"
                    opacity="0.9"
                    style={{
                      filter: 'drop-shadow(0 0 12px #F59E0B)',
                      animation: 'chaosBadgePulse 1.2s ease-in-out infinite',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Active Flow Animation Line when In-Flight Packets Transmit */}
                {hasInFlight && !isDown && (
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={hasInFlightLSR ? 'url(#packetStreamGrad)' : 'url(#packetStreamGradDvr)'}
                    strokeWidth="3.5"
                    className={hasInFlightLSR ? 'edge-stream-active' : 'edge-stream-active edge-stream-active-dvr'}
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Metric Badge in Center */}
                <g
                  transform={`translate(${midX}, ${midY})`}
                  onClick={() => setEditingEdge(edge)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x="-19"
                    y="-12"
                    width="38"
                    height="24"
                    rx="12"
                    fill={isDown ? 'rgba(254, 226, 226, 0.96)' : 'rgba(255, 255, 255, 0.96)'}
                    stroke={strokeColor}
                    strokeWidth="1.5"
                    style={{
                      filter: 'drop-shadow(0 2px 6px rgba(92, 50, 20, 0.15))',
                    }}
                  />
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill={isDown ? '#b91c1c' : 'var(--text-primary)'}
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                  >
                    {isDown ? '\u2715' : edge.cost}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Rubber-band Connection Line */}
          {connecting && (
            (() => {
              const srcNode = graph.getNode(connecting.sourceNodeId);
              if (!srcNode) return null;
              return (
                <line
                  x1={srcNode.x}
                  y1={srcNode.y}
                  x2={connecting.currentX}
                  y2={connecting.currentY}
                  stroke="var(--accent-cyan)"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  style={{ filter: 'drop-shadow(0 0 6px var(--accent-cyan))' }}
                />
              );
            })()
          )}

          {/* Nodes Layer */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isPingSource = pingToolSource === node.id;
            const isCrashed = node.status === 'CRASHED';
            const radius = 24;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onMouseUp={() => handleNodeMouseUp(node)}
                onContextMenu={(e) => handleNodeContextMenu(e, node)}
                style={{
                  cursor:
                    toolMode === 'ping'
                      ? 'crosshair'
                      : toolMode === 'link'
                      ? 'crosshair'
                      : dragging?.nodeId === node.id
                      ? 'grabbing'
                      : 'grab',
                }}
              >
                {/* Ping Tool Source Target Ring */}
                {isPingSource && (
                  <g>
                    <circle
                      r={radius + 12}
                      fill="none"
                      stroke="#00F2FE"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      style={{ filter: 'drop-shadow(0 0 10px #00F2FE)' }}
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0"
                        to="360"
                        dur="4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      r={radius + 5}
                      fill="none"
                      stroke="#00F2FE"
                      strokeWidth="1.5"
                      opacity="0.8"
                    />
                  </g>
                )}

                {/* Selection halo */}
                {isSelected && !isPingSource && (
                  <circle
                    r={radius + 8}
                    fill="none"
                    stroke="var(--accent-cyan)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    style={{ filter: 'drop-shadow(0 0 8px var(--accent-cyan))' }}
                  />
                )}

                {/* Ambient Breathing Glow Ring for Active Nodes */}
                {!isCrashed && (
                  <circle
                    r={radius + 4}
                    fill="none"
                    stroke="rgba(59, 139, 235, 0.28)"
                    strokeWidth="1.5"
                    className="router-node-ambient"
                  />
                )}

                {/* Node Outer Circle with Radial Gradient */}
                <circle
                  r={radius}
                  fill={
                    isCrashed
                      ? 'url(#routerCrashedGrad)'
                      : isSelected
                      ? 'url(#routerSelectedGrad)'
                      : 'url(#routerGrad)'
                  }
                  stroke={
                    isCrashed
                      ? 'var(--accent-rose)'
                      : isSelected
                      ? 'var(--accent-cyan)'
                      : 'rgba(59, 139, 235, 0.75)'
                  }
                  strokeWidth={isSelected ? '2.5' : '1.8'}
                  style={{
                    filter: isCrashed
                      ? 'drop-shadow(0 0 10px rgba(225, 71, 90, 0.45))'
                      : isSelected
                      ? 'drop-shadow(0 0 14px rgba(148, 200, 253, 0.8))'
                      : 'drop-shadow(0 4px 10px rgba(92, 50, 20, 0.12))',
                    transition: 'all 0.2s',
                  }}
                />

                {/* Authentic Cisco/IEEE Network Router Glyph (Bidirectional Flow Arrows) */}
                <g
                  stroke={
                    isCrashed
                      ? 'var(--accent-rose)'
                      : isSelected
                      ? '#ffffff'
                      : 'var(--accent-cyan)'
                  }
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                >
                  {/* Top Arrow: Left-to-Right */}
                  <path d="M -10 -3.5 L 10 -3.5" />
                  <path d="M 6.5 -6.5 L 10 -3.5 L 6.5 -0.5" />
                  {/* Bottom Arrow: Right-to-Left */}
                  <path d="M 10 3.5 L -10 3.5" />
                  <path d="M -6.5 0.5 L -10 3.5 L -6.5 6.5" />
                </g>

                {/* Status Dot with Glow */}
                <circle
                  cx="17"
                  cy="-17"
                  r="4.5"
                  fill={isCrashed ? 'var(--accent-rose)' : 'var(--accent-emerald)'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{
                    filter: isCrashed
                      ? 'drop-shadow(0 0 6px var(--accent-rose))'
                      : 'drop-shadow(0 0 6px var(--accent-emerald))',
                  }}
                />

                {/* Node Label Badge (Proper Dynamic Width, No Overflow) */}
                {(() => {
                  const labelText = node.label || `Router ${node.id}`;
                  const badgeWidth = Math.max(64, labelText.length * 8 + 18);
                  return (
                    <g transform="translate(0, 38)">
                      <rect
                        x={-badgeWidth / 2}
                        y="-11"
                        width={badgeWidth}
                        height="22"
                        rx="11"
                        fill="rgba(255, 255, 255, 0.95)"
                        stroke={isSelected ? 'var(--accent-cyan)' : 'rgba(220, 165, 135, 0.45)'}
                        strokeWidth={isSelected ? '1.5' : '1'}
                        style={{
                          backdropFilter: 'blur(6px)',
                          filter: 'drop-shadow(0 2px 6px rgba(92, 50, 20, 0.12))',
                        }}
                      />
                      <text
                        textAnchor="middle"
                        dy="4"
                        fill={isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)'}
                        fontSize="11"
                        fontFamily="var(--font-sans)"
                        fontWeight="600"
                        letterSpacing="0.2px"
                      >
                        {labelText}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* In-Flight Tracer Packets Layer */}
          {activeTracePackets.map((pkt) => {
            const currNode = graph.getNode(pkt.currentHop);
            const nextNode = pkt.nextHop ? graph.getNode(pkt.nextHop) : null;
            if (!currNode) return null;

            let posX = currNode.x;
            let posY = currNode.y;

            if (nextNode) {
              const dx = nextNode.x - currNode.x;
              const dy = nextNode.y - currNode.y;
              const len = Math.hypot(dx, dy) || 1;
              const nx = -dy / len;
              const ny = dx / len;
              posX = (currNode.x + nextNode.x) / 2 + nx * 22;
              posY = (currNode.y + nextNode.y) / 2 + ny * 22;
            }

            const isCycle = pkt.cycleDetected;
            const particleColor = isCycle ? 'var(--accent-amber)' : 'var(--accent-cyan)';

            return (
              <g key={pkt.id} transform={`translate(${posX}, ${posY})`} style={{ pointerEvents: 'none' }}>
                {/* Glowing halo */}
                <circle
                  r="18"
                  fill="none"
                  stroke={particleColor}
                  strokeWidth="2"
                  strokeDasharray={isCycle ? '4 4' : undefined}
                  style={{
                    filter: `drop-shadow(0 0 10px ${particleColor})`,
                    opacity: 0.8,
                  }}
                />
                {/* Radiating radar ripple */}
                <circle r="9" fill="none" stroke={particleColor} strokeWidth="1.8">
                  <animate attributeName="r" from="9" to="24" dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.8" to="0" dur="1.4s" repeatCount="indefinite" />
                </circle>

                {/* Core particle */}
                <circle
                  r="8.5"
                  fill={particleColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{
                    filter: `drop-shadow(0 0 8px ${particleColor})`,
                  }}
                />
                <circle r="2.5" fill="#ffffff" />

                {/* Frosted pill badge */}
                <g transform="translate(0, -18)" className="packet-float">
                  <rect
                    x="-32"
                    y="-9"
                    width="64"
                    height="18"
                    rx="9"
                    fill="rgba(255, 255, 255, 0.96)"
                    stroke={particleColor}
                    strokeWidth="1.4"
                    style={{ filter: 'drop-shadow(0 2px 6px rgba(92, 50, 20, 0.15))' }}
                  />
                  <text
                    textAnchor="middle"
                    dy="3.5"
                    fill="var(--text-primary)"
                    fontSize="9.5"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                  >
                    {isCycle ? 'LOOP' : 'TTL'}: {pkt.ttl}
                  </text>
                </g>
              </g>
            );
          })}
          {/* In-Flight LSR LSP Packets Layer (Separated non-overlapping flight lanes) */}
          {(() => {
            const pairCountMap = new Map<string, number>();
            inFlightLSPs.forEach((item) => {
              const key = `${item.sourceNodeId}->${item.targetNodeId}`;
              pairCountMap.set(key, (pairCountMap.get(key) || 0) + 1);
            });
            const pairIndexMap = new Map<string, number>();

            return inFlightLSPs.map((item) => {
              const srcNode = graph.getNode(item.sourceNodeId);
              const tgtNode = graph.getNode(item.targetNodeId);
              if (!srcNode || !tgtNode) return null;

              const key = `${item.sourceNodeId}->${item.targetNodeId}`;
              const totalInDir = pairCountMap.get(key) || 1;
              const idxInDir = pairIndexMap.get(key) || 0;
              pairIndexMap.set(key, idxInDir + 1);

              // Vector from source to target router
              const dx = tgtNode.x - srcNode.x;
              const dy = tgtNode.y - srcNode.y;
              const len = Math.hypot(dx, dy) || 1;
              const tx = dx / len;
              const ty = dy / len;

              // Unit right-hand normal vector (in SVG screen coords, right side of driver)
              const rx = -ty;
              const ry = tx;

              // Stagger along flight lane if multiple packets exist in same direction
              const staggerStep = Math.min(0.07, 0.20 / totalInDir);
              const stagger = totalInDir > 1 ? (idxInDir - (totalInDir - 1) / 2) * staggerStep : 0;
              const baseProg = item.progress > 0 ? 0.24 + item.progress * 0.52 : 0.32;
              const prog = Math.max(0.18, Math.min(0.82, baseProg + stagger));

              // Dedicated right-hand flight lane offset so opposite direction packets never collide with each other or edge cost
              const laneOffset = 28;
              const posX = srcNode.x + dx * prog + rx * laneOffset;
              const posY = srcNode.y + dy * prog + ry * laneOffset;

              const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
              const color = '#3B8BEB';
              const badgeId = `lsp-${item.packet.id}-${item.sourceNodeId}-${item.targetNodeId}-${idxInDir}`;

              return (
                <g key={badgeId} transform={`translate(${posX}, ${posY})`} className="packet-float" style={{ pointerEvents: 'none' }}>
                  {/* Forward gliding motion along wire */}
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values={`${posX - tx * 14},${posY - ty * 14}; ${posX + tx * 14},${posY + ty * 14}; ${posX - tx * 14},${posY - ty * 14}`}
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                  {/* Radiating Radar Ripple Wave */}
                  <circle cx="-20" cy="0" r="5" fill="none" stroke={color} strokeWidth="1.6">
                    <animate attributeName="r" from="5" to="16" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>

                  {/* Sleek Frosted Capsule Pill Badge */}
                  <rect
                    x="-34"
                    y="-11"
                    width="68"
                    height="22"
                    rx="11"
                    fill="rgba(255, 255, 255, 0.96)"
                    stroke={color}
                    strokeWidth="1.5"
                    style={{
                      backdropFilter: 'blur(8px)',
                      filter: 'drop-shadow(0 3px 8px rgba(59, 139, 235, 0.28))',
                    }}
                  />

                  {/* Core Beacon Dot inside Pill */}
                  <circle
                    cx="-20"
                    cy="0"
                    r="5.5"
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    style={{ filter: `drop-shadow(0 0 5px ${color})` }}
                  />
                  <circle cx="-20" cy="0" r="2" fill="#ffffff" />

                  {/* Label Text */}
                  <text
                    x="2"
                    y="0"
                    textAnchor="middle"
                    dy="3.5"
                    fill="#1D64B5"
                    fontSize="9.5"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                    letterSpacing="0.2px"
                  >
                    LSP #{item.packet.sequenceNumber}
                  </text>

                  {/* Directional Chevron Pointer pointing to target router */}
                  <g transform={`translate(22, 0) rotate(${angleDeg})`}>
                    <polygon
                      points="-3,-3 4,0 -3,3"
                      fill={color}
                    />
                  </g>
                </g>
              );
            });
          })()}

          {/* In-Flight DVR Distance Vector Messages Layer (Separated non-overlapping flight lanes) */}
          {(() => {
            const pairCountMap = new Map<string, number>();
            inFlightDVMessages.forEach((item) => {
              const key = `${item.sourceNodeId}->${item.targetNodeId}`;
              pairCountMap.set(key, (pairCountMap.get(key) || 0) + 1);
            });
            const pairIndexMap = new Map<string, number>();

            return inFlightDVMessages.map((item) => {
              const srcNode = graph.getNode(item.sourceNodeId);
              const tgtNode = graph.getNode(item.targetNodeId);
              if (!srcNode || !tgtNode) return null;

              const key = `${item.sourceNodeId}->${item.targetNodeId}`;
              const totalInDir = pairCountMap.get(key) || 1;
              const idxInDir = pairIndexMap.get(key) || 0;
              pairIndexMap.set(key, idxInDir + 1);

              const dx = tgtNode.x - srcNode.x;
              const dy = tgtNode.y - srcNode.y;
              const len = Math.hypot(dx, dy) || 1;
              const tx = dx / len;
              const ty = dy / len;

              const rx = -ty;
              const ry = tx;

              const staggerStep = Math.min(0.07, 0.20 / totalInDir);
              const stagger = totalInDir > 1 ? (idxInDir - (totalInDir - 1) / 2) * staggerStep : 0;
              const baseProg = item.progress > 0 ? 0.24 + item.progress * 0.52 : 0.32;
              const prog = Math.max(0.18, Math.min(0.82, baseProg + stagger));

              const laneOffset = 28;
              const posX = srcNode.x + dx * prog + rx * laneOffset;
              const posY = srcNode.y + dy * prog + ry * laneOffset;

              const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
              const color = '#E87A50';
              const badgeId = `dv-${item.message.id}-${item.sourceNodeId}-${item.targetNodeId}-${idxInDir}`;
              const routesCount = item.message.vector.length;
              const labelText = `DV (${routesCount})`;
              const pillWidth = Math.max(68, labelText.length * 7 + 24);

              return (
                <g key={badgeId} transform={`translate(${posX}, ${posY})`} className="packet-float" style={{ pointerEvents: 'none' }}>
                  {/* Forward gliding motion along wire */}
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values={`${posX - tx * 14},${posY - ty * 14}; ${posX + tx * 14},${posY + ty * 14}; ${posX - tx * 14},${posY - ty * 14}`}
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                  {/* Radiating Radar Ripple Wave */}
                  <circle cx={-pillWidth / 2 + 14} cy="0" r="5" fill="none" stroke={color} strokeWidth="1.6">
                    <animate attributeName="r" from="5" to="16" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>

                  {/* Sleek Frosted Capsule Pill Badge */}
                  <rect
                    x={-pillWidth / 2}
                    y="-11"
                    width={pillWidth}
                    height="22"
                    rx="11"
                    fill="rgba(255, 255, 255, 0.96)"
                    stroke={color}
                    strokeWidth="1.5"
                    style={{
                      backdropFilter: 'blur(8px)',
                      filter: 'drop-shadow(0 3px 8px rgba(232, 122, 80, 0.28))',
                    }}
                  />

                  {/* Core Beacon Dot inside Pill */}
                  <circle
                    cx={-pillWidth / 2 + 14}
                    cy="0"
                    r="5.5"
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    style={{ filter: `drop-shadow(0 0 5px ${color})` }}
                  />
                  <circle cx={-pillWidth / 2 + 14} cy="0" r="2" fill="#ffffff" />

                  {/* Label Text */}
                  <text
                    x="2"
                    y="0"
                    textAnchor="middle"
                    dy="3.5"
                    fill="#9E4D2B"
                    fontSize="9.5"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                    letterSpacing="0.2px"
                  >
                    {labelText}
                  </text>

                  {/* Directional Chevron Pointer pointing to target router */}
                  <g transform={`translate(${pillWidth / 2 - 12}, 0) rotate(${angleDeg})`}>
                    <polygon
                      points="-3,-3 4,0 -3,3"
                      fill={color}
                    />
                  </g>
                </g>
              );
            });
          })()}

          {/* Router Shockwave Pulse Rings */}
          {nodePulseRings.map((ring) => {
            const node = graph.getNode(ring.nodeId);
            if (!node) return null;
            const elapsed = Date.now() - ring.startTime;
            const prog = Math.min(1, Math.max(0, elapsed / ring.durationMs));
            const r = 26 + prog * 44;
            const strokeW = Math.max(0.6, 3 * (1 - prog));
            const opacity = Math.max(0, 1 - prog);

            return (
              <g key={ring.id} style={{ pointerEvents: 'none' }}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={strokeW}
                  opacity={opacity}
                  style={{
                    filter: `drop-shadow(0 0 10px ${ring.color})`,
                  }}
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r * 0.65}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={strokeW * 0.7}
                  opacity={opacity * 0.7}
                />
              </g>
            );
          })}

          {/* In-Flight ICMP Ping Animated Packets Layer */}
          {activePings.map((ping) => {
            const fromNode = graph.getNode(ping.activePath[ping.currentHopIndex]);
            const toNode = ping.activePath[ping.currentHopIndex + 1]
              ? graph.getNode(ping.activePath[ping.currentHopIndex + 1])
              : null;
            if (!fromNode) return null;

            let posX = fromNode.x;
            let posY = fromNode.y;
            let angleDeg = 0;

            if (toNode) {
              const dx = toNode.x - fromNode.x;
              const dy = toNode.y - fromNode.y;
              const len = Math.hypot(dx, dy) || 1;
              angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

              // Lateral offset away from link line so metric badge remains visible
              const nx = -dy / len;
              const ny = dx / len;
              const lateralOffset = 18;

              posX = fromNode.x + dx * ping.progress + nx * lateralOffset;
              posY = fromNode.y + dy * ping.progress + ny * lateralOffset;
            }

            const isReply = ping.phase === 'REPLY';
            const color = ping.color;

            return (
              <g key={ping.id} transform={`translate(${posX}, ${posY})`} style={{ pointerEvents: 'none' }}>
                {/* Outer Radiating Pulse Radar Wave */}
                <circle r="16" fill="none" stroke={color} strokeWidth="1.8" opacity="0.8">
                  <animate attributeName="r" from="10" to="30" dur="0.9s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.85" to="0" dur="0.9s" repeatCount="indefinite" />
                </circle>

                {/* Trailing Comet Aura */}
                <circle r="12" fill={color} opacity="0.35" style={{ filter: 'blur(3px)' }} />

                {/* Core Glowing Particle Dot */}
                <circle
                  r="8"
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{
                    filter: `drop-shadow(0 0 10px ${color})`,
                  }}
                />
                <circle r="2.5" fill="#ffffff" />

                {/* Direction Arrow Head pointing towards next hop */}
                <g transform={`rotate(${angleDeg}) translate(10, 0)`}>
                  <polygon points="0,-4 7,0 0,4" fill={color} />
                </g>

                {/* Sleek Frosted Pill Badge with TTL and Phase */}
                <g transform="translate(0, -22)" className="packet-float">
                  <rect
                    x="-55"
                    y="-11"
                    width="110"
                    height="22"
                    rx="11"
                    fill="rgba(15, 23, 42, 0.94)"
                    stroke={color}
                    strokeWidth="1.6"
                    style={{
                      backdropFilter: 'blur(8px)',
                      filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4))',
                    }}
                  />
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill="#ffffff"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                    letterSpacing="0.2px"
                  >
                    {isReply ? '↩ ECHO REPLY' : '➔ ECHO REQ'} · TTL:{ping.ttl}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Chaos Monkey Visual Strikes Layer (Lightning, Explosions, Metric Spikes, Flap Badges) */}
          {chaosStrikes.map((strike) => {
            if (strike.type === 'LINK_SEVER' && strike.targetX !== undefined && strike.targetY !== undefined) {
              const midX = (strike.sourceX + strike.targetX) / 2;
              const midY = (strike.sourceY + strike.targetY) / 2;
              return (
                <g key={strike.id} style={{ pointerEvents: 'none' }}>
                  {/* Outer Electric Red Laser Lightning Beam */}
                  <line
                    x1={strike.sourceX}
                    y1={strike.sourceY}
                    x2={strike.targetX}
                    y2={strike.targetY}
                    stroke="#F43F5E"
                    strokeWidth="5"
                    className="chaos-lightning-line"
                    style={{ filter: 'drop-shadow(0 0 16px #FB7185)' }}
                  />
                  {/* Core White Hot Electric Discharge Line */}
                  <line
                    x1={strike.sourceX}
                    y1={strike.sourceY}
                    x2={strike.targetX}
                    y2={strike.targetY}
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                    className="chaos-lightning-line"
                  />
                  {/* Center Sever Spark Burst Badge */}
                  <g transform={`translate(${midX}, ${midY})`} className="sever-spark-anim">
                    <circle r="22" fill="none" stroke="#F43F5E" strokeWidth="2.5" opacity="0.85">
                      <animate attributeName="r" from="8" to="34" dur="0.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.9" to="0" dur="0.6s" repeatCount="indefinite" />
                    </circle>
                    <rect
                      x="-48"
                      y="-13"
                      width="96"
                      height="26"
                      rx="13"
                      fill="rgba(244, 63, 94, 0.96)"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      style={{ filter: 'drop-shadow(0 0 14px #F43F5E)' }}
                    />
                    <text
                      textAnchor="middle"
                      dy="5"
                      fill="#FFFFFF"
                      fontSize="11"
                      fontFamily="var(--font-mono)"
                      fontWeight="800"
                      letterSpacing="0.4px"
                    >
                      ⚡ SEVERED
                    </text>
                  </g>
                </g>
              );
            }

            if (strike.type === 'ROUTER_CRASH') {
              return (
                <g key={strike.id} transform={`translate(${strike.sourceX}, ${strike.sourceY})`} style={{ pointerEvents: 'none' }}>
                  {/* Expanding Fiery Explosion Shockwaves */}
                  <circle
                    r="46"
                    fill="none"
                    stroke="#F43F5E"
                    strokeWidth="3.5"
                    className="chaos-explosion-ring"
                  />
                  <circle
                    r="32"
                    fill="rgba(249, 115, 22, 0.28)"
                    stroke="#F97316"
                    strokeWidth="2.5"
                    className="chaos-explosion-ring"
                    style={{ animationDelay: '0.12s' }}
                  />
                  {/* Floating Crash Alert Badge */}
                  <g transform="translate(0, -38)" className="sever-spark-anim">
                    <rect
                      x="-50"
                      y="-12"
                      width="100"
                      height="24"
                      rx="12"
                      fill="rgba(225, 29, 72, 0.96)"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      style={{ filter: 'drop-shadow(0 0 14px #E11D48)' }}
                    />
                    <text
                      textAnchor="middle"
                      dy="4.5"
                      fill="#FFFFFF"
                      fontSize="10.5"
                      fontFamily="var(--font-mono)"
                      fontWeight="800"
                      letterSpacing="0.3px"
                    >
                      💥 CRASHED
                    </text>
                  </g>
                </g>
              );
            }

            if (strike.type === 'METRIC_SPIKE') {
              return (
                <g key={strike.id} transform={`translate(${strike.sourceX}, ${strike.sourceY - 14})`} className="flame-pop-anim" style={{ pointerEvents: 'none' }}>
                  <rect
                    x="-68"
                    y="-13"
                    width="136"
                    height="26"
                    rx="13"
                    fill="rgba(249, 115, 22, 0.96)"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    style={{ filter: 'drop-shadow(0 0 14px rgba(249, 115, 22, 0.75))' }}
                  />
                  <text
                    textAnchor="middle"
                    dy="5"
                    fill="#FFFFFF"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                    fontWeight="800"
                  >
                    {strike.label || '🔥 JITTER'}
                  </text>
                </g>
              );
            }

            if (strike.type === 'FLAP' && strike.targetX !== undefined && strike.targetY !== undefined) {
              const midX = (strike.sourceX + strike.targetX) / 2;
              const midY = (strike.sourceY + strike.targetY) / 2;
              return (
                <g key={strike.id} transform={`translate(${midX}, ${midY})`} className="sever-spark-anim" style={{ pointerEvents: 'none' }}>
                  <rect
                    x="-58"
                    y="-13"
                    width="116"
                    height="26"
                    rx="13"
                    fill="rgba(245, 158, 11, 0.96)"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    style={{ filter: 'drop-shadow(0 0 14px #F59E0B)' }}
                  />
                  <text
                    textAnchor="middle"
                    dy="5"
                    fill="#FFFFFF"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                    fontWeight="800"
                  >
                    ⚠️ FLAPPING
                  </text>
                </g>
              );
            }

            return null;
          })}
        </g>
      </svg>

      {/* Action Event Floating Banners Stack (Top-Right) */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 150,
          pointerEvents: 'none',
        }}
      >
        {actionBanners.map((banner) => {
          const isChaos =
            banner.type.includes('CHAOS') ||
            banner.type === 'ROUTER_CRASH' ||
            banner.type === 'METRIC_JITTER' ||
            banner.type === 'LINK_FLAP' ||
            banner.type === 'LINK_DOWN';

          return (
            <div
              key={banner.id}
              className="glass-panel canvas-action-banner"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                borderLeft: `4px solid ${banner.color}`,
                backgroundColor: isChaos ? 'rgba(255, 241, 242, 0.98)' : 'rgba(255, 255, 255, 0.96)',
                boxShadow: isChaos ? '0 8px 24px rgba(244, 63, 94, 0.28)' : '0 8px 24px rgba(70, 45, 30, 0.18)',
                backdropFilter: 'blur(10px)',
                minWidth: '240px',
                maxWidth: '380px',
              }}
            >
              {isChaos ? (
                <Flame size={16} color={banner.color} style={{ flexShrink: 0 }} />
              ) : (
                <div
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: banner.color,
                    boxShadow: `0 0 8px ${banner.color}`,
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {banner.title}
                </span>
                {banner.subtitle && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                      marginTop: '2px',
                    }}
                  >
                    {banner.subtitle}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chaos Monkey Active HUD Indicator */}
      {isChaosActive && (
        <div
          className="glass-panel chaos-active-hud"
          style={{
            position: 'absolute',
            top: 20,
            left: 80,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 18px',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.95), rgba(249, 115, 22, 0.95))',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(244, 63, 94, 0.45)',
            zIndex: 160,
            backdropFilter: 'blur(10px)',
            border: '1.5px solid rgba(255, 255, 255, 0.6)',
            pointerEvents: 'none',
          }}
        >
          <Flame size={16} color="#ffffff" />
          <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.4px' }}>
            CHAOS MONKEY ACTIVE · AUTO-INJECTING FAULTS
          </span>
          <span
            style={{
              fontSize: '10px',
              background: 'rgba(0, 0, 0, 0.28)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
            }}
          >
            LIVE
          </span>
        </div>
      )}

      {/* Ping Tool Active Guidance Pill (Top-Center) */}
      {toolMode === 'ping' && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 18px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            zIndex: 160,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
          }}
        >
          <Target size={16} color="#00F2FE" />
          <span style={{ fontSize: '12px', fontWeight: 600 }}>
            {pingToolSource
              ? `Source: ${graph.getNode(pingToolSource)?.label || pingToolSource} ➔ Click Destination Router`
              : 'ICMP Ping Tool: Click Source Router'}
          </span>
          <button
            onClick={() => {
              setToolMode('select');
              setPingToolSource(null);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
            title="Cancel Ping Tool"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Floating Canvas Controls Toolbar (Vertical Dock on Left - Prevents overlap with Scrubber) */}
      {showControls && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            bottom: 24,
            left: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 6px',
            zIndex: 100,
            boxShadow: 'var(--shadow-md)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {/* Tool Modes */}
          <button
            className={`btn ${toolMode === 'select' ? 'btn-primary' : 'btn-secondary'} btn-icon`}
            title="Select & Move Tool"
            onClick={() => setToolMode('select')}
          >
            <Hand size={16} />
          </button>

          <button
            className={`btn ${toolMode === 'link' ? 'btn-primary' : 'btn-secondary'} btn-icon`}
            title="Connect Link Tool (Drag between routers)"
            onClick={() => setToolMode(toolMode === 'link' ? 'select' : 'link')}
          >
            <Link2 size={16} />
          </button>

          <button
            className={`btn ${toolMode === 'ping' ? 'btn-primary' : 'btn-secondary'} btn-icon`}
            title="Quick ICMP Ping Tool (Click source router, then target router)"
            onClick={() => {
              setToolMode(toolMode === 'ping' ? 'select' : 'ping');
              setPingToolSource(null);
            }}
            style={{
              color: toolMode === 'ping' ? '#ffffff' : 'var(--accent-cyan)',
            }}
          >
            <Target size={16} />
          </button>

          {!readOnly && (
            <button
              className="btn btn-secondary btn-icon"
              title="Add New Router Node"
              onClick={handleAddRouter}
            >
              <Plus size={16} />
            </button>
          )}

          <div style={{ width: 22, height: 1, background: 'var(--border-subtle)', margin: '2px 0' }} />

          {/* Zoom & View Controls */}
          <button
            className="btn btn-secondary btn-icon"
            title="Zoom In"
            onClick={() => handleZoom(0.15)}
          >
            <ZoomIn size={16} />
          </button>

          <button
            className="btn btn-secondary btn-icon"
            title="Zoom Out"
            onClick={() => handleZoom(-0.15)}
          >
            <ZoomOut size={16} />
          </button>

          <button
            className="btn btn-secondary btn-icon"
            title="Zoom to Fit All"
            onClick={handleZoomToFit}
          >
            <Maximize2 size={16} />
          </button>

          <button
            className="btn btn-secondary btn-icon"
            title="Reset View (100%)"
            onClick={handleResetView}
          >
            <RotateCcw size={16} />
          </button>

          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              marginTop: '2px',
              fontWeight: 600,
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
        </div>
      )}

      {/* Edge Modal */}
      {editingEdge && (
        <EdgeModal
          edge={editingEdge}
          onClose={() => setEditingEdge(null)}
          onUpdateCost={(edgeId, cost) => graph.setEdgeCost(edgeId, cost)}
          onToggleStatus={(edgeId) => graph.toggleEdgeStatus(edgeId)}
          onDelete={(edgeId) => graph.removeEdge(edgeId)}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
