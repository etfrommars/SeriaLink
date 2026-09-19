import React from 'react';
import {
  Activity,
  Download,
  FileText,
  Play,
  Square,
  Trash2,
  Tv,
  Cpu,
  HelpCircle,
  Maximize2,
  Minimize2,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface NavbarProps {
  isConnected: boolean;
  isVirtual: boolean;
  virtualMode: string;
  activeTab: 'console' | 'chart' | 'quick' | 'autoReply' | 'tools';
  setActiveTab: (tab: 'console' | 'chart' | 'quick' | 'autoReply' | 'tools') => void;
  onConnectPort: () => void;
  onConnectVirtual: () => void;
  onDisconnect: () => void;
  onClearLogs: () => void;
  onExportCsv: () => void;
  isAutoLogging: boolean;
  onToggleAutoLog: () => void;
  onOpenHelp: () => void;
  rxBytes: number;
  txBytes: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isConnected,
  isVirtual,
  virtualMode,
  activeTab,
  setActiveTab,
  onConnectPort,
  onConnectVirtual,
  onDisconnect,
  onClearLogs,
  onExportCsv,
  isAutoLogging,
  onToggleAutoLog,
  onOpenHelp,
  rxBytes,
  txBytes,
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 select-none shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Connection Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100 text-sm tracking-wide">Web Serial Studio</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Web Serial API 串口调试助手</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-slate-800">
            {isConnected ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800 shadow-sm shadow-emerald-950">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isVirtual ? `仿真运行 (${virtualMode})` : '已连接串口'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-800 text-slate-400 border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>串口未打开</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'console'
                ? 'bg-slate-800 text-cyan-400 shadow-sm shadow-cyan-900/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>终端数据流</span>
          </button>

          <button
            onClick={() => setActiveTab('chart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'chart'
                ? 'bg-slate-800 text-cyan-400 shadow-sm shadow-cyan-900/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>示波器图表</span>
          </button>

          <button
            onClick={() => setActiveTab('quick')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'quick'
                ? 'bg-slate-800 text-cyan-400 shadow-sm shadow-cyan-900/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>快捷面板与轮询</span>
          </button>

          <button
            onClick={() => setActiveTab('autoReply')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'autoReply'
                ? 'bg-slate-800 text-cyan-400 shadow-sm shadow-cyan-900/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>自动应答</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'tools'
                ? 'bg-slate-800 text-cyan-400 shadow-sm shadow-cyan-900/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>校验与协议工具</span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Connect / Disconnect Buttons */}
          {!isConnected ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onConnectPort}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20 transition-all active:scale-95 cursor-pointer"
                title="选择物理串口并打开"
              >
                <Play className="w-3.5 h-3.5" />
                <span>打开串口</span>
              </button>
              <button
                onClick={onConnectVirtual}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-all cursor-pointer"
                title="在没有物理设备时启动虚拟仿真设备进行波形与协议测试"
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden md:inline">仿真器</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/20 transition-all active:scale-95 cursor-pointer"
              title="关闭当前连接"
            >
              <Square className="w-3.5 h-3.5" />
              <span>关闭串口</span>
            </button>
          )}

          {/* Auto Log Toggle */}
          <button
            onClick={onToggleAutoLog}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              isAutoLogging
                ? 'bg-amber-950/70 border-amber-600 text-amber-300 shadow-sm shadow-amber-950'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="实时自动保存日志到本地磁盘文件 (Stream Writing)"
          >
            <Save className={`w-3.5 h-3.5 ${isAutoLogging ? 'animate-bounce text-amber-400' : ''}`} />
            <span className="hidden lg:inline">{isAutoLogging ? '实时记录中' : '自动存盘'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="导出当前通信日志为 CSV 电子表格"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">导出CSV</span>
          </button>

          {/* Clear logs */}
          <button
            onClick={onClearLogs}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
            title="清空终端缓存"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
            title="切换全屏"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Help */}
          <button
            onClick={onOpenHelp}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all cursor-pointer"
            title="使用指南与 Web Serial 提示"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
