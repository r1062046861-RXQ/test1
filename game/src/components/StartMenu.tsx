import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { ENEMY_ACT_LABELS, ENEMY_CODEX_DETAILS, ENEMY_TIER_LABELS, type EnemyTier } from '../data/codex';
import { ENEMIES } from '../data/enemies';
import { useGameStore } from '../store/gameStore';
import type { Constitution } from '../types';
import { resolveAssetUrl } from '../utils/assets';
import { useRuntimeAssetLoadingProgress } from '../hooks/useRuntimeAssetLoadingProgress';
import {
  CONSTITUTION_CINEMATIC_MS,
  CONSTITUTION_REDUCED_MOTION_MS,
  ConstitutionIntroOverlay,
  type ConstitutionIntroStage,
  type ConstitutionOption,
} from './ConstitutionIntroOverlay';
import { ActionButton, Badge } from './ui/PageShell';
import { playSfx } from '../services/audioService';

const CONSTITUTIONS: ConstitutionOption[] = [
    {
      id: 'balanced',
      title: '平和质',
      subtitle: '均衡新手型',
      passive: '攻防疗愈 +1',
      detail: '卡组攻防均衡，无明显短板，适配所有打法。阴阳气血调和，脏腑机能平稳。',
      accent: 'from-stone-100 to-amber-50 border-stone-700/30',
      image: '/assets/constitutions/balanced.webp',
    },
    {
      id: 'yin_deficiency',
      title: '阴虚质',
      subtitle: '技巧叠层型',
      passive: '滋阴强化',
      detail: '叠加滋阴层数获取高额增益，擅长技巧输出，防御薄弱、身板偏脆。',
      accent: 'from-sky-100 to-indigo-50 border-sky-700/30',
      image: '/assets/constitutions/yin_deficiency.webp',
    },
    {
      id: 'qi_deficiency',
      title: '气虚质',
      subtitle: '续航防御型',
      passive: '固表续航',
      detail: '稳定获取护盾与气血恢复，抗压续航拉满，输出疲软、进攻节奏缓慢。',
      accent: 'from-yellow-100 to-amber-50 border-yellow-700/30',
      image: '/assets/constitutions/qi_deficiency.webp',
    },
    {
      id: 'yang_deficiency',
      title: '阳虚质',
      subtitle: '蓄力爆发型',
      passive: '温阳爆发',
      detail: '叠温阳层数蓄力，后期高额群伤爆发，前期启动慢，易被快攻压制。',
      accent: 'from-amber-100 to-yellow-50 border-amber-700/30',
      image: '/assets/constitutions/yang_deficiency.webp',
    },
    {
      id: 'phlegm_dampness',
      title: '痰湿质',
      subtitle: '禁锢消耗型',
      passive: '痰湿禁锢',
      detail: '给敌方叠加痰湿禁锢，减速降攻、封锁行动，主打慢速拉扯。',
      accent: 'from-green-100 to-lime-50 border-green-700/30',
      image: '/assets/constitutions/phlegm_dampness.webp',
    },
    {
      id: 'damp_heat',
      title: '湿热质',
      subtitle: '持续DOT型',
      passive: '湿热灼烧',
      detail: '施加群体湿热灼烧，持续流血清场强，无护盾自保，身板脆弱惧怕秒杀。',
      accent: 'from-orange-100 to-red-50 border-orange-700/30',
      image: '/assets/constitutions/damp_heat.webp',
    },
    {
      id: 'blood_stasis',
      title: '血瘀质',
      subtitle: '破甲刺杀型',
      passive: '破瘀穿透',
      detail: '自带破瘀穿透、高暴击单点秒杀，无回血无护盾，续航极差不适合拉锯。',
      accent: 'from-red-100 to-rose-50 border-red-700/30',
      image: '/assets/constitutions/blood_stasis.webp',
    },
    {
      id: 'qi_stagnation',
      title: '气郁质',
      subtitle: '节奏拉扯型',
      passive: '气机流转',
      detail: '高抽牌、高闪避、灵活换牌，擅长打乱敌方节奏，基础攻防低。',
      accent: 'from-indigo-100 to-violet-50 border-indigo-700/30',
      image: '/assets/constitutions/qi_stagnation.webp',
    },
    {
      id: 'special_diathesis',
      title: '特禀质',
      subtitle: '随机天赋型',
      passive: '先天禀赋',
      detail: '先天禀赋被动随机触发，特效多变上限极高，发挥不稳定。',
      accent: 'from-slate-100 to-gray-50 border-slate-700/30',
      image: '/assets/constitutions/special_diathesis.webp',
    },
    {
      id: 'admin',
      title: '管理员体质',
      subtitle: '全卡测试型',
      passive: '全解锁',
      detail: '开局获得所有药材、药方蓝图、装备。仅用于合成台测试。',
      accent: 'from-purple-100 to-pink-50 border-purple-700/30',
      image: '/assets/constitutions/balanced.webp',
    },
  ];

const AUTHOR_CONTACTS = [
  {
    id: 'wang-yi',
    role: '视觉、创意作者',
    name: '王熠',
    note: '负责整体视觉气质、创意方向与美术表达。',
    qr: '/assets/author_qr/wang-yi.jpg',
    qrAlt: '王熠二维码',
  },
  {
    id: 'ren-xuanqi',
    role: '技术支持作者',
    name: '任玄奇',
    note: '负责网页端实现、交互整合与部署支持。',
    qr: '/assets/author_qr/ren-xuanqi.jpg',
    qrAlt: '任玄奇二维码',
  },
] as const;

const ADMIN_ENEMY_ACT_ORDER: Array<1 | 2 | 3> = [1, 2, 3];
const ADMIN_ENEMY_TIER_ORDER: EnemyTier[] = ['common', 'elite', 'boss'];
const ADMIN_ENEMY_BADGE_VARIANT: Record<EnemyTier, 'slate' | 'amber' | 'crimson'> = {
  common: 'slate',
  elite: 'amber',
  boss: 'crimson',
};

type NewRunStage = 'closed' | ConstitutionIntroStage;
type EnemyEntry = {
  enemy: (typeof ENEMIES)[string];
  act: 1 | 2 | 3;
  tier: EnemyTier;
  summary: string;
};

const REF_W = 1920;
const REF_H = 1080;

type StartMenuButtonId = 'continue' | 'new_run' | 'codex' | 'contact' | 'settings' | 'admin';

type MenuButtonVisual = {
  title: string;
  subtitle: string;
  defaultPlate: string;
  defaultText: string;
  defaultIcon: string;
  hoverRegion: string;
  hoverPlate: string;
  x: number;
  y: number;
  width: number;
  height: number;
  defaultTextX: number;
  defaultTextY: number;
  defaultTextWidth: number;
  defaultTextHeight: number;
  hoverX: number;
  hoverY: number;
  hoverWidth: number;
  hoverHeight: number;
};

type MenuButtonDef = MenuButtonVisual & {
  id: StartMenuButtonId;
  requiresSavedRun?: boolean;
};

const BUTTON_CONFIG: MenuButtonDef[] = [
  {
    id: 'continue',
    requiresSavedRun: true,
    title: '继续巡诊',
    subtitle: '回到地图。',
    defaultPlate: '/assets/main_menu/v2/default/continue_plate.png',
    defaultText: '/assets/main_menu/v2/default/continue_text.png',
    defaultIcon: '/assets/main_menu/v2/default/continue_icon.png',
    hoverRegion: '/assets/main_menu/v2/hover/continue.png',
    hoverPlate: '/assets/main_menu/v2/hover/continue_plate.png',
    x: 168,
    y: 208,
    width: 424,
    height: 197,
    defaultTextX: 360,
    defaultTextY: 329,
    defaultTextWidth: 193,
    defaultTextHeight: 55,
    hoverX: 0,
    hoverY: 0,
    hoverWidth: 796,
    hoverHeight: 628,
  },
  {
    id: 'new_run',
    title: '重新巡诊',
    subtitle: '重新选择体质。',
    defaultPlate: '/assets/main_menu/v2/default/new_run_plate.png',
    defaultText: '/assets/main_menu/v2/default/new_run_text.png',
    defaultIcon: '/assets/main_menu/v2/default/new_run_icon.png',
    hoverRegion: '/assets/main_menu/v2/hover/new_run.png',
    hoverPlate: '/assets/main_menu/v2/hover/new_run_plate.png',
    x: 158,
    y: 453,
    width: 442,
    height: 215,
    defaultTextX: 360,
    defaultTextY: 588,
    defaultTextWidth: 193,
    defaultTextHeight: 55,
    hoverX: 0,
    hoverY: 237,
    hoverWidth: 796,
    hoverHeight: 642,
  },
  {
    id: 'codex',
    title: '图鉴总览',
    subtitle: '查看已收集的药材等。',
    defaultPlate: '/assets/main_menu/v2/default/codex_plate.png',
    defaultText: '/assets/main_menu/v2/default/codex_text.png',
    defaultIcon: '/assets/main_menu/v2/default/codex_icon.png',
    hoverRegion: '/assets/main_menu/v2/hover/codex.png',
    hoverPlate: '/assets/main_menu/v2/hover/codex_plate.png',
    x: 158,
    y: 703,
    width: 442,
    height: 215,
    defaultTextX: 360,
    defaultTextY: 838,
    defaultTextWidth: 208,
    defaultTextHeight: 55,
    hoverX: 0,
    hoverY: 488,
    hoverWidth: 796,
    hoverHeight: 592,
  },
  {
    id: 'settings',
    title: '功能设置',
    subtitle: '调整显示。',
    defaultPlate: '/assets/main_menu/v2/default/settings_plate.png',
    defaultText: '/assets/main_menu/v2/default/settings_text.png',
    defaultIcon: '/assets/main_menu/v2/default/settings_icon.png',
    hoverRegion: '/assets/main_menu/v2/hover/settings.png',
    hoverPlate: '/assets/main_menu/v2/hover/settings_plate.png',
    x: 1350,
    y: 206,
    width: 442,
    height: 215,
    defaultTextX: 1550,
    defaultTextY: 329,
    defaultTextWidth: 193,
    defaultTextHeight: 55,
    hoverX: 1149,
    hoverY: 0,
    hoverWidth: 771,
    hoverHeight: 629,
  },
  {
    id: 'contact',
    title: '联系作者',
    subtitle: '扫码联系。',
    defaultPlate: '/assets/main_menu/v2/default/contact_plate.png',
    defaultText: '/assets/main_menu/v2/default/contact_text.png',
    defaultIcon: '/assets/main_menu/v2/default/contact_icon.png',
    hoverRegion: '/assets/main_menu/v2/hover/contact.png',
    hoverPlate: '/assets/main_menu/v2/hover/contact_plate.png',
    x: 1353,
    y: 453,
    width: 442,
    height: 215,
    defaultTextX: 1550,
    defaultTextY: 588,
    defaultTextWidth: 190,
    defaultTextHeight: 56,
    hoverX: 1149,
    hoverY: 238,
    hoverWidth: 771,
    hoverHeight: 642,
  },
  {
    id: 'admin',
    title: '管理员测试',
    subtitle: '调试入口。',
    defaultPlate: '/assets/main_menu/v2/default/admin_plate.png',
    defaultText: '/assets/main_menu/v2/default/admin_text.png',
    defaultIcon: '/assets/main_menu/v2/default/admin_icon.png',
    hoverRegion: '/assets/main_menu/v2/hover/admin.png',
    hoverPlate: '/assets/main_menu/v2/hover/admin_plate.png',
    x: 1353,
    y: 703,
    width: 442,
    height: 215,
    defaultTextX: 1550,
    defaultTextY: 838,
    defaultTextWidth: 223,
    defaultTextHeight: 55,
    hoverX: 1149,
    hoverY: 488,
    hoverWidth: 771,
    hoverHeight: 592,
  },
];

const DEFAULT_BORDER = '/assets/main_menu/v2/default/border.png';
const HOVER_DETAIL_ASSETS = [
  '/assets/main_menu/v2/hover/continue_plate.png',
  '/assets/main_menu/v2/hover/new_run_plate.png',
  '/assets/main_menu/v2/hover/codex_plate.png',
  '/assets/main_menu/v2/hover/settings_plate.png',
  '/assets/main_menu/v2/hover/contact_plate.png',
  '/assets/main_menu/v2/hover/admin_plate.png',
  '/assets/main_menu/v2/hover/text_backplate.png',
  '/assets/main_menu/v2/hover/gold_border.png',
] as const;

const QA_REFERENCE_ASSETS = [
  '/assets/main_menu/v2/qa/default_no_text.png',
  '/assets/main_menu/v2/qa/default_with_text.png',
  '/assets/main_menu/v2/qa/hover_no_text.png',
  '/assets/main_menu/v2/qa/hover_with_text.png',
] as const;

const toCanvasStyle = (x: number, y: number, width: number, height: number): React.CSSProperties => ({
  left: `${(x / REF_W) * 100}%`,
  top: `${(y / REF_H) * 100}%`,
  width: `${(width / REF_W) * 100}%`,
  height: `${(height / REF_H) * 100}%`,
});

const formatMegabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const LOADING_STAGE_LABELS = {
  critical: '首批资源',
  static: '静态图片',
  gif: '动态图',
  done: '已完成',
} as const;

const formatLoadingSpeed = (bytesPerSecond: number) => {
  if (bytesPerSecond <= 0) {
    return '0 KB/s';
  }

  if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(bytesPerSecond < 100 * 1024 ? 0 : 1)} KB/s`;
  }

  return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
};

const MenuCard: React.FC<{
  button: MenuButtonDef;
  enabled: boolean;
  onClick: () => void;
  onHover: (id: StartMenuButtonId | null) => void;
}> = ({ button, enabled, onClick, onHover }) => {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={enabled ? onClick : undefined}
      onMouseEnter={() => onHover(button.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(button.id)}
      onBlur={() => onHover(null)}
      className={[
        'start-menu-card',
        enabled ? '' : 'start-menu-card--disabled',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...toCanvasStyle(button.x, button.y, button.width, button.height),
      }}
      aria-label={button.title}
    />
  );
};

export const StartMenu: React.FC = () => {
  const {
    map,
    startGame,
    startCombat,
    startAdminEnemyChallenge,
    setPhase,
    setBgmVolume,
    setSfxVolume,
    setFontSize,
    fontSize,
    bgmVolume,
    sfxVolume,
  } = useGameStore();
  const shouldReduceMotion = useReducedMotion();
  const [showSettings, setShowSettings] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [showEnemyChallengePicker, setShowEnemyChallengePicker] = useState(false);
  const [newRunStage, setNewRunStage] = useState<NewRunStage>('closed');
  const assetLoadingProgress = useRuntimeAssetLoadingProgress();
  const adminEnabled = (() => {
    if (typeof window === 'undefined') return false;
    try {
      return new URLSearchParams(window.location.search).has('admin');
    } catch {
      return false;
    }
  })();
  const [showAdminPanel, setShowAdminPanel] = useState(adminEnabled);
  const [adminUnlocked, setAdminUnlocked] = useState(adminEnabled);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(() => {
    try { return localStorage.getItem('wuxing_admin_pw') === '260208'; } catch { return false; }
  });

  const openPasswordPrompt = (mode: 'panel' | 'game') => {
    setShowPasswordPrompt(mode);
    const saved = rememberPassword ? '260208' : '';
    setPasswordInput(saved);
    setPasswordError(false);
  };

  const checkPassword = (pw: string) => {
    if (pw === '260208') {
      setAdminUnlocked(true);
      const mode = showPasswordPrompt;
      setShowPasswordPrompt(null);
      setPasswordInput('');
      setPasswordError(false);
      if (rememberPassword) {
        try { localStorage.setItem('wuxing_admin_pw', '260208'); } catch { /* */ }
      }
      if (mode === 'panel') {
        resetAdminPickerState();
        setShowAdminPanel(true);
      } else if (mode === 'game') {
        playSfx('confirm');
        startGame('admin');
        setNewRunStage('closed');
      }
      return true;
    }
    setPasswordError(true);
    return false;
  };

  const adminEnemyGroups = useMemo(() => {
    const enemyEntries: EnemyEntry[] = Object.values(ENEMIES).map((enemy) => {
      const meta = ENEMY_CODEX_DETAILS[enemy.id];
      return {
        enemy,
        act: meta?.act ?? 1,
        tier: meta?.tier ?? 'common',
        summary: meta?.summary ?? enemy.intent.description,
      };
    }).filter((entry) => ENEMY_CODEX_DETAILS[entry.enemy.id]?.adminSelectable !== false);

    return ADMIN_ENEMY_ACT_ORDER.map((act) => ({
      act,
      tiers: ADMIN_ENEMY_TIER_ORDER.map((tier) => ({
        tier,
        entries: enemyEntries.filter((entry) => entry.act === act && entry.tier === tier),
      })).filter((group) => group.entries.length > 0),
    })).filter((group) => group.tiers.length > 0);
  }, []);

  useEffect(() => {
    if (newRunStage !== 'cinematic') {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setNewRunStage('select'),
      shouldReduceMotion ? CONSTITUTION_REDUCED_MOTION_MS : CONSTITUTION_CINEMATIC_MS,
    );

    return () => window.clearTimeout(timer);
  }, [newRunStage, shouldReduceMotion]);

  const openNewRunFlow = () => {
    setNewRunStage('cinematic');
  };

  const handleStartGame = (constitution: Constitution) => {
    if (constitution === 'admin' && !adminUnlocked) {
      openPasswordPrompt('game');
      return;
    }
    playSfx('confirm');
    startGame(constitution);
    setNewRunStage('closed');
  };

  const resetAdminPickerState = () => {
    setShowEnemyChallengePicker(false);
  };

  const closeAdminPanel = () => {
    setShowAdminPanel(false);
    resetAdminPickerState();
  };

  const openAdminPanel = () => {
    if (adminUnlocked) {
      resetAdminPickerState();
      setShowAdminPanel(true);
      return;
    }
    openPasswordPrompt('panel');
  };

  const handleRandomAdminCombat = () => {
    closeAdminPanel();
    startGame('balanced');
    window.setTimeout(() => startCombat('admin_test'), 0);
  };

  const hasSavedRun = Boolean(map && map.length > 0);
  const loadingProgressPercent = assetLoadingProgress.totalBytes
    ? Math.min(100, (assetLoadingProgress.loadedBytes / assetLoadingProgress.totalBytes) * 100)
    : 100;
  const currentStageLabel = LOADING_STAGE_LABELS[assetLoadingProgress.currentStage];

  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  const handleMenuAction = (id: StartMenuButtonId) => {
    playSfx('button_click');
    switch (id) {
      case 'continue':
        setPhase('map');
        break;
      case 'new_run':
        openNewRunFlow();
        break;
      case 'codex':
        setPhase('card_codex');
        break;
      case 'contact':
        setShowContactPanel(true);
        break;
      case 'settings':
        setShowSettings(true);
        break;
      case 'admin':
        openAdminPanel();
        break;
    }
  };

  return (
    <>
      <div className="start-menu-page">
        <canvas
          id="playwright-canvas"
          className="fixed inset-0 w-full h-full opacity-0 pointer-events-none"
        />

        <div className="start-menu-page__inner">
          <div className="start-menu-page__canvas">
            <div
              className="start-menu-page__background"
              style={{
                backgroundImage: `url("${resolveAssetUrl('/assets/main_menu/v2/background.png')}")`,
              }}
            />
            <img
              className="start-menu-title-text"
              src={resolveAssetUrl('/assets/main_menu/v2/title_text.png')}
              alt="五行辨证巡诊"
            />

            {BUTTON_CONFIG.map((button) => {
              const enabled = !button.requiresSavedRun || hasSavedRun;
              const isHovered = hoveredBtn === button.id && enabled;
              return (
                <React.Fragment key={button.id}>
                  <img
                    src={resolveAssetUrl(button.defaultPlate)}
                    alt=""
                    aria-hidden="true"
                    className={[
                      'start-menu-button-plate',
                      enabled ? '' : 'start-menu-button-overlay--disabled',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={toCanvasStyle(button.x, button.y, button.width, button.height)}
                  />
                  {button.width !== 424 || button.height !== 197 ? (
                    <img
                      src={resolveAssetUrl(DEFAULT_BORDER)}
                      alt=""
                      aria-hidden="true"
                      className={[
                        'start-menu-button-border',
                        enabled ? '' : 'start-menu-button-overlay--disabled',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={toCanvasStyle(button.x + 9, button.y + 9, 424, 197)}
                    />
                  ) : null}
                  <img
                    src={resolveAssetUrl(button.defaultText)}
                    alt=""
                    aria-hidden="true"
                    className={[
                      'start-menu-button-text',
                      enabled ? '' : 'start-menu-button-overlay--disabled',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={toCanvasStyle(
                      button.defaultTextX,
                      button.defaultTextY,
                      button.defaultTextWidth,
                      button.defaultTextHeight,
                    )}
                  />
                  <img
                    src={resolveAssetUrl(button.hoverRegion)}
                    alt=""
                    aria-hidden="true"
                    className={[
                      'start-menu-button-hover',
                      isHovered ? 'start-menu-button-hover--visible' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={toCanvasStyle(button.hoverX, button.hoverY, button.hoverWidth, button.hoverHeight)}
                  />
                  <MenuCard
                    button={button}
                    enabled={enabled}
                    onClick={() => handleMenuAction(button.id)}
                    onHover={setHoveredBtn}
                  />
                </React.Fragment>
              );
            })}

            <div className="start-menu-preload-assets" aria-hidden="true">
              {BUTTON_CONFIG.map((button) => (
                <React.Fragment key={`${button.id}-preload`}>
                  <img src={resolveAssetUrl(button.defaultIcon)} alt="" />
                  <img src={resolveAssetUrl(button.hoverPlate)} alt="" />
                </React.Fragment>
              ))}
              {HOVER_DETAIL_ASSETS.map((asset) => (
                <img key={asset} src={resolveAssetUrl(asset)} alt="" />
              ))}
              {QA_REFERENCE_ASSETS.map((asset) => (
                <img key={asset} src={resolveAssetUrl(asset)} alt="" />
              ))}
            </div>

            <AnimatePresence>
              {assetLoadingProgress.visible && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="start-menu__asset-loader"
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'min(90%, 600px)',
                  }}
                >
                  <div className="start-menu__asset-loader-head">
                    <div>
                      <div className="start-menu__asset-loader-kicker">资源加载</div>
                      <div className="start-menu__asset-loader-copy">
                        {formatMegabytes(assetLoadingProgress.loadedBytes)} / {formatMegabytes(assetLoadingProgress.totalBytes)}
                      </div>
                      <div className="start-menu__asset-loader-status">
                        <span>当前阶段：{currentStageLabel}</span>
                        <span>当前速度：{formatLoadingSpeed(assetLoadingProgress.speedBytesPerSecond)}</span>
                      </div>
                    </div>
                    <div className="start-menu__asset-loader-meta">
                      <span>{assetLoadingProgress.loadedCount}/{assetLoadingProgress.totalCount}</span>
                      <span>{loadingProgressPercent.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="start-menu__asset-loader-track" aria-hidden="true">
                    <motion.div
                      className="start-menu__asset-loader-fill"
                      animate={{ width: `${loadingProgressPercent}%` }}
                      transition={{ duration: 0.24, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="start-menu__asset-loader-note">
                    {assetLoadingProgress.finished
                      ? '素材已加载完成。'
                      : '资源会在后台继续加载，不用等全部完成也能开始游玩。'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showContactPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="immersive-modal-backdrop fixed inset-0 z-40 flex items-center justify-center px-4"
            onClick={() => setShowContactPanel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="immersive-modal w-full max-w-3xl px-6 py-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="immersive-modal__header mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="immersive-modal__kicker text-[12px] font-semibold tracking-[0.18em]">作者联系</div>
                  <h2 className="immersive-modal__title mt-2 text-3xl font-bold">联系作者</h2>
                  <p className="immersive-modal__copy mt-2 text-sm leading-7">扫码可联系作者。</p>
                </div>
                <button
                  onClick={() => setShowContactPanel(false)}
                  className="immersive-modal__close rounded-full p-2 transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {AUTHOR_CONTACTS.map((author) => (
                  <div key={author.id} className="immersive-modal__panel flex h-full flex-col gap-4 px-4 py-4">
                    <div className="immersive-modal__qr-frame overflow-hidden rounded-[24px] p-4">
                      <img
                        src={resolveAssetUrl(author.qr)}
                        alt={author.qrAlt}
                        className="immersive-modal__qr-image mx-auto aspect-square w-full max-w-[13rem] rounded-[20px] object-contain"
                      />
                    </div>
                    <div>
                      <div className="immersive-modal__kicker text-[12px] font-semibold uppercase tracking-[0.24em]">
                        {author.role}
                      </div>
                      <div className="immersive-modal__title mt-2 text-2xl font-bold">{author.name}</div>
                      <p className="immersive-modal__copy mt-2 text-sm leading-7">{author.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="immersive-modal-backdrop fixed inset-0 z-40 flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="immersive-modal w-full max-w-md px-6 py-6"
            >
              <div className="immersive-modal__header mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="immersive-modal__kicker text-[12px] font-semibold tracking-[0.18em]">界面设置</div>
                  <h2 className="immersive-modal__title mt-2 text-3xl font-bold">设置</h2>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="immersive-modal__close rounded-full p-2 transition"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="immersive-modal__panel px-4 py-4">
                <label className="block text-base font-semibold text-amber-50">音乐音量：{Math.round(bgmVolume * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(bgmVolume * 100)}
                  onChange={(event) => setBgmVolume(Number(event.target.value) / 100)}
                  className="mt-3 w-full accent-amber-700"
                />
                <div className="mt-4 mb-1 border-t border-stone-700/50" />
                <label className="block text-base font-semibold text-amber-50">音效音量：{Math.round(sfxVolume * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(sfxVolume * 100)}
                  onChange={(event) => setSfxVolume(Number(event.target.value) / 100)}
                  className="mt-3 w-full accent-amber-700"
                />
                <div className="mt-4 mb-1 border-t border-stone-700/50" />
                <label className="block text-base font-semibold text-amber-50">字体大小：{fontSize}px</label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  step="2"
                  value={fontSize}
                  onChange={(event) => setFontSize(Number(event.target.value))}
                  className="mt-3 w-full accent-amber-700"
                />
                <div className="mt-3 text-sm text-stone-300">仅影响网页端界面的基础字号。</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="immersive-modal-backdrop fixed inset-0 z-40 flex items-center justify-center px-4"
            onClick={closeAdminPanel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="immersive-modal flex max-h-[88vh] w-full max-w-5xl flex-col px-6 py-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="immersive-modal__header mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="immersive-modal__kicker text-[12px] font-semibold tracking-[0.18em]">管理员入口</div>
                  <h2 className="immersive-modal__title mt-2 text-3xl font-bold">管理员测试</h2>
                  <p className="immersive-modal__copy mt-2 text-sm leading-7">
                    保留现有快捷入口，并可直接指定一名敌人进入调试战斗。
                  </p>
                </div>
                <button onClick={closeAdminPanel} className="immersive-modal__close rounded-full p-2 transition">
                  <X size={24} />
                </button>
              </div>

              <div className="ornate-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
                <div className="immersive-modal__panel px-4 py-4">
                  <div className="mb-3 text-sm font-bold tracking-[0.14em] text-amber-200/80">选择章节</div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <ActionButton
                      variant="primary"
                      className="justify-center px-5 py-4"
                      onClick={() => { startGame('admin', 1); closeAdminPanel(); }}
                    >
                      第一幕 · 风寒初起
                    </ActionButton>
                    <ActionButton
                      variant="primary"
                      className="justify-center px-5 py-4"
                      onClick={() => { startGame('admin', 2); closeAdminPanel(); }}
                    >
                      第二幕 · 邪热入里
                    </ActionButton>
                    <ActionButton
                      variant="primary"
                      className="justify-center px-5 py-4"
                      onClick={() => { startGame('admin', 3); closeAdminPanel(); }}
                    >
                      第三幕 · 五行失衡
                    </ActionButton>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <ActionButton
                    id="admin-combat-btn"
                    variant="primary"
                    className="justify-start px-5 py-4"
                    onClick={handleRandomAdminCombat}
                  >
                    随机战斗
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    className="justify-start px-5 py-4"
                    onClick={() => {
                      startGame('balanced');
                      useGameStore.setState({ phase: 'shop' });
                      closeAdminPanel();
                    }}
                  >
                    直接进入药房
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    className="justify-start px-5 py-4"
                    onClick={() => {
                      startGame('balanced');
                      useGameStore.setState({ phase: 'rest' });
                      closeAdminPanel();
                    }}
                  >
                    直接进入休憩
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    className="justify-start px-5 py-4"
                    onClick={() => {
                      startGame('balanced');
                      useGameStore.setState({ phase: 'event' });
                      closeAdminPanel();
                    }}
                  >
                    直接进入事件
                  </ActionButton>
                </div>

                <div className="immersive-modal__panel px-4 py-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="immersive-modal__title text-2xl font-bold">自选敌人挑战</div>
                      <p className="immersive-modal__copy mt-2 text-sm leading-7">
                        按幕次和定位浏览现有敌人，点击卡片就会直接开战。
                      </p>
                    </div>
                    <ActionButton
                      id="admin-picker-toggle-btn"
                      variant={showEnemyChallengePicker ? 'primary' : 'secondary'}
                      className="justify-center px-5 py-3"
                      onClick={() => setShowEnemyChallengePicker((current) => !current)}
                    >
                      {showEnemyChallengePicker ? '收起敌人列表' : '展开自选敌人'}
                    </ActionButton>
                  </div>

                  <AnimatePresence initial={false}>
                    {showEnemyChallengePicker ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: 10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: 6 }}
                        className="admin-enemy-picker mt-5"
                      >
                        {adminEnemyGroups.map((actGroup) => (
                          <section key={actGroup.act} className="admin-enemy-picker__act-section">
                            <div className="admin-enemy-picker__act-head">
                              <div className="admin-enemy-picker__act-title">{ENEMY_ACT_LABELS[actGroup.act]}</div>
                              <Badge variant="emerald">
                                {actGroup.tiers.reduce((total, group) => total + group.entries.length, 0)} 名敌人
                              </Badge>
                            </div>

                            {actGroup.tiers.map((tierGroup) => (
                              <div key={`${actGroup.act}-${tierGroup.tier}`} className="admin-enemy-picker__tier-section">
                                <div className="admin-enemy-picker__tier-head">
                                  <div className="admin-enemy-picker__tier-title">
                                    {ENEMY_TIER_LABELS[tierGroup.tier]}
                                  </div>
                                  <Badge variant={ADMIN_ENEMY_BADGE_VARIANT[tierGroup.tier]}>
                                    {tierGroup.entries.length}
                                  </Badge>
                                </div>

                                <div className="admin-enemy-picker__grid">
                                  {tierGroup.entries.map(({ enemy, act, tier, summary }) => (
                                    <button
                                      key={enemy.id}
                                      data-enemy-id={enemy.id}
                                      type="button"
                                      onClick={() => {
                                        closeAdminPanel();
                                        startAdminEnemyChallenge(enemy.id);
                                      }}
                                      className="admin-enemy-picker__card"
                                    >
                                      <div className="admin-enemy-picker__art-frame">
                                        <img
                                          src={resolveAssetUrl(enemy.image)}
                                          alt={enemy.name}
                                          className="admin-enemy-picker__art"
                                          loading="lazy"
                                        />
                                      </div>

                                      <div className="admin-enemy-picker__body">
                                        <div className="admin-enemy-picker__title-row">
                                          <div className="admin-enemy-picker__title">{enemy.name}</div>
                                          <div className="admin-enemy-picker__hp">生命 {enemy.maxHp}</div>
                                        </div>

                                        <div className="admin-enemy-picker__badges">
                                          <Badge variant="emerald">{ENEMY_ACT_LABELS[act]}</Badge>
                                          <Badge variant={ADMIN_ENEMY_BADGE_VARIANT[tier]}>
                                            {ENEMY_TIER_LABELS[tier]}
                                          </Badge>
                                          {enemy.block > 0 ? <Badge variant="blue">格挡 {enemy.block}</Badge> : null}
                                        </div>

                                        <p className="admin-enemy-picker__summary">{summary}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </section>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {newRunStage !== 'closed' ? (
          <ConstitutionIntroOverlay
            key="constitution-intro-overlay"
            stage={newRunStage}
            options={CONSTITUTIONS}
            onSkip={() => setNewRunStage('select')}
            onClose={() => setNewRunStage('closed')}
            onSelect={handleStartGame}
          />
        ) : null}

        <AnimatePresence>
          {showPasswordPrompt ? (
            <motion.div
              key="admin-password-prompt"
              className="synthesis-bench-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowPasswordPrompt(null); setPasswordInput(''); setPasswordError(false); }}
            >
              <motion.div
                className="synthesis-bench"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.99 }}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '360px' }}
              >
                <div className="synthesis-bench__header">
                  <h2 className="synthesis-bench__title">管理员验证</h2>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-stone-300">请输入管理员密码：</p>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') checkPassword(passwordInput); }}
                    autoFocus
                    className="w-full rounded-xl border border-amber-500/30 bg-stone-900/60 px-4 py-2.5 text-amber-100 placeholder-stone-500 outline-none focus:border-amber-400/60"
                    placeholder="输入密码"
                  />
                  {passwordError && (
                    <p className="text-xs text-red-400">密码错误，请重试。</p>
                  )}
                  <label className="flex items-center gap-2 text-xs text-stone-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberPassword}
                      onChange={(e) => setRememberPassword(e.target.checked)}
                      className="rounded border-amber-500/30 bg-stone-900/60 accent-amber-400"
                    />
                    记住密码
                  </label>
                  <button
                    type="button"
                    onClick={() => checkPassword(passwordInput)}
                    className="w-full rounded-full border border-amber-400/40 bg-amber-400/15 px-6 py-2.5 text-sm font-bold text-amber-50 hover:bg-amber-400/25 active:scale-[0.97] transition-all duration-200"
                  >
                    确认
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </AnimatePresence>
    </>
  );
};
