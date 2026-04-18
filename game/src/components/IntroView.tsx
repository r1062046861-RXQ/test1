import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { ActionButton } from './ui/PageShell';
import { pageRevealVariants } from './ui/motionPresets';
import { resolveAssetBackground } from '../utils/assets';

export const IntroView: React.FC = () => {
  const setPhase = useGameStore((state) => state.setPhase);

  return (
    <div
      className="relative flex h-screen w-screen items-end overflow-hidden bg-stone-950"
      style={{
        backgroundImage:
          `linear-gradient(180deg, rgba(14,10,8,0.12), rgba(14,10,8,0.52)), radial-gradient(circle at top, rgba(255,231,180,0.12), transparent 36%), ${resolveAssetBackground('/assets/background_main_menu.png')}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_46%,rgba(8,6,5,0.42)_100%)]" />
      <div className="page-shell__grain opacity-20" />

      <motion.div
        variants={pageRevealVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex w-full justify-center px-6 pb-12 md:justify-start md:px-12 md:pb-16"
      >
        <div className="max-w-xl text-center md:text-left">
          <div className="text-[13px] uppercase tracking-[0.42em] text-amber-100/78">五行初引</div>
          <h1 className="mt-4 text-5xl font-bold tracking-[0.12em] text-amber-50 drop-shadow-[0_10px_26px_rgba(0,0,0,0.42)] md:text-7xl">
            五行医道
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-stone-100/90 md:text-lg md:leading-9">
            循五行，辨寒热虚实。以巡诊构筑为引，在一次次取舍中理解药性、生克与证候变化。
          </p>

          <div className="mt-8">
            <ActionButton variant="primary" className="px-8 py-4 text-base md:text-lg" onClick={() => setPhase('start_menu')}>
              进入主菜单
              <ArrowRight size={18} />
            </ActionButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
