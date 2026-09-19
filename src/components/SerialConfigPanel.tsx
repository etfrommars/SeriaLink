import React from 'react';
import {
  RefreshCw,
  Sliders,
  Radio,
  Zap,
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { DataBits, FlowControlType, ParityType, SerialConfig, SerialSignals, StopBits } from '../types';

interface SerialConfigPanelProps {
  config: SerialConfig;
  onChangeConfig: (newConfig: SerialConfig) => void;
  isConnected: boolean;
  isVirtual: boolean;
  virtualMode: 'waveform' | 'modbus' | 'at' | 'echo';
  onChangeVirtualMode: (mode: 'waveform' | 'modbus' | 'at' | 'echo') => void;
  availablePorts: any[];
  onRefreshPorts: () => void;
  onRequestNewPort: () => void;
  selectedPortIndex: number;
  onSelectPortIndex: (index: number) => void;
  signals: SerialSignals;
  onToggleDtr: () => void;
  onToggleRts: () => void;
  rxBytes: number;
  txBytes: number;
  rxSpeed: number;
  txSpeed: number;
  onResetStats: () => void;
}

const COMMON_BAUDRATES = [
  300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 460800, 921600, 1500000, 2000000
];

export const SerialConfigPanel: React.FC<SerialConfigPanelProps> = ({
  config,
  onChangeConfig,
  isConnected,
  isVirtual,
  virtualMode,
  onChangeVirtualMode,
  availablePorts,
  onRefreshPorts,
  onRequestNewPort,
  selectedPortIndex,
  onSelectPortIndex,
  signals,
  onToggleDtr,
  onToggleRts,
  rxBytes,
  txBytes,
  rxSpeed,
  txSpeed,
  onResetStats,
}) => {
  const [isCustomBaud, setIsCustomBaud] = React.useState(
    !COMMON_BAUDRATES.includes(config.baudRate)
  );

  const formatByteSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <aside className="w-full lg:w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-xs text-slate-300 select-none overflow-y-auto">
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>串口硬件配置</span>
        </div>
        <button
          onClick={onRefreshPorts}
          disabled={isConnected}
          className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors disabled:opacity-40"
          title="刷新已授权串口列表"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* Device / Port Selector */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between">
            <span>物理串口设备</span>
            <button
              onClick={onRequestNewPort}
              disabled={isConnected}
              className="text-cyan-400 hover:text-cyan-300 font-mono text-[10px] hover:underline disabled:opacity-40"
            >
              + 扫描配对
            </button>
          </label>
          <div className="flex gap-1.5">
            <select
              value={selectedPortIndex}
              onChange={(e) => onSelectPortIndex(Number(e.target.value))}
              disabled={isConnected || isVirtual}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              {availablePorts.length === 0 ? (
                <option value={-1}>未发现已授权串口 (点扫描配对)</option>
              ) : (
                availablePorts.map((p, idx) => {
                  const info = p.getInfo ? p.getInfo() : {};
                  const vid = info.usbVendorId ? `VID:${info.usbVendorId.toString(16)}` : '';
                  const pid = info.usbProductId ? `PID:${info.usbProductId.toString(16)}` : '';
                  const label = [vid, pid].filter(Boolean).join(' ') || `COM 端口 #${idx + 1}`;
                  return (
                    <option key={idx} value={idx}>
                      {label}
                    </option>
                  );
                })
              )}
            </select>
          </div>
        </div>

        {/* Virtual Simulator Selector (if virtual or user wants to switch mode) */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
              <Radio className="w-3 h-3" />
              虚拟仿真模式
            </span>
            {isVirtual && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800">
                活跃中
              </span>
            )}
          </div>
          <select
            value={virtualMode}
            onChange={(e) => onChangeVirtualMode(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="waveform">示波器多通道遥测 (CH1/CH2/CH3)</option>
            <option value="modbus">Modbus RTU 从机 (Addr: 01)</option>
            <option value="at">AT 调制解调器 (AT/CSQ/GMR)</option>
            <option value="echo">环回回显模式 (Loopback Echo)</option>
          </select>
        </div>

        {/* Baud Rate */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between">
            <span>波特率 (Baud Rate)</span>
            <button
              onClick={() => setIsCustomBaud(!isCustomBaud)}
              disabled={isConnected}
              className="text-cyan-400 hover:text-cyan-300 text-[10px] disabled:opacity-40"
            >
              {isCustomBaud ? '选择预设' : '自定义'}
            </button>
          </label>
          {isCustomBaud ? (
            <input
              type="number"
              value={config.baudRate}
              disabled={isConnected}
              onChange={(e) => onChangeConfig({ ...config, baudRate: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              placeholder="输入自定义波特率..."
            />
          ) : (
            <select
              value={config.baudRate}
              disabled={isConnected}
              onChange={(e) => onChangeConfig({ ...config, baudRate: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              {COMMON_BAUDRATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate} bps
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Data Bits & Stop Bits */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">数据位 (Data)</label>
            <select
              value={config.dataBits}
              disabled={isConnected}
              onChange={(e) => onChangeConfig({ ...config, dataBits: Number(e.target.value) as DataBits })}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              <option value={8}>8 位</option>
              <option value={7}>7 位</option>
              <option value={6}>6 位</option>
              <option value={5}>5 位</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">停止位 (Stop)</label>
            <select
              value={config.stopBits}
              disabled={isConnected}
              onChange={(e) => onChangeConfig({ ...config, stopBits: Number(e.target.value) as StopBits })}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              <option value={1}>1 位</option>
              <option value={2}>2 位</option>
            </select>
          </div>
        </div>

        {/* Parity & Flow Control */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">校验位 (Parity)</label>
            <select
              value={config.parity}
              disabled={isConnected}
              onChange={(e) => onChangeConfig({ ...config, parity: e.target.value as ParityType })}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              <option value="none">None (无)</option>
              <option value="even">Even (偶校验)</option>
              <option value="odd">Odd (奇校验)</option>
              <option value="mark">Mark</option>
              <option value="space">Space</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">硬件流控 (Flow)</label>
            <select
              value={config.flowControl}
              disabled={isConnected}
              onChange={(e) => onChangeConfig({ ...config, flowControl: e.target.value as FlowControlType })}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              <option value="none">无 (None)</option>
              <option value="hardware">RTS / CTS</option>
            </select>
          </div>
        </div>

        {/* Signal Lines Control (DTR / RTS) & Inputs (CTS/DSR/CD/RI) */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              引脚信号控制
            </span>
            <span className="text-[10px] text-slate-500">DTR / RTS</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2.5">
            <button
              onClick={onToggleDtr}
              disabled={!isConnected || isVirtual}
              className={`py-1 px-2 rounded text-center text-xs font-mono font-medium border transition-colors cursor-pointer disabled:opacity-40 ${
                config.dtr
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300 shadow-sm shadow-amber-950'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              DTR: {config.dtr ? 'HIGH (1)' : 'LOW (0)'}
            </button>

            <button
              onClick={onToggleRts}
              disabled={!isConnected || isVirtual}
              className={`py-1 px-2 rounded text-center text-xs font-mono font-medium border transition-colors cursor-pointer disabled:opacity-40 ${
                config.rts
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300 shadow-sm shadow-amber-950'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              RTS: {config.rts ? 'HIGH (1)' : 'LOW (0)'}
            </button>
          </div>

          {/* Input Signals status pins */}
          <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center">
            <div className={`p-1 rounded border ${signals.cts ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
              CTS
            </div>
            <div className={`p-1 rounded border ${signals.dsr ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
              DSR
            </div>
            <div className={`p-1 rounded border ${signals.cd ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
              CD
            </div>
            <div className={`p-1 rounded border ${signals.ri ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
              RI
            </div>
          </div>
        </div>

        {/* Traffic Statistics */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              收发统计 (Traffic)
            </span>
            <button
              onClick={onResetStats}
              className="p-0.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="复位计数"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 text-emerald-400">
                <ArrowDownToLine className="w-3 h-3" />
                RX (接收):
              </span>
              <span>{formatByteSize(rxBytes)} <span className="text-[10px] text-slate-500">({rxSpeed} B/s)</span></span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 text-blue-400">
                <ArrowUpFromLine className="w-3 h-3" />
                TX (发送):
              </span>
              <span>{formatByteSize(txBytes)} <span className="text-[10px] text-slate-500">({txSpeed} B/s)</span></span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
