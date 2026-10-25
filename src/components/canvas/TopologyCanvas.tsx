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

interface TopologyCanvasProps {
  graph: NetworkGraph;
  selectedNodeId?: NodeId | null;
  onSelectNode?: (nodeId: NodeId | null) => void;
  activeTracePackets?: TracePacket[];
  readOnly?: boolean;
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
  readOnly = false,
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

  // Zoom Controls
  const handleZoom = (delta: number, clientX?: number, clientY?: number) => {
    setZoom((prevZoom) => {
      const newZoom = Math.min(2.5, Math.max(0.3, prevZoom + delta));
      if (clientX !== undefined && clientY !== undefined && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        setPan((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * (newZoom / prevZoom),
          y: mouseY - (mouseY - prevPan.y) * (newZoom / prevZoom),
        }));
      }
      return newZoom;
    });
  };

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

    setZoom(fitZoom);
    setPan({
      x: rect.width / 2 - centerX * fitZoom,
      y: rect.height / 2 - centerY * fitZoom,
    });
  }, [nodes]);

  const handleResetView = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setZoom(1);
    setPan({ x: rect.width / 2 - 250, y: rect.height / 2 - 200 });
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
    e.preventDefault();
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
        background: 'radial-gradient(circle at 50% 50%, #0d1527 0%, #070a12 100%)',
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
            id="canvas-grid"
            width={40 * zoom}
            height={40 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x}, ${pan.y})`}
          >
            <circle cx="2" cy="2" r="1" fill="rgba(255, 255, 255, 0.07)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#canvas-grid)" />
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
              : 'rgba(56, 189, 248, 0.55)';

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
                    filter: isDown ? 'none' : 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.4))',
                    transition: 'stroke 0.2s',
                  }}
                />

                {/* Metric Badge in Center */}
                <g
                  transform={`translate(${midX}, ${midY})`}
                  onClick={() => setEditingEdge(edge)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x="-18"
                    y="-11"
                    width="36"
                    height="22"
                    rx="11"
                    fill={isDown ? '#4c0519' : '#0f172a'}
                    stroke={strokeColor}
                    strokeWidth="1.5"
                    style={{
                      filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.5))',
                    }}
                  />
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill={isDown ? '#fda4af' : 'var(--text-primary)'}
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

                {/* Node Outer Circle */}
                <circle
                  r={radius}
                  fill={isCrashed ? '#270811' : '#0b1329'}
                  stroke={
                    isCrashed
                      ? 'var(--accent-rose)'
                      : isSelected
                      ? 'var(--accent-cyan)'
                      : 'rgba(56, 189, 248, 0.7)'
                  }
                  strokeWidth={isSelected ? '3' : '2'}
                  style={{
                    filter: isCrashed
                      ? 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.4))'
                      : 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.35))',
                    transition: 'all 0.2s',
                  }}
                />

                {/* Router Symbol / Antenna Glyphs */}
                <path
                  d="M -10 -2 L 10 -2 M -10 3 L 10 3 M -5 -7 L -5 8 M 5 -7 L 5 8"
                  stroke={isCrashed ? 'var(--accent-rose)' : 'var(--accent-cyan)'}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />

                {/* Status Dot */}
                <circle
                  cx="16"
                  cy="-16"
                  r="5"
                  fill={isCrashed ? 'var(--accent-rose)' : 'var(--accent-emerald)'}
                  stroke="#0a0e17"
                  strokeWidth="1.5"
                />

                {/* Node Label Badge */}
                <g transform="translate(0, 36)">
                  <rect
                    x="-24"
                    y="-9"
                    width="48"
                    height="18"
                    rx="5"
                    fill="rgba(15, 23, 42, 0.85)"
                    stroke="var(--border-strong)"
                    strokeWidth="1"
                  />
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill="var(--text-primary)"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                  >
                    {node.label}
                  </text>
                </g>
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
              posX = (currNode.x + nextNode.x) / 2;
              posY = (currNode.y + nextNode.y) / 2;
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
                {/* Core particle */}
                <circle
                  r="9"
                  fill={particleColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{
                    filter: `drop-shadow(0 0 8px ${particleColor})`,
                  }}
                />
                {/* Label badge */}
                <g transform="translate(0, -20)">
                  <rect
                    x="-32"
                    y="-9"
                    width="64"
                    height="18"
                    rx="4"
                    fill="rgba(15, 23, 42, 0.95)"
                    stroke={particleColor}
                    strokeWidth="1.5"
                  />
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill="#ffffff"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                  >
                    {isCycle ? 'LOOP' : 'TTL'}: {pkt.ttl}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Canvas Controls Toolbar */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          zIndex: 100,
        }}
      >
        <button
          className={`btn ${toolMode === 'select' ? 'btn-primary' : 'btn-secondary'} btn-icon`}
          title="Select & Drag Mode"
          onClick={() => setToolMode('select')}
        >
          <Hand size={16} />
        </button>

        <button
          className={`btn ${toolMode === 'link' ? 'btn-primary' : 'btn-secondary'} btn-icon`}
          title="Connect Link Mode (Drag between routers)"
          onClick={() => setToolMode(toolMode === 'link' ? 'select' : 'link')}
        >
          <Link2 size={16} />
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px' }} />

        {!readOnly && (
          <button
            className="btn btn-secondary"
            title="Add New Router"
            onClick={handleAddRouter}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Plus size={16} /> Add Router
          </button>
        )}

        <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px' }} />

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
          title="Reset View"
          onClick={handleResetView}
        >
          <RotateCcw size={16} />
        </button>

        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            marginLeft: '6px',
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
      </div>

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
