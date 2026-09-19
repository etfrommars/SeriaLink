/**
 * Web Serial API manager & Simulator Port
 */

import { DataBits, DataEncoding, FlowControlType, ParityType, SerialConfig, SerialSignals } from '../types';

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

// Format Uint8Array to Hex string: e.g. "AA 01 2F 0D 0A"
export function bytesToHex(bytes: Uint8Array, separator = ' '): string {
  const hexArr: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hexArr.push(bytes[i].toString(16).padStart(2, '0').toUpperCase());
  }
  return hexArr.join(separator);
}

// Convert Hex string with loose format (e.g. "AA BB CC", "AABBCC", "0xAA,0xBB") to Uint8Array
export function hexToBytes(hexStr: string): Uint8Array {
  // Clean all spaces, commas, 0x, semicolons
  const cleaned = hexStr.replace(/(0x|[\s,;:\-_])/gi, '');
  if (!cleaned) return new Uint8Array(0);

  // Even length requirement padding
  const validHex = cleaned.length % 2 !== 0 ? '0' + cleaned : cleaned;
  const bytes = new Uint8Array(validHex.length / 2);

  for (let i = 0; i < validHex.length; i += 2) {
    const byte = parseInt(validHex.slice(i, i + 2), 16);
    bytes[i / 2] = isNaN(byte) ? 0 : byte;
  }
  return bytes;
}

// Decode Uint8Array to text with encoding support
export function bytesToString(bytes: Uint8Array, encoding: DataEncoding): string {
  try {
    if (encoding === 'gbk') {
      const decoder = new TextDecoder('gbk', { fatal: false });
      return decoder.decode(bytes);
    } else if (encoding === 'ascii') {
      let str = '';
      for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i] & 0x7f);
      }
      return str;
    } else {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      return decoder.decode(bytes);
    }
  } catch {
    // Fallback to UTF-8 or simple charCode
    try {
      return new TextDecoder('utf-8').decode(bytes);
    } catch {
      return String.fromCharCode.apply(null, Array.from(bytes));
    }
  }
}

// Encode string to Uint8Array
export function stringToBytes(text: string, encoding: DataEncoding): Uint8Array {
  if (encoding === 'ascii') {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      bytes[i] = text.charCodeAt(i) & 0x7f;
    }
    return bytes;
  }
  // Standard UTF-8
  return new TextEncoder().encode(text);
}

// Extract numeric values from incoming serial string for real-time oscilloscope
export function extractNumbers(text: string): number[] {
  const clean = text.trim();
  if (!clean) return [];

  // Match key:value or key=value like "CH1:23.5,CH2:44.1" or "temp=25.4"
  if (clean.includes(':') || clean.includes('=')) {
    const nums: number[] = [];
    const parts = clean.split(/[,;\s]+/);
    for (const part of parts) {
      const kv = part.split(/[:=]/);
      if (kv.length >= 2) {
        const val = parseFloat(kv[1]);
        if (!isNaN(val)) nums.push(val);
      }
    }
    if (nums.length > 0) return nums;
  }

  // Match comma, semicolon or space separated numbers
  const tokens = clean.split(/[,;\s\t]+/);
  const result: number[] = [];
  for (const token of tokens) {
    if (!token) continue;
    const num = parseFloat(token);
    if (!isNaN(num) && isFinite(num)) {
      result.push(num);
    }
  }
  return result;
}

export type SerialEventType = 'data' | 'disconnect' | 'error' | 'signals';

export class WebSerialManager {
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private keepReading = false;
  private onDataCallback: ((bytes: Uint8Array) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private onErrorCallback: ((err: Error) => void) | null = null;
  private onSignalsCallback: ((signals: SerialSignals) => void) | null = null;

  // Virtual Simulator state
  public isVirtual = false;
  private virtualIntervalId: any = null;
  public virtualMode: 'waveform' | 'modbus' | 'at' | 'echo' = 'waveform';
  private virtualAngle = 0;

  public isConnected(): boolean {
    return this.isVirtual || this.port !== null;
  }

  public setCallbacks(
    onData: (bytes: Uint8Array) => void,
    onDisconnect: () => void,
    onError: (err: Error) => void,
    onSignals?: (signals: SerialSignals) => void
  ) {
    this.onDataCallback = onData;
    this.onDisconnectCallback = onDisconnect;
    this.onErrorCallback = onError;
    if (onSignals) this.onSignalsCallback = onSignals;
  }

  public async getAvailablePorts(): Promise<any[]> {
    if (!isWebSerialSupported()) return [];
    try {
      return await (navigator as any).serial.getPorts();
    } catch {
      return [];
    }
  }

  public async requestPort(): Promise<any> {
    if (!isWebSerialSupported()) {
      throw new Error('当前浏览器不支持 Web Serial API，请使用 Chrome / Edge 89+ 并在安全上下文 (HTTPS/localhost) 下运行');
    }
    try {
      return await (navigator as any).serial.requestPort();
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.message?.includes('No port selected')) {
        throw new Error('用户取消了串口选择');
      }
      if (err.name === 'SecurityError') {
        throw new Error('受限于iframe沙箱安全策略，请点击右上角在“新标签页打开”使用物理串口');
      }
      throw err;
    }
  }

  public async connect(selectedPort: any, config: SerialConfig): Promise<void> {
    if (this.isConnected()) {
      await this.disconnect();
    }

    this.port = selectedPort;
    const serialOptions: any = {
      baudRate: config.baudRate,
      dataBits: config.dataBits,
      stopBits: config.stopBits,
      parity: config.parity,
      flowControl: config.flowControl,
      bufferSize: 16384,
    };

    try {
      await this.port.open(serialOptions);
    } catch (err: any) {
      this.port = null;
      throw new Error(`无法打开串口: ${err.message || '端口已被占用或无法访问'}`);
    }

    // Set Initial signals
    try {
      await this.port.setSignals({
        dataTerminalReady: config.dtr,
        requestToSend: config.rts,
      });
    } catch {
      // Some serial adapters don't support signal control
    }

    this.keepReading = true;
    this.startReadingLoop();
  }

  // Connect Virtual Simulator
  public connectVirtual(virtualMode: 'waveform' | 'modbus' | 'at' | 'echo' = 'waveform'): void {
    this.disconnect();
    this.isVirtual = true;
    this.virtualMode = virtualMode;
    this.virtualAngle = 0;

    // Start simulation loop
    if (virtualMode === 'waveform') {
      this.virtualIntervalId = setInterval(() => {
        this.virtualAngle += 0.15;
        const v1 = (Math.sin(this.virtualAngle) * 50 + 50).toFixed(2);
        const v2 = (Math.cos(this.virtualAngle * 0.7) * 30 + 40 + Math.random() * 2).toFixed(2);
        const v3 = (Math.sin(this.virtualAngle * 1.5) * 20 + 25).toFixed(2);
        const text = `CH1:${v1}, CH2:${v2}, CH3:${v3}\r\n`;
        const bytes = new TextEncoder().encode(text);
        if (this.onDataCallback) this.onDataCallback(bytes);
      }, 100);
    } else if (virtualMode === 'modbus') {
      // Announce Modbus ready
      setTimeout(() => {
        const hello = '=== Virtual Modbus RTU Slave (Addr: 01) Ready ===\r\n';
        if (this.onDataCallback) this.onDataCallback(new TextEncoder().encode(hello));
      }, 100);
    } else if (virtualMode === 'at') {
      setTimeout(() => {
        const hello = '\r\n+READY\r\nAT Modem Simulator v1.2 Ready\r\n';
        if (this.onDataCallback) this.onDataCallback(new TextEncoder().encode(hello));
      }, 100);
    }
  }

  private async startReadingLoop(): Promise<void> {
    while (this.port && this.port.readable && this.keepReading) {
      try {
        this.reader = this.port.readable.getReader();
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value && this.onDataCallback) {
            this.onDataCallback(value);
          }
        }
      } catch (err: any) {
        if (this.keepReading && this.onErrorCallback) {
          this.onErrorCallback(err);
        }
        break;
      } finally {
        if (this.reader) {
          try {
            this.reader.releaseLock();
          } catch {}
          this.reader = null;
        }
      }
    }

    if (this.keepReading && this.onDisconnectCallback) {
      this.onDisconnectCallback();
    }
  }

  public async send(data: Uint8Array): Promise<void> {
    if (this.isVirtual) {
      // Virtual port response simulation
      if (this.virtualMode === 'echo') {
        setTimeout(() => {
          if (this.onDataCallback) {
            const prefix = new TextEncoder().encode('[ECHO] ');
            const combined = new Uint8Array(prefix.length + data.length);
            combined.set(prefix, 0);
            combined.set(data, prefix.length);
            this.onDataCallback(combined);
          }
        }, 50);
      } else if (this.virtualMode === 'at') {
        const text = new TextDecoder().decode(data).trim().toUpperCase();
        setTimeout(() => {
          let reply = 'ERROR\r\n';
          if (text === 'AT') reply = 'OK\r\n';
          else if (text === 'AT+CSQ') reply = '+CSQ: 28,99\r\n\r\nOK\r\n';
          else if (text === 'AT+GMR' || text === 'ATI') reply = 'Simulated Modem v2.4.0\r\nOK\r\n';
          else if (text.startsWith('AT+')) reply = 'OK\r\n';
          if (this.onDataCallback) this.onDataCallback(new TextEncoder().encode(reply));
        }, 120);
      } else if (this.virtualMode === 'modbus') {
        // If query is standard read holding registers 01 03 ...
        setTimeout(() => {
          if (data.length >= 6 && data[0] === 0x01 && data[1] === 0x03) {
            // Reply: 01 03 04 00 19 01 F4 + CRC
            const reply = new Uint8Array([0x01, 0x03, 0x04, 0x00, 0x19, 0x01, 0xf4, 0xfa, 0x5a]);
            if (this.onDataCallback) this.onDataCallback(reply);
          } else {
            // Echo back with simulated ACK
            const ack = new Uint8Array([0x01, 0x80, 0x01, 0x81, 0x90]);
            if (this.onDataCallback) this.onDataCallback(ack);
          }
        }, 80);
      }
      return;
    }

    if (!this.port || !this.port.writable) {
      throw new Error('串口未连接或不可写');
    }

    const writer = this.port.writable.getWriter();
    try {
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }
  }

  public async setSignals(signals: { dtr?: boolean; rts?: boolean }): Promise<void> {
    if (this.port) {
      try {
        const sig: any = {};
        if (signals.dtr !== undefined) sig.dataTerminalReady = signals.dtr;
        if (signals.rts !== undefined) sig.requestToSend = signals.rts;
        await this.port.setSignals(sig);
      } catch {}
    }
  }

  public async readSignals(): Promise<SerialSignals> {
    if (this.port && typeof this.port.getSignals === 'function') {
      try {
        const sig = await this.port.getSignals();
        return {
          cts: sig.clearToSend,
          dsr: sig.dataSetReady,
          cd: sig.dataCarrierDetect,
          ri: sig.ringIndicator,
        };
      } catch {
        return {};
      }
    }
    return {};
  }

  public async disconnect(): Promise<void> {
    this.keepReading = false;
    if (this.virtualIntervalId) {
      clearInterval(this.virtualIntervalId);
      this.virtualIntervalId = null;
    }
    this.isVirtual = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {}
      try {
        this.reader.releaseLock();
      } catch {}
      this.reader = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch {}
      this.port = null;
    }
  }
}

export const serialManager = new WebSerialManager();
