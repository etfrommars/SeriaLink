import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Activity,
  Play,
  Pause,
  Trash2,
  Download,
  Sliders,
  Maximize2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Camera
} from 'lucide-react';
import { ChartChannel, ChartPoint } from '../types';
import { exportChartDataToCsv } from '../utils/exportHelper';

interface RealtimeChartProps {
  dataPoints: ChartPoint[];
  onClearData: () => void;
  channels: ChartChannel[];
  onUpdateChannels: (channels: ChartChannel[]) => void;
}

const DEFAULT_COLORS = [
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#84cc16', // Lime
  '#ec4899', // Pink
];

export const RealtimeChart: React.FC<RealtimeChartProps> = ({
  dataPoints,
  onClearData,
  channels,
  onUpdateChannels,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [windowSize, setWindowSize] = useState<number>(200); // number of samples
  const [autoScale, setAutoScale] = useState(true);
  const [manualMin, setManualMin] = useState<number>(0);
  const [manualMax, setManualMax] = useState<number>(100);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; point?: ChartPoint } | null>(null);

  // Cached points for pause state
  const frozenPointsRef = useRef<ChartPoint[]>([]);

  useEffect(() => {
    if (!isPaused) {
      frozenPointsRef.current = dataPoints;
    }
  }, [dataPoints, isPaused]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    const activePoints = isPaused ? frozenPointsRef.current : dataPoints;
    const sliced = activePoints.slice(-windowSize);

    // Padding for axes
    const padLeft = 50;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 30;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    if (plotWidth <= 0 || plotHeight <= 0) return;

    // Calculate Min and Max
    let yMin = manualMin;
    let yMax = manualMax;

    if (autoScale) {
      let minVal = Infinity;
      let maxVal = -Infinity;

      sliced.forEach((pt) => {
        pt.values.forEach((v, chIdx) => {
          if (channels[chIdx]?.visible && v !== undefined && !isNaN(v)) {
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
          }
        });
      });

      if (minVal === Infinity || maxVal === -Infinity) {
        yMin = 0;
        yMax = 100;
      } else if (minVal === maxVal) {
        yMin = minVal - 10;
        yMax = maxVal + 10;
      } else {
        const margin = (maxVal - minVal) * 0.1;
        yMin = minVal - margin;
        yMax = maxVal + margin;
      }
    }

    const yRange = yMax - yMin === 0 ? 1 : yMax - yMin;

    // Draw Gridlines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const gridRows = 5;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';

    for (let r = 0; r <= gridRows; r++) {
      const y = padTop + (plotHeight / gridRows) * r;
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotWidth, y);

      const val = yMax - (yRange / gridRows) * r;
      ctx.fillText(val.toFixed(1), padLeft - 6, y + 3);
    }

    // Vertical gridlines
    const gridCols = 6;
    for (let c = 0; c <= gridCols; c++) {
      const x = padLeft + (plotWidth / gridCols) * c;
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotHeight);
    }
    ctx.stroke();

    // Draw bottom time axis label
    ctx.textAlign = 'center';
    ctx.fillText(
      `时间序列采样 (${sliced.length} 采样点 / 窗口 ${windowSize})`,
      padLeft + plotWidth / 2,
      height - 10
    );

    if (sliced.length < 2) {
      ctx.fillStyle = '#475569';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('等待数值数据流以绘制曲线 (格式如: 23.4, 45.1 或 CH1:20.5)...', width / 2, height / 2);
      return;
    }

    // Draw Curves for each channel
    const numChannels = channels.length;
    for (let ch = 0; ch < numChannels; ch++) {
      const channel = channels[ch];
      if (!channel || !channel.visible) continue;

      ctx.strokeStyle = channel.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      let started = false;
      sliced.forEach((pt, idx) => {
        const val = pt.values[ch];
        if (val === undefined || isNaN(val)) return;

        const x = padLeft + (plotWidth / (sliced.length - 1)) * idx;
        const normY = (val - yMin) / yRange;
        const y = padTop + plotHeight - normY * plotHeight;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Draw crosshair cursor if hovered
    if (hoverInfo && hoverInfo.point) {
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverInfo.x, padTop);
      ctx.lineTo(hoverInfo.x, padTop + plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [dataPoints, channels, windowSize, autoScale, manualMin, manualMax, isPaused, hoverInfo]);

  // Handle Mouse Move over Canvas for inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padLeft = 50;
    const padRight = 20;
    const plotWidth = rect.width - padLeft - padRight;

    if (x >= padLeft && x <= padLeft + plotWidth) {
      const activePoints = isPaused ? frozenPointsRef.current : dataPoints;
      const sliced = activePoints.slice(-windowSize);
      if (sliced.length > 0) {
        const ratio = (x - padLeft) / plotWidth;
        const index = Math.min(sliced.length - 1, Math.max(0, Math.round(ratio * (sliced.length - 1))));
        setHoverInfo({ x, y, point: sliced[index] });
        return;
      }
    }
    setHoverInfo(null);
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  // Toggle channel visibility
  const toggleChannel = (index: number) => {
    const updated = channels.map((c, i) => (i === index ? { ...c, visible: !c.visible } : c));
    onUpdateChannels(updated);
  };

  // Export Chart Image PNG
  const exportChartPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial_waveform_${Date.now()}.png`;
    a.click();
  };

  // Export CSV Data
  const handleExportCsv = () => {
    const channelNames = channels.map((c) => c.name);
    exportChartDataToCsv(dataPoints, channelNames, `serial_waveform_${Date.now()}.csv`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0 select-none">
      {/* Top Toolbar */}
      <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-cyan-400">
            <Activity className="w-4 h-4" />
            <span>实时示波器图表</span>
          </div>

          {/* Pause / Resume button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              isPaused
                ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3 text-amber-400" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? '继续波形' : '冻结波形'}</span>
          </button>

          {/* Sample Window Slider */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-700">
            <span className="text-[11px] text-slate-400">采样窗口:</span>
            <select
              value={windowSize}
              onChange={(e) => setWindowSize(Number(e.target.value))}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value={50}>50 采样点</option>
              <option value={100}>100 采样点</option>
              <option value={200}>200 采样点</option>
              <option value={500}>500 采样点</option>
              <option value={1000}>1000 采样点</option>
            </select>
          </div>

          {/* Auto scale toggle */}
          <button
            onClick={() => setAutoScale(!autoScale)}
            className={`px-2 py-1 rounded-md border transition-all cursor-pointer ${
              autoScale
                ? 'bg-cyan-950/80 border-cyan-700 text-cyan-300'
                : 'bg-slate-950 border-slate-700 text-slate-400'
            }`}
          >
            {autoScale ? 'Y轴自适应缩放' : 'Y轴固定量程'}
          </button>

          {!autoScale && (
            <div className="flex items-center gap-1 text-[11px]">
              <span>Min:</span>
              <input
                type="number"
                value={manualMin}
                onChange={(e) => setManualMin(Number(e.target.value))}
                className="w-12 bg-slate-950 border border-slate-700 rounded px-1 text-center text-xs text-slate-200"
              />
              <span>Max:</span>
              <input
                type="number"
                value={manualMax}
                onChange={(e) => setManualMax(Number(e.target.value))}
                className="w-12 bg-slate-950 border border-slate-700 rounded px-1 text-center text-xs text-slate-200"
              />
            </div>
          )}
        </div>

        {/* Right Actions: Export CSV, PNG, Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={dataPoints.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950 border border-slate-700 text-slate-300 hover:text-emerald-400 transition-colors disabled:opacity-40 cursor-pointer"
            title="导出波形数据为 CSV 文件以供后续分析"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">导出波形CSV</span>
          </button>

          <button
            onClick={exportChartPng}
            disabled={dataPoints.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-colors disabled:opacity-40 cursor-pointer"
            title="保存波形图截图"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">截图</span>
          </button>

          <button
            onClick={onClearData}
            className="p-1 rounded-md bg-slate-950 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="清空波形数据"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div ref={containerRef} className="flex-1 relative w-full h-full min-h-[260px] bg-[#090d16]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Floating Tooltip during hover */}
        {hoverInfo && hoverInfo.point && (
          <div
            style={{
              left: Math.min(hoverInfo.x + 12, (containerRef.current?.clientWidth || 300) - 160),
              top: Math.max(10, hoverInfo.y - 20),
            }}
            className="absolute bg-slate-950/90 border border-slate-700 rounded-md p-2 shadow-xl pointer-events-none text-xs text-slate-200 z-20 space-y-1"
          >
            <div className="text-[10px] text-slate-400 font-mono">
              {new Date(hoverInfo.point.time).toTimeString().split(' ')[0]}.
              {new Date(hoverInfo.point.time).getMilliseconds().toString().padStart(3, '0')}
            </div>
            {channels.map((ch, idx) => {
              if (!ch.visible) return null;
              const v = hoverInfo.point?.values[idx];
              return (
                <div key={idx} className="flex items-center justify-between gap-3 text-[11px] font-mono">
                  <span style={{ color: ch.color }}>{ch.name}:</span>
                  <span className="font-bold">{v !== undefined ? v.toFixed(2) : '-'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Channels Legend Bar */}
      <div className="p-2 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-400 text-[11px] font-semibold">通道列表 (可点击显隐):</span>
        {channels.map((ch, idx) => (
          <button
            key={idx}
            onClick={() => toggleChannel(idx)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-mono transition-all cursor-pointer ${
              ch.visible
                ? 'bg-slate-950 border-slate-700 shadow-xs'
                : 'bg-slate-950/40 border-slate-800 opacity-40'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
            <span className="text-slate-200 font-medium">{ch.name}</span>
            <span className="text-slate-400 font-bold ml-1">
              {ch.currentValue !== undefined && !isNaN(ch.currentValue) ? ch.currentValue.toFixed(1) : '--'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
