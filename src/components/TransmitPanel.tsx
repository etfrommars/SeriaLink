import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Trash2,
  Repeat,
  CornerDownLeft,
  ShieldCheck,
  History,
  ChevronDown
} from 'lucide-react';
import { CrcType, DisplayMode, LineEnding } from '../types';
import { hexToBytes, bytesToHex } from '../utils/serialHelper';
import { appendCrc } from '../utils/crc';

interface TransmitPanelProps {
  onSend: (content: string, isHex: boolean, lineEnding: LineEnding, crc: CrcType) => Promise<void>;
  isConnected: boolean;
  history: string[];
}

export const TransmitPanel: React.FC<TransmitPanelProps> = ({
  onSend,
  isConnected,
  history,
}) => {
  const [text, setText] = useState('');
  const [isHex, setIsHex] = useState(false);
  const [lineEnding, setLineEnding] = useState<LineEnding>('\r\n');
  const [crc, setCrc] = useState<CrcType>('none');
  const [sendOnEnter, setSendOnEnter] = useState(true);
  const [clearOnSend, setClearOnSend] = useState(false);

  // Cyclic repeat send
  const [isCyclic, setIsCyclic] = useState(false);
  const [cycleInterval, setCycleInterval] = useState(1000);
  const [cycleCount, setCycleCount] = useState(0);
  const cyclicTimerRef = useRef<any>(null);

  // History navigation index
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Stop cyclic send if disconnected
  useEffect(() => {
    if (!isConnected && isCyclic) {
      stopCyclic();
    }
  }, [isConnected]);

  // Clean cyclic timer on unmount
  useEffect(() => {
    return () => {
      if (cyclicTimerRef.current) clearInterval(cyclicTimerRef.current);
    };
  }, []);

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      await onSend(text, isHex, lineEnding, crc);
      if (clearOnSend) {
        setText('');
      }
      setHistoryIndex(-1);
    } catch (err: any) {
      console.error('Send error:', err);
    }
  };

  const startCyclic = () => {
    if (!text.trim() || !isConnected) return;
    setIsCyclic(true);
    setCycleCount(0);

    // Initial send
    handleSend();
    setCycleCount(1);

    cyclicTimerRef.current = setInterval(() => {
      handleSend();
      setCycleCount((prev) => prev + 1);
    }, Math.max(50, cycleInterval));
  };

  const stopCyclic = () => {
    if (cyclicTimerRef.current) {
      clearInterval(cyclicTimerRef.current);
      cyclicTimerRef.current = null;
    }
    setIsCyclic(false);
  };

  // Keyboard events: Enter to send, Up/Down for history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && sendOnEnter) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Up arrow for history
    if (e.key === 'ArrowUp' && (e.currentTarget.selectionStart === 0 || text === '')) {
      if (history.length > 0) {
        e.preventDefault();
        const nextIdx = historyIndex + 1 < history.length ? historyIndex + 1 : historyIndex;
        setHistoryIndex(nextIdx);
        setText(history[nextIdx]);
      }
    }

    // Down arrow for history
    if (e.key === 'ArrowDown' && historyIndex >= 0) {
      e.preventDefault();
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      if (nextIdx >= 0) {
        setText(history[nextIdx]);
      } else {
        setText('');
      }
    }
  };

  // Preview formatted HEX data
  const hexPreview = React.useMemo(() => {
    if (!isHex || !text.trim()) return null;
    try {
      let bytes = hexToBytes(text);
      if (crc !== 'none') {
        bytes = appendCrc(bytes, crc);
      }
      return {
        bytesCount: bytes.length,
        hexStr: bytesToHex(bytes),
      };
    } catch {
      return null;
    }
  }, [text, isHex, crc]);

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-3 select-none shrink-0">
      {/* Transmit Options Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-slate-400">
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Format Toggle ASCII / HEX */}
          <div className="flex rounded-md bg-slate-950 p-0.5 border border-slate-700">
            <button
              onClick={() => setIsHex(false)}
              className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-all ${
                !isHex ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ASCII 发送
            </button>
            <button
              onClick={() => setIsHex(true)}
              className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-all ${
                isHex ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              HEX 发送
            </button>
          </div>

          {/* Line Ending */}
          {!isHex && (
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-700">
              <span className="text-[11px]">结束符:</span>
              <select
                value={lineEnding}
                onChange={(e) => setLineEnding(e.target.value as LineEnding)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="\r\n">\r\n (CRLF)</option>
                <option value="\n">\n (LF)</option>
                <option value="\r">\r (CR)</option>
                <option value="none">无 (None)</option>
              </select>
            </div>
          )}

          {/* Checksum / CRC Append */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px]">自动校验:</span>
            <select
              value={crc}
              onChange={(e) => setCrc(e.target.value as CrcType)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="none">无校验 (None)</option>
              <option value="crc16-modbus-le">CRC16-Modbus (低位在前)</option>
              <option value="crc16-modbus-be">CRC16-Modbus (高位在前)</option>
              <option value="crc16-ccitt">CRC16-CCITT</option>
              <option value="crc32">CRC32</option>
              <option value="sum8">Sum8 (求和)</option>
              <option value="xor8">XOR/BCC (异或)</option>
              <option value="lrc">LRC (纵向校验)</option>
            </select>
          </div>
        </div>

        {/* Checkbox Toggles & History */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200 text-xs">
            <input
              type="checkbox"
              checked={sendOnEnter}
              onChange={(e) => setSendOnEnter(e.target.checked)}
              className="accent-cyan-500 rounded"
            />
            <span className="flex items-center gap-0.5">
              Enter 发送 <CornerDownLeft className="w-3 h-3 text-slate-500" />
            </span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200 text-xs">
            <input
              type="checkbox"
              checked={clearOnSend}
              onChange={(e) => setClearOnSend(e.target.checked)}
              className="accent-cyan-500 rounded"
            />
            <span>发送后清空</span>
          </label>

          {/* History dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 hover:text-slate-200 cursor-pointer"
              title="发送历史记录"
            >
              <History className="w-3 h-3" />
              <span>历史</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {showHistoryDropdown && (
              <div className="absolute right-0 bottom-full mb-1 w-64 bg-slate-950 border border-slate-700 rounded-lg shadow-xl p-1 z-30 max-h-48 overflow-y-auto">
                <div className="text-[10px] text-slate-500 px-2 py-1 font-semibold border-b border-slate-800">
                  最近发送记录 (↑ / ↓ 可调用)
                </div>
                {history.length === 0 ? (
                  <div className="text-slate-500 text-xs p-2 text-center">暂无记录</div>
                ) : (
                  history.slice(0, 15).map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setText(cmd);
                        setShowHistoryDropdown(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-xs font-mono text-slate-300 truncate cursor-pointer"
                    >
                      {cmd}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Box & Send Button */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={
              isHex
                ? '输入 HEX 字符串 (支持空格、逗号或紧凑格式，如: 01 03 00 00 00 02 或 010300000002)'
                : '输入待发送数据 (支持 ASCII 文本，可直接按 Enter 发送)...'
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
          />

          {/* Hex Preview badge if active */}
          {hexPreview && (
            <div className="absolute right-2 bottom-2 text-[10px] font-mono text-cyan-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-cyan-900">
              有效字节: {hexPreview.bytesCount}B
            </div>
          )}
        </div>

        {/* Action Buttons Column */}
        <div className="flex flex-col justify-between gap-1.5 shrink-0">
          <button
            onClick={handleSend}
            disabled={!isConnected || !text.trim()}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-cyan-950 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>发送</span>
          </button>

          <button
            onClick={() => setText('')}
            className="p-1 rounded bg-slate-950 border border-slate-700 text-slate-400 hover:text-rose-400 text-center flex items-center justify-center transition-colors cursor-pointer"
            title="清空输入框"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cyclic / Repeat Send Toolbar */}
      <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 flex items-center gap-1">
            <Repeat className="w-3.5 h-3.5 text-cyan-400" />
            定时循环发送:
          </span>

          <div className="flex items-center gap-1">
            <input
              type="number"
              min={20}
              step={100}
              value={cycleInterval}
              disabled={isCyclic}
              onChange={(e) => setCycleInterval(Number(e.target.value))}
              className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <span className="text-slate-500 text-[11px]">ms</span>
          </div>

          {!isCyclic ? (
            <button
              onClick={startCyclic}
              disabled={!isConnected || !text.trim()}
              className="px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-medium disabled:opacity-40 transition-colors cursor-pointer"
            >
              启动循环
            </button>
          ) : (
            <button
              onClick={stopCyclic}
              className="px-2.5 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-300 font-medium animate-pulse cursor-pointer"
            >
              停止 ({cycleCount}次)
            </button>
          )}
        </div>

        {isHex && hexPreview && (
          <div className="text-[11px] font-mono text-slate-400 truncate max-w-md hidden sm:block">
            组包预览: <span className="text-cyan-300">{hexPreview.hexStr}</span>
          </div>
        )}
      </div>
    </div>
  );
};
