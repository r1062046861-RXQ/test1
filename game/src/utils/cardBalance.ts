import type { Card } from '../types';

const DIRECT_DAMAGE_EFFECT_IDS = new Set([
  'aoe_damage',
  'aoe_damage_cleanse',
  'aoe_damage_cleanse_all_buffs',
  'aoe_damage_cleanse_heat',
  'aoe_damage_heat',
  'cleanse_enemy_buffs',
  'cleanse_heat_aoe_damage',
  'dahuang_effect',
  'damage_block',
  'damage_cleanse_buff',
  'damage_conditional_stasis',
  'damage_debuff_stasis',
  'damage_draw',
  'debuff_weak_draw',
  'huangqin_effect',
  'mahuang_effect',
  'percent_damage',
  'sleep_debuff',
  'true_damage',
  'yin_spend_damage_random',
  'yin_spend_double_damage',
  'formula_banxia_houpu_tang',
  'formula_maxing_shigan_tang',
  'formula_xiaoqinglong_tang',
  'formula_yinqiao_san',
]);

export const isOffensiveCard = (card: Card | undefined | null) =>
  Boolean(card && (card.type === 'attack' || DIRECT_DAMAGE_EFFECT_IDS.has(card.effectId)));

export const needsOffensiveOffer = (deck: Card[], threshold = 0.4) => {
  const playableCards = deck.filter(card => !card.unplayable);
  if (playableCards.length === 0) return true;
  const offensiveCards = playableCards.filter(isOffensiveCard);
  return offensiveCards.length / playableCards.length < threshold;
};

export const ensureOffensiveOffer = <T extends Card>(
  picked: T[],
  pool: T[],
  deck: Card[],
  threshold = 0.4
) => {
  if (!needsOffensiveOffer(deck, threshold) || picked.some(isOffensiveCard)) return picked;
  const pickedIds = new Set(picked.map(card => card.id));
  const offensiveCandidates = pool.filter(card => isOffensiveCard(card) && !pickedIds.has(card.id));
  if (offensiveCandidates.length === 0) return picked;
  const replacement = offensiveCandidates[Math.floor(Math.random() * offensiveCandidates.length)];
  if (picked.length === 0) return [replacement];
  return [replacement, ...picked.slice(1)];
};
