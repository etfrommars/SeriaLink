export type DataBits = 5 | 6 | 7 | 8;
export type StopBits = 1 | 2;
export type ParityType = 'none' | 'even' | 'odd' | 'mark' | 'space';
export type FlowControlType = 'none' | 'hardware';
export type DataEncoding = 'utf-8' | 'gbk' | 'ascii';
export type DisplayMode = 'ascii' | 'hex';
export type LineEnding = 'none' | '\r\n' | '\n' | '\r';

export type CrcType =
  | 'none'
  | 'crc16-modbus-le'
  | 'crc16-modbus-be'
  | 'crc16-ccitt'
  | 'crc32'
  | 'sum8'
  | 'xor8'
  | 'lrc';

export interface SerialConfig {
  baudRate: number;
  dataBits: DataBits;
  stopBits: StopBits;
  parity: ParityType;
  flowControl: FlowControlType;
  dtr: boolean;
  rts: boolean;
}

export interface SerialSignals {
  cts?: boolean;
  dsr?: boolean;
  cd?: boolean;
  ri?: boolean;
}

export interface SerialLogItem {
  id: string;
  timestamp: number;
  direction: 'RX' | 'TX';
  rawBytes: Uint8Array;
  text: string;
  hex: string;
  highlightMatch?: string;
  channelValues?: number[];
}

export interface HighlightRule {
  id: string;
  keyword: string;
  color: string; // e.g. '#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'
  caseSensitive: boolean;
  enabled: boolean;
}

export interface QuickCommand {
  id: string;
  name: string;
  content: string;
  isHex: boolean;
  lineEnding: LineEnding;
  crc: CrcType;
}

export interface SequenceStep {
  id: string;
  commandId: string;
  delayMs: number;
  enabled: boolean;
}

export interface AutoReplyRule {
  id: string;
  name: string;
  triggerType: 'contains' | 'regex' | 'exact' | 'hex';
  triggerPattern: string;
  replyContent: string;
  isHex: boolean;
  lineEnding: LineEnding;
  delayMs: number;
  enabled: boolean;
}

export interface ChartChannel {
  id: number;
  name: string;
  color: string;
  visible: boolean;
  currentValue: number;
}

export interface ChartPoint {
  time: number;
  values: number[];
}
