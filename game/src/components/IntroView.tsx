import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { resolveAssetUrl } from '../utils/assets';

const REF_W = 1920;
const REF_H = 1080;

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
  top: number;
}> = [
  { id: 'notice', label: '公告', top: 87 },
  { id: 'activity', label: '活动', top: 207 },
  { id: 'codex', label: '图鉴', top: 327 },
  { id: 'settings', label: '设置', top: 447 },
];

const PlaceholderPanel: React.FC<{
  type: Exclude<IntroPanel, 'settings' | null>;
  onClose: () => void;
}> = ({ type, onClose }) => {
  const title = type === 'notice' ? '公告' : '活动';
  const copy = type === 'notice' ? '暂无新的公告。' : '暂无新的活动。';

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
            <div className="immersive-modal__kicker text-[12px] font-semibold tracking-[0.18em]">启动页入口</div>
            <h2 className="immersive-modal__title mt-2 text-3xl font-bold">{title}</h2>
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
          <p className="immersive-modal__copy text-sm leading-7">{copy}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

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
  const [acceptedAgreement, setAcceptedAgreement] = useState(false);
  const [activePanel, setActivePanel] = useState<IntroPanel>(null);
  const [showAgreementHint, setShowAgreementHint] = useState(false);

  const handleEnter = () => {
    if (!acceptedAgreement) {
      setShowAgreementHint(true);
      window.setTimeout(() => setShowAgreementHint(false), 1400);
      return;
    }

    setPhase('start_menu');
  };

  const handleSideAction = (id: SideActionId) => {
    if (id === 'codex') {
      setPhase('card_codex');
      return;
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
              src={resolveAssetUrl('/assets/intro/background.png')}
              alt=""
              aria-hidden="true"
            />
            <img
              className="intro-page__top-copy"
              src={resolveAssetUrl('/assets/intro/top_copy.png')}
              alt="循五行，辨寒热虚实。以巡诊构筑为引，在一次次取舍中理解药性、生克与证候变化。"
              style={refRect(79, 81, 509, 65)}
            />
            <img
              className="intro-page__title"
              src={resolveAssetUrl('/assets/intro/title.png')}
              alt="五行医道"
              style={refRect(611, 263, 738, 296)}
            />
            <img
              className="intro-page__side-menu"
              src={resolveAssetUrl('/assets/intro/side_menu.png')}
              alt=""
              aria-hidden="true"
              style={refRect(1753, 87, 81, 462)}
            />
            {SIDE_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className="intro-page__side-hotspot"
                style={refRect(1738, action.top - 6, 111, 104)}
                aria-label={action.label}
                onClick={() => handleSideAction(action.id)}
              />
            ))}
            <button
              type="button"
              className={[
                'intro-page__enter',
                acceptedAgreement ? 'intro-page__enter--enabled' : 'intro-page__enter--locked',
              ].join(' ')}
              style={refRect(431, 895, 1149, 66)}
              onClick={handleEnter}
              aria-label="进入主菜单"
              aria-disabled={!acceptedAgreement}
            >
              <img
                src={resolveAssetUrl('/assets/intro/enter_main_menu.png')}
                alt=""
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className="intro-page__agreement"
              style={refRect(755, 991, 503, 29)}
              onClick={() => {
                setAcceptedAgreement((current) => !current);
                setShowAgreementHint(false);
              }}
              aria-pressed={acceptedAgreement}
              aria-label="我已仔细阅读并同意用户协议和隐私政策"
            >
              <img
                src={resolveAssetUrl('/assets/intro/agreement.png')}
                alt=""
                aria-hidden="true"
              />
              <span className="intro-page__agreement-check" aria-hidden="true">
                {acceptedAgreement ? <Check size={20} strokeWidth={3} /> : null}
              </span>
            </button>
            <AnimatePresence>
              {showAgreementHint ? (
                <motion.div
                  className="intro-page__agreement-hint"
                  style={refRect(775, 956, 460, 28)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                >
                  请先勾选阅读协议。
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activePanel === 'notice' || activePanel === 'activity' ? (
          <PlaceholderPanel type={activePanel} onClose={() => setActivePanel(null)} />
        ) : null}
        {activePanel === 'settings' ? (
          <IntroSettingsPanel onClose={() => setActivePanel(null)} />
        ) : null}
      </AnimatePresence>
    </>
  );
};
