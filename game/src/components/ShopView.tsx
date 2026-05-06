import React, { useEffect, useMemo, useState } from 'react';
import { CARD_LIBRARY } from '../data/cards';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { ActionButton, Badge, Panel, SectionTitle } from './ui/PageShell';

type TabKey = 'buy' | 'sell' | 'combine' | 'decompose';

const SELL_PRICE: Record<string, number> = { common: 15, uncommon: 30, rare: 50 };
const MAX_SELL_PER_VISIT = 3;

const TAB_LABELS: Record<TabKey, string> = { buy: '购买', sell: '出售', combine: '合成', decompose: '分解' };

interface BuySlot {
  cardId: string;
  price: number;
  discount: boolean;
  sold: boolean;
}

export const ShopView: React.FC = () => {
  const {
    player,
    addCardToDeck,
    sellCardFromDeck,
    combineCards,
    spendGold,
    completeNonCombat,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<TabKey>('buy');
  const [buySlots, setBuySlots] = useState<BuySlot[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [combineSelected, setCombineSelected] = useState<string[]>([]);
  const [combineStep, setCombineStep] = useState<'sacrifice' | 'target'>('sacrifice');
  const [sellCount, setSellCount] = useState(0);

  const cardPool = useMemo(
    () => Object.values(CARD_LIBRARY).filter((card) => !card.unplayable),
    [],
  );

  useEffect(() => {
    const pool = [...cardPool].filter(c => {
      const count = player.deck.filter(dc => dc.id === c.id || dc.name === c.name).length;
      return count < 10;
    });
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 4);
    const discountIdx = Math.floor(Math.random() * picked.length);
    setBuySlots(picked.map((c, i) => {
      const basePrice = c.rarity === 'rare' ? 80 : c.rarity === 'uncommon' ? 50 : 30;
      const discount = i === discountIdx;
      return { cardId: c.id, price: discount ? Math.ceil(basePrice * 0.5) : basePrice, discount, sold: false };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardPool]);

  const buyCard = (slotIndex: number, cardId: string, price: number) => {
    const state = useGameStore.getState();
    if (state.player.gold < price) { setMsg('金币不足'); return; }
    spendGold(price);
    addCardToDeck(cardId);
    setBuySlots(prev => prev.map((s, i) => i === slotIndex ? { ...s, sold: true } : s));
    setMsg('购买成功');
    setTimeout(() => setMsg(null), 1500);
  };

  const sellCard = (cardId: string) => {
    if (sellCount >= MAX_SELL_PER_VISIT) { setMsg(`本间最多出售${MAX_SELL_PER_VISIT}张`); return; }
    sellCardFromDeck(cardId);
    setSellCount(c => c + 1);
    setMsg('出售成功');
    setTimeout(() => setMsg(null), 1500);
  };

  const doCombine = (targetCardId: string) => {
    combineCards(combineSelected, targetCardId);
    setCombineSelected([]);
    setCombineStep('sacrifice');
    setMsg('合成成功');
    setTimeout(() => setMsg(null), 1500);
  };

  const obtainedCandidates = useMemo(() => {
    const ids = player.obtainedCardIds ?? [];
    return ids.filter(cid => {
      const count = player.deck.filter(c => c.id === cid || c.name === CARD_LIBRARY[cid]?.name).length;
      return count < 10 && CARD_LIBRARY[cid];
    });
  }, [player.obtainedCardIds, player.deck]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setCombineSelected([]);
    setCombineStep('sacrifice');
    setMsg(null);
  };

  return (
    <div className="flex min-h-full items-start justify-center p-4">
      <Panel className="max-w-5xl mx-auto px-5 py-5 w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="chapter-kicker">药房</div>
            <h2 className="text-3xl font-bold text-amber-50 mt-1">药房</h2>
            <p className="text-sm text-stone-300 mt-1">买卖药材，合成新方。</p>
          </div>
          <div className="flex items-center gap-3">
            {msg && <Badge variant="amber">{msg}</Badge>}
            <Badge variant="amber">{player.gold} 金币</Badge>
            <ActionButton variant="secondary" onClick={() => completeNonCombat()}>继续下一层</ActionButton>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={`rounded-full px-5 py-2 text-sm font-semibold tracking-[0.14em] transition ${
                activeTab === tab
                  ? 'bg-amber-500/20 border border-amber-400/40 text-amber-100'
                  : 'border border-stone-700/40 text-stone-400 hover:text-stone-200'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {activeTab === 'buy' && (
          <div>
            <SectionTitle title="购入药材" hint="每间药房刷新4张牌，其中1张五折" />
            <div className="grid grid-cols-4 gap-4 mt-3 justify-items-center">
              {buySlots.map(({ cardId, price, discount, sold }, i) => {
                const card = CARD_LIBRARY[cardId];
                return (
                  <div key={`${cardId}_${i}`} className="relative flex flex-col items-center">
                    {sold ? (
                      <div className="w-48 aspect-[2/3] rounded-[22px] border border-dashed border-stone-700/30 bg-stone-900/20 flex items-center justify-center">
                        <span className="text-stone-600 text-xs">已售出</span>
                      </div>
                    ) : (
                      <>
                        {discount && (
                          <div className="absolute -top-2 -left-2 z-20 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
                            5折
                          </div>
                        )}
                        <Card card={card!} interactive={false} hoverLift={false} />
                        <ActionButton
                          variant="primary"
                          className="mt-2 text-sm"
                          style={{ width: 'fit-content' }}
                          onClick={() => buyCard(i, cardId, price)}
                        >
                          {price} 金币/购买
                        </ActionButton>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'sell' && (
          <div>
            <SectionTitle title="出售药材" hint={`点击牌组中的牌出售换金（本间剩余${MAX_SELL_PER_VISIT - sellCount}次）`} />
            {player.deck.length === 0 ? (
              <p className="text-stone-400 mt-4">牌组为空，无可出售的牌。</p>
            ) : (
              <div className="grid grid-cols-4 gap-4 mt-3 max-h-[55vh] overflow-y-auto ornate-scroll p-1 justify-items-center">
                {player.deck.map((card) => (
                  <div key={card.id} className="relative group">
                    <Card card={card} interactive={false} hoverLift={false} />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40 rounded-[22px]">
                      <ActionButton
                        variant="danger"
                        className="text-sm"
                        disabled={sellCount >= MAX_SELL_PER_VISIT}
                        onClick={() => sellCard(card.id)}
                      >
                        +{SELL_PRICE[card.rarity] || 15} 金
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'combine' && (
          <div>
            <SectionTitle
              title={combineStep === 'sacrifice' ? '合成药材 · 选择材料' : '合成药材 · 选择目标'}
              hint={combineStep === 'sacrifice' ? '选择3张牌作为合成材料' : '从已获取的牌中选择1张作为合成结果'}
            />
            {player.deck.length < 3 ? (
              <p className="text-stone-400 mt-4">牌组不足3张，无法合成。</p>
            ) : combineStep === 'sacrifice' ? (
              <>
                <div className="grid grid-cols-4 gap-4 mt-3 max-h-[40vh] overflow-y-auto ornate-scroll p-1 justify-items-center">
                  {player.deck.map((card) => {
                    const sel = combineSelected.includes(card.id);
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          if (sel) setCombineSelected(combineSelected.filter(id => id !== card.id));
                          else if (combineSelected.length < 3) setCombineSelected([...combineSelected, card.id]);
                        }}
                        className={`relative transition ${sel ? 'ring-4 ring-amber-400 rounded-[22px] scale-105' : 'opacity-70 hover:opacity-100'}`}
                      >
                        <Card card={card} interactive={false} hoverLift={false} />
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-center">
                  <ActionButton
                    variant="primary"
                    disabled={combineSelected.length !== 3}
                    className="px-8 py-3 text-base"
                    onClick={() => { setCombineStep('target'); setMsg(null); }}
                  >
                    {combineSelected.length === 3 ? '确定材料，选择目标' : `已选 ${combineSelected.length}/3`}
                  </ActionButton>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4 mt-3 max-h-[40vh] overflow-y-auto ornate-scroll p-1 justify-items-center">
                  {obtainedCandidates.map((cid) => {
                    const card = CARD_LIBRARY[cid];
                    if (!card) return null;
                    return (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => doCombine(cid)}
                        className="relative transition hover:scale-105 hover:opacity-100 opacity-80"
                      >
                        <Card card={card} interactive={false} hoverLift={false} />
                      </button>
                    );
                  })}
                  {obtainedCandidates.length === 0 && (
                    <div className="col-span-4 text-center text-stone-500 py-8">
                      没有可合成的目标牌（需要先在本局游戏中使用或获取过卡牌）
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-center gap-3">
                  <ActionButton
                    variant="secondary"
                    className="px-6 py-3 text-sm"
                    onClick={() => { setCombineStep('sacrifice'); setMsg(null); }}
                  >
                    返回重选材料
                  </ActionButton>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'decompose' && (
          <div>
            <SectionTitle title="分解药材" hint="此功能尚未开放" />
            <p className="text-stone-400 mt-4">分解功能正在筹备中，敬请期待。</p>
          </div>
        )}
      </Panel>
    </div>
  );
};
