import React, { useRef, useEffect, useState } from 'react';
import {
  Clock,
  WrapText,
  ArrowDown,
  Search,
  Filter,
  Palette,
  X,
  Plus,
  Copy,
  Check,
  Pause,
  Play
} from 'lucide-react';
import { DataEncoding, DisplayMode, HighlightRule, SerialLogItem } from '../types';

interface ConsoleViewProps {
  logs: SerialLogItem[];
  displayMode: DisplayMode;
  onChangeDisplayMode: (mode: DisplayMode) => void;
  encoding: DataEncoding;
  onChangeEncoding: (encoding: DataEncoding) => void;
  showTimestamps: boolean;
  onToggleTimestamps: () => void;
  autoWrap: boolean;
  onToggleAutoWrap: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  highlightRules: HighlightRule[];
  onAddHighlightRule: (rule: HighlightRule) => void;
  onRemoveHighlightRule: (id: string) => void;
  onToggleHighlightRule: (id: string) => void;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({
  logs,
  displayMode,
  onChangeDisplayMode,
  encoding,
  onChangeEncoding,
  showTimestamps,
  onToggleTimestamps,
  autoWrap,
  onToggleAutoWrap,
  isPaused,
  onTogglePause,
  highlightRules,
  onAddHighlightRule,
  onRemoveHighlightRule,
  onToggleHighlightRule,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'RX' | 'TX'>('ALL');
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newColor, setNewColor] = useState('#ef4444');
  const [copied, setCopied] = useState(false);

  // Scroll to bottom when new logs arrive if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Detect user scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterDirection !== 'ALL' && log.direction !== filterDirection) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.text.toLowerCase().includes(query) ||
      log.hex.toLowerCase().includes(query)
    );
  });

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => {
        const d = new Date(l.timestamp);
        const time = `${d.toTimeString().split(' ')[0]}.${d.getMilliseconds().toString().padStart(3, '0')}`;
        const prefix = showTimestamps ? `[${time}] [${l.direction}] ` : `[${l.direction}] `;
        return prefix + (displayMode === 'hex' ? l.hex : l.text);
      })
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Highlight keywords within text
  const renderFormattedContent = (content: string) => {
    const enabledRules = highlightRules.filter((r) => r.enabled && r.keyword.trim());
    if (enabledRules.length === 0) return <span>{content}</span>;

    // Build regex
    const patterns = enabledRules.map((r) =>
      r.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
    const parts = content.split(regex);

    return (
      <>
        {parts.map((part, i) => {
          const matchRule = enabledRules.find(
            (r) => r.keyword.toLowerCase() === part.toLowerCase()
          );
          if (matchRule) {
            return (
              <mark
                key={i}
                style={{ backgroundColor: `${matchRule.color}33`, color: matchRule.color }}
                className="px-1 py-0.5 rounded font-bold border"
              >
                {part}
              </mark>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0">
      {/* Console Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
        {/* Left Toolbar Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Display Mode HEX / ASCII */}
          <div className="flex rounded-md bg-slate-950 p-0.5 border border-slate-700">
            <button
              onClick={() => onChangeDisplayMode('ascii')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                displayMode === 'ascii'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ASCII 文本
            </button>
            <button
              onClick={() => onChangeDisplayMode('hex')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                displayMode === 'hex'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              HEX 16进制
            </button>
          </div>

          {/* Encoding selector */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-700">
            <span className="text-[11px] text-slate-400">编码:</span>
            <select
              value={encoding}
              onChange={(e) => onChangeEncoding(e.target.value as DataEncoding)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="utf-8">UTF-8</option>
              <option value="gbk">GBK (中文)</option>
              <option value="ascii">ASCII</option>
            </select>
          </div>

          {/* Timestamp Toggle */}
          <button
            onClick={onToggleTimestamps}
            className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all cursor-pointer ${
              showTimestamps
                ? 'bg-slate-800 border-cyan-700 text-cyan-300'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="显示/隐藏时间戳 [HH:MM:SS.mmm]"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>时间戳</span>
          </button>

          {/* Auto Wrap Toggle */}
          <button
            onClick={onToggleAutoWrap}
            className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all cursor-pointer ${
              autoWrap
                ? 'bg-slate-800 border-cyan-700 text-cyan-300'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="自动折行 / 单行滚动"
          >
            <WrapText className="w-3.5 h-3.5" />
            <span>自动换行</span>
          </button>

          {/* Pause Stream */}
          <button
            onClick={onTogglePause}
            className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all cursor-pointer ${
              isPaused
                ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={isPaused ? '继续接收数据流' : '暂停接收数据流'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? '已暂停' : '暂停'}</span>
          </button>
        </div>

        {/* Right Search & Keywords */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Direction Filter */}
          <div className="flex items-center bg-slate-950 rounded-md border border-slate-700 p-0.5 text-[11px]">
            <button
              onClick={() => setFilterDirection('ALL')}
              className={`px-1.5 py-0.5 rounded ${filterDirection === 'ALL' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'}`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterDirection('RX')}
              className={`px-1.5 py-0.5 rounded ${filterDirection === 'RX' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'}`}
            >
              仅RX
            </button>
            <button
              onClick={() => setFilterDirection('TX')}
              className={`px-1.5 py-0.5 rounded ${filterDirection === 'TX' ? 'bg-slate-800 text-blue-400' : 'text-slate-400'}`}
            >
              仅TX
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="搜索终端内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-md pl-6 pr-6 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-32 md:w-40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Highlight Rules Button */}
          <button
            onClick={() => setShowHighlightModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
            title="设置关键词高亮 (如 ERROR、OK)"
          >
            <Palette className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">高亮 ({highlightRules.filter(r => r.enabled).length})</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopyLogs}
            className="p-1 rounded-md bg-slate-950 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="复制控制台内容"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Terminal Output Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 p-3 overflow-y-auto overflow-x-auto font-mono text-xs leading-relaxed select-text ${
          autoWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
        } bg-[#090d16] text-slate-200`}
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 select-none">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
              <span className="text-xl">📡</span>
            </div>
            <p className="text-sm font-sans font-medium text-slate-400">等待串口数据流...</p>
            <p className="text-xs font-sans text-slate-600">
              请点击上方“打开串口”或“仿真器”开始接收和发送数据
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const date = new Date(log.timestamp);
            const timeStr = `${date.toTimeString().split(' ')[0]}.${date.getMilliseconds().toString().padStart(3, '0')}`;
            const isRx = log.direction === 'RX';
            const content = displayMode === 'hex' ? log.hex : log.text;

            return (
              <div key={log.id} className="hover:bg-slate-900/60 py-0.5 px-1 rounded transition-colors group">
                {showTimestamps && (
                  <span className="text-slate-500 mr-2 select-none text-[11px]">
                    [{timeStr}]
                  </span>
                )}
                <span
                  className={`inline-block px-1 py-0.2 mr-2 rounded text-[10px] font-bold select-none ${
                    isRx
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-blue-950 text-blue-400 border border-blue-800'
                  }`}
                >
                  {log.direction}
                </span>
                <span className={isRx ? 'text-slate-200' : 'text-sky-300'}>
                  {renderFormattedContent(content)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Scroll to Bottom Indicator */}
      {!autoScroll && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-8 flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shadow-lg shadow-cyan-950 text-xs font-sans font-medium transition-all active:scale-95 cursor-pointer z-10"
        >
          <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          <span>恢复自动滚屏</span>
        </button>
      )}

      {/* Highlight Settings Modal */}
      {showHighlightModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 font-semibold text-slate-100 text-sm">
                <Palette className="w-4 h-4 text-pink-400" />
                <span>关键词高亮规则</span>
              </div>
              <button
                onClick={() => setShowHighlightModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing rules */}
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {highlightRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => onToggleHighlightRule(rule.id)}
                      className="rounded accent-cyan-500"
                    />
                    <span
                      className="px-2 py-0.5 rounded font-mono font-bold border"
                      style={{ backgroundColor: `${rule.color}22`, color: rule.color, borderColor: rule.color }}
                    >
                      {rule.keyword}
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveHighlightRule(rule.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Rule */}
            <div className="pt-2 border-t border-slate-800 flex gap-2 items-center">
              <input
                type="text"
                placeholder="输入高亮关键词 (如 ERR, OK, WARN)"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-8 h-8 rounded border border-slate-700 bg-slate-950 cursor-pointer p-0.5"
                title="选择颜色"
              />
              <button
                onClick={() => {
                  if (newKeyword.trim()) {
                    onAddHighlightRule({
                      id: Date.now().toString(),
                      keyword: newKeyword.trim(),
                      color: newColor,
                      caseSensitive: false,
                      enabled: true,
                    });
                    setNewKeyword('');
                  }
                }}
                className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium cursor-pointer"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
