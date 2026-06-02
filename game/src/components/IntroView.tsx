import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { resolveAssetUrl } from '../utils/assets';
import packageInfo from '../../package.json';

const REF_W = 1920;
const REF_H = 1080;
const APP_VERSION = packageInfo.version;
const NOTICE_SEEN_STORAGE_KEY = `wuxing-yidao-notice-seen:${APP_VERSION}`;

type IntroPanel = 'notice' | 'activity' | 'settings' | null;
type SideActionId = 'notice' | 'activity' | 'codex' | 'settings';

const refRect = (left: number, top: number, width: number, height: number) => ({
  left: `${(left / REF_W) * 100}%`,
  top: `${(top / REF_H) * 100}%`,
  width: `${(width / REF_W) * 100}%`,
  height: `${(height / REF_H) * 100}%`,
});

const SIDE_ACTIONS: Array<{
  id: SideActionId;
  label: string;
  asset: string;
  left: number;
  top: number;
  width: number;
  height: number;
}> = [
  { id: 'notice', label: '公告', asset: '/assets/intro/v2/notice.png', left: 1753, top: 89, width: 79, height: 102 },
  { id: 'activity', label: '活动', asset: '/assets/intro/v2/activity.png', left: 1753, top: 207, width: 79, height: 102 },
  { id: 'codex', label: '图鉴', asset: '/assets/intro/v2/codex.png', left: 1753, top: 323, width: 79, height: 102 },
  { id: 'settings', label: '设置', asset: '/assets/intro/v2/settings.png', left: 1753, top: 439, width: 79, height: 104 },
];

const hasSeenNotice = () => {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(NOTICE_SEEN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const markNoticeSeen = () => {
  try {
    window.localStorage.setItem(NOTICE_SEEN_STORAGE_KEY, '1');
  } catch {
    // Local storage may be unavailable in privacy-restricted environments.
  }
};

const UPDATE_LOG_SECTIONS = [
  {
    title: '界面与阅读',
    items: [
      '首页显示当前版本号，路径页“真气”改为“真气上限”。',
      '药房和战斗奖励页新增“查看现有手牌”，可同时查看已有装备牌。',
      '战斗效果面板拆分为增益效果、负面效果、装备三栏，折叠条目可点击查看完整说明。',
      '战斗手牌文字整体放大，长悬浮预览改为 3 秒出现，并放大到 1.5 倍。',
    ],
  },
  {
    title: '体质与效果',
    items: [
      '阴虚、气虚、阳虚、湿热、血瘀、气郁等体质的收益与代价分开展示。',
      '负面效果会进入专门分栏，避免和装备、增益混在一起。',
    ],
  },
  {
    title: '药材牌平衡：旧效果 → 新效果',
    items: [
      '葛根解肌：旧为恢复5点生命、抽1张牌、获得4点格挡；新为恢复3点生命、抽1张牌、获得4点格挡。',
      '当归补血：旧为恢复5点生命，满血时获得5点护盾；新为恢复4点生命，满血时获得4点护盾。',
      '石斛益胃：旧为0费，获得1层滋阴并使本场战斗滋阴上限+2；新为1费，获得1层滋阴并使滋阴上限+1。',
      '山萸肉固涩：旧为恢复3点生命，并额外恢复等同于滋阴层数的生命；新为恢复2点生命，并额外恢复等同于滋阴层数的生命。',
      '甘草和中：旧为恢复4点生命、抽1张牌；新为恢复3点生命、抽1张牌。',
      '山药平补：旧为能力，回合结束时恢复2点生命；新为能力，回合结束时恢复1点生命。',
      '枳实行气：旧为抽1张牌，并无条件让本回合下一张攻击牌消耗-1，若本回合已打出攻击牌则额外抽1张；新为抽1张牌，只有本回合已打出攻击牌时才额外抽1张，并让下一张攻击牌消耗-1。',
      '天冬养阴：旧为恢复12点生命、获得4点格挡；新为恢复8点生命、获得4点格挡。',
      '五味敛阴：旧为0费，获得3层滋阴和4点格挡；新为1费，获得2层滋阴和3点格挡。',
      '苏叶解表：旧为清除所有负面状态并恢复10点生命；新为清除所有负面状态并恢复6点生命。',
      '豆豉宣郁：旧为恢复12点生命、抽2张牌；新为恢复8点生命、抽2张牌。',
      '柴胡疏肝：旧为获得2点力量和2点敏捷，恢复8点生命；新为获得2点力量和2点敏捷，恢复4点生命。',
      '桔梗宣肺：旧为0费，若手牌少于5张则抽到5张，否则抽1弃1；新为1费，效果不变。',
      '艾灸：关元：旧为获得1点真气上限并恢复3点生命；新为获得1点真气上限并恢复2点生命。',
    ],
  },
  {
    title: '药方牌平衡：旧效果 → 新效果',
    items: [
      '葛根汤：旧为获得8点格挡、清除自身1个负面状态、抽1张牌；新为上述效果外，追加本回合首次受伤-3。',
      '麻杏石甘汤：旧为对单体造成10点伤害，并施加2层热邪；新为对单体造成9点伤害，目标每层热邪额外+1伤害，最多+4，并施加2层热邪。',
      '小柴胡汤：旧为恢复6点生命、抽2张牌、清除自身1个负面状态；新为恢复4点生命、抽2张牌、清除自身1个负面状态。',
      '理中丸：旧为恢复8点生命、获得1点力量；新为恢复5点生命、获得1点力量与1层温阳，若自身有寒邪则清除1层。',
      '四君子汤：旧为恢复10点生命、获得6点格挡；新为恢复6点生命、获得6点格挡，并使下张技能核心效果+1。',
      '小青龙汤：旧为对所有敌人造成7点伤害，若目标有寒邪则额外3点伤害；新为同样伤害逻辑外，对有寒邪的目标追加1回合虚弱。',
      '酸枣仁汤：旧为使一个敌人困倦1回合，并恢复5点生命；新为使一个敌人困倦1回合，恢复3点生命，并令本回合首次受伤-3。',
    ],
  },
  {
    title: '起始牌组与奖励供给',
    items: [
      '平和质起始牌组：旧为甘草和中；新替换为黄芩清肺，增加攻击牌密度，减少开局回血依赖。',
      '气虚质起始牌组：旧为甘草和中；新替换为川芎行气，让气虚质开局有更多主动攻击与抽牌节奏。',
      '气郁质起始牌组：旧为大枣养血；新替换为麻黄发汗，降低纯续航比例，提高攻击启动能力。',
      '起始牌组追加调整：平和质旧为当归补血，新替换为第二张山楂消食；气虚质旧为山药平补，新替换为第二张川芎行气。',
      '起始牌组追加调整：阴虚质旧为山萸肉固涩、五味敛阴，新替换为第二张黄芩清肺、第二张杏仁降气。',
      '起始牌组追加调整：阳虚质旧为甘草和中，新替换为第二张麻黄发汗。',
      '起始牌组追加调整：痰湿质旧为耳穴：神门、温针灸：三阴交，新替换为第二张黄芩清肺、第二张点穴：合谷。',
      '起始牌组追加调整：气郁质旧为耳穴：神门，新替换为第二张白芍柔肝；特禀质旧为艾灸：关元、针刺：足三里，新替换为第二张黄芩清肺、第二张山楂消食。',
      '起始牌组攻击密度：平和、阴虚、气虚、阳虚、痰湿、气郁、特禀均提高到15张中7张攻击牌；湿热和血瘀本来攻击牌充足，保持不变。',
      '奖励与药房进攻保底：旧为牌组有效进攻牌低于40%时保底给进攻牌；新提高到45%，低攻击卡组更容易拿到攻击牌。',
    ],
  },
  {
    title: '敌人难度与招式复杂度',
    items: [
      '普通敌血量上调：风寒客30→33，风热袭28→31，湿浊缠35→38；紫荆囚徒50→56，臃肿肉山55→61，水火双生鬼45→50，迷心浊灵52→58；终焉虚影70→78，散华残躯65→72，沸血暗影72→80，夺息雾妖68→76，焦土巨汉78→86。',
      'Boss血量回落：寒霜封卫150→138，怒炎狂客140→132，沉沦泥怪250→230，逆源修罗500→470。',
      '普通敌双动概率：Act 2 旧为45%概率双动，新为55%；Act 3 旧为80%概率双动，新为85%。',
      '风寒客新增寒邪联动：玩家已有寒邪时，有概率改用“寒邪入络”，造成8+寒邪层数修正的伤害，最多额外+2。',
      '风热袭新增热邪联动：玩家热邪达到2层及以上时，有概率改用“热盛连灼”，造成5点×2段伤害。',
      '湿浊缠新增湿邪联动：玩家已有湿邪时，有概率改用“湿浊蓄势”，获得8点格挡并获得1层攻击强化。',
      '紫荆囚徒新增血瘀联动：玩家已有血瘀且处于对应回合时，改用“瘀阻痛甚”，造成11+血瘀层数修正的伤害，最多额外+2。',
      '臃肿肉山新增湿邪联动：玩家已有湿邪时，有概率改用“湿聚成形”，获得12点格挡并获得1层攻击强化。',
      '夺息雾妖新增真气压制联动：玩家已有肾不纳气时改用“纳气反冲”造成12点伤害；每3回合会出现“寒饮压气”，施加肾不纳气与1回合虚弱。',
    ],
  },
] as const;

const NoticePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="immersive-modal-backdrop fixed inset-0 z-40 flex items-center justify-center px-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 8 }}
      className="immersive-modal intro-notice-modal w-full px-6 py-6"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="immersive-modal__header mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="immersive-modal__kicker text-[12px] font-semibold tracking-[0.18em]">版本公告</div>
          <h2 className="immersive-modal__title mt-2 text-3xl font-bold">1.0.0 更新日志</h2>
        </div>
        <button
          onClick={onClose}
          className="immersive-modal__close rounded-full p-2 transition"
          type="button"
          aria-label="关闭"
        >
          <X size={24} />
        </button>
      </div>
      <div className="immersive-modal__panel intro-notice-modal__panel px-4 py-4">
        <p className="immersive-modal__copy intro-notice-modal__lead">
          本次版本集中处理可读性、效果归类和战斗曲线，让前期战斗更有压力，后期构筑启动更克制，药方牌也更像一次完整配伍。
        </p>
        <div className="intro-notice-modal__sections">
          {UPDATE_LOG_SECTIONS.map((section) => (
            <section key={section.title} className="intro-notice-modal__section">
              <h3 className="intro-notice-modal__section-title">{section.title}</h3>
              <ul className="intro-notice-modal__list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </motion.div>
  </motion.div>
);

const PlaceholderPanel: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="immersive-modal-backdrop fixed inset-0 z-40 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        className="immersive-modal w-full max-w-md px-6 py-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="immersive-modal__header mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="immersive-modal__kicker text-[12px] font-semibold tracking-[0.18em]">启动页入口</div>
            <h2 className="immersive-modal__title mt-2 text-3xl font-bold">活动</h2>
          </div>
          <button
            onClick={onClose}
            className="immersive-modal__close rounded-full p-2 transition"
            type="button"
            aria-label="关闭"
          >
            <X size={24} />
          </button>
        </div>
        <div className="immersive-modal__panel px-4 py-4">
          <p className="immersive-modal__copy text-sm leading-7">暂无新的活动。</p>
        </div>
      </motion.div>
    </motion.div>
);

const IntroSettingsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    bgmVolume,
    sfxVolume,
    fontSize,
    setBgmVolume,
    setSfxVolume,
    setFontSize,
  } = useGameStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="immersive-modal-backdrop fixed inset-0 z-40 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        className="immersive-modal w-full max-w-md px-6 py-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="immersive-modal__header mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="immersive-modal__kicker text-[12px] font-semibold tracking-[0.18em]">界面设置</div>
            <h2 className="immersive-modal__title mt-2 text-3xl font-bold">设置</h2>
          </div>
          <button
            onClick={onClose}
            className="immersive-modal__close rounded-full p-2 transition"
            type="button"
            aria-label="关闭"
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
  );
};

export const IntroView: React.FC = () => {
  const setPhase = useGameStore((state) => state.setPhase);
  const [activePanel, setActivePanel] = useState<IntroPanel>(null);
  const [hasUnreadNotice, setHasUnreadNotice] = useState(() => !hasSeenNotice());

  const handleEnter = () => {
    setPhase('start_menu');
  };

  const handleSideAction = (id: SideActionId) => {
    if (id === 'codex') {
      setPhase('card_codex');
      return;
    }

    if (id === 'notice' && hasUnreadNotice) {
      setHasUnreadNotice(false);
      markNoticeSeen();
    }

    setActivePanel(id);
  };

  return (
    <>
      <div className="intro-page">
        <div className="intro-page__inner">
          <div className="intro-page__canvas">
            <img
              className="intro-page__background"
              src={resolveAssetUrl('/assets/intro/background.gif')}
              alt=""
              aria-hidden="true"
            />
            <img
              className="intro-page__top-copy"
              src={resolveAssetUrl('/assets/intro/v2/top_copy.png')}
              alt="循五行，辨寒热虚实。以巡诊构筑为引，在一次次取舍中理解药性、生克与证候变化。"
              style={refRect(79, 81, 509, 65)}
            />
            <img
              className="intro-page__title"
              src={resolveAssetUrl('/assets/intro/v2/title.png')}
              alt="五行医道"
              style={refRect(528, 232, 913, 356)}
            />
            {SIDE_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`intro-page__side-action${
                  action.id === 'notice' && hasUnreadNotice ? ' intro-page__side-action--unread' : ''
                }`}
                style={refRect(action.left, action.top, action.width, action.height)}
                aria-label={action.id === 'notice' && hasUnreadNotice ? '公告，有新内容' : action.label}
                onClick={() => handleSideAction(action.id)}
              >
                <img src={resolveAssetUrl(action.asset)} alt="" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              className="intro-page__enter intro-page__enter--enabled"
              style={refRect(483, 894, 955, 54)}
              onClick={handleEnter}
              aria-label="进入主菜单"
            >
              <img
                src={resolveAssetUrl('/assets/intro/v2/enter_main_menu.png')}
                alt=""
                aria-hidden="true"
              />
            </button>
            <div className="intro-page__version" aria-label={`Version ${APP_VERSION}`}>
              v{APP_VERSION}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activePanel === 'notice' ? (
          <NoticePanel onClose={() => setActivePanel(null)} />
        ) : null}
        {activePanel === 'activity' ? (
          <PlaceholderPanel onClose={() => setActivePanel(null)} />
        ) : null}
        {activePanel === 'settings' ? (
          <IntroSettingsPanel onClose={() => setActivePanel(null)} />
        ) : null}
      </AnimatePresence>
    </>
  );
};
