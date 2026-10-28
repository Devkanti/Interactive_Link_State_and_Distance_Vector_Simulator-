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
} from 'lucide-react';

import { TracePacket } from '../../core/tracer/types';
import { InFlightLSPPacket } from '../../core/lsr/types';
import { InFlightDVMessage } from '../../core/dvr/types';

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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Graph state listener to trigger re-renders
  const [, setVersion] = useState(0);
  useEffect(() => {
    return graph.subscribe(() => {
      setVersion((v) => v + 1);
    });
  }, [graph]);

  // Viewport Pan & Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Tool Modes: 'select' | 'link'
  const [toolMode, setToolMode] = useState<'select' | 'link'>('select');

  // Dragging and Connecting states
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [connecting, setConnecting] = useState<ConnectingState | null>(null);

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
    if (e.button === 0 && (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      if (onSelectNode) onSelectNode(null);
    }
  };

  // Global mouse move & up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      } else if (dragging) {
        const coords = screenToGraphCoords(e.clientX, e.clientY);
        graph.setNodePosition(dragging.nodeId, Math.round(coords.x), Math.round(coords.y));
      } else if (connecting) {
        const coords = screenToGraphCoords(e.clientX, e.clientY);
        setConnecting((prev) =>
          prev ? { ...prev, currentX: coords.x, currentY: coords.y } : null
        );
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      setDragging(null);
      setConnecting(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, panStart, dragging, connecting, graph, screenToGraphCoords]);

  // Start Node Drag or Connect
  const handleNodeMouseDown = (e: React.MouseEvent, node: NetworkNode) => {
    e.stopPropagation();
    if (e.button === 0) {
      if (toolMode === 'link') {
        const coords = screenToGraphCoords(e.clientX, e.clientY);
        setConnecting({
          sourceNodeId: node.id,
          currentX: coords.x,
          currentY: coords.y,
        });
      } else {
        setDragging({
          nodeId: node.id,
          startX: e.clientX,
          startY: e.clientY,
          originalX: node.x,
          originalY: node.y,
        });
      }
      if (onSelectNode) onSelectNode(node.id);
    }
  };

  // Complete Connection on MouseUp over Target Node
  const handleNodeMouseUp = (e: React.MouseEvent, targetNode: NetworkNode) => {
    e.stopPropagation();
    if (connecting && connecting.sourceNodeId !== targetNode.id) {
      const sourceId = connecting.sourceNodeId;
      const targetId = targetNode.id;
      // Check if edge already exists
      const existing = graph.getEdgeBetween(sourceId, targetId);
      if (!existing) {
        const newEdge = graph.addEdge(sourceId, targetId, 1);
        setEditingEdge(newEdge);
      }
      setConnecting(null);
    }
  };

  // Node Context Menu
  const handleNodeContextMenu = (e: React.MouseEvent, node: NetworkNode) => {
    e.preventDefault();
    e.stopPropagation();
    const items: ContextMenuItem[] = [
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
        cursor: isPanning ? 'grabbing' : connecting ? 'crosshair' : 'default',
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
                    filter: isDown ? 'none' : 'drop-shadow(0 0 5px rgba(148, 200, 253, 0.55))',
                    transition: 'stroke 0.2s',
                  }}
                />

                {/* Active Flow Animation Line when In-Flight Packets Transmit */}
                {hasInFlight && !isDown && (
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={hasInFlightLSR ? 'url(#packetStreamGrad)' : 'url(#packetStreamGradDvr)'}
                    strokeWidth="3.5"
                    className="edge-stream-active"
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
            const isCrashed = node.status === 'CRASHED';
            const radius = 24;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onMouseUp={(e) => handleNodeMouseUp(e, node)}
                onContextMenu={(e) => handleNodeContextMenu(e, node)}
                style={{ cursor: toolMode === 'link' ? 'crosshair' : 'grab' }}
              >
                {/* Selection halo */}
                {isSelected && (
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
              <g key={pkt.id} transform={`translate(${posX}, ${posY})`}>
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
                <g key={badgeId} transform={`translate(${posX}, ${posY})`} className="packet-float">
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
                <g key={badgeId} transform={`translate(${posX}, ${posY})`} className="packet-float">
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
        </g>
      </svg>

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
