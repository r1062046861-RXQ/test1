import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Play, Settings, Shield, Users, X } from 'lucide-react';
import { ENEMY_ACT_LABELS, ENEMY_CODEX_DETAILS, ENEMY_TIER_LABELS, type EnemyTier } from '../data/codex';
import { ENEMIES } from '../data/enemies';
import { useGameStore } from '../store/gameStore';
import type { Constitution } from '../types';
import { resolveAssetBackground, resolveAssetUrl } from '../utils/assets';
import { useRuntimeAssetLoadingProgress } from '../hooks/useRuntimeAssetLoadingProgress';
import {
  CONSTITUTION_CINEMATIC_MS,
  CONSTITUTION_REDUCED_MOTION_MS,
  ConstitutionIntroOverlay,
  type ConstitutionIntroStage,
  type ConstitutionOption,
} from './ConstitutionIntroOverlay';
import { ActionButton, Badge, PageShell, Panel } from './ui/PageShell';
import { playSfx } from '../services/audioService';

const CONSTITUTIONS: ConstitutionOption[] = [
  {
    id: 'balanced',
    title: '平和体质',
    subtitle: '攻防均衡，起手更稳。',
    passive: '平和开局',
    detail: '适合稳定开局。',
    accent: 'from-stone-100 to-amber-50 border-stone-700/30',
    image: '/assets/constitutions/balanced.png',
  },
  {
    id: 'yin_deficiency',
    title: '阴虚体质',
    subtitle: '偏资源爆发，换更高展开但承受更脆血线。',
    passive: '回合开始 +1 真气，受伤 +1',
    detail: '偏高风险高收益。',
    accent: 'from-sky-100 to-indigo-50 border-sky-700/30',
    image: '/assets/constitutions/yin_deficiency.png',
  },
  {
    id: 'qi_deficiency',
    title: '气虚体质',
    subtitle: '偏续航稳定，靠频繁攻击把血线慢慢拉回。',
    passive: '每次打出攻击牌，恢复 1 点生命',
    detail: '偏长线磨局。',
    accent: 'from-yellow-100 to-amber-50 border-yellow-700/30',
    image: '/assets/constitutions/qi_deficiency.png',
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

const MenuActionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  wide?: boolean;
  id?: string;
}> = ({ title, description, icon, onClick, variant = 'secondary', wide = false, id }) => {
  const handleClick = () => {
    playSfx('button_click');
    onClick();
  };
  return (
  <motion.button
    id={id}
    type="button"
    onClick={handleClick}
    whileHover={{ y: -4, scale: 1.01 }}
    whileTap={{ scale: 0.985 }}
    className={[
      'start-menu__action-card',
      `start-menu__action-card--${variant}`,
      wide ? 'md:col-span-2' : '',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className="start-menu__action-icon">{icon}</div>
    <div className="start-menu__action-copy">
      <div className="start-menu__action-title">{title}</div>
      <p className="start-menu__action-description">{description}</p>
    </div>
  </motion.button>
  );
};

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

export const StartMenu: React.FC = () => {
  const {
    map,
    startGame,
    startCombat,
    startAdminEnemyChallenge,
    setPhase,
    setFontSize,
    fontSize,
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
    resetAdminPickerState();
    setShowAdminPanel(true);
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

  return (
    <>
      <PageShell
        tone="immersive"
        headerSurface="plain"
        title="五行医道"
        kicker="五行辨证巡诊"
        subtitle="辨体质，定路径，开巡诊。"
        className="start-menu-page"
        headerClassName="start-menu__hero"
        style={{
          backgroundImage:
            `linear-gradient(180deg, rgba(8,10,18,0.28), rgba(6,8,14,0.78)), radial-gradient(circle at top, rgba(255,221,161,0.14), transparent 32%), ${resolveAssetBackground('/assets/background_main_menu.png')}`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        contentClassName="start-menu__layout start-menu__layout--focused"
      >
        <Panel className="start-menu__stage start-menu__stage--focused px-5 py-5 md:px-7 md:py-7">
          <div className="start-menu__stage-kicker">巡诊起局</div>
          <div className="start-menu__stage-title">
            {hasSavedRun ? '继续当前巡诊，或重新起一局' : '开始一局新的巡诊'}
          </div>
          <p className="start-menu__stage-copy">
            {hasSavedRun ? '继续会直接回到地图；重新巡诊会先进入体质选择。' : '先选体质，再开始本局巡诊。'}
          </p>

          <div className="start-menu__actions-grid">
            {hasSavedRun ? (
              <MenuActionCard
                title="继续巡诊"
                description="回到地图。"
                icon={<Play size={20} />}
                variant="primary"
                onClick={() => setPhase('map')}
              />
            ) : null}

            <MenuActionCard
              title={hasSavedRun ? '重新巡诊' : '开始巡诊'}
              description={hasSavedRun ? '重新选择体质。' : '进入体质选择。'}
              icon={<Play size={20} />}
              variant="primary"
              wide={!hasSavedRun}
              onClick={openNewRunFlow}
            />

            <MenuActionCard
              title="图鉴总览"
              description="查看条目。"
              icon={<BookOpen size={20} />}
              onClick={() => setPhase('card_codex')}
            />
            <MenuActionCard
              title="联系作者"
              description="扫码联系。"
              icon={<Users size={20} />}
              onClick={() => setShowContactPanel(true)}
            />
            <MenuActionCard
              title="设置"
              description="调整显示。"
              icon={<Settings size={20} />}
              variant="quiet"
              onClick={() => setShowSettings(true)}
            />
            <MenuActionCard
              title="管理员测试"
              description="调试入口。"
              icon={<Shield size={20} />}
              variant="quiet"
              id="open-admin-panel-btn"
              onClick={openAdminPanel}
            />
          </div>

          <AnimatePresence>
            {assetLoadingProgress.visible && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="start-menu__asset-loader"
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
        </Panel>
      </PageShell>

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
                <label className="block text-base font-semibold text-amber-50">字体大小：{fontSize}px</label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  step="2"
                  value={fontSize}
                  onChange={(event) => setFontSize(Number(event.target.value))}
                  className="mt-4 w-full accent-amber-700"
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
                    直接进入药铺
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
            stage={newRunStage}
            options={CONSTITUTIONS}
            onSkip={() => setNewRunStage('select')}
            onClose={() => setNewRunStage('closed')}
            onSelect={handleStartGame}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
};
