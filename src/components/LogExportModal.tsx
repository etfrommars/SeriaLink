import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Save,
  RotateCcw,
  Play,
  Square,
  Upload,
  CheckCircle2,
  X
} from 'lucide-react';
import { SerialLogItem } from '../types';
import { exportLogsToCsv, exportLogsToTxt } from '../utils/exportHelper';

interface LogExportModalProps {
  logs: SerialLogItem[];
  isOpen: boolean;
  onClose: () => void;
  isAutoLogging: boolean;
  onToggleAutoLog: () => void;
  onReplayLogs: (replayLogs: SerialLogItem[], speedMultiplier: number) => void;
  isReplaying: boolean;
  onStopReplay: () => void;
}

export const LogExportModal: React.FC<LogExportModalProps> = ({
  logs,
  isOpen,
  onClose,
  isAutoLogging,
  onToggleAutoLog,
  onReplayLogs,
  isReplaying,
  onStopReplay,
}) => {
  const [speed, setSpeed] = useState(1);
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'RX' | 'TX'>('ALL');

  if (!isOpen) return null;

  const targetLogs = logs.filter(
    (l) => filterDirection === 'ALL' || l.direction === filterDirection
  );

  const handleExportCsv = () => {
    const filename = `serial_logs_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.csv`;
    exportLogsToCsv(targetLogs, filename);
  };

  const handleExportTxt = () => {
    const filename = `serial_logs_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.txt`;
    exportLogsToTxt(targetLogs, filename);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-semibold text-slate-100 text-sm">
            <Download className="w-4 h-4 text-cyan-400" />
            <span>日志分析与本地导出中心 (Data Export & Analysis)</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Options */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">选择导出范围:</span>
            <div className="flex rounded-md bg-slate-950 p-0.5 border border-slate-700">
              <button
                onClick={() => setFilterDirection('ALL')}
                className={`px-2 py-0.5 rounded ${filterDirection === 'ALL' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
              >
                全部 ({logs.length})
              </button>
              <button
                onClick={() => setFilterDirection('RX')}
                className={`px-2 py-0.5 rounded ${filterDirection === 'RX' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
              >
                仅RX ({logs.filter((l) => l.direction === 'RX').length})
              </button>
              <button
                onClick={() => setFilterDirection('TX')}
                className={`px-2 py-0.5 rounded ${filterDirection === 'TX' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                仅TX ({logs.filter((l) => l.direction === 'TX').length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleExportCsv}
              disabled={targetLogs.length === 0}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl text-left space-y-1 transition-all group disabled:opacity-40 cursor-pointer"
            >
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <FileSpreadsheet className="w-4 h-4" />
                <span>导出为 CSV 电子表格</span>
              </div>
              <p className="text-[11px] text-slate-400">
                包含序号、高精度时间戳、方向、Hex 与解码内容，适合 Excel / MATLAB / Python 分析
              </p>
            </button>

            <button
              onClick={handleExportTxt}
              disabled={targetLogs.length === 0}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl text-left space-y-1 transition-all group disabled:opacity-40 cursor-pointer"
            >
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <FileText className="w-4 h-4" />
                <span>导出为 TXT 纯文本</span>
              </div>
              <p className="text-[11px] text-slate-400">
                标准时间戳文本通信记录，便于快速归档和分享
              </p>
            </button>
          </div>

          {/* Auto Log Stream */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <Save className="w-4 h-4 text-amber-400" />
                <span>实时流式存盘 (Stream to File)</span>
              </div>
              <button
                onClick={onToggleAutoLog}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  isAutoLogging
                    ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {isAutoLogging ? '停止存盘' : '开启存盘'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              通过 File System Access API 将接收到的每一包串口数据直接流式追加写入本地物理磁盘文件，防止内存过大或意外断电丢失。
            </p>
          </div>

          {/* Log Replay */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <RotateCcw className="w-4 h-4 text-purple-400" />
                <span>历史日志时序回放 (Log Replay)</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  disabled={isReplaying}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-xs"
                >
                  <option value={1}>1x 原速</option>
                  <option value={2}>2x 倍速</option>
                  <option value={5}>5x 快进</option>
                  <option value={10}>10x 极速</option>
                </select>

                {!isReplaying ? (
                  <button
                    onClick={() => onReplayLogs(targetLogs, speed)}
                    disabled={targetLogs.length === 0}
                    className="flex items-center gap-1 px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium disabled:opacity-40 cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>开始回放</span>
                  </button>
                ) : (
                  <button
                    onClick={onStopReplay}
                    className="flex items-center gap-1 px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer"
                  >
                    <Square className="w-3 h-3" />
                    <span>停止回放</span>
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              根据原始接收数据包之间的时间间隔，重新播放已录制的数据流，同步驱动示波器图表重绘。
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
