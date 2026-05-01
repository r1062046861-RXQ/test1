import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { playBgm, getBgmKeyForPhase } from '../services/audioService';

export const useBgmAutoSwitch = () => {
  const phase = useGameStore((s) => s.phase);
  const currentAct = useGameStore((s) => s.currentAct);
  const currentNodeId = useGameStore((s) => s.currentNodeId);
  const map = useGameStore((s) => s.map);
  const prevKey = useRef<string | null>(null);

  useEffect(() => {
    let nodeType: string | undefined;
    if (currentNodeId && map.length > 0) {
      for (const layer of map) {
        const found = layer.nodes.find((n) => n.id === currentNodeId);
        if (found) { nodeType = found.type; break; }
      }
    }
    const key = getBgmKeyForPhase(phase, currentAct, nodeType);
    if (key && key !== prevKey.current) {
      prevKey.current = key;
      playBgm(key);
    }
  }, [phase, currentAct, currentNodeId, map]);
};
