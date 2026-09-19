/**
 * Data export and local file auto-save utilities
 */

import { SerialLogItem, ChartPoint } from '../types';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export communication logs to standard CSV format
 */
export function exportLogsToCsv(logs: SerialLogItem[], filename = 'serial_log.csv'): void {
  const headers = ['Index', 'Timestamp', 'Direction', 'ByteCount', 'Hex', 'Text'];
  const rows = logs.map((log, index) => {
    const timeStr = new Date(log.timestamp).toISOString();
    // Escape quotes in text
    const escapedText = `"${log.text.replace(/"/g, '""').replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`;
    const hex = `"${log.hex}"`;
    return [
      index + 1,
      timeStr,
      log.direction,
      log.rawBytes.length,
      hex,
      escapedText,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Export real-time plotted chart points to CSV for offline analysis in Excel/Matlab
 */
export function exportChartDataToCsv(
  points: ChartPoint[],
  channelNames: string[],
  filename = 'serial_chart_data.csv'
): void {
  const headers = ['Timestamp', 'RelativeTime_ms', ...channelNames];
  const startTime = points.length > 0 ? points[0].time : 0;

  const rows = points.map((pt) => {
    const timeStr = new Date(pt.time).toISOString();
    const relMs = pt.time - startTime;
    const vals = pt.values.map(v => (v !== undefined && v !== null ? v : ''));
    return [timeStr, relMs, ...vals].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Export raw TXT logs
 */
export function exportLogsToTxt(logs: SerialLogItem[], filename = 'serial_log.txt'): void {
  const lines = logs.map((log) => {
    const d = new Date(log.timestamp);
    const time = `${d.toTimeString().split(' ')[0]}.${d.getMilliseconds().toString().padStart(3, '0')}`;
    return `[${time}] [${log.direction}] ${log.text}`;
  });

  const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Local File System stream writer for real-time automatic log persistence
 */
export class AutoLogSaver {
  private fileHandle: any = null;
  private writable: any = null;
  public isLogging = false;
  private buffer: string[] = [];
  private flushTimer: any = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
  }

  public async startSaving(): Promise<string> {
    if (!this.isSupported()) {
      throw new Error('当前浏览器不支持 File System Access API (仅支持 Chrome/Edge)');
    }

    try {
      this.fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: `serial_stream_${new Date().toISOString().slice(0, 10)}.log`,
        types: [
          {
            description: 'Log File (*.log, *.txt)',
            accept: { 'text/plain': ['.log', '.txt'] },
          },
        ],
      });

      this.writable = await this.fileHandle.createWritable({ keepExistingData: true });
      this.isLogging = true;
      this.buffer = [];

      // Initial header
      await this.writable.write(`=== Web Serial Studio Log Started at ${new Date().toISOString()} ===\r\n`);

      // Flush periodically
      this.flushTimer = setInterval(() => this.flush(), 2000);
      return this.fileHandle.name;
    } catch (err: any) {
      this.isLogging = false;
      this.writable = null;
      this.fileHandle = null;
      throw err;
    }
  }

  public appendLog(log: SerialLogItem): void {
    if (!this.isLogging) return;
    const d = new Date(log.timestamp);
    const time = `${d.toTimeString().split(' ')[0]}.${d.getMilliseconds().toString().padStart(3, '0')}`;
    const entry = `[${time}] [${log.direction}] [HEX: ${log.hex}] ${log.text}\r\n`;
    this.buffer.push(entry);

    if (this.buffer.length >= 20) {
      this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (!this.writable || this.buffer.length === 0) return;
    const content = this.buffer.join('');
    this.buffer = [];
    try {
      await this.writable.write(content);
    } catch (e) {
      console.warn('AutoLogSaver write error', e);
    }
  }

  public async stopSaving(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.writable) {
      try {
        await this.flush();
        await this.writable.write(`=== Log Closed at ${new Date().toISOString()} ===\r\n`);
        await this.writable.close();
      } catch {}
      this.writable = null;
      this.fileHandle = null;
    }
    this.isLogging = false;
  }
}

export const autoLogSaver = new AutoLogSaver();
