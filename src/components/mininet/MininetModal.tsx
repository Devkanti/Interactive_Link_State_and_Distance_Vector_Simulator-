import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Terminal,
  Activity,
  Download,
  RefreshCw,
  X,
  AlertCircle,
  Play,
  Copy,
  Check,
  Send,
  Cpu,
} from 'lucide-react';
import { NetworkNode, NetworkEdge } from '../../core/types';
import { mininetBridge } from '../../core/mininet/MininetBridgeClient';
import { MininetStatusResponse, RouterKernelRoutes, MininetPingResult } from '../../core/mininet/mininetTypes';

export interface MininetModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  activeProtocol: 'LSR' | 'DVR';
  onTriggerPingAnimation?: (sourceId: string, destId: string) => void;
}

type TabKey = 'overview' | 'routes' | 'ping' | 'cli';

export const MininetModal: React.FC<MininetModalProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
  activeProtocol,
  onTriggerPingAnimation,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [bridgeUrl, setBridgeUrl] = useState<string>(mininetBridge.getBaseUrl());
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [statusData, setStatusData] = useState<MininetStatusResponse>({ online: false });
  const [kernelRoutes, setKernelRoutes] = useState<RouterKernelRoutes>({});
  const [selectedRouter, setSelectedRouter] = useState<string>('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Ping Tool State
  const [pingSrc, setPingSrc] = useState<string>('');
  const [pingDst, setPingDst] = useState<string>('');
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<MininetPingResult | null>(null);

  // List of active routers synchronized with bridge routes
  const routerOptions = useMemo(() => {
    if (nodes && nodes.length > 0) {
      return nodes.map((n, idx) => {
        const cleanName = (n.label || n.id).replace(/^Router\s+/i, '').trim();
        const rKey = `r${idx + 1}`;
        const resolvedId = kernelRoutes[rKey]
          ? rKey
          : kernelRoutes[n.id]
            ? n.id
            : kernelRoutes[cleanName]
              ? cleanName
              : rKey;
        return {
          id: resolvedId,
          label: `Router ${cleanName}`
        };
      });
    }

    const rKeys = Object.keys(kernelRoutes).filter((k) => /^r\d+$/i.test(k));
    if (rKeys.length > 0) {
      return rKeys.sort().map((key) => {
        const num = key.replace(/\D/g, '');
        const letter = String.fromCharCode(64 + parseInt(num, 10));
        return {
          id: key,
          label: `Router ${letter}`
        };
      });
    }

    return [
      { id: 'r1', label: 'Router A' },
      { id: 'r2', label: 'Router B' },
      { id: 'r3', label: 'Router C' },
      { id: 'r4', label: 'Router D' },
    ];
  }, [kernelRoutes, nodes]);

  // Resolve active routes for the currently selected router across ID variations
  const currentRoutes = useMemo(() => {
    if (!selectedRouter) return [];
    if (kernelRoutes[selectedRouter] && kernelRoutes[selectedRouter].length > 0) {
      return kernelRoutes[selectedRouter];
    }
    const lower = selectedRouter.toLowerCase();
    if (kernelRoutes[lower] && kernelRoutes[lower].length > 0) {
      return kernelRoutes[lower];
    }
    const upper = selectedRouter.toUpperCase();
    if (kernelRoutes[upper] && kernelRoutes[upper].length > 0) {
      return kernelRoutes[upper];
    }
    if (selectedRouter.startsWith('r') && !isNaN(Number(selectedRouter.slice(1)))) {
      const idx = Number(selectedRouter.slice(1));
      const letter = String.fromCharCode(64 + idx);
      if (kernelRoutes[letter]) return kernelRoutes[letter];
      if (kernelRoutes[letter.toLowerCase()]) return kernelRoutes[letter.toLowerCase()];
    }
    if (selectedRouter.length === 1 && selectedRouter.match(/[A-Z]/i)) {
      const idx = selectedRouter.toUpperCase().charCodeAt(0) - 64;
      const rKey = `r${idx}`;
      if (kernelRoutes[rKey]) return kernelRoutes[rKey];
    }
    return [];
  }, [kernelRoutes, selectedRouter]);

  // Synchronize selected router and ping endpoints whenever router options update
  useEffect(() => {
    if (routerOptions.length > 0) {
      if (!selectedRouter || !routerOptions.some(r => r.id === selectedRouter)) {
        setSelectedRouter(routerOptions[0].id);
      }
      if (!pingSrc || !routerOptions.some(r => r.id === pingSrc)) {
        setPingSrc(routerOptions[0].id);
      }
      if (!pingDst || !routerOptions.some(r => r.id === pingDst)) {
        setPingDst(routerOptions.length > 1 ? routerOptions[1].id : routerOptions[0].id);
      }
    }
  }, [routerOptions, selectedRouter, pingSrc, pingDst]);

  // Poll / Check Bridge Status
  const handleCheckConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await mininetBridge.fetchStatus();
      setStatusData(res);
      if (res.online) {
        const routes = await mininetBridge.fetchRoutes();
        setKernelRoutes(routes);
        const routeKeys = Object.keys(routes);
        if (routeKeys.length > 0) {
          setSelectedRouter((prev) => (prev && routes[prev] ? prev : routeKeys[0]));
        }
      }
    } catch {
      setStatusData({ online: false, error: 'Cannot connect to bridge server' });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      handleCheckConnection();
    }
  }, [isOpen, handleCheckConnection]);

  if (!isOpen) return null;

  // Handle URL Change
  const handleSaveUrl = () => {
    mininetBridge.setBaseUrl(bridgeUrl);
    handleCheckConnection();
  };

  // Export Topology to Python Script
  const handleExportScript = () => {
    const script = mininetBridge.generatePythonScript(nodes, edges, activeProtocol);
    const filename = `mininet_${activeProtocol.toLowerCase()}_topo.py`;
    mininetBridge.downloadScript(filename, script);
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Run ICMP Ping
  const handleExecutePing = async () => {
    if (!pingSrc || !pingDst) return;
    setIsPinging(true);
    setPingResult(null);

    // Immediately trigger real-time canvas animation on the dashboard
    if (onTriggerPingAnimation) {
      onTriggerPingAnimation(pingSrc, pingDst);
    }

    try {
      const res = await mininetBridge.executePing(pingSrc, pingDst, 3);
      setPingResult(res);
    } catch (err: any) {
      setPingResult({
        success: false,
        src: pingSrc,
        dst: pingDst,
        output: `Execution error: ${err?.message || 'Check bridge connection'}`,
      });
    } finally {
      setIsPinging(false);
    }
  };

  const isOnline = statusData.online;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(35, 28, 24, 0.45)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '900px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFDFB',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(70, 45, 30, 0.2)',
          border: '1px solid var(--border-strong)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(254, 226, 207, 0.5) 0%, rgba(254, 239, 229, 0.7) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: 'var(--glow-sky)',
              }}
            >
              <Terminal size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Mininet L3 Router Emulation
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: isOnline ? 'rgba(31, 163, 126, 0.15)' : 'rgba(107, 91, 82, 0.12)',
                    color: isOnline ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      backgroundColor: isOnline ? 'var(--accent-emerald)' : '#A09088',
                      boxShadow: isOnline ? '0 0 8px var(--accent-emerald)' : 'none',
                    }}
                  />
                  {isOnline ? 'Bridge Connected' : 'Bridge Standby'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Layer 3 Network Emulation & Telemetry Control Plane
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleCheckConnection}
              disabled={isChecking}
              style={{ fontSize: '12px', padding: '6px 12px', gap: '6px' }}
              title="Refresh connection status"
            >
              <RefreshCw size={13} className={isChecking ? 'spin' : ''} />
              {isChecking ? 'Checking...' : 'Refresh'}
            </button>
            <button
              className="btn btn-secondary btn-icon"
              onClick={onClose}
              style={{ width: 32, height: 32 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            padding: '0 24px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(254, 239, 229, 0.3)',
            gap: '8px',
          }}
        >
          {[
            { key: 'overview', label: 'Setup & Export', icon: Cpu },
            { key: 'routes', label: 'Kernel Routing (FIB)', icon: Activity },
            { key: 'ping', label: 'ICMP Ping Console', icon: Send },
            { key: 'cli', label: 'Mininet CLI Reference', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as TabKey);
                  if (tab.key === 'routes') {
                    handleCheckConnection();
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  marginBottom: '-1px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* TAB 1: OVERVIEW & EXPORT */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Highlight Card: 1-Click Export */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(148, 200, 253, 0.18) 0%, rgba(254, 226, 207, 0.28) 100%)',
                  border: '1px solid rgba(148, 200, 253, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Export Topology to Mininet (.py)
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Generates a standalone Python script configuring Layer 3 Linux routers, point-to-point subnets, and IP forwarding for your active canvas.
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleExportScript}
                  style={{
                    fontSize: '13px',
                    padding: '8px 16px',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    boxShadow: 'var(--glow-sky)',
                  }}
                >
                  <Download size={15} />
                  Download Mininet Script (.py)
                </button>
              </div>

              {/* Bridge Connection Config */}
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: '#fff',
                }}
              >
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
                  Emulation Bridge Server
                </h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    placeholder="http://localhost:8080"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={handleSaveUrl}
                    style={{ fontSize: '12px', padding: '8px 14px' }}
                  >
                    Connect Bridge
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  {isOnline ? (
                    <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                      ✓ Connected to Mininet ({statusData.engine}) with {statusData.nodes?.length || 0} routers online.
                    </span>
                  ) : (
                    <span>
                      Bridge is currently offline. Start it in Ubuntu or WSL with the command below to enable live telemetry.
                    </span>
                  )}
                </div>
              </div>

              {/* Linux Terminal Instructions */}
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: '#fff',
                }}
              >
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Terminal Commands (Run on Linux / WSL2)
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Run these commands inside your project folder in Ubuntu or WSL:
                </p>

                {/* Command 1: Setup */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Step 1: Install Mininet & Open vSwitch
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#1E1E1E',
                      color: '#E0E0E0',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                    }}
                  >
                    <span>cd mininet && sudo ./setup.sh</span>
                    <button
                      onClick={() => handleCopy('cd mininet && sudo ./setup.sh', 'setup')}
                      style={{ background: 'transparent', border: 'none', color: '#94C8FD', cursor: 'pointer' }}
                    >
                      {copiedCmd === 'setup' ? <Check size={14} color="#1FA37E" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Command 2: Runner */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Step 2: Launch Mininet L3 Emulation with Web Bridge
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#1E1E1E',
                      color: '#E0E0E0',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                    }}
                  >
                    <span>sudo python3 mininet/topology_runner.py --topo diamond --bridge-port 8080</span>
                    <button
                      onClick={() =>
                        handleCopy(
                          'sudo python3 mininet/topology_runner.py --topo diamond --bridge-port 8080',
                          'runner'
                        )
                      }
                      style={{ background: 'transparent', border: 'none', color: '#94C8FD', cursor: 'pointer' }}
                    >
                      {copiedCmd === 'runner' ? <Check size={14} color="#1FA37E" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KERNEL ROUTING TABLES (FIB) */}
          {activeTab === 'routes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Kernel Routing Tables (FIB)
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Active Forwarding Information Base (FIB) synchronized via <code style={{ fontFamily: 'var(--font-mono)' }}>ip route</code>
                  </p>
                </div>

                {/* Router Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Select Router:
                  </span>
                  <select
                    value={selectedRouter}
                    onChange={(e) => setSelectedRouter(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: '#fff',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                    }}
                  >
                    {routerOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Routing Table Display */}
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                }}
              >
                {isOnline && currentRoutes.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderBottom: '1px solid var(--border-subtle)',
                          textAlign: 'left',
                        }}
                      >
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Destination CIDR</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Next Hop Gateway</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Interface</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Protocol</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Metric</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRoutes.map((entry, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {entry.dst || (entry as any).destination}
                          </td>
                          <td style={{ padding: '10px 14px', color: (entry.gateway || (entry as any).nextHop) ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                            {entry.gateway || (entry as any).nextHop || 'Direct (Link)'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(148, 200, 253, 0.2)',
                                color: 'var(--accent-blue)',
                              }}
                            >
                              {entry.dev || (entry as any).interface || 'veth'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor:
                                  entry.protocol === 'lsr'
                                    ? 'rgba(31, 163, 126, 0.15)'
                                    : entry.protocol === 'dvr'
                                      ? 'rgba(232, 122, 80, 0.15)'
                                      : 'rgba(107, 91, 82, 0.1)',
                                color:
                                  entry.protocol === 'lsr'
                                    ? 'var(--accent-emerald)'
                                    : entry.protocol === 'dvr'
                                      ? 'var(--accent-peach)'
                                      : 'var(--text-secondary)',
                                fontWeight: 600,
                              }}
                            >
                              {entry.protocol ? `proto ${entry.protocol}` : 'kernel'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                            {entry.metric !== undefined ? entry.metric : ((entry as any).cost ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : isOnline ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Activity size={32} color="var(--accent-blue)" style={{ margin: '0 auto 10px' }} />
                    <p style={{ fontWeight: 600 }}>No routes installed for {selectedRouter}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Waiting for protocol convergence update.
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <AlertCircle size={32} color="var(--accent-amber)" style={{ margin: '0 auto 10px' }} />
                    <p style={{ fontWeight: 600 }}>Emulation Bridge Offline</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Start <code style={{ fontFamily: 'var(--font-mono)' }}>topology_runner.py</code> to stream live kernel routing tables.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ICMP PING CONSOLE */}
          {activeTab === 'ping' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  ICMP Ping Diagnostics
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Execute end-to-end ICMP echo requests across emulated router nodes.
                </p>
              </div>

              {/* Ping Form */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#fff',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Source:</span>
                  <select
                    value={pingSrc}
                    onChange={(e) => setPingSrc(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-strong)',
                    }}
                  >
                    {routerOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>➔</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Destination:</span>
                  <select
                    value={pingDst}
                    onChange={(e) => setPingDst(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-strong)',
                    }}
                  >
                    {routerOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleExecutePing}
                  disabled={isPinging || !isOnline}
                  style={{
                    fontSize: '12px',
                    padding: '8px 18px',
                    gap: '6px',
                    marginLeft: 'auto',
                  }}
                >
                  <Play size={13} />
                  {isPinging ? 'Executing Ping...' : 'Execute Ping'}
                </button>
              </div>

              {/* Visual Hop Pipeline Animation Card */}
              {(isPinging || pingResult) && (
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: '#E0F2FE',
                        color: '#0369A1',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                      }}
                    >
                      {pingSrc.toUpperCase()} (10.{pingSrc.replace(/\D/g, '') || '1'}.0.1)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          height: '2px',
                          width: '45px',
                          background: isPinging
                            ? 'linear-gradient(90deg, #00F2FE, #3B82F6)'
                            : '#CBD5E1',
                          display: 'inline-block',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '10px',
                          color: isPinging ? '#0284C7' : '#64748B',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        ● ICMP
                      </span>
                      <span
                        style={{
                          height: '2px',
                          width: '45px',
                          background: isPinging
                            ? 'linear-gradient(90deg, #3B82F6, #10B981)'
                            : '#CBD5E1',
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>➔</span>
                    </div>
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: pingResult?.success ? '#DCFCE7' : '#FEE2E2',
                        color: pingResult?.success ? '#15803D' : '#B91C1C',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                      }}
                    >
                      {pingDst.toUpperCase()} (10.{pingDst.replace(/\D/g, '') || '4'}.0.1)
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                    {isPinging ? (
                      <span style={{ color: '#0284C7', fontWeight: 600 }}>Streaming packets across canvas...</span>
                    ) : pingResult?.success ? (
                      <span style={{ color: '#16A34A', fontWeight: 600 }}>
                        RTT: {pingResult.avgRttMs ? `${pingResult.avgRttMs} ms` : '< 1 ms'} · Packet Loss: {pingResult.packetLoss ?? 0}%
                      </span>
                    ) : (
                      <span style={{ color: '#DC2626', fontWeight: 600 }}>Destination Unreachable (100% loss)</span>
                    )}
                  </div>
                </div>
              )}

              {/* Terminal Ping Output */}
              <div
                style={{
                  backgroundColor: '#1E1E1E',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: '#D4D4D4',
                  minHeight: '160px',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {pingResult ? (
                  <div>
                    <div style={{ color: pingResult.success ? '#4ADE80' : '#F87171', marginBottom: '8px', fontWeight: 600 }}>
                      {pingResult.success ? '✓ Ping Completed' : '✗ Ping Failed / Unreachable'}
                    </div>
                    <div>{pingResult.output}</div>
                  </div>
                ) : (
                  <div style={{ color: '#888' }}>
                    # Select routers above and click "Execute ICMP Ping" to test end-to-end connectivity across Linux namespaces...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MININET CLI & ARCHITECTURE REFERENCE */}
          {activeTab === 'cli' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Mininet Layer 3 Architecture & CLI Reference
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Kernel-level network namespace orchestration and debugging commands for evaluation.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: '#fff',
                  }}
                >
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '8px' }}>
                    Linux Network Namespaces (netns)
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Each router is an isolated Linux namespace. Virtual Ethernet (<code style={{ fontFamily: 'var(--font-mono)' }}>veth</code>) pairs carry real IP traffic with IP forwarding enabled (<code style={{ fontFamily: 'var(--font-mono)' }}>net.ipv4.ip_forward=1</code>). Routing daemons communicate over UDP sockets.
                  </p>
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: '#fff',
                  }}
                >
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '8px' }}>
                    Kernel Routing Table Inspection
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Inspect the active Linux Forwarding Information Base (FIB) inside any router:
                    <br />
                    <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)', fontWeight: 600 }}>
                      mininet&gt; r1 ip route show
                    </code>
                    <br />
                    Routes installed dynamically by our daemons appear with <code style={{ fontFamily: 'var(--font-mono)' }}>proto lsr</code> or <code style={{ fontFamily: 'var(--font-mono)' }}>proto dvr</code> tags.
                  </p>
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: '#fff',
                  }}
                >
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '8px' }}>
                    Dynamic Fault Injection
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Simulate link cuts and observe automatic convergence:
                    <br />
                    <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-rose)', fontWeight: 600 }}>
                      mininet&gt; link r1 r2 down
                    </code>
                    <br />
                    Routing daemons detect neighbor loss, recalculate shortest paths (Dijkstra / Bellman-Ford), and update kernel next-hops automatically.
                  </p>
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: '#fff',
                  }}
                >
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-peach)', marginBottom: '8px' }}>
                    End-to-End Packet Verification
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Execute multi-hop ICMP echo requests through the emulated topology:
                    <br />
                    <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)', fontWeight: 600 }}>
                      mininet&gt; r1 ping -c 3 10.3.0.1
                    </code>
                    <br />
                    Packets traverse intermediate Linux router hops, decrementing TTL and measuring real kernel latency.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Files located in <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>mininet/</code> directory
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleExportScript}
              style={{ fontSize: '12px', padding: '6px 14px', gap: '6px' }}
            >
              <Download size={13} /> Export .py
            </button>
            <button
              className="btn btn-primary"
              onClick={onClose}
              style={{ fontSize: '12px', padding: '6px 16px' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
