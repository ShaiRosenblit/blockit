import { createContext, useContext } from 'react';
import type { GameState, GameAction } from '../game/gameReducer';

type GameContextValue = {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
};

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
