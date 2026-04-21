import React from 'react';
import { Sparkles } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../utils/cn';

interface PassiveEffectsProps {
  className?: string;
  compact?: boolean;
}

export const PassiveEffects: React.FC<PassiveEffectsProps> = ({ className, compact = false }) => {
  const { player } = useGameStore();

  if (player.statusEffects.length === 0) return null;

  return (
    <div className={cn('combat-parchment-panel flex min-h-0 flex-col overflow-hidden px-3 py-3', className)}>
      <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
        <Sparkles size={16} className="text-amber-300" />
        <div className="text-[12px] uppercase tracking-[0.24em] text-stone-300">被动属性</div>
      </div>
      <div className={cn('ornate-scroll min-h-0 flex-1 overflow-y-auto pr-1', compact ? 'space-y-1.5' : 'space-y-2')}>
        {player.statusEffects.map((effect) => (
          <div key={effect.id} className="combat-parchment-inset px-2.5 py-2 text-stone-100">
            <div className="flex items-start gap-2">
              <div
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-bold text-white',
                  effect.type === 'buff' ? 'bg-emerald-700' : 'bg-red-700',
                )}
              >
                {effect.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-stone-50">
                  {effect.name}
                  {effect.stacks > 0 ? ` ×${effect.stacks}` : ''}
                </div>
                <div className={cn('mt-1 text-stone-300/90', compact ? 'text-[12px] leading-5' : 'text-sm leading-5')}>
                  {effect.description}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
