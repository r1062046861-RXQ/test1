import { Enemy } from '../baseTypes';

export const ENEMIES: Record<string, Enemy> = {
  // --- Act 1: External Pathogens ---
  'wind_cold_guest': {
    id: 'wind_cold_guest',
    name: '风寒客',
    maxHp: 33,
    currentHp: 33,
    block: 0,
    statusEffects: [],
    intent: { type: 'attack', value: 5, description: '寒邪侵袭' },
    image: '/assets/cards_enemy/89.webp',
    posterImage: '/assets/cards_enemy/89-poster.png',
    behavior: 'wind_cold_guest'
  },
  'wind_heat_attack': {
    id: 'wind_heat_attack',
    name: '风热袭',
    maxHp: 31,
    currentHp: 31,
    block: 0,
    statusEffects: [],
    intent: { type: 'attack', value: 3, description: '热邪灼烧' }, // Multi-hit logic handled in store
    image: '/assets/cards_enemy/90.webp',
    posterImage: '/assets/cards_enemy/90-poster.png',
    behavior: 'wind_heat_attack'
  },
  'damp_turbidity': {
    id: 'damp_turbidity',
    name: '湿浊缠',
    maxHp: 38,
    currentHp: 38,
    block: 0,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '湿邪困脾' },
    image: '/assets/cards_enemy/91.webp',
    posterImage: '/assets/cards_enemy/91-poster.png',
    behavior: 'damp_turbidity'
  },
  // Elite Act 1
  'external_combination': {
    id: 'external_combination',
    name: '斑斓厄兽',
    maxHp: 80,
    currentHp: 80,
    block: 10,
    statusEffects: [],
    intent: { type: 'special', value: 0, description: '形态切换' },
    image: '/assets/cards_enemy/92.webp',
    posterImage: '/assets/cards_enemy/92-poster.png',
    behavior: 'external_combination',
    meta: { form: 'cold', formTurns: 3 }
  },
  // Boss Act 1
  'boss_wind_cold': {
    id: 'boss_wind_cold',
    name: '寒霜封卫',
    maxHp: 138,
    currentHp: 138,
    block: 0,
    statusEffects: [],
    intent: { type: 'attack', value: 12, description: '寒凝血瘀' },
    image: '/assets/cards_enemy/93.webp',
    posterImage: '/assets/cards_enemy/93-poster.png',
    behavior: 'boss_wind_cold'
  },
  'boss_liver_fire': {
    id: 'boss_liver_fire',
    name: '怒炎狂客',
    maxHp: 132,
    currentHp: 132,
    block: 0,
    statusEffects: [],
    intent: { type: 'attack', value: 8, description: '火旺伤阴' },
    image: '/assets/cards_enemy/94.webp',
    posterImage: '/assets/cards_enemy/94-poster.png',
    behavior: 'boss_liver_fire'
  },

  // --- Act 2: Internal Dysfunction ---
  'qi_blood_stasis': {
    id: 'qi_blood_stasis',
    name: '紫荆囚徒',
    maxHp: 56,
    currentHp: 56,
    block: 5,
    statusEffects: [],
    intent: { type: 'attack', value: 8, description: '郁而作痛' },
    image: '/assets/cards_enemy/95.webp',
    posterImage: '/assets/cards_enemy/95-poster.png',
    behavior: 'qi_blood_stasis'
  },
  'spleen_dampness': {
    id: 'spleen_dampness',
    name: '臃肿肉山',
    maxHp: 61,
    currentHp: 61,
    block: 8,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '湿困中焦' },
    image: '/assets/cards_enemy/96.webp',
    posterImage: '/assets/cards_enemy/96-poster.png',
    behavior: 'spleen_dampness'
  },
  'heart_kidney_gap': {
    id: 'heart_kidney_gap',
    name: '水火双生鬼',
    maxHp: 50,
    currentHp: 50,
    block: 0,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '心悸不安' },
    image: '/assets/cards_enemy/97.webp',
    posterImage: '/assets/cards_enemy/97-poster.png',
    behavior: 'heart_kidney_gap'
  },
  'tanmengxinqiao': {
    id: 'tanmengxinqiao',
    name: '迷心浊灵',
    maxHp: 58,
    currentHp: 58,
    block: 0,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '痰蒙心窍' },
    image: '/assets/cards_enemy/83.webp',
    posterImage: '/assets/cards_enemy/83-poster.png',
    behavior: 'tanmengxinqiao',
    meta: { turn: 0 }
  },
  // Elite Act 2
  'phlegm_stasis': {
    id: 'phlegm_stasis',
    name: '顽石死骸',
    maxHp: 120,
    currentHp: 120,
    block: 15,
    statusEffects: [],
    intent: { type: 'buff', value: 0, description: '痰凝血瘀' },
    image: '/assets/cards_enemy/98.webp',
    posterImage: '/assets/cards_enemy/98-poster.png',
    behavior: 'phlegm_stasis'
  },
  // Boss Act 2
  'boss_spleen_damp': {
    id: 'boss_spleen_damp',
    name: '沉沦泥怪',
    maxHp: 230,
    currentHp: 230,
    block: 20,
    statusEffects: [],
    intent: { type: 'special', value: 0, description: '水湿不运' },
    image: '/assets/cards_enemy/99.webp',
    posterImage: '/assets/cards_enemy/99-poster.png',
    behavior: 'boss_spleen_damp',
    meta: { turn: 0 }
  },
  'damp_minion': {
    id: 'damp_minion',
    name: '水湿小怪',
    maxHp: 20,
    currentHp: 20,
    block: 0,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '湿邪侵体' },
    image: '/assets/cards_enemy/104.webp',
    posterImage: '/assets/cards_enemy/104-poster.png',
    behavior: 'damp_minion',
    meta: {}
  },

  // --- Act 3: Five Elements ---
  'yin_yang_split': {
    id: 'yin_yang_split',
    name: '终焉虚影',
    maxHp: 78,
    currentHp: 78,
    block: 0,
    statusEffects: [],
    intent: { type: 'special', value: 0, description: '阴阳格拒' },
    image: '/assets/cards_enemy/100.webp',
    posterImage: '/assets/cards_enemy/100-poster.png',
    behavior: 'yin_yang_split',
    meta: { form: 'yin' }
  },
  'chong_ren_instability': {
    id: 'chong_ren_instability',
    name: '散华残躯',
    maxHp: 72,
    currentHp: 72,
    block: 0,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '崩漏不止' },
    image: '/assets/cards_enemy/101.webp',
    posterImage: '/assets/cards_enemy/101-poster.png',
    behavior: 'chong_ren_instability'
  },
  'reruyingxue': {
    id: 'reruyingxue',
    name: '沸血暗影',
    maxHp: 80,
    currentHp: 80,
    block: 0,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '热入营血' },
    image: '/assets/cards_enemy/79.webp',
    posterImage: '/assets/cards_enemy/79-poster.png',
    behavior: 'reruyingxue',
    meta: { turn: 0 }
  },
  'shenbunaqi': {
    id: 'shenbunaqi',
    name: '夺息雾妖',
    maxHp: 76,
    currentHp: 76,
    block: 6,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '肾不纳气' },
    image: '/assets/cards_enemy/80.webp',
    posterImage: '/assets/cards_enemy/80-poster.png',
    behavior: 'shenbunaqi',
    meta: { turn: 0 }
  },
  'yangmingfushi': {
    id: 'yangmingfushi',
    name: '焦土巨汉',
    maxHp: 86,
    currentHp: 86,
    block: 8,
    statusEffects: [],
    intent: { type: 'special', value: 0, description: '阳明腑实' },
    image: '/assets/cards_enemy/84.webp',
    posterImage: '/assets/cards_enemy/84-poster.png',
    behavior: 'yangmingfushi',
    meta: { turn: 0 }
  },
  // Elite Act 3
  'jueyin_complex': {
    id: 'jueyin_complex',
    name: '紫渊幽影',
    maxHp: 180,
    currentHp: 180,
    block: 20,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '寒热错杂' },
    image: '/assets/cards_enemy/102.webp',
    posterImage: '/assets/cards_enemy/102-poster.png',
    behavior: 'jueyin_complex',
    meta: { turn: 0 }
  },
  // Final Boss
  'boss_five_elements': {
    id: 'boss_five_elements',
    name: '逆源修罗',
    maxHp: 470,
    currentHp: 470,
    block: 50,
    statusEffects: [],
    intent: { type: 'special', value: 0, description: '五行流转' },
    image: '/assets/cards_enemy/103.webp',
    posterImage: '/assets/cards_enemy/103-poster.png',
    behavior: 'boss_five_elements',
    meta: { phase: 'wood' }
  }
};

export const ENEMY_POOLS = {
  act1: {
    common: ['wind_cold_guest', 'wind_heat_attack', 'damp_turbidity'],
    elite: ['external_combination'],
    boss: ['boss_wind_cold', 'boss_liver_fire']
  },
  act2: {
    common: ['qi_blood_stasis', 'spleen_dampness', 'heart_kidney_gap', 'tanmengxinqiao'],
    elite: ['phlegm_stasis'],
    boss: ['boss_spleen_damp']
  },
  act3: {
    common: ['yin_yang_split', 'chong_ren_instability', 'reruyingxue', 'shenbunaqi', 'yangmingfushi'],
    elite: ['jueyin_complex'],
    boss: ['boss_five_elements']
  }
};
