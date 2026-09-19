/**
 * Checksum and CRC calculation algorithms for industrial serial protocols
 */

import { CrcType } from '../types';

// CRC-16 Modbus (Poly 0x8005 reversed -> 0xA001, Init 0xFFFF)
export function calcCrc16Modbus(data: Uint8Array): number {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x0001) !== 0) {
        crc = (crc >> 1) ^ 0xa001;
      } else {
        crc >>= 1;
      }
    }
  }
  return crc & 0xffff;
}

// CRC-16 CCITT (Poly 0x1021, Init 0x0000 or 0xFFFF)
export function calcCrc16Ccitt(data: Uint8Array, init = 0xffff): number {
  let crc = init;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc & 0xffff;
}

// CRC-32 (IEEE 802.3)
const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

export function calcCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Sum8 (Sum modulo 256)
export function calcSum8(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data[i]) & 0xff;
  }
  return sum;
}

// XOR 8-bit (BCC)
export function calcXor8(data: Uint8Array): number {
  let xor = 0;
  for (let i = 0; i < data.length; i++) {
    xor ^= data[i];
  }
  return xor & 0xff;
}

// LRC (Modbus ASCII)
export function calcLrc(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data[i]) & 0xff;
  }
  return ((-sum) + 256) & 0xff;
}

/**
 * Append CRC bytes to Uint8Array based on selected CrcType
 */
export function appendCrc(data: Uint8Array, crcType: CrcType): Uint8Array {
  if (crcType === 'none') return data;

  if (crcType === 'crc16-modbus-le') {
    const crc = calcCrc16Modbus(data);
    const result = new Uint8Array(data.length + 2);
    result.set(data, 0);
    result[data.length] = crc & 0xff; // Low byte first
    result[data.length + 1] = (crc >> 8) & 0xff; // High byte second
    return result;
  }

  if (crcType === 'crc16-modbus-be') {
    const crc = calcCrc16Modbus(data);
    const result = new Uint8Array(data.length + 2);
    result.set(data, 0);
    result[data.length] = (crc >> 8) & 0xff; // High byte first
    result[data.length + 1] = crc & 0xff;
    return result;
  }

  if (crcType === 'crc16-ccitt') {
    const crc = calcCrc16Ccitt(data);
    const result = new Uint8Array(data.length + 2);
    result.set(data, 0);
    result[data.length] = (crc >> 8) & 0xff;
    result[data.length + 1] = crc & 0xff;
    return result;
  }

  if (crcType === 'crc32') {
    const crc = calcCrc32(data);
    const result = new Uint8Array(data.length + 4);
    result.set(data, 0);
    result[data.length] = (crc >> 24) & 0xff;
    result[data.length + 1] = (crc >> 16) & 0xff;
    result[data.length + 2] = (crc >> 8) & 0xff;
    result[data.length + 3] = crc & 0xff;
    return result;
  }

  if (crcType === 'sum8') {
    const sum = calcSum8(data);
    const result = new Uint8Array(data.length + 1);
    result.set(data, 0);
    result[data.length] = sum;
    return result;
  }

  if (crcType === 'xor8') {
    const xor = calcXor8(data);
    const result = new Uint8Array(data.length + 1);
    result.set(data, 0);
    result[data.length] = xor;
    return result;
  }

  if (crcType === 'lrc') {
    const lrc = calcLrc(data);
    const result = new Uint8Array(data.length + 1);
    result.set(data, 0);
    result[data.length] = lrc;
    return result;
  }

  return data;
}

export function formatCrcHex(val: number, bytes = 2): string {
  return val.toString(16).toUpperCase().padStart(bytes * 2, '0');
}
