import { useReducer, useRef, useState, useCallback, useEffect } from 'react';
import { gameReducer, createInitialState } from './game/gameReducer';
import { canPlacePiece, placePiece, detectCompletedLines } from './game/board';
import { calculatePlacementScore, calculateClearScore } from './game/scoring';
import { GameContext } from './hooks/useGame';
import { Board } from './components/Board';
import { PieceTray, FloatingPiece } from './components/PieceTray';
import { ScoreBar } from './components/ScoreBar';
import { GameOverOverlay } from './components/GameOverOverlay';
import type { Coord } from './game/types';
import { BOARD_SIZE } from './game/types';

type ScorePopup = { id: number; value: number; x: number; y: number };

let popupId = 0;

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const boardRef = useRef<HTMLDivElement>(null);

  const [drag, setDrag] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const [preview, setPreview] = useState<{
    cells: Map<string, 'valid' | 'invalid'>;
    color: string | null;
  } | null>(null);

  const [flashCells, setFlashCells] = useState<Map<string, string> | null>(null);
  const [placedCells, setPlacedCells] = useState<Set<string> | null>(null);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);

  const computeOrigin = useCallback(
    (clientX: number, clientY: number, piece: { width: number; height: number }): Coord | null => {
      if (!boardRef.current) return null;
      const rect = boardRef.current.getBoundingClientRect();
      const cellSize = rect.width / BOARD_SIZE;
      const centerCol = (clientX - rect.left) / cellSize - piece.width / 2;
      const centerRow = (clientY - rect.top - 40) / cellSize - piece.height / 2;
      const col = Math.round(centerCol);
      const row = Math.round(centerRow);
      return { row, col };
    },
    []
  );

  const updatePreview = useCallback(
    (clientX: number, clientY: number, trayIndex: number) => {
      const piece = state.tray[trayIndex];
      if (!piece || !boardRef.current) {
        setPreview(null);
        return;
      }
      const origin = computeOrigin(clientX, clientY, piece);
      if (!origin) {
        setPreview(null);
        return;
      }
      const valid = canPlacePiece(state.board, piece, origin);
      const cells = new Map<string, 'valid' | 'invalid'>();
      for (const cell of piece.cells) {
        const r = origin.row + cell.row;
        const c = origin.col + cell.col;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          cells.set(`${r},${c}`, valid ? 'valid' : 'invalid');
        }
      }
      setPreview(cells.size > 0 ? { cells, color: piece.color } : null);
    },
    [state.board, state.tray, computeOrigin]
  );

  const spawnScorePopup = useCallback((value: number, boardOrigin: Coord) => {
    if (!boardRef.current || value === 0) return;
    const rect = boardRef.current.getBoundingClientRect();
    const cellSize = rect.width / BOARD_SIZE;
    const x = rect.left + (boardOrigin.col + 0.5) * cellSize;
    const y = rect.top + (boardOrigin.row + 0.5) * cellSize;
    const id = ++popupId;
    setScorePopups((prev) => [...prev, { id, value, x, y }]);
    setTimeout(() => {
      setScorePopups((prev) => prev.filter((p) => p.id !== id));
    }, 600);
  }, []);

  const handlePlace = useCallback(
    (trayIndex: number, origin: Coord) => {
      const piece = state.tray[trayIndex];
      if (!piece) return;
      if (!canPlacePiece(state.board, piece, origin)) return;

      // Compute placed cells for snap animation
      const placed = new Set<string>();
      for (const cell of piece.cells) {
        placed.add(`${origin.row + cell.row},${origin.col + cell.col}`);
      }
      setPlacedCells(placed);
      setTimeout(() => setPlacedCells(null), 200);

      // Compute which cells will be cleared for flash animation
      const hypothetical = placePiece(state.board, piece, origin);
      const { rows, cols } = detectCompletedLines(hypothetical);
      const linesCleared = rows.length + cols.length;

      if (linesCleared > 0) {
        const flash = new Map<string, string>();
        for (const r of rows) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            flash.set(`${r},${c}`, hypothetical[r][c]!);
          }
        }
        for (const c of cols) {
          for (let r = 0; r < BOARD_SIZE; r++) {
            if (!flash.has(`${r},${c}`)) {
              flash.set(`${r},${c}`, hypothetical[r][c]!);
            }
          }
        }
        setFlashCells(flash);
        setTimeout(() => setFlashCells(null), 250);

        const clearScore = calculateClearScore(linesCleared, state.combo);
        const totalPopup = calculatePlacementScore(piece) + clearScore;
        spawnScorePopup(totalPopup, origin);
      }

      dispatch({ type: 'PLACE_PIECE', trayIndex, origin });
    },
    [state.board, state.tray, state.combo, spawnScorePopup]
  );

  const handleDragStart = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDrag({ index, x: e.clientX, y: e.clientY });
      updatePreview(e.clientX, e.clientY, index);
    },
    [updatePreview]
  );

  useEffect(() => {
    if (drag === null) return;

    const onMove = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : null));
      updatePreview(e.clientX, e.clientY, drag.index);
    };

    const onUp = (e: PointerEvent) => {
      const piece = state.tray[drag.index];
      if (piece && boardRef.current) {
        const origin = computeOrigin(e.clientX, e.clientY, piece);
        if (origin && canPlacePiece(state.board, piece, origin)) {
          handlePlace(drag.index, origin);
        }
      }
      setDrag(null);
      setPreview(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, state.board, state.tray, computeOrigin, updatePreview, handlePlace]);

  const dragPiece = drag ? state.tray[drag.index] : null;

  return (
    <GameContext value={{ state, dispatch }}>
      <div className="app">
        <h1 className="title">Blockit</h1>
        <ScoreBar />
        <Board
          boardRef={boardRef}
          previewCells={preview?.cells}
          previewColor={preview?.color}
          flashCells={flashCells ?? undefined}
          placedCells={placedCells ?? undefined}
        />
        <PieceTray onDragStart={handleDragStart} draggingIndex={drag?.index ?? null} />
        {drag && dragPiece && (
          <FloatingPiece piece={dragPiece} x={drag.x} y={drag.y} />
        )}
        {scorePopups.map((popup) => (
          <div
            key={popup.id}
            className="score-popup"
            style={{ left: popup.x, top: popup.y }}
          >
            +{popup.value}
          </div>
        ))}
        <GameOverOverlay />
      </div>
    </GameContext>
  );
}
