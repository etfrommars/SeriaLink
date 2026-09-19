import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AutoReplyRule,
  ChartChannel,
  ChartPoint,
  CrcType,
  DataBits,
  DataEncoding,
  DisplayMode,
  FlowControlType,
  HighlightRule,
  LineEnding,
  ParityType,
  SerialConfig,
  SerialLogItem,
  SerialSignals,
  StopBits
} from './types';
import { Navbar } from './components/Navbar';
import { SerialConfigPanel } from './components/SerialConfigPanel';
import { ConsoleView } from './components/ConsoleView';
import { TransmitPanel } from './components/TransmitPanel';
import { RealtimeChart } from './components/RealtimeChart';
import { QuickSendPanel } from './components/QuickSendPanel';
import { AutoReplyPanel } from './components/AutoReplyPanel';
import { CrcCalculatorModal } from './components/CrcCalculatorModal';
import { LogExportModal } from './components/LogExportModal';
import { HelpModal } from './components/HelpModal';
import {
  bytesToHex,
  bytesToString,
  extractNumbers,
  hexToBytes,
  serialManager,
  stringToBytes
} from './utils/serialHelper';
import { appendCrc } from './utils/crc';
import { autoLogSaver, exportLogsToCsv } from './utils/exportHelper';

const INITIAL_CHANNELS: ChartChannel[] = [
  { id: 0, name: 'CH1 通道', color: '#06b6d4', visible: true, currentValue: 0 },
  { id: 1, name: 'CH2 通道', color: '#10b981', visible: true, currentValue: 0 },
  { id: 2, name: 'CH3 通道', color: '#f59e0b', visible: true, currentValue: 0 },
  { id: 3, name: 'CH4 通道', color: '#a855f7', visible: false, currentValue: 0 },
  { id: 4, name: 'CH5 通道', color: '#f43f5e', visible: false, currentValue: 0 },
  { id: 5, name: 'CH6 通道', color: '#3b82f6', visible: false, currentValue: 0 },
];

const INITIAL_HIGHLIGHTS: HighlightRule[] = [
  { id: 'h1', keyword: 'ERROR', color: '#ef4444', caseSensitive: false, enabled: true },
  { id: 'h2', keyword: 'ERR', color: '#f87171', caseSensitive: false, enabled: true },
  { id: 'h3', keyword: 'WARN', color: '#f59e0b', caseSensitive: false, enabled: true },
  { id: 'h4', keyword: 'OK', color: '#10b981', caseSensitive: false, enabled: true },
  { id: 'h5', keyword: 'ACK', color: '#06b6d4', caseSensitive: false, enabled: true },
];

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'console' | 'chart' | 'quick' | 'autoReply' | 'tools'>('console');

  // Serial Port Configuration State
  const [config, setConfig] = useState<SerialConfig>({
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none',
    dtr: true,
    rts: true,
  });

  const [availablePorts, setAvailablePorts] = useState<any[]>([]);
  const [selectedPortIndex, setSelectedPortIndex] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualMode, setVirtualMode] = useState<'waveform' | 'modbus' | 'at' | 'echo'>('waveform');
  const [signals, setSignals] = useState<SerialSignals>({});

  // Display & Terminal Options
  const [displayMode, setDisplayMode] = useState<DisplayMode>('ascii');
  const [encoding, setEncoding] = useState<DataEncoding>('utf-8');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [autoWrap, setAutoWrap] = useState(true);
  const [isConsolePaused, setIsConsolePaused] = useState(false);
  const [highlightRules, setHighlightRules] = useState<HighlightRule[]>(INITIAL_HIGHLIGHTS);

  // Communication Logs
  const [logs, setLogs] = useState<SerialLogItem[]>([]);
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('webserial_tx_history');
    return saved ? JSON.parse(saved) : ['AT', 'AT+CSQ', '01 03 00 00 00 02'];
  });

  // Traffic statistics
  const [rxBytes, setRxBytes] = useState(0);
  const [txBytes, setTxBytes] = useState(0);
  const [rxSpeed, setRxSpeed] = useState(0);
  const [txSpeed, setTxSpeed] = useState(0);
  const lastRxBytesRef = useRef(0);
  const lastTxBytesRef = useRef(0);

  // Real-time Chart Data
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [channels, setChannels] = useState<ChartChannel[]>(INITIAL_CHANNELS);

  // Auto Reply Rules
  const [autoReplyRules, setAutoReplyRules] = useState<AutoReplyRule[]>([]);

  // Modals & Notices
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAutoLogging, setIsAutoLogging] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

  // Replay state
  const [isReplaying, setIsReplaying] = useState(false);
  const replayTimerRef = useRef<any>(null);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('webserial_tx_history', JSON.stringify(history.slice(0, 50)));
  }, [history]);

  // Show Toast Notice Helper
  const showNotice = useCallback((text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setNoticeMessage({ text, type });
    setTimeout(() => setNoticeMessage(null), 4000);
  }, []);

  // Fetch Available Ports on Mount
  const refreshPorts = useCallback(async () => {
    try {
      const ports = await serialManager.getAvailablePorts();
      setAvailablePorts(ports);
      if (ports.length > 0 && selectedPortIndex >= ports.length) {
        setSelectedPortIndex(0);
      }
    } catch {
      setAvailablePorts([]);
    }
  }, [selectedPortIndex]);

  useEffect(() => {
    refreshPorts();

    // Listen for device connect/disconnect events
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      const onConnect = () => refreshPorts();
      const onDisconnect = () => {
        refreshPorts();
        if (isConnected && !isVirtual) {
          setIsConnected(false);
          showNotice('检测到串口设备已被拔出或断开连接', 'error');
        }
      };
      (navigator as any).serial.addEventListener('connect', onConnect);
      (navigator as any).serial.addEventListener('disconnect', onDisconnect);

      return () => {
        (navigator as any).serial.removeEventListener('connect', onConnect);
        (navigator as any).serial.removeEventListener('disconnect', onDisconnect);
      };
    }
  }, [refreshPorts, isConnected, isVirtual, showNotice]);

  // Measure speed (B/s) every second
  useEffect(() => {
    const timer = setInterval(() => {
      setRxSpeed(rxBytes - lastRxBytesRef.current);
      setTxSpeed(txBytes - lastTxBytesRef.current);
      lastRxBytesRef.current = rxBytes;
      lastTxBytesRef.current = txBytes;
    }, 1000);
    return () => clearInterval(timer);
  }, [rxBytes, txBytes]);

  // Handle incoming data
  const handleDataReceived = useCallback(
    (bytes: Uint8Array) => {
      setRxBytes((prev) => prev + bytes.length);

      const decodedText = bytesToString(bytes, encoding);
      const hex = bytesToHex(bytes);

      // Create log item
      const logItem: SerialLogItem = {
        id: `${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        direction: 'RX',
        rawBytes: bytes,
        text: decodedText,
        hex,
      };

      // Auto log stream
      if (autoLogSaver.isLogging) {
        autoLogSaver.appendLog(logItem);
      }

      // Append to logs unless paused
      if (!isConsolePaused) {
        setLogs((prev) => {
          const next = [...prev, logItem];
          return next.length > 5000 ? next.slice(-4000) : next;
        });
      }

      // Extract numbers for oscilloscope
      const nums = extractNumbers(decodedText);
      if (nums.length > 0) {
        const point: ChartPoint = {
          time: Date.now(),
          values: nums,
        };
        setChartPoints((prev) => {
          const next = [...prev, point];
          return next.length > 1000 ? next.slice(-1000) : next;
        });

        // Update channel live values
        setChannels((prevChannels) =>
          prevChannels.map((ch, idx) => {
            if (nums[idx] !== undefined) {
              return { ...ch, currentValue: nums[idx] };
            }
            return ch;
          })
        );
      }

      // Auto-reply rule evaluation
      if (autoReplyRules.length > 0) {
        for (const rule of autoReplyRules) {
          if (!rule.enabled) continue;
          let matched = false;

          if (rule.triggerType === 'contains') {
            matched = decodedText.includes(rule.triggerPattern);
          } else if (rule.triggerType === 'exact') {
            matched = decodedText.trim() === rule.triggerPattern.trim();
          } else if (rule.triggerType === 'hex') {
            const cleanPattern = rule.triggerPattern.replace(/[\s,]/g, '').toLowerCase();
            const cleanHex = hex.replace(/\s/g, '').toLowerCase();
            matched = cleanHex.includes(cleanPattern);
          }

          if (matched) {
            setTimeout(async () => {
              try {
                let payload: Uint8Array;
                if (rule.isHex) {
                  payload = hexToBytes(rule.replyContent);
                } else {
                  const end = rule.lineEnding === 'none' ? '' : rule.lineEnding;
                  payload = stringToBytes(rule.replyContent + end, encoding);
                }
                await serialManager.send(payload);

                // Record TX log for auto reply
                const replyLog: SerialLogItem = {
                  id: `${Date.now()}_reply`,
                  timestamp: Date.now(),
                  direction: 'TX',
                  rawBytes: payload,
                  text: `[自动应答 -> ${rule.name}] ` + (rule.isHex ? '' : rule.replyContent),
                  hex: bytesToHex(payload),
                };
                setLogs((prev) => [...prev, replyLog]);
                setTxBytes((prev) => prev + payload.length);
              } catch (err: any) {
                console.error('Auto reply failed', err);
              }
            }, Math.max(10, rule.delayMs));
            break;
          }
        }
      }
    },
    [encoding, isConsolePaused, autoReplyRules]
  );

  // Set Manager Callbacks
  useEffect(() => {
    serialManager.setCallbacks(
      handleDataReceived,
      () => {
        setIsConnected(false);
        showNotice('串口已断开连接', 'info');
      },
      (err) => {
        setIsConnected(false);
        showNotice(`通信异常: ${err.message}`, 'error');
      },
      (newSignals) => {
        setSignals(newSignals);
      }
    );
  }, [handleDataReceived, showNotice]);

  // Request new port pairing dialog
  const handleRequestNewPort = async () => {
    try {
      const port = await serialManager.requestPort();
      await refreshPorts();
      setSelectedPortIndex(0);
      showNotice('成功扫描并配对串口设备', 'success');
    } catch (err: any) {
      showNotice(err.message, 'error');
    }
  };

  // Connect Physical Port
  const handleConnectPort = async () => {
    if (availablePorts.length === 0) {
      try {
        await handleRequestNewPort();
      } catch {
        return;
      }
    }

    const portToConnect = availablePorts[selectedPortIndex] || availablePorts[0];
    if (!portToConnect) {
      showNotice('没有可用的串口设备，请先配对或连接虚拟仿真器', 'error');
      return;
    }

    try {
      await serialManager.connect(portToConnect, config);
      setIsConnected(true);
      setIsVirtual(false);
      showNotice(`已成功打开串口 (波特率: ${config.baudRate})`, 'success');
    } catch (err: any) {
      showNotice(err.message, 'error');
    }
  };

  // Connect Virtual Simulator
  const handleConnectVirtual = () => {
    serialManager.connectVirtual(virtualMode);
    setIsConnected(true);
    setIsVirtual(true);
    showNotice(`已启动虚拟串口仿真器 (${virtualMode})`, 'success');
  };

  // Disconnect
  const handleDisconnect = async () => {
    await serialManager.disconnect();
    setIsConnected(false);
    setIsVirtual(false);
    showNotice('串口已关闭', 'info');
  };

  // Send Data
  const handleSend = async (
    content: string,
    isHex: boolean,
    lineEnding: LineEnding,
    crc: CrcType
  ) => {
    if (!isConnected) {
      showNotice('串口未打开，请先连接串口', 'error');
      return;
    }

    let payload: Uint8Array;
    if (isHex) {
      payload = hexToBytes(content);
      if (crc !== 'none') {
        payload = appendCrc(payload, crc);
      }
    } else {
      const suffix = lineEnding === 'none' ? '' : lineEnding;
      payload = stringToBytes(content + suffix, encoding);
      if (crc !== 'none') {
        payload = appendCrc(payload, crc);
      }
    }

    if (payload.length === 0) return;

    await serialManager.send(payload);

    setTxBytes((prev) => prev + payload.length);

    // Save to history
    setHistory((prev) => [content, ...prev.filter((c) => c !== content)]);

    // Log TX
    const txLogItem: SerialLogItem = {
      id: `${Date.now()}_tx`,
      timestamp: Date.now(),
      direction: 'TX',
      rawBytes: payload,
      text: isHex ? bytesToHex(payload) : bytesToString(payload, encoding),
      hex: bytesToHex(payload),
    };

    if (autoLogSaver.isLogging) {
      autoLogSaver.appendLog(txLogItem);
    }

    setLogs((prev) => {
      const next = [...prev, txLogItem];
      return next.length > 5000 ? next.slice(-4000) : next;
    });
  };

  // Toggle Signal DTR / RTS
  const handleToggleDtr = async () => {
    const newDtr = !config.dtr;
    setConfig({ ...config, dtr: newDtr });
    await serialManager.setSignals({ dtr: newDtr });
  };

  const handleToggleRts = async () => {
    const newRts = !config.rts;
    setConfig({ ...config, rts: newRts });
    await serialManager.setSignals({ rts: newRts });
  };

  // Toggle Auto Log
  const handleToggleAutoLog = async () => {
    if (!isAutoLogging) {
      try {
        const filename = await autoLogSaver.startSaving();
        setIsAutoLogging(true);
        showNotice(`已启动实时存盘至本地文件: ${filename}`, 'success');
      } catch (err: any) {
        showNotice(`无法启动自动存盘: ${err.message}`, 'error');
      }
    } else {
      await autoLogSaver.stopSaving();
      setIsAutoLogging(false);
      showNotice('已停止实时自动存盘', 'info');
    }
  };

  // Replay Logs
  const handleReplayLogs = (replayLogs: SerialLogItem[], speedMultiplier: number) => {
    if (replayLogs.length === 0) return;
    setIsReplaying(true);
    let index = 0;

    const playNext = () => {
      if (index >= replayLogs.length) {
        setIsReplaying(false);
        showNotice('历史日志回放完成', 'success');
        return;
      }

      const current = replayLogs[index];
      handleDataReceived(current.rawBytes);
      index++;

      if (index < replayLogs.length) {
        const next = replayLogs[index];
        const diff = Math.min(1000, Math.max(20, (next.timestamp - current.timestamp) / speedMultiplier));
        replayTimerRef.current = setTimeout(playNext, diff);
      } else {
        setIsReplaying(false);
      }
    };

    playNext();
  };

  const handleStopReplay = () => {
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setIsReplaying(false);
    showNotice('已停止回放', 'info');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Toast Notice Banner */}
      {noticeMessage && (
        <div
          className={`fixed top-14 right-4 z-50 px-4 py-2 rounded-xl text-xs font-medium shadow-2xl flex items-center gap-2 border transition-all animate-fade-in ${
            noticeMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800'
              : noticeMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
              : 'bg-cyan-950/90 text-cyan-200 border-cyan-800'
          }`}
        >
          <span>{noticeMessage.text}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        isConnected={isConnected}
        isVirtual={isVirtual}
        virtualMode={virtualMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onConnectPort={handleConnectPort}
        onConnectVirtual={handleConnectVirtual}
        onDisconnect={handleDisconnect}
        onClearLogs={() => {
          setLogs([]);
          showNotice('已清空控制台日志', 'info');
        }}
        onExportCsv={() => setIsExportModalOpen(true)}
        isAutoLogging={isAutoLogging}
        onToggleAutoLog={handleToggleAutoLog}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        rxBytes={rxBytes}
        txBytes={txBytes}
      />

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Serial Configuration Sidebar */}
        <SerialConfigPanel
          config={config}
          onChangeConfig={setConfig}
          isConnected={isConnected}
          isVirtual={isVirtual}
          virtualMode={virtualMode}
          onChangeVirtualMode={(mode) => {
            setVirtualMode(mode);
            if (isVirtual) {
              serialManager.connectVirtual(mode);
              showNotice(`已切换为 ${mode} 仿真`, 'info');
            }
          }}
          availablePorts={availablePorts}
          onRefreshPorts={refreshPorts}
          onRequestNewPort={handleRequestNewPort}
          selectedPortIndex={selectedPortIndex}
          onSelectPortIndex={setSelectedPortIndex}
          signals={signals}
          onToggleDtr={handleToggleDtr}
          onToggleRts={handleToggleRts}
          rxBytes={rxBytes}
          txBytes={txBytes}
          rxSpeed={rxSpeed}
          txSpeed={txSpeed}
          onResetStats={() => {
            setRxBytes(0);
            setTxBytes(0);
            lastRxBytesRef.current = 0;
            lastTxBytesRef.current = 0;
            showNotice('已重置收发计数统计', 'info');
          }}
        />

        {/* Center/Right Dynamic Tab View Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
          {/* Tab 1: Terminal Console */}
          {activeTab === 'console' && (
            <div className="flex-1 flex flex-col min-h-0">
              <ConsoleView
                logs={logs}
                displayMode={displayMode}
                onChangeDisplayMode={setDisplayMode}
                encoding={encoding}
                onChangeEncoding={setEncoding}
                showTimestamps={showTimestamps}
                onToggleTimestamps={() => setShowTimestamps(!showTimestamps)}
                autoWrap={autoWrap}
                onToggleAutoWrap={() => setAutoWrap(!autoWrap)}
                isPaused={isConsolePaused}
                onTogglePause={() => setIsConsolePaused(!isConsolePaused)}
                highlightRules={highlightRules}
                onAddHighlightRule={(rule) => setHighlightRules([...highlightRules, rule])}
                onRemoveHighlightRule={(id) => setHighlightRules(highlightRules.filter((r) => r.id !== id))}
                onToggleHighlightRule={(id) =>
                  setHighlightRules(
                    highlightRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
                  )
                }
              />
              <TransmitPanel onSend={handleSend} isConnected={isConnected} history={history} />
            </div>
          )}

          {/* Tab 2: Realtime Oscilloscope Chart */}
          {activeTab === 'chart' && (
            <div className="flex-1 flex flex-col min-h-0">
              <RealtimeChart
                dataPoints={chartPoints}
                onClearData={() => {
                  setChartPoints([]);
                  showNotice('已清空波形数据', 'info');
                }}
                channels={channels}
                onUpdateChannels={setChannels}
              />
              <TransmitPanel onSend={handleSend} isConnected={isConnected} history={history} />
            </div>
          )}

          {/* Tab 3: Quick Command Panel & Sequence */}
          {activeTab === 'quick' && (
            <div className="flex-1 flex flex-col min-h-0">
              <QuickSendPanel onSend={handleSend} isConnected={isConnected} />
              <TransmitPanel onSend={handleSend} isConnected={isConnected} history={history} />
            </div>
          )}

          {/* Tab 4: Auto Reply Rule Engine */}
          {activeTab === 'autoReply' && (
            <div className="flex-1 flex flex-col min-h-0">
              <AutoReplyPanel
                rules={autoReplyRules}
                onUpdateRules={setAutoReplyRules}
                isConnected={isConnected}
              />
            </div>
          )}

          {/* Tab 5: Protocol Tools & Checksum Calculator */}
          {activeTab === 'tools' && (
            <div className="flex-1 flex flex-col min-h-0">
              <CrcCalculatorModal onSend={handleSend} isConnected={isConnected} />
            </div>
          )}
        </main>
      </div>

      {/* Log Export Modal */}
      <LogExportModal
        logs={logs}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        isAutoLogging={isAutoLogging}
        onToggleAutoLog={handleToggleAutoLog}
        onReplayLogs={handleReplayLogs}
        isReplaying={isReplaying}
        onStopReplay={handleStopReplay}
      />

      {/* Help Modal */}
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
}
