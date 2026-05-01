const AUDIO_BASE = '/assets/audio';

interface BgmEntry {
  name: string;
  path: string;
}

interface SfxEntry {
  name: string;
  path: string;
}

const BGM_FILES: Record<string, BgmEntry> = {
  bgm_main_menu: { name: '主菜单', path: `${AUDIO_BASE}/bgm/bgm_main_menu_loop.mp3` },
  bgm_constitution: { name: '体质选择', path: `${AUDIO_BASE}/bgm/bgm_constitution_select_loop.mp3` },
  bgm_map: { name: '地图探索', path: `${AUDIO_BASE}/bgm/bgm_map_exploration_loop.mp3` },
  bgm_combat_act1: { name: '第一幕战斗', path: `${AUDIO_BASE}/bgm/bgm_combat_act1_loop.mp3` },
  bgm_boss_act1: { name: '第一幕Boss', path: `${AUDIO_BASE}/bgm/bgm_boss_act1_loop.mp3` },
  bgm_combat_act2: { name: '第二幕战斗', path: `${AUDIO_BASE}/bgm/bgm_combat_act2_loop.mp3` },
  bgm_boss_act2: { name: '第二幕Boss', path: `${AUDIO_BASE}/bgm/bgm_boss_act2_loop.mp3` },
  bgm_combat_act3: { name: '第三幕战斗', path: `${AUDIO_BASE}/bgm/bgm_combat_act3_loop.mp3` },
  bgm_boss_act3: { name: '第三幕Boss', path: `${AUDIO_BASE}/bgm/bgm_boss_act3_loop.mp3` },
  bgm_safe_room: { name: '安全房间', path: `${AUDIO_BASE}/bgm/bgm_safe_room_loop.mp3` },
};

const SFX_FILES: Record<string, SfxEntry> = {
  button_click: { name: '按钮点击', path: `${AUDIO_BASE}/sfx/button_click.mp3` },
  card_hover: { name: '卡牌悬停', path: `${AUDIO_BASE}/sfx/card_hover.mp3` },
  confirm: { name: '确认选择', path: `${AUDIO_BASE}/sfx/confirm.mp3` },
  back: { name: '返回关闭', path: `${AUDIO_BASE}/sfx/back.mp3` },
  card_draw: { name: '抽牌', path: `${AUDIO_BASE}/sfx/card_draw.mp3` },
  card_discard: { name: '弃牌', path: `${AUDIO_BASE}/sfx/card_discard.mp3` },
  victory: { name: '战斗胜利', path: `${AUDIO_BASE}/sfx/victory.mp3` },
  chest_open: { name: '宝箱打开', path: `${AUDIO_BASE}/sfx/chest_open.mp3` },
  card_reward: { name: '获得卡牌', path: `${AUDIO_BASE}/sfx/card_reward.mp3` },
  gold_gain: { name: '获得金币', path: `${AUDIO_BASE}/sfx/gold_gain.mp3` },
  heal: { name: '治疗', path: `${AUDIO_BASE}/sfx/heal.mp3` },
  shop_purchase: { name: '商店购买', path: `${AUDIO_BASE}/sfx/shop_purchase.mp3` },
};

const CROSSFADE_DURATION = 500;
const MAX_SFX_POOL = 6;

let masterVolume = 1;
let muted = false;
let unlockResolve: (() => void) | null = null;
let audioUnlocked = false;

const audioUnlockPromise = new Promise<void>((resolve) => {
  unlockResolve = resolve;
});

const unlockAudio = () => {
  if (audioUnlocked) return;
  audioUnlocked = true;
  resumeAudio().then(() => {
    unlockResolve?.();
  });
};

if (typeof window !== 'undefined') {
  const events: Array<keyof HTMLElementEventMap> = ['click', 'touchstart', 'keydown', 'mousedown'];
  const handler = () => {
    unlockAudio();
    events.forEach((ev) => document.removeEventListener(ev, handler));
  };
  events.forEach((ev) => document.addEventListener(ev, handler));
}

const bgmCache = new Map<string, HTMLAudioElement>();
const sfxPool = new Map<string, HTMLAudioElement[]>();
let currentBgmKey: string | null = null;
let currentBgmEl: HTMLAudioElement | null = null;
let fadeOutTimer: ReturnType<typeof setTimeout> | null = null;
let fadeInTimer: ReturnType<typeof setTimeout> | null = null;

const getBgmElement = (key: string): HTMLAudioElement | null => {
  if (bgmCache.has(key)) return bgmCache.get(key)!;
  const entry = BGM_FILES[key];
  if (!entry) return null;
  const audio = new Audio(entry.path);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0;
  bgmCache.set(key, audio);
  return audio;
};

const getSfxElement = (key: string): HTMLAudioElement | null => {
  const entry = SFX_FILES[key];
  if (!entry) return null;
  const pool = sfxPool.get(key) || [];
  const free = pool.find((el) => el.paused || el.ended);
  if (free) {
    free.currentTime = 0;
    return free;
  }
  if (pool.length >= MAX_SFX_POOL) return pool[0];
  const audio = new Audio(entry.path);
  audio.preload = 'auto';
  audio.volume = masterVolume;
  pool.push(audio);
  sfxPool.set(key, pool);
  return audio;
};

const stopAllBgm = () => {
  if (fadeOutTimer) { clearTimeout(fadeOutTimer); fadeOutTimer = null; }
  if (fadeInTimer) { clearTimeout(fadeInTimer); fadeInTimer = null; }
  if (currentBgmEl) {
    currentBgmEl.pause();
    currentBgmEl.currentTime = 0;
    currentBgmEl = null;
  }
  currentBgmKey = null;
};

export const setVolume = (value: number) => {
  masterVolume = Math.max(0, Math.min(1, value));
  if (currentBgmEl && !muted) {
    currentBgmEl.volume = masterVolume;
  }
  sfxPool.forEach((pool) => {
    pool.forEach((el) => { if (!muted) el.volume = masterVolume; });
  });
};

export const setMuted = (value: boolean) => {
  muted = value;
  if (currentBgmEl) {
    currentBgmEl.volume = muted ? 0 : masterVolume;
  }
  sfxPool.forEach((pool) => {
    pool.forEach((el) => { el.volume = muted ? 0 : masterVolume; });
  });
};

export const getVolume = () => masterVolume;
export const isMuted = () => muted;

const resumeAudio = async (): Promise<void> => {
  const promises: Promise<void>[] = [];
  bgmCache.forEach((el) => {
    if (el.paused && el.currentTime > 0) {
      promises.push(el.play().catch(() => {}));
    }
  });
  sfxPool.forEach((pool) => {
    pool.forEach((el) => {
      if (el.paused && el.currentTime > 0) {
        promises.push(el.play().catch(() => {}));
      }
    });
  });
  await Promise.allSettled(promises);
};

export const playBgm = async (key: string): Promise<void> => {
  await audioUnlockPromise;
  if (key === currentBgmKey) return;

  const nextEl = getBgmElement(key);
  if (!nextEl) {
    stopAllBgm();
    return;
  }

  const prevEl = currentBgmEl;

  if (fadeOutTimer) { clearTimeout(fadeOutTimer); fadeOutTimer = null; }
  if (fadeInTimer) { clearTimeout(fadeInTimer); fadeInTimer = null; }

  currentBgmKey = key;
  currentBgmEl = nextEl;

  if (!prevEl) {
    nextEl.volume = muted ? 0 : masterVolume;
    nextEl.currentTime = 0;
    nextEl.play().catch(() => {});
    return;
  }

  const startVol = prevEl.volume;
  const steps = 20;
  const stepMs = CROSSFADE_DURATION / steps;
  let step = 0;

  nextEl.volume = 0;
  nextEl.currentTime = 0;
  nextEl.play().catch(() => {});

  fadeOutTimer = setInterval(() => {
    step += 1;
    if (step >= steps) {
      clearInterval(fadeOutTimer!);
      fadeOutTimer = null;
      prevEl.pause();
      prevEl.currentTime = 0;
      prevEl.volume = 0;
      nextEl.volume = muted ? 0 : masterVolume;
      return;
    }
    const factor = 1 - step / steps;
    prevEl.volume = factor * startVol;
    nextEl.volume = muted ? 0 : (1 - factor) * masterVolume;
  }, stepMs);
};

export const stopBgm = () => {
  stopAllBgm();
};

export const playSfx = (key: string): void => {
  void audioUnlockPromise.then(() => {
    if (muted) return;
    const el = getSfxElement(key);
    if (!el) return;
    el.volume = masterVolume;
    el.currentTime = 0;
    el.play().catch(() => {});
  });
};

export const getBgmKeyForPhase = (
  phase: string,
  act?: number,
  nodeType?: string
): string | null => {
  switch (phase) {
    case 'intro':
    case 'start_menu':
    case 'card_codex':
      return 'bgm_main_menu';
    case 'map':
      return 'bgm_map';
    case 'combat': {
      if (!act) return 'bgm_combat_act1';
      if (nodeType === 'boss') {
        return act >= 3 ? 'bgm_boss_act3' : act >= 2 ? 'bgm_boss_act2' : 'bgm_boss_act1';
      }
      return act >= 3 ? 'bgm_combat_act3' : act >= 2 ? 'bgm_combat_act2' : 'bgm_combat_act1';
    }
    case 'shop':
    case 'rest':
    case 'chest':
      return 'bgm_safe_room';
    case 'reward':
    case 'event':
      return 'bgm_map';
    case 'victory':
      return 'bgm_main_menu';
    case 'game_over':
      return 'bgm_main_menu';
    default:
      return null;
  }
};

export const preloadAllAudio = (): void => {
  Object.keys(BGM_FILES).forEach((key) => getBgmElement(key));
  Object.keys(SFX_FILES).forEach((key) => getSfxElement(key));
};
