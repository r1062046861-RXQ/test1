import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { cn } from '../utils/cn';
import { Card } from './Card';
import { cardReleaseTransition, handHoverTransition, handSettleTransition } from './ui/motionPresets';

type CombatViewportTier = 'regular' | 'compact' | 'tight';

interface HandProps {
  viewportTier?: CombatViewportTier;
}

interface HandLayout {
  spread: number;
  angle: number;
  scale: number;
  curve: number;
  hoverLift: number;
  neighborShift: number;
  releaseXAttack: number;
  releaseXSkill: number;
  releaseY: number;
  releaseRotateAttack: number;
  releaseRotateSkill: number;
}

const getHandLayout = (count: number, viewportTier: CombatViewportTier): HandLayout => {
  const base =
    count <= 4
      ? { spread: 68, angle: 4.0, scale: 1, curve: 9, hoverLift: 42, neighborShift: 26 }
      : count <= 6
        ? { spread: 58, angle: 3.2, scale: 0.98, curve: 8, hoverLift: 38, neighborShift: 24 }
        : count <= 8
          ? { spread: 48, angle: 2.6, scale: 0.94, curve: 6, hoverLift: 32, neighborShift: 20 }
          : { spread: 40, angle: 2.1, scale: 0.9, curve: 5, hoverLift: 28, neighborShift: 16 };

  const tierAdjust =
    viewportTier === 'regular'
      ? {
          spread: 1,
          angle: 0.94,
          scale: 1,
          curve: 0.92,
          hoverLift: 0.84,
          neighborShift: 0.92,
          releaseXAttack: 218,
          releaseXSkill: -128,
          releaseY: -320,
          releaseRotateAttack: 18,
          releaseRotateSkill: -14,
        }
      : viewportTier === 'compact'
        ? {
            spread: 0.88,
            angle: 0.88,
            scale: 0.95,
            curve: 0.84,
            hoverLift: 0.72,
            neighborShift: 0.82,
            releaseXAttack: 184,
            releaseXSkill: -112,
            releaseY: -286,
            releaseRotateAttack: 15,
            releaseRotateSkill: -12,
          }
        : {
            spread: 0.8,
            angle: 0.82,
            scale: 0.9,
            curve: 0.74,
            hoverLift: 0.6,
            neighborShift: 0.72,
            releaseXAttack: 156,
            releaseXSkill: -96,
            releaseY: -252,
            releaseRotateAttack: 13,
            releaseRotateSkill: -10,
          };

  return {
    spread: Math.round(base.spread * tierAdjust.spread),
    angle: Number((base.angle * tierAdjust.angle).toFixed(2)),
    scale: Number((base.scale * tierAdjust.scale).toFixed(3)),
    curve: Math.max(3, Math.round(base.curve * tierAdjust.curve)),
    hoverLift: Math.round(base.hoverLift * tierAdjust.hoverLift),
    neighborShift: Math.round(base.neighborShift * tierAdjust.neighborShift),
    releaseXAttack: tierAdjust.releaseXAttack,
    releaseXSkill: tierAdjust.releaseXSkill,
    releaseY: tierAdjust.releaseY,
    releaseRotateAttack: tierAdjust.releaseRotateAttack,
    releaseRotateSkill: tierAdjust.releaseRotateSkill,
  };
};

export const Hand: React.FC<HandProps> = ({ viewportTier = 'regular' }) => {
  const { player, playCard, selectedEnemyId } = useGameStore((state) => ({
    player: state.player,
    playCard: state.playCard,
    selectedEnemyId: state.selectedEnemyId,
  }));

  const [playingCardId, setPlayingCardId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const hoveredIndex = useMemo(
    () => player.hand.findIndex((card) => card.id === hoveredCardId),
    [hoveredCardId, player.hand],
  );

  const layout = useMemo(() => getHandLayout(player.hand.length, viewportTier), [player.hand.length, viewportTier]);

  const handleCardClick = (card: (typeof player.hand)[number]) => {
    if (player.energy < card.cost || card.unplayable || playingCardId) return;

    setPlayingCardId(card.id);
    window.setTimeout(() => {
      if (card.target === 'single_enemy') {
        playCard(card.id, selectedEnemyId || undefined);
      } else {
        playCard(card.id);
      }
      setPlayingCardId(null);
      setHoveredCardId(null);
    }, 420);
  };

  return (
    <div className={cn('combat-hand relative flex h-full w-full items-end justify-center perspective-1000', `combat-hand--${viewportTier}`)}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[radial-gradient(circle_at_center,rgba(255,228,178,0.18),transparent_62%)]" />
      <div className="pointer-events-none absolute bottom-2 h-10 w-[72%] rounded-full bg-black/35 blur-2xl" />

      <AnimatePresence>
        {player.hand.map((card, index) => {
          const isPlaying = playingCardId === card.id;
          const isHovered = hoveredCardId === card.id;
          const isPlayable = player.energy >= card.cost && !card.unplayable && !playingCardId;
          const centerOffset = index - (player.hand.length - 1) / 2;
          const baseRotation = centerOffset * layout.angle;
          const baseYOffset = Math.abs(centerOffset) * layout.curve;
          const baseXOffset = centerOffset * layout.spread;
          const relativeToHovered = hoveredIndex >= 0 ? index - hoveredIndex : 0;
          const hoverSpread =
            hoveredIndex < 0
              ? 0
              : relativeToHovered === -2
                ? -layout.neighborShift * 0.7
                : relativeToHovered === -1
                  ? -layout.neighborShift
                  : relativeToHovered === 1
                    ? layout.neighborShift
                    : relativeToHovered === 2
                      ? layout.neighborShift * 0.7
                      : 0;
          const dimmed = hoveredIndex >= 0 && !isHovered;
          const focusScale = isHovered ? layout.scale * 1.06 : dimmed ? layout.scale * 0.975 : layout.scale;
          const focusYOffset = isHovered ? -layout.hoverLift : dimmed ? baseYOffset + (viewportTier === 'regular' ? 6 : 4) : baseYOffset;
          const focusRotation = isHovered ? baseRotation * 0.08 : baseRotation + (hoverSpread > 0 ? 0.45 : hoverSpread < 0 ? -0.45 : 0);
          const focusXOffset = baseXOffset + hoverSpread;
          const releaseX = focusXOffset + (card.type === 'attack' ? layout.releaseXAttack : layout.releaseXSkill);
          const releaseRotate = baseRotation + (card.type === 'attack' ? layout.releaseRotateAttack : layout.releaseRotateSkill);

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 96, rotate: baseRotation * 0.32, scale: layout.scale * 0.95 }}
              animate={
                isPlaying
                  ? {
                      opacity: [1, 1, 0],
                      scale: [focusScale, focusScale * 1.02, layout.scale * 0.72],
                      y: [focusYOffset, focusYOffset - 16, layout.releaseY],
                      x: [focusXOffset, focusXOffset + (card.type === 'attack' ? 28 : -20), releaseX],
                      rotate: [focusRotation, focusRotation * 0.22, releaseRotate],
                      filter: ['brightness(1.05)', 'brightness(1.1)', 'brightness(1)'],
                    }
                  : {
                      opacity: 1,
                      y: focusYOffset,
                      x: focusXOffset,
                      rotate: focusRotation,
                      scale: focusScale,
                      filter: dimmed
                        ? 'saturate(0.92) brightness(0.94)'
                        : isPlayable
                          ? 'saturate(1.04) brightness(1.02)'
                          : 'saturate(0.92) brightness(0.96)',
                    }
              }
              exit={{ opacity: 0, scale: layout.scale * 0.82, y: 72 }}
              transition={isPlaying ? cardReleaseTransition : isHovered ? handHoverTransition : handSettleTransition}
              className="combat-hand__card absolute bottom-0 origin-bottom transform-gpu"
              style={{ zIndex: isPlaying ? 60 : isHovered ? 45 : index + 1 }}
              onMouseEnter={() => !playingCardId && setHoveredCardId(card.id)}
              onMouseLeave={() => setHoveredCardId((current) => (current === card.id ? null : current))}
            >
              <Card
                card={card}
                onClick={() => !isPlaying && handleCardClick(card)}
                disabled={!isPlayable && !isHovered}
                interactive={!isPlaying}
                hoverLift={false}
                layoutVariant="hand"
                imageTreatment="muted"
                visualTone={
                  isPlaying
                    ? 'focus'
                    : isHovered
                      ? isPlayable
                        ? 'focus'
                        : 'muted'
                      : isPlayable
                        ? 'playable'
                        : 'muted'
                }
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
