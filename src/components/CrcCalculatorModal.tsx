import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Copy,
  Check,
  Send,
  ShieldCheck,
  Binary,
  Layers,
  Bug,
  Sparkles
} from 'lucide-react';
import {
  calcCrc16Modbus,
  calcCrc16Ccitt,
  calcCrc32,
  calcSum8,
  calcXor8,
  calcLrc,
  formatCrcHex
} from '../utils/crc';
import { hexToBytes, bytesToHex } from '../utils/serialHelper';
import { CrcType, LineEnding } from '../types';

interface CrcCalculatorModalProps {
  onSend: (content: string, isHex: boolean, lineEnding: LineEnding, crc: CrcType) => Promise<void>;
  isConnected: boolean;
}

export const CrcCalculatorModal: React.FC<CrcCalculatorModalProps> = ({
  onSend,
  isConnected,
}) => {
  const [inputText, setInputText] = useState('01 03 00 00 00 02');
  const [isInputHex, setIsInputHex] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modbus Builder Form
  const [slaveAddr, setSlaveAddr] = useState('01');
  const [funcCode, setFuncCode] = useState('03');
  const [startReg, setStartReg] = useState('0000');
  const [regCount, setRegCount] = useState('0002');

  // Parse input to bytes
  const inputBytes = useMemo(() => {
    if (!inputText.trim()) return new Uint8Array(0);
    if (isInputHex) {
      return hexToBytes(inputText);
    } else {
      return new TextEncoder().encode(inputText);
    }
  }, [inputText, isInputHex]);

  // Compute all checksums
  const calculations = useMemo(() => {
    if (inputBytes.length === 0) return null;
    const modbusCrc = calcCrc16Modbus(inputBytes);
    const ccittCrc = calcCrc16Ccitt(inputBytes);
    const crc32Val = calcCrc32(inputBytes);
    const sum8Val = calcSum8(inputBytes);
    const xor8Val = calcXor8(inputBytes);
    const lrcVal = calcLrc(inputBytes);

    const modbusLe = `${(modbusCrc & 0xff).toString(16).padStart(2, '0')} ${(modbusCrc >> 8).toString(16).padStart(2, '0')}`.toUpperCase();
    const modbusBe = `${(modbusCrc >> 8).toString(16).padStart(2, '0')} ${(modbusCrc & 0xff).toString(16).padStart(2, '0')}`.toUpperCase();

    return {
      modbusLe,
      modbusBe,
      ccitt: formatCrcHex(ccittCrc, 2),
      crc32: formatCrcHex(crc32Val, 4),
      sum8: formatCrcHex(sum8Val, 1),
      xor8: formatCrcHex(xor8Val, 1),
      lrc: formatCrcHex(lrcVal, 1),
    };
  }, [inputBytes]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  // Build Modbus RTU Frame
  const modbusFrame = useMemo(() => {
    try {
      const addr = parseInt(slaveAddr, 16) || 1;
      const func = parseInt(funcCode, 16) || 3;
      const sReg = parseInt(startReg, 16) || 0;
      const cnt = parseInt(regCount, 16) || 1;

      const pdu = new Uint8Array([
        addr & 0xff,
        func & 0xff,
        (sReg >> 8) & 0xff,
        sReg & 0xff,
        (cnt >> 8) & 0xff,
        cnt & 0xff,
      ]);

      const crc = calcCrc16Modbus(pdu);
      const full = new Uint8Array(8);
      full.set(pdu, 0);
      full[6] = crc & 0xff; // Low
      full[7] = (crc >> 8) & 0xff; // High
      return bytesToHex(full);
    } catch {
      return '';
    }
  }, [slaveAddr, funcCode, startReg, regCount]);

  // Error Injection: Flip CRC or omit byte
  const handleInjectErrorAndSend = (type: 'bad_crc' | 'truncated') => {
    if (!isConnected || inputBytes.length === 0) return;
    if (type === 'bad_crc') {
      const bytesWithBadCrc = new Uint8Array(inputBytes.length + 2);
      bytesWithBadCrc.set(inputBytes, 0);
      bytesWithBadCrc[inputBytes.length] = 0x00; // Intentionally invalid
      bytesWithBadCrc[inputBytes.length + 1] = 0x00;
      onSend(bytesToHex(bytesWithBadCrc), true, 'none', 'none');
    } else if (type === 'truncated') {
      const truncated = inputBytes.slice(0, Math.max(1, inputBytes.length - 1));
      onSend(bytesToHex(truncated), true, 'none', 'none');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0 select-none overflow-y-auto p-4 space-y-6">
      {/* Tool 1: Universal CRC Calculator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 max-w-4xl shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>通用工业协议校验计算器 (CRC & Checksum)</span>
          </h3>
          <div className="flex rounded-md bg-slate-950 p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setIsInputHex(true)}
              className={`px-2.5 py-0.5 rounded ${isInputHex ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
            >
              HEX 输入
            </button>
            <button
              onClick={() => setIsInputHex(false)}
              className={`px-2.5 py-0.5 rounded ${!isInputHex ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
            >
              ASCII 输入
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            输入待计算数据 ({inputBytes.length} 字节):
          </label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isInputHex ? '如: 01 03 00 00 00 02' : '如: TEST'}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Calculation Results Grid */}
        {calculations && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {/* Modbus LE */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-medium">CRC16-Modbus (低位在前 LE)</div>
                <div className="text-xs font-mono font-bold text-cyan-400 mt-0.5">{calculations.modbusLe}</div>
              </div>
              <button
                onClick={() => copyToClipboard(calculations.modbusLe, 'modbusLe')}
                className="p-1 rounded text-slate-400 hover:text-cyan-400 cursor-pointer"
              >
                {copiedKey === 'modbusLe' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Modbus BE */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-medium">CRC16-Modbus (高位在前 BE)</div>
                <div className="text-xs font-mono font-bold text-cyan-400 mt-0.5">{calculations.modbusBe}</div>
              </div>
              <button
                onClick={() => copyToClipboard(calculations.modbusBe, 'modbusBe')}
                className="p-1 rounded text-slate-400 hover:text-cyan-400 cursor-pointer"
              >
                {copiedKey === 'modbusBe' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* CCITT */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-medium">CRC16-CCITT</div>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">{calculations.ccitt}</div>
              </div>
              <button
                onClick={() => copyToClipboard(calculations.ccitt, 'ccitt')}
                className="p-1 rounded text-slate-400 hover:text-cyan-400 cursor-pointer"
              >
                {copiedKey === 'ccitt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* CRC-32 */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-medium">CRC-32 (IEEE 802.3)</div>
                <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">{calculations.crc32}</div>
              </div>
              <button
                onClick={() => copyToClipboard(calculations.crc32, 'crc32')}
                className="p-1 rounded text-slate-400 hover:text-cyan-400 cursor-pointer"
              >
                {copiedKey === 'crc32' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Sum8 */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Sum8 (求和校验码)</div>
                <div className="text-xs font-mono font-bold text-purple-400 mt-0.5">{calculations.sum8}</div>
              </div>
              <button
                onClick={() => copyToClipboard(calculations.sum8, 'sum8')}
                className="p-1 rounded text-slate-400 hover:text-cyan-400 cursor-pointer"
              >
                {copiedKey === 'sum8' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* XOR8 / BCC */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-medium">XOR8 / BCC (异或校验)</div>
                <div className="text-xs font-mono font-bold text-rose-400 mt-0.5">{calculations.xor8}</div>
              </div>
              <button
                onClick={() => copyToClipboard(calculations.xor8, 'xor8')}
                className="p-1 rounded text-slate-400 hover:text-cyan-400 cursor-pointer"
              >
                {copiedKey === 'xor8' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tool 2: Modbus RTU Packet Builder */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 max-w-4xl shadow-sm">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Modbus RTU 快速组包工具</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">从机地址 (HEX)</label>
            <input
              type="text"
              value={slaveAddr}
              onChange={(e) => setSlaveAddr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">功能码 (Function Code)</label>
            <select
              value={funcCode}
              onChange={(e) => setFuncCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
            >
              <option value="01">01: 读线圈状态</option>
              <option value="02">02: 读离散输入</option>
              <option value="03">03: 读保持寄存器</option>
              <option value="04">04: 读输入寄存器</option>
              <option value="05">05: 写单个线圈</option>
              <option value="06">06: 写单个寄存器</option>
              <option value="10">10: 写多个寄存器</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">起始寄存器地址 (HEX)</label>
            <input
              type="text"
              value={startReg}
              onChange={(e) => setStartReg(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">寄存器数量 / 值 (HEX)</label>
            <input
              type="text"
              value={regCount}
              onChange={(e) => setRegCount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
            />
          </div>
        </div>

        {/* Generated Modbus Frame */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">自动计算 CRC16 的完整 RTU 帧:</div>
            <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">{modbusFrame}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(modbusFrame, 'modbusFrame')}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              {copiedKey === 'modbusFrame' ? '已复制' : '复制帧'}
            </button>
            <button
              onClick={() => onSend(modbusFrame, true, 'none', 'none')}
              disabled={!isConnected}
              className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>一键发送到串口</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tool 3: Fault & Error Injection Testing */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 max-w-4xl shadow-sm">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
          <Bug className="w-4 h-4 text-rose-400" />
          <span>错误注入测试 (Fault Injection for Device Robustness)</span>
        </h3>
        <p className="text-xs text-slate-400">
          向当前串口故意发送非法 CRC 校验码或截断残缺帧，测试下位机设备/从机的通信异常处理和容错防死锁机制。
        </p>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={() => handleInjectErrorAndSend('bad_crc')}
            disabled={!isConnected || inputBytes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-medium disabled:opacity-40 cursor-pointer transition-all active:scale-95"
          >
            <span>注入错误 CRC 校验 (0x0000) 发送</span>
          </button>

          <button
            onClick={() => handleInjectErrorAndSend('truncated')}
            disabled={!isConnected || inputBytes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-200 text-xs font-medium disabled:opacity-40 cursor-pointer transition-all active:scale-95"
          >
            <span>注入截断不完整帧 (-1B) 发送</span>
          </button>
        </div>
      </div>
    </div>
  );
};
