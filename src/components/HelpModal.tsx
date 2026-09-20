import React from 'react';
import { HelpCircle, X, ExternalLink, Cpu, ShieldAlert, CheckCircle2, Github } from 'lucide-react';
import { isWebSerialSupported } from '../utils/serialHelper';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const supported = isWebSerialSupported();

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-semibold text-slate-100 text-sm">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Web Serial Studio 使用指南与环境说明</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Browser Capability Status */}
        <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
          supported
            ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
            : 'bg-amber-950/60 border-amber-700 text-amber-300'
        }`}>
          {supported ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-semibold">
              {supported ? 'Web Serial API 支持正常' : '当前环境不支持或受限 Web Serial API'}
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {supported
                ? '您的浏览器支持与原生硬件串口通信。如果在预览窗口内打开物理串口被安全沙箱拦截，请点击界面右上角“在新标签页打开”获得完整硬件权限。'
                : '请使用 Google Chrome、Microsoft Edge (89+) 或 Opera 等 Chromium 内核浏览器。在不支持物理硬件时，可随时使用顶部的“虚拟仿真器”体验全部波形与协议功能！'}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <div>
            <h4 className="font-semibold text-cyan-400 mb-1">1. 常用功能与特性</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li><strong className="text-slate-200">波特率与配置</strong>：支持 9600、115200 及任意自定义波特率，5-8数据位，校验位及硬件流控。</li>
              <li><strong className="text-slate-200">示波器图表</strong>：支持自动解析传入的数字序列 (如 <code className="text-cyan-300">CH1:23.4, CH2:55.1</code> 或逗号隔开的浮点数)，60fps 实时波形绘制并支持一键导出 CSV。</li>
              <li><strong className="text-slate-200">HEX / ASCII 切换</strong>：接收与发送独立切换，HEX 输入支持容错(自动过滤空格与 0x)。</li>
              <li><strong className="text-slate-200">自动校验</strong>：集成 Modbus RTU CRC16 (高/低字节优先)、CCITT、CRC32、Sum8、XOR8 及 LRC。</li>
              <li><strong className="text-slate-200">日志存盘与导出</strong>：支持实时自动流式写入本地磁盘文件，并提供多维度 CSV 格式导出。</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-cyan-400 mb-1">2. 虚拟仿真模式 (Simulator)</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              无需连接任何物理单片机或 USB 转串口模块，点击顶部“仿真器”即可选择：
              <strong>示波器多通道遥测</strong>、<strong>Modbus RTU 从机</strong>、<strong>AT 指令 Modem</strong> 或 <strong>回环回显</strong>，即刻体验波形波动和交互应答！
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-cyan-400 mb-1">3. 快捷键提示</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">Enter</kbd> : 快速发送当前输入框内容</li>
              <li><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">↑</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">↓</kbd> : 在发送输入框调取最近历史发送命令</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <a
            href="https://github.com/etfrommars/SeriaLink"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub: etfrommars/SeriaLink</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};
