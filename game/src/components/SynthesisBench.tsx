import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Beaker, ScrollText, X } from 'lucide-react';
import type { Card as CardData } from '../types';
import { CARD_LIBRARY, countCardsByTemplate, getCardCategory, getTemplateCardId } from '../data/cards';
import { FORMULA_BLUEPRINTS } from '../data/formulas';
import { useGameStore, type CraftFormulaResult } from '../store/gameStore';
import { ActionButton, Badge, Panel } from './ui/PageShell';

const EMPTY_RESULT: CraftFormulaResult = {
  ok: false,
  message: '选择蓝图后可录入到合成台，再按完整配方选择药材牌合成药方牌。',
};

export const SynthesisBench: React.FC = () => {
  const player = useGameStore((state) => state.player);
  const recordFormulaBlueprint = useGameStore((state) => state.recordFormulaBlueprint);
  const craftFormulaFromBlueprint = useGameStore((state) => state.craftFormulaFromBlueprint);
  const [open, setOpen] = React.useState(false);
  const [activeBlueprintId, setActiveBlueprintId] = React.useState(FORMULA_BLUEPRINTS[0]?.id ?? '');
  const [result, setResult] = React.useState<CraftFormulaResult>(EMPTY_RESULT);
  const [selectedIngredientIds, setSelectedIngredientIds] = React.useState<string[]>([]);
  const dialogTitleId = React.useId();

  const activeBlueprint = FORMULA_BLUEPRINTS.find((blueprint) => blueprint.id === activeBlueprintId) ?? FORMULA_BLUEPRINTS[0];
  const knownBlueprintIds = player.knownFormulaBlueprintIds ?? [];
  const known = activeBlueprint ? knownBlueprintIds.includes(activeBlueprint.id) : false;
  const herbCards = player.deck.filter((card) => getCardCategory(card) === 'herb');
  const requiredIngredientIds = activeBlueprint?.ingredientCardIds ?? [];
  const selectedCards = selectedIngredientIds
    .map((id) => herbCards.find((card) => card.id === id))
    .filter((card): card is CardData => Boolean(card));
  const selectedTemplateIds = selectedCards
    .map(getTemplateCardId)
    .filter((id): id is string => Boolean(id));
  const selectedCounts = selectedTemplateIds.reduce<Record<string, number>>((counts, id) => {
    counts[id] = (counts[id] ?? 0) + 1;
    return counts;
  }, {});
  const requiredCounts = requiredIngredientIds.reduce<Record<string, number>>((counts, id) => {
    counts[id] = (counts[id] ?? 0) + 1;
    return counts;
  }, {});
  const inventoryCounts = countCardsByTemplate(herbCards);
  const inventoryRows = Object.values(inventoryCounts).sort((left, right) =>
    left.card.name.localeCompare(right.card.name, 'zh-Hans-CN'),
  );
  const selectedMatchesRecipe =
    selectedIngredientIds.length === requiredIngredientIds.length &&
    Object.entries(requiredCounts).every(([id, count]) => selectedCounts[id] === count);

  React.useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  React.useEffect(() => {
    setSelectedIngredientIds([]);
    setResult(EMPTY_RESULT);
  }, [activeBlueprintId]);

  const handleRecord = () => {
    if (!activeBlueprint) return;
    setResult(recordFormulaBlueprint(activeBlueprint.id));
  };

  const handleCraft = () => {
    if (!activeBlueprint) return;
    const nextResult = craftFormulaFromBlueprint(activeBlueprint.id, selectedIngredientIds);
    setResult(nextResult);
    if (nextResult.ok) {
      setSelectedIngredientIds([]);
    }
  };

  const toggleIngredient = (cardId: string) => {
    setSelectedIngredientIds((current) => {
      if (current.includes(cardId)) {
        return current.filter((id) => id !== cardId);
      }
      if (!activeBlueprint || current.length >= activeBlueprint.ingredientCardIds.length) {
        return current;
      }
      return [...current, cardId];
    });
    setResult(EMPTY_RESULT);
  };

  return (
    <>
      <button
        type="button"
        className="synthesis-bench-button"
        aria-label="打开合成台"
        onClick={() => setOpen(true)}
      >
        <Beaker size={18} />
        <span>合成台</span>
        <Badge variant="amber" className="synthesis-bench-button__count">
          {knownBlueprintIds.length}/{FORMULA_BLUEPRINTS.length}
        </Badge>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="synthesis-bench-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="synthesis-bench"
              role="dialog"
              aria-modal="true"
              aria-labelledby={dialogTitleId}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="synthesis-bench__header">
                <div className="min-w-0">
                  <div className="chapter-kicker">药方器具</div>
                  <h2 id={dialogTitleId} className="synthesis-bench__title">
                    合成台
                  </h2>
                </div>
                <button type="button" className="synthesis-bench__close" aria-label="关闭合成台" onClick={() => setOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="synthesis-bench__body ornate-scroll">
                <Panel inset className="synthesis-bench__sidebar">
                  <div className="synthesis-bench__section-title">蓝图目录</div>
                  <div className="synthesis-bench__blueprint-list">
                    {FORMULA_BLUEPRINTS.map((blueprint, index) => {
                      const formulaCard = CARD_LIBRARY[blueprint.formulaCardId];
                      const isActive = blueprint.id === activeBlueprint?.id;
                      const isKnown = knownBlueprintIds.includes(blueprint.id);
                      return (
                        <button
                          key={blueprint.id}
                          type="button"
                          className={`synthesis-bench__blueprint ${isActive ? 'synthesis-bench__blueprint--active' : ''} ${!isKnown ? 'synthesis-bench__blueprint--locked' : ''}`}
                          onClick={() => setActiveBlueprintId(blueprint.id)}
                        >
                          <span>{isKnown ? (formulaCard?.name ?? `药方 ${index + 1}`) : '未解锁'}</span>
                          <Badge variant={isKnown ? 'emerald' : 'slate'}>{isKnown ? '已录入' : '未录入'}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </Panel>

                <Panel inset className="synthesis-bench__detail">
                  {activeBlueprint ? (
                    <>
                      <div className="synthesis-bench__detail-head">
                        <div>
                          <div className="synthesis-bench__section-title">蓝图详情</div>
                          <h3>{CARD_LIBRARY[activeBlueprint.formulaCardId]?.name ?? activeBlueprint.name}</h3>
                        </div>
                        <Badge variant={known ? 'emerald' : 'slate'}>{known ? '已录入' : '未录入'}</Badge>
                      </div>

                      <div className="synthesis-bench__formula-card">
                        <ScrollText size={22} />
                        <div>
                          <div className="synthesis-bench__formula-name">{activeBlueprint.name}</div>
                          <p>{activeBlueprint.description}</p>
                          <div className="synthesis-bench__meta-row">
                            <Badge variant="amber">{activeBlueprint.difficulty}</Badge>
                            <Badge variant="slate">{requiredIngredientIds.length} 味药材</Badge>
                            {activeBlueprint.classicSource ? <Badge variant="slate">{activeBlueprint.classicSource}</Badge> : null}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="synthesis-bench__section-title">完整配方</div>
                        <div className="synthesis-bench__composition">{activeBlueprint.fullCompositionText}</div>
                        <div className="synthesis-bench__ingredients">
                          {requiredIngredientIds.map((ingredientId, index) => {
                            const ingredientName = CARD_LIBRARY[ingredientId]?.name ?? ingredientId;
                            const slotNumber = requiredIngredientIds.slice(0, index + 1).filter((id) => id === ingredientId).length;
                            const selectedForSlot = (selectedCounts[ingredientId] ?? 0) >= slotNumber;
                            const owned = inventoryCounts[ingredientId]?.count ?? 0;
                            const required = requiredCounts[ingredientId] ?? 0;
                            const missing = Math.max(0, required - owned);
                            return (
                              <div
                                key={`${ingredientId}-${index}`}
                                className={[
                                  'synthesis-bench__ingredient-slot',
                                  selectedForSlot ? 'synthesis-bench__ingredient-slot--filled' : 'synthesis-bench__ingredient-slot--missing',
                                  missing > 0 ? 'synthesis-bench__ingredient-slot--short' : '',
                                ].filter(Boolean).join(' ')}
                              >
                                <span>{ingredientName}</span>
                                <small>{selectedForSlot ? `已选 ${Math.min(selectedCounts[ingredientId] ?? 0, required)}/${required}` : `拥有 ${owned}/${required}${missing > 0 ? `，缺 ${missing}` : ''}`}</small>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="synthesis-bench__section-title">拥有药材</div>
                        <div className="synthesis-bench__deck-grid">
                          {herbCards.length > 0 ? inventoryRows.map((entry) => {
                            const required = requiredCounts[entry.templateId] ?? 0;
                            const missing = Math.max(0, required - entry.count);
                            const cardInstance = herbCards.find((c) => getTemplateCardId(c) === entry.templateId);
                            const isSelected = cardInstance ? selectedIngredientIds.includes(cardInstance.id) : false;
                            const canSelect = required > 0 && !isSelected && selectedIngredientIds.length < requiredIngredientIds.length;
                            return (
                              <button
                                key={entry.templateId}
                                type="button"
                                disabled={required > 0 ? !canSelect : true}
                                className={[
                                  'synthesis-bench__deck-card',
                                  isSelected ? 'synthesis-bench__deck-card--selected' : '',
                                  required > 0 ? 'synthesis-bench__deck-card--needed' : '',
                                  missing > 0 && required > 0 ? 'synthesis-bench__deck-card--short' : '',
                                ].filter(Boolean).join(' ')}
                                onClick={() => { if (cardInstance && canSelect) toggleIngredient(cardInstance.id); }}
                              >
                                <span>{entry.card.name} × {entry.count}</span>
                                <small>
                                  {required > 0
                                    ? `配方需要 ${required}${missing > 0 ? `，缺 ${missing}` : ''}${isSelected ? '，已选' : ''}`
                                    : '当前未用于本方'}
                                </small>
                              </button>
                            );
                          }) : (
                            <div className="synthesis-bench__deck-empty">当前牌组没有药材牌。</div>
                          )}
                        </div>
                      </div>

                      {result.showPoem && result.poem ? (
                        <div className="synthesis-bench__poem">
                          <div className="synthesis-bench__section-title">汤头歌诀</div>
                          {result.poem.split('\n').map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                        </div>
                      ) : null}

                      <div className="synthesis-bench__deck-note">
                        已选择 {selectedIngredientIds.length}/{requiredIngredientIds.length} 张药材牌。合成成功会消耗所选药材实例，并把药方牌加入当前牌组。
                      </div>

                      <div className={`synthesis-bench__message ${result.ok ? 'synthesis-bench__message--ok' : ''}`}>
                        {result.message}
                      </div>

                      <div className="synthesis-bench__actions">
                        <ActionButton variant="primary" onClick={handleRecord}>
                          录入药方蓝图
                        </ActionButton>
                        <ActionButton variant="secondary" onClick={handleCraft} disabled={!known || !selectedMatchesRecipe}>
                          合成药方牌
                        </ActionButton>
                      </div>
                    </>
                  ) : null}
                </Panel>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};
