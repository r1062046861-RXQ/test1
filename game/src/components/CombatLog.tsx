import React, { useEffect, useRef } from 'react';
import { ScrollText } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../utils/cn';

interface CombatLogProps {
  className?: string;
  compact?: boolean;
}

export const CombatLog: React.FC<CombatLogProps> = ({ className, compact = false }) => {
  const { combatLog } = useGameStore();
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [combatLog]);

  return (
    <div className={cn('combat-parchment-panel flex min-h-0 flex-col overflow-hidden px-3 py-3', className)}>
      <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
        <ScrollText size={16} className="text-amber-300" />
        <div className="text-[12px] uppercase tracking-[0.24em] text-stone-300">战斗记录</div>
      </div>
      <div className={cn('ornate-scroll min-h-0 flex-1 overflow-y-auto pr-1', compact ? 'text-[12px] leading-5' : 'text-sm leading-6')}>
        <div className="flex flex-col gap-1.5">
          {combatLog.map((log, index) => (
            <div
              key={`${index}-${log}`}
              className="combat-parchment-inset px-2.5 py-1.5 text-stone-100 transition hover:bg-white/8"
            >
              {log}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};
