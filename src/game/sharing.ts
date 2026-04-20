import type {
  BoardGrid,
  PieceShape,
  RiddleDifficulty,
  TargetPattern,
} from './types';
import { BOARD_SIZE, COLORS } from './types';
import { clampRiddleDifficulty } from './riddleGenerator';

/**
 * Share-link format for riddles. The entire starting state of a riddle
 * (board, target pattern, tray pieces with colors & rotation) is serialized
 * into a compact byte stream, base64url-encoded, and placed in the URL hash
 * (`#r=<payload>`) so GitHub Pages routing doesn't need any special tricks.
 *
 * Byte layout (VERSION 1):
 *   [0]         VERSION (= 1)
 *   [1]         difficulty (1..5)
 *   [2..33]     board, 64 cells packed 2 per byte (high nibble first).
 *                 nibble values:
 *                   0       = empty
 *                   1..7    = palette color COLORS[n-1]
 *                   8       = pre-fill color (#5c6b7a)
 *   [34..41]    target pattern, 64 bits, row-major, MSB first.
 *   [42]        trayLen (1..255)
 *   then per tray piece:
 *                 color:    1 byte (0..7 = COLORS index, 8 = pre-fill)
 *                 numCells: 1 byte (1..9)
 *                 cells:    numCells × (row:1, col:1) pairs, each 0..4.
 *
 * `VERSION` lets the decoder reject unknown formats cleanly, so the layout
 * can be changed later without breaking old links in an uncontrolled way.
 */

const VERSION = 1;
const PREFILL_COLOR = '#5c6b7a';
const PREFILL_INDEX = 8;

function colorToIndex(color: string): number {
  if (color === PREFILL_COLOR) return PREFILL_INDEX;
  const idx = COLORS.indexOf(color);
  if (idx === -1) {
    throw new Error(`Cannot share: unknown color ${color}`);
  }
  return idx + 1;
}

function indexToColor(idx: number): string | null {
  if (idx === 0) return null;
  if (idx === PREFILL_INDEX) return PREFILL_COLOR;
  if (idx >= 1 && idx <= COLORS.length) return COLORS[idx - 1];
  return null;
}

function bytesToBase64Url(bytes: number[]): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b & 0xff);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(encoded: string): number[] | null {
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64);
    const out: number[] = new Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export type EncodableRiddle = {
  difficulty: RiddleDifficulty;
  board: BoardGrid;
  tray: PieceShape[];
  target: TargetPattern;
};

export function encodeRiddle(riddle: EncodableRiddle): string {
  const { difficulty, board, tray, target } = riddle;
  const bytes: number[] = [];

  bytes.push(VERSION);
  bytes.push(clampRiddleDifficulty(difficulty));

  // Board: 64 cells packed 2 per byte.
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i += 2) {
    const r1 = Math.floor(i / BOARD_SIZE);
    const c1 = i % BOARD_SIZE;
    const r2 = Math.floor((i + 1) / BOARD_SIZE);
    const c2 = (i + 1) % BOARD_SIZE;
    const hi = board[r1][c1] === null ? 0 : colorToIndex(board[r1][c1]!);
    const lo = board[r2][c2] === null ? 0 : colorToIndex(board[r2][c2]!);
    bytes.push(((hi & 0x0f) << 4) | (lo & 0x0f));
  }

  // Target: 64 bits, 8 bits per byte, MSB first.
  for (let byte = 0; byte < 8; byte++) {
    let b = 0;
    for (let bit = 0; bit < 8; bit++) {
      const idx = byte * 8 + bit;
      const r = Math.floor(idx / BOARD_SIZE);
      const c = idx % BOARD_SIZE;
      if (target[r][c]) b |= 1 << (7 - bit);
    }
    bytes.push(b);
  }

  // Tray.
  if (tray.length > 255) throw new Error('Cannot share: tray too large.');
  bytes.push(tray.length);
  for (const piece of tray) {
    bytes.push(colorToIndex(piece.color));
    if (piece.cells.length > 255) throw new Error('Cannot share: piece too large.');
    bytes.push(piece.cells.length);
    for (const cell of piece.cells) {
      if (cell.row < 0 || cell.row > 255 || cell.col < 0 || cell.col > 255) {
        throw new Error('Cannot share: piece cell out of range.');
      }
      bytes.push(cell.row);
      bytes.push(cell.col);
    }
  }

  return bytesToBase64Url(bytes);
}

export function decodeRiddle(encoded: string): EncodableRiddle | null {
  const bytes = base64UrlToBytes(encoded);
  if (!bytes) return null;
  if (bytes.length < 2 + 32 + 8 + 1) return null;
  if (bytes[0] !== VERSION) return null;

  let off = 1;
  const difficulty = clampRiddleDifficulty(bytes[off++]);

  const board: BoardGrid = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null as string | null)
  );
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i += 2) {
    const b = bytes[off++];
    const hi = (b >> 4) & 0x0f;
    const lo = b & 0x0f;
    const r1 = Math.floor(i / BOARD_SIZE);
    const c1 = i % BOARD_SIZE;
    const r2 = Math.floor((i + 1) / BOARD_SIZE);
    const c2 = (i + 1) % BOARD_SIZE;
    if (hi !== 0) {
      const color = indexToColor(hi);
      if (color === null) return null;
      board[r1][c1] = color;
    }
    if (lo !== 0) {
      const color = indexToColor(lo);
      if (color === null) return null;
      board[r2][c2] = color;
    }
  }

  const target: TargetPattern = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false)
  );
  for (let byte = 0; byte < 8; byte++) {
    const b = bytes[off++];
    for (let bit = 0; bit < 8; bit++) {
      const idx = byte * 8 + bit;
      const r = Math.floor(idx / BOARD_SIZE);
      const c = idx % BOARD_SIZE;
      target[r][c] = (b & (1 << (7 - bit))) !== 0;
    }
  }

  if (off >= bytes.length) return null;
  const trayLen = bytes[off++];
  const tray: PieceShape[] = [];
  for (let i = 0; i < trayLen; i++) {
    if (off + 2 > bytes.length) return null;
    const colorIdx = bytes[off++];
    const color = indexToColor(colorIdx);
    if (color === null) return null;
    const numCells = bytes[off++];
    if (numCells === 0 || off + numCells * 2 > bytes.length) return null;

    const cells: { row: number; col: number }[] = [];
    let maxR = 0;
    let maxC = 0;
    for (let k = 0; k < numCells; k++) {
      const r = bytes[off++];
      const c = bytes[off++];
      cells.push({ row: r, col: c });
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }

    tray.push({
      id: `shared-${i}`,
      cells,
      width: maxC + 1,
      height: maxR + 1,
      color,
    });
  }

  return { difficulty, board, tray, target };
}

/** Build a full shareable URL pointing at the current origin + base URL. */
export function buildShareUrl(riddle: EncodableRiddle): string {
  const encoded = encodeRiddle(riddle);
  const base = import.meta.env.BASE_URL;
  return `${window.location.origin}${base}#r=${encoded}`;
}

/**
 * Extract a shared-riddle payload from the current URL hash, if any.
 * Returns the raw encoded string (caller decides when to decode) so the
 * app can tell "there is a share link" apart from "link was there but
 * failed to decode" if it wants to.
 */
export function parseSharePayload(): string | null {
  const hash = window.location.hash;
  if (!hash) return null;
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (h.startsWith('r=')) return h.slice(2);
  return null;
}

/** Remove any shared-riddle marker from the URL without adding a history entry. */
export function clearShareHash(): void {
  if (!window.location.hash) return;
  const url = window.location.pathname + window.location.search;
  history.replaceState(null, '', url);
}
