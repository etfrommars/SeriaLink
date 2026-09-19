import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Plus,
  Trash2,
  Edit2,
  Zap,
  ListOrdered,
  RotateCw,
  Send,
  Check
} from 'lucide-react';
import { CrcType, LineEnding, QuickCommand, SequenceStep } from '../types';

interface QuickSendPanelProps {
  onSend: (content: string, isHex: boolean, lineEnding: LineEnding, crc: CrcType) => Promise<void>;
  isConnected: boolean;
}

const DEFAULT_QUICK_COMMANDS: QuickCommand[] = [
  { id: '1', name: 'AT 测试', content: 'AT', isHex: false, lineEnding: '\r\n', crc: 'none' },
  { id: '2', name: 'AT 信号质量', content: 'AT+CSQ', isHex: false, lineEnding: '\r\n', crc: 'none' },
  { id: '3', name: 'AT 查询固件', content: 'AT+GMR', isHex: false, lineEnding: '\r\n', crc: 'none' },
  { id: '4', name: 'Modbus 读保持寄存器', content: '01 03 00 00 00 02', isHex: true, lineEnding: 'none', crc: 'crc16-modbus-le' },
  { id: '5', name: 'Modbus 读输入寄存器', content: '01 04 00 00 00 02', isHex: true, lineEnding: 'none', crc: 'crc16-modbus-le' },
  { id: '6', name: '复位指令 (Reset)', content: 'RESET', isHex: false, lineEnding: '\r\n', crc: 'none' },
  { id: '7', name: 'Ping 心跳包', content: 'PING', isHex: false, lineEnding: '\r\n', crc: 'none' },
  { id: '8', name: 'HEX 握手包 (0x55 AA)', content: '55 AA 01 00', isHex: true, lineEnding: 'none', crc: 'sum8' },
];

export const QuickSendPanel: React.FC<QuickSendPanelProps> = ({ onSend, isConnected }) => {
  const [commands, setCommands] = useState<QuickCommand[]>(() => {
    const saved = localStorage.getItem('webserial_quick_cmds');
    return saved ? JSON.parse(saved) : DEFAULT_QUICK_COMMANDS;
  });

  const [steps, setSteps] = useState<SequenceStep[]>(() => {
    return [
      { id: 's1', commandId: '1', delayMs: 500, enabled: true },
      { id: 's2', commandId: '2', delayMs: 1000, enabled: true },
      { id: 's3', commandId: '3', delayMs: 800, enabled: true },
    ];
  });

  const [activeTab, setActiveTab] = useState<'buttons' | 'sequence'>('buttons');

  // Sequence runner state
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [isLooping, setIsLooping] = useState(false);
  const sequenceTimerRef = useRef<any>(null);

  // New Command Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCmdName, setNewCmdName] = useState('');
  const [newCmdContent, setNewCmdContent] = useState('');
  const [newCmdIsHex, setNewCmdIsHex] = useState(false);
  const [newCmdEnding, setNewCmdEnding] = useState<LineEnding>('\r\n');
  const [newCmdCrc, setNewCmdCrc] = useState<CrcType>('none');

  useEffect(() => {
    localStorage.setItem('webserial_quick_cmds', JSON.stringify(commands));
  }, [commands]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
    };
  }, []);

  const handleExecuteCommand = (cmd: QuickCommand) => {
    if (!isConnected) return;
    onSend(cmd.content, cmd.isHex, cmd.lineEnding, cmd.crc);
  };

  // Run Sequence
  const runStep = async (stepIndex: number) => {
    const activeSteps = steps.filter((s) => s.enabled);
    if (activeSteps.length === 0 || !isConnected) {
      stopSequence();
      return;
    }

    if (stepIndex >= activeSteps.length) {
      if (isLooping) {
        stepIndex = 0;
      } else {
        stopSequence();
        return;
      }
    }

    const currentStep = activeSteps[stepIndex];
    setActiveStepIndex(stepIndex);

    const cmd = commands.find((c) => c.id === currentStep.commandId);
    if (cmd) {
      await onSend(cmd.content, cmd.isHex, cmd.lineEnding, cmd.crc);
    }

    sequenceTimerRef.current = setTimeout(() => {
      runStep(stepIndex + 1);
    }, Math.max(50, currentStep.delayMs));
  };

  const startSequence = () => {
    if (!isConnected) return;
    setIsSequenceRunning(true);
    runStep(0);
  };

  const stopSequence = () => {
    if (sequenceTimerRef.current) {
      clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
    setIsSequenceRunning(false);
    setActiveStepIndex(-1);
  };

  const addCommand = () => {
    if (!newCmdName.trim() || !newCmdContent.trim()) return;
    const newCmd: QuickCommand = {
      id: Date.now().toString(),
      name: newCmdName.trim(),
      content: newCmdContent.trim(),
      isHex: newCmdIsHex,
      lineEnding: newCmdEnding,
      crc: newCmdCrc,
    };
    setCommands([...commands, newCmd]);
    setShowAddModal(false);
    setNewCmdName('');
    setNewCmdContent('');
  };

  const removeCommand = (id: string) => {
    setCommands(commands.filter((c) => c.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0 select-none overflow-y-auto p-4 space-y-4">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('buttons')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'buttons'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>快捷发送面板 ({commands.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('sequence')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'sequence'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>多命令轮询调度器</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建命令预设</span>
        </button>
      </div>

      {/* Tab 1: Quick Buttons Grid */}
      {activeTab === 'buttons' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {commands.map((cmd) => (
            <div
              key={cmd.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-slate-100 truncate">{cmd.name}</span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                        cmd.isHex
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                          : 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                      }`}
                    >
                      {cmd.isHex ? 'HEX' : 'ASCII'}
                    </span>
                    <button
                      onClick={() => removeCommand(cmd.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="font-mono text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80 truncate mb-3">
                  {cmd.content}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
                <span>{cmd.crc !== 'none' ? `+${cmd.crc.split('-')[0]}` : '无校验'}</span>
                <button
                  onClick={() => handleExecuteCommand(cmd)}
                  disabled={!isConnected}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-sans text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                >
                  <Send className="w-3 h-3" />
                  <span>立即发送</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Sequence Polling Runner */}
      {activeTab === 'sequence' && (
        <div className="space-y-4 max-w-3xl">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">轮询任务步骤</h3>
                <p className="text-xs text-slate-400">按照先后顺序自动发送指定指令，支持各自设置延迟和无限循环</p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLooping}
                    onChange={(e) => setIsLooping(e.target.checked)}
                    className="accent-cyan-500 rounded"
                  />
                  <span>无限循环</span>
                </label>

                {!isSequenceRunning ? (
                  <button
                    onClick={startSequence}
                    disabled={!isConnected || steps.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm disabled:opacity-40 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>启动轮询</span>
                  </button>
                ) : (
                  <button
                    onClick={stopSequence}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm animate-pulse cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>停止轮询</span>
                  </button>
                )}
              </div>
            </div>

            {/* Steps List */}
            <div className="space-y-2">
              {steps.map((step, idx) => {
                const cmd = commands.find((c) => c.id === step.commandId);
                const isActive = isSequenceRunning && activeStepIndex === idx;

                return (
                  <div
                    key={step.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${
                      isActive
                        ? 'bg-cyan-950/60 border-cyan-500 shadow-md'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-500 w-6">#{idx + 1}</span>
                      <select
                        value={step.commandId}
                        onChange={(e) => {
                          const updated = [...steps];
                          updated[idx].commandId = e.target.value;
                          setSteps(updated);
                        }}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                      >
                        {commands.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.content.slice(0, 16)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-slate-400">
                        <span>延时:</span>
                        <input
                          type="number"
                          value={step.delayMs}
                          min={50}
                          step={100}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[idx].delayMs = Number(e.target.value);
                            setSteps(updated);
                          }}
                          className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs font-mono text-slate-200"
                        />
                        <span className="text-[11px]">ms</span>
                      </div>

                      <button
                        onClick={() => {
                          setSteps(steps.filter((_, i) => i !== idx));
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                if (commands.length > 0) {
                  setSteps([
                    ...steps,
                    { id: Date.now().toString(), commandId: commands[0].id, delayMs: 1000, enabled: true },
                  ]);
                }
              }}
              className="w-full py-2 rounded-lg border border-dashed border-slate-700 hover:border-cyan-500 text-slate-400 hover:text-cyan-400 text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加轮询步骤</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Command Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
              新建快捷发送指令
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">指令名称</label>
                <input
                  type="text"
                  placeholder="例如: 读取温湿度"
                  value={newCmdName}
                  onChange={(e) => setNewCmdName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">格式类型</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      checked={!newCmdIsHex}
                      onChange={() => setNewCmdIsHex(false)}
                      className="accent-cyan-500"
                    />
                    <span>ASCII 字符串</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      checked={newCmdIsHex}
                      onChange={() => setNewCmdIsHex(true)}
                      className="accent-cyan-500"
                    />
                    <span>HEX 16进制</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">指令内容</label>
                <textarea
                  placeholder={newCmdIsHex ? '例如: 01 03 00 00 00 01' : '例如: AT+CSQ'}
                  value={newCmdContent}
                  onChange={(e) => setNewCmdContent(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">结束符</label>
                  <select
                    value={newCmdEnding}
                    onChange={(e) => setNewCmdEnding(e.target.value as LineEnding)}
                    disabled={newCmdIsHex}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                  >
                    <option value="\r\n">\r\n (CRLF)</option>
                    <option value="\n">\n (LF)</option>
                    <option value="none">无 (None)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">自动校验</label>
                  <select
                    value={newCmdCrc}
                    onChange={(e) => setNewCmdCrc(e.target.value as CrcType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                  >
                    <option value="none">无</option>
                    <option value="crc16-modbus-le">CRC16-Modbus</option>
                    <option value="crc32">CRC32</option>
                    <option value="sum8">Sum8</option>
                    <option value="xor8">XOR8</option>
                  </select>
                </div>
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
                onClick={addCommand}
                disabled={!newCmdName.trim() || !newCmdContent.trim()}
                className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium disabled:opacity-40 cursor-pointer"
              >
                保存预设
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
