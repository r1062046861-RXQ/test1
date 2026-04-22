import { Enemy } from '../baseTypes';

export const ENEMIES: Record<string, Enemy> = {
  // --- Act 1: External Pathogens ---
  'wind_cold_guest': {
    id: 'wind_cold_guest',
    name: '风寒客',
    maxHp: 30,
    currentHp: 30,
    block: 0,
    statusEffects: [],
    intent: { type: 'attack', value: 5, description: '寒邪侵袭' },
    image: '/assets/cards_enemy/89.png',
    behavior: 'wind_cold_guest'
  },
  'wind_heat_attack': {
    id: 'wind_heat_attack',
    name: '风热袭',
    maxHp: 28,
    currentHp: 28,
    block: 0,
    statusEffects: [],
    intent: { type: 'attack', value: 3, description: '热邪灼烧' }, // Multi-hit logic handled in store
    image: '/assets/cards_enemy/90.png',
    behavior: 'wind_heat_attack'
  },
  'damp_turbidity': {
    id: 'damp_turbidity',
    name: '湿浊缠',
    maxHp: 35,
    currentHp: 35,
    block: 0,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '湿邪困脾' },
    image: '/assets/cards_enemy/91.png',
    behavior: 'damp_turbidity'
  },
  // Elite Act 1
  'external_combination': {
    id: 'external_combination',
    name: '外感合病',
    maxHp: 80,
    currentHp: 80,
    block: 10,
    statusEffects: [],
    intent: { type: 'special', value: 0, description: '形态切换' },
    image: '/assets/cards_enemy/92.png',
    behavior: 'external_combination',
    meta: { form: 'cold', formTurns: 3 }
  },
  // Boss Act 1
  'boss_wind_cold': {
    id: 'boss_wind_cold',
    name: '风寒束表',
    maxHp: 150,
    currentHp: 150,
    block: 0,
    statusEffects: [],
    intent: { type: 'attack', value: 12, description: '寒凝血瘀' },
    image: '/assets/cards_enemy/93.png',
    behavior: 'boss_wind_cold'
  },
  'boss_liver_fire': {
    id: 'boss_liver_fire',
    name: '肝火炽盛',
    maxHp: 140,
    currentHp: 140,
    block: 0,
    statusEffects: [],
    intent: { type: 'attack', value: 8, description: '火旺伤阴' },
    image: '/assets/cards_enemy/94.png',
    behavior: 'boss_liver_fire'
  },

  // --- Act 2: Internal Dysfunction ---
  'qi_blood_stasis': {
    id: 'qi_blood_stasis',
    name: '气滞血瘀者',
    maxHp: 50,
    currentHp: 50,
    block: 5,
    statusEffects: [],
    intent: { type: 'attack', value: 8, description: '郁而作痛' },
    image: '/assets/cards_enemy/95.png',
    behavior: 'qi_blood_stasis'
  },
  'spleen_dampness': {
    id: 'spleen_dampness',
    name: '脾虚湿盛者',
    maxHp: 55,
    currentHp: 55,
    block: 8,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '湿困中焦' },
    image: '/assets/cards_enemy/96.png',
    behavior: 'spleen_dampness'
  },
  'heart_kidney_gap': {
    id: 'heart_kidney_gap',
    name: '心神不交者',
    maxHp: 45,
    currentHp: 45,
    block: 0,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '心悸不安' },
    image: '/assets/cards_enemy/97.png',
    behavior: 'heart_kidney_gap'
  },
  'tanmengxinqiao': {
    id: 'tanmengxinqiao',
    name: '痰蒙心窍者',
    maxHp: 52,
    currentHp: 52,
    block: 0,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '痰蒙心窍' },
    image: '/assets/cards_enemy/83.png',
    behavior: 'tanmengxinqiao',
    meta: { turn: 0 }
  },
  // Elite Act 2
  'phlegm_stasis': {
    id: 'phlegm_stasis',
    name: '痰瘀互结',
    maxHp: 120,
    currentHp: 120,
    block: 15,
    statusEffects: [],
    intent: { type: 'buff', value: 0, description: '痰凝血瘀' },
    image: '/assets/cards_enemy/98.png',
    behavior: 'phlegm_stasis'
  },
  // Boss Act 2
  'boss_spleen_damp': {
    id: 'boss_spleen_damp',
    name: '脾虚湿困',
    maxHp: 250,
    currentHp: 250,
    block: 20,
    statusEffects: [],
    intent: { type: 'special', value: 0, description: '水湿不运' },
    image: '/assets/cards_enemy/99.png',
    behavior: 'boss_spleen_damp',
    meta: { turn: 0 }
  },

  // --- Act 3: Five Elements ---
  'yin_yang_split': {
    id: 'yin_yang_split',
    name: '阴阳离决者',
    maxHp: 70,
    currentHp: 70,
    block: 0,
    statusEffects: [],
    intent: { type: 'special', value: 0, description: '阴阳格拒' },
    image: '/assets/cards_enemy/100.png',
    behavior: 'yin_yang_split',
    meta: { form: 'yin' }
  },
  'chong_ren_instability': {
    id: 'chong_ren_instability',
    name: '冲任不固者',
    maxHp: 65,
    currentHp: 65,
    block: 0,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '崩漏不止' },
    image: '/assets/cards_enemy/101.png',
    behavior: 'chong_ren_instability'
  },
  'reruyingxue': {
    id: 'reruyingxue',
    name: '热入营血者',
    maxHp: 72,
    currentHp: 72,
    block: 0,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '热入营血' },
    image: '/assets/cards_enemy/79.png',
    behavior: 'reruyingxue',
    meta: { turn: 0 }
  },
  'shenbunaqi': {
    id: 'shenbunaqi',
    name: '肾不纳气者',
    maxHp: 68,
    currentHp: 68,
    block: 6,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '肾不纳气' },
    image: '/assets/cards_enemy/80.png',
    behavior: 'shenbunaqi',
    meta: { turn: 0 }
  },
  'yangmingfushi': {
    id: 'yangmingfushi',
    name: '阳明腑实者',
    maxHp: 78,
    currentHp: 78,
    block: 8,
    statusEffects: [],
    intent: { type: 'special', value: 0, description: '阳明腑实' },
    image: '/assets/cards_enemy/84.png',
    behavior: 'yangmingfushi',
    meta: { turn: 0 }
  },
  // Elite Act 3
  'jueyin_complex': {
    id: 'jueyin_complex',
    name: '厥阴复杂证',
    maxHp: 180,
    currentHp: 180,
    block: 20,
    statusEffects: [],
    intent: { type: 'debuff', value: 0, description: '寒热错杂' },
    image: '/assets/cards_enemy/102.png',
    behavior: 'jueyin_complex',
    meta: { turn: 0 }
  },
  // Final Boss
  'boss_five_elements': {
    id: 'boss_five_elements',
    name: '五行失调',
    maxHp: 500,
    currentHp: 500,
    block: 50,
    statusEffects: [],
    intent: { type: 'special', value: 0, description: '五行流转' },
    image: '/assets/cards_enemy/103.png',
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
