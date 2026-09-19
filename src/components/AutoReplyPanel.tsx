import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Send,
  Zap
} from 'lucide-react';
import { AutoReplyRule, LineEnding } from '../types';

interface AutoReplyPanelProps {
  rules: AutoReplyRule[];
  onUpdateRules: (rules: AutoReplyRule[]) => void;
  isConnected: boolean;
}

const PRESET_RULES: AutoReplyRule[] = [
  {
    id: 'r1',
    name: 'PING 心跳自动回复 PONG',
    triggerType: 'contains',
    triggerPattern: 'PING',
    replyContent: 'PONG',
    isHex: false,
    lineEnding: '\r\n',
    delayMs: 50,
    enabled: true,
  },
  {
    id: 'r2',
    name: 'AT 指令自动回复 OK',
    triggerType: 'exact',
    triggerPattern: 'AT',
    replyContent: 'OK',
    isHex: false,
    lineEnding: '\r\n',
    delayMs: 20,
    enabled: true,
  },
  {
    id: 'r3',
    name: 'Modbus 01 03 读寄存器应答',
    triggerType: 'hex',
    triggerPattern: '01 03 00 00',
    replyContent: '01 03 04 00 19 01 F4 FA 5A',
    isHex: true,
    lineEnding: 'none',
    delayMs: 10,
    enabled: false,
  },
];

export const AutoReplyPanel: React.FC<AutoReplyPanelProps> = ({
  rules,
  onUpdateRules,
  isConnected,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [triggerType, setTriggerType] = useState<'contains' | 'exact' | 'hex'>('contains');
  const [triggerPattern, setTriggerPattern] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [isHex, setIsHex] = useState(false);
  const [lineEnding, setLineEnding] = useState<LineEnding>('\r\n');
  const [delayMs, setDelayMs] = useState(50);

  const toggleRule = (id: string) => {
    onUpdateRules(
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const removeRule = (id: string) => {
    onUpdateRules(rules.filter((r) => r.id !== id));
  };

  const addRule = () => {
    if (!ruleName.trim() || !triggerPattern.trim() || !replyContent.trim()) return;
    const newRule: AutoReplyRule = {
      id: Date.now().toString(),
      name: ruleName.trim(),
      triggerType,
      triggerPattern: triggerPattern.trim(),
      replyContent: replyContent.trim(),
      isHex,
      lineEnding,
      delayMs,
      enabled: true,
    };
    onUpdateRules([...rules, newRule]);
    setShowAddModal(false);
    setRuleName('');
    setTriggerPattern('');
    setReplyContent('');
  };

  const loadPresets = () => {
    onUpdateRules([...rules, ...PRESET_RULES]);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0 select-none overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>智能自动应答 / 规则引擎 (Rule Engine)</span>
          </h2>
          <p className="text-xs text-slate-400">
            当串口接收到符合规则的数据时，自动按照预设条件延时回复特定数据 (可用于设备仿真、心跳保持及协议自动测试)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {rules.length === 0 && (
            <button
              onClick={loadPresets}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-cyan-400 hover:bg-slate-800 cursor-pointer"
            >
              载入常用预设
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加应答规则</span>
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3 max-w-4xl">
        {rules.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800 text-slate-500 text-xs">
            暂无自动应答规则，点击右上角添加规则或载入常用预设
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-3.5 rounded-xl border transition-all ${
                rule.enabled
                  ? 'bg-slate-900 border-slate-700 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleRule(rule.id)}
                    className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="font-semibold text-xs text-slate-200">{rule.name}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                    延时 {rule.delayMs}ms
                  </span>
                </div>

                <button
                  onClick={() => removeRule(rule.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-sans mb-1">
                    触发条件 ({rule.triggerType}):
                  </div>
                  <div className="text-emerald-400 break-all">{rule.triggerPattern}</div>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-sans mb-1">
                    自动回复 ({rule.isHex ? 'HEX' : 'ASCII'}):
                  </div>
                  <div className="text-cyan-400 break-all">{rule.replyContent}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-4 shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
              新建串口自动应答规则
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">规则名称</label>
                <input
                  type="text"
                  placeholder="例如: 模拟温湿度传感器回复"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">匹配模式</label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                  >
                    <option value="contains">包含文本 (Contains)</option>
                    <option value="exact">完全匹配 (Exact Match)</option>
                    <option value="hex">十六进制匹配 (HEX)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">回复延时 (ms)</label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={delayMs}
                    onChange={(e) => setDelayMs(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">接收匹配内容</label>
                <input
                  type="text"
                  placeholder={triggerType === 'hex' ? '例如: 01 03 00 00' : '例如: PING'}
                  value={triggerPattern}
                  onChange={(e) => setTriggerPattern(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">回复内容格式</label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isHex}
                      onChange={() => setIsHex(false)}
                      className="accent-cyan-500"
                    />
                    <span>ASCII 字符串</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      checked={isHex}
                      onChange={() => setIsHex(true)}
                      className="accent-cyan-500"
                    />
                    <span>HEX 16进制</span>
                  </label>
                </div>

                <textarea
                  placeholder={isHex ? '例如: 01 03 04 00 19 01 F4 FA 5A' : '例如: PONG'}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={addRule}
                disabled={!ruleName.trim() || !triggerPattern.trim() || !replyContent.trim()}
                className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium disabled:opacity-40 cursor-pointer"
              >
                保存规则
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
