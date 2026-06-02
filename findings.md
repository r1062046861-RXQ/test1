# Codex crash findings

## 2026-05-27
- Current `C:\Users\C2H6O\.codex\config.toml` has `BROWSER_USE_AVAILABLE_BACKENDS = "chrome,iab"` even though Chrome plugin is disabled. This means Codex rewrote the previous IAB-only setting.
- Latest Codex process logs for process `17976` are zero-byte, which points to an abnormal app exit before useful desktop logging started.
- Prior useful log `codex-desktop-6932e743-76a5-4d7a-8064-b665c8660f60-6356-t0-i1-153833-0.log` repeatedly resolved the same in-app browser route for thread `019e5ef0-4f68-7f13-a2a2-15e936d12aeb`, then tore down the browser guest.
- Suspicious historical session file is about 154 MB and contains browser-use metadata for turn `019e6514-ec17-79b1-95a0-f7893a1db298`.

## Working hypothesis
The remaining crash source is stale browser-use route hydration from a huge historical thread plus config drift back to mixed `chrome,iab` backends. External Chrome native messaging is no longer the primary suspect.

## Repair findings
- Quarantined the 155 MB session file for thread `019e5ef0-4f68-7f13-a2a2-15e936d12aeb` into `C:\Users\C2H6O\.codex\backups\codex-browser-thread-quarantine-20260527-004509\sessions-quarantined`.
- Removed that thread from `session_index.jsonl`.
- Current Codex process can rewrite `.codex-global-state.json` from memory while running, so final global-state pruning must run after Codex fully exits. A watcher is installed for that.
- Re-applied `BROWSER_USE_AVAILABLE_BACKENDS = "iab"` and removed the local bundled `chrome` plugin entry/source from the active bundled marketplace copy.
- External Chrome bridge is currently absent: no native host registry key, no native host manifest, no chrome plugin cache, no bundled chrome source, and no `extension-host.exe`.

---

# Project reading findings

## 2026-05-27
- Project is `五行医道`, a TCM-themed roguelike deckbuilder implemented as React 18 + TypeScript + Vite, with Zustand store orchestration and rules/data concentrated under `shared/`.
- Key handoff rule: read `AI_HANDOFF.md` before editing; run `git status --short`; do not revert existing user/UI/resource changes; do not copy garbled terminal Chinese; keep gameplay rules out of React components.
- Runtime project lives under `game/`; common commands are `npm run dev`, `npm test -- --run`, `npm run build`, and `npm run assets:manifest`.
- Current content from docs: 9 playable constitutions plus admin, 108 card templates, 12 formula blueprints, 11 equipment cards, 12 events, 20 enemies including 4 bosses, 3-act infinite map loop.
- Map model: each act/loop has mainline columns plus a separate boss lane; boss lane unlocks after 3 combat wins; defeating a boss advances `currentAct` up to 3.
- Event model: mandatory three-act mainline (`三兄弟择师`) plus a queued branch system, especially `子午流注` as a continuation-priority event.
- UI state: main menu, map, and combat have v2 asset-splice implementations using 1920x1080 reference coordinates; edits must preserve same-size/same-anchor replacement semantics and regenerate runtime asset manifest after asset changes.
- Balance guide is the canonical starting point for numerical changes; it documents five rounds of balance work and points card/enemy/equipment changes to `shared/data/*`, `shared/core/gameCore.ts`, and `shared/core/enemyStrategies.ts`.
- Offline delivery exists in `offline-windows/`, serving built `web/` files through a Windows PowerShell local HTTP server with no Node/npm/Python requirement for players.
- Spreadsheet data: `卡牌清单.xlsx` has sheets `卡牌清单` (108 rows, 15 cols) and `统计`; `游戏战斗数据.xlsx` has sheets for card table, enemy data, formula blueprints, events, equipment cards, constitution passives, system constants, and overview stats.
- `shared/baseTypes.ts` defines the cross-layer schema; `game/src/types/index.ts` re-exports it and adds UI-only animation cue types.
- `shared/core/gameCore.ts` owns map generation, energy cost calculation, card play resolution, end-of-player-turn effects, enemy turn resolution, status helpers, equipment cap counting, and boss unlock requirement.
- `game/src/store/gameStore.ts` wraps the rule core with Zustand state, persistence, phase routing, async enemy action animation scheduling, reward rolls, formula crafting, event choice effects, and node completion.
- Card implementation is data-driven by `effectId`, but actual card behavior is a large switch in `resolveCardPlay`; card balance changes must keep `cards.ts`, `gameCore.ts`, tests, and UI text in sync.
- Enemy behavior is strategy-driven through `shared/core/enemyStrategies.ts`; each enemy `behavior` ID maps to a strategy with intent planning/execution, while `getEnemyActionCount` controls common/enemy double-action cadence by act/rank.
- App routing is phase-based in `game/src/App.tsx`; lazy-loaded views include map, combat, reward, rest, shop, event, chest, and card codex. `window.render_game_to_text()` exposes a structured automation snapshot.
- Resource loading uses an auto-generated image manifest. `runtimeAssetLoading` preloads only `critical` and `static` stages for the visible loading bar; `gif` includes delayed animated enemy WebP/background assets and is not counted in initial loading progress.
- Test coverage is concentrated in `game/src/store/gameCore.test.ts` for pure combat/rule behavior, `game/src/store/gameStore.test.ts` for run flow/rewards/events/crafting, plus focused tests for runtime asset loading, progressive image loading, runtime IDs, and asset manifest byte accounting.
- `game/package.json` scripts confirm the project entry workflow: `npm run dev`, `npm test -- --run`, `npm run build`, `npm run assets:manifest`; production Vite builds use `PAGES_BASE_PATH` or `./` as base.

## Intro page UI replacement findings
- The requested "第一页" maps to `game/src/components/IntroView.tsx`, not the post-entry `StartMenu`.
- Source folder contains 8 PNGs: 7 usable UI pieces plus `示例图.png` as the 1920x1080 reference composite.
- New asset dimensions: title `913x356`, top copy `509x65`, enter button `955x54`, notice/activity/codex `79x102`, settings `79x104`.
- Template matching against the sample gives target reference coordinates: top copy `(79,81,509,65)`, title `(528,232,913,356)`, enter `(483,894,955,54)`, notice `(1753,89,79,102)`, activity `(1753,207,79,102)`, codex `(1753,323,79,102)`, settings `(1753,439,79,104)`.

## Intro and main menu clarity findings
- High-quality source animations are `未使用/root/新UI/首页/首页.gif` and `未使用/root/新UI/第二页/第二页.gif`, both 1138x640, 95 frames, 10fps, 9.5s.
- Re-exported animated WebP at q=88 keeps the existing runtime paths while increasing clarity: intro background ~12.7 MB, main-menu background ~10.1 MB.
- After brightness tuning, local intro screenshot luminance is close to the sample: whole image ~101%, central gate ~101%, right button area ~98% of sample brightness.

## Intro/main menu sub-10MB clarity findings
- User now requires each animated background to be less than 10MB.
- Current runtime sizes before this pass: intro background 12,737,224 bytes (~12.15 MiB), main-menu background 10,100,574 bytes (~9.63 MiB).
- Original GIF sources remain 1138x640, 95 frames, 10fps, 9.5s; higher clarity must come from better encoding/sharpening and avoiding unnecessary upscaling, not from true extra source detail.
- Selected replacement backgrounds are 1920x1080 animated WebP, 76 frames, pre-scaled with Lanczos and light sharpening to avoid browser-side upscaling blur.
- Final background sizes: intro 9,914,388 bytes (9.914 MB / 9.455 MiB), main menu 9,510,000 bytes (9.510 MB / 9.069 MiB), both below the 10MB requirement.

---

# Documentation consistency audit findings (2026-06-02)

## Current source-of-truth snapshot
- Working tree already had modified `README.md`, `AI_HANDOFF.md`, `game/src/components/StartMenu.tsx`, `game/src/index.css`, plus planning files and `qzj.txt`; audit changes are limited to planning files.
- Source data loaded from `shared/data/cards.ts`, `shared/data/formulas.ts`, `shared/data/enemies.ts`, and `shared/data/events.ts`:
  - Cards: 108 total; categories `herb=75`, `enemy=10`, `formula=12`, `equipment=11`.
  - Card types: `skill=44`, `attack=28`, `power=36`.
  - Rarities: `common=22`, `uncommon=30`, `rare=56`.
  - Costs: `0=38`, `1=52`, `2=14`, `3=4`.
  - Targets: `self=72`, `single_enemy=24`, `all_enemies=12`.
  - Formula blueprints: 12.
  - Enemies: 20 total; enemy pools contain 3+1+2 for Act 1, 4+1+1 for Act 2, 5+1+1 for Act 3, plus the summon template in `ENEMIES`.
  - Side events: 11, with `side_needle_stage2` as a continuation event; mainline id is `mainline_three_brothers`.
- Current filesystem asset total under `game/public/assets`: 370 files, 208,009,739 bytes, about 198.37 MiB. Audio subdirectory is about 35.56 MiB; image manifest total is 168,702,119 bytes, about 160.89 MiB.
- Current intro/main-menu runtime components reference `.gif`: `IntroView.tsx` uses `/assets/intro/background.gif`; `StartMenu.tsx` uses `/assets/main_menu/v2/background.gif`.

## Confirmed potential documentation mismatches so far
- `README.md` and `AI_HANDOFF.md` card cost distributions that say `0=44 / 1=45 / 2=15 / 3=4` are stale; current source and `BALANCE_GUIDE.md` match `0=38 / 1=52 / 2=14 / 3=4`.
- `AI_HANDOFF.md` target distribution `self=73 / single_enemy=23 / all_enemies=12` is stale; current source is `self=72 / single_enemy=24 / all_enemies=12`.
- `README.md` project tree says `game/public/assets` is about 368 files / 118 MiB, but current filesystem is 370 files / 198.37 MiB and the same README later says about 198 MiB.
- `AI_HANDOFF.md` still describes the intro page background path as `game/public/assets/intro/background.webp`, but current `IntroView.tsx` uses `/assets/intro/background.gif`.

## Final audit notes
- Correct card classification must use `getCardCategory()`: current counts are 75 herb, 10 enemy mechanism, 12 formula, and 11 equipment. Raw `category` fields are absent on many herb/enemy cards, so direct property counting gives the wrong answer.
- `BALANCE_GUIDE.md` is mostly aligned with the current fifth-balance data for card counts, type/cost distributions, equipment caps, and act-scaled equipment drop rates.
- `README.md` line 151 and `AI_HANDOFF.md` line 256 still use the pre-fifth-balance cost distribution. Replace with `0=38 / 1=52 / 2=14 / 3=4`.
- `AI_HANDOFF.md` line 257 still uses stale target distribution. Replace with `self=72 / single_enemy=24 / all_enemies=12`.
- `README.md` line 66 conflicts with the current filesystem and its own later status table: current `game/public/assets` is 370 files / 208,009,739 bytes (~198.37 MiB), with audio 37,286,268 bytes (~35.56 MiB). Manifest image bytes are 168,702,119 (~160.89 MiB).
- `README.md` line 141, `AI_HANDOFF.md` line 384, and `游戏事件系统-落地方案.md` line 75 describe `combatSinceEvent >= 2`; current `shared/core/gameCore.ts` uses `forceEvent = combatSinceEvent >= 1`, so after any mainline layer without event/shop/rest/boss the next eligible layer is forced event/shop in all three main columns.
- `AI_HANDOFF.md` line 267 says equipment only comes from battle victory drops at 10%/20%/50%; current `gameStore.ts` uses act-scaled battle drop rates: Act 1 6/15/35, Act 2 8/18/45, Act 3 10/20/50. Current events/mainline can also grant equipment directly via `addRelic`.
- `游戏逻辑框架-展墙信息图谱.md` lines 129 and 137-139 are stale: it says 85 herb, attack 27, skill 45, power 36. Current effective counts are herb 75, enemy 10, formula 12, equipment 11; attack 28, skill 44, power 36.
- `游戏逻辑框架-展墙信息图谱.md` line 164 repeats the old fixed equipment drop rate 10/20/50; current rates are act-scaled and equipment effects are capped by `EQUIPMENT_EFFECT_CAPS`.
- `游戏事件系统-落地方案.md` is useful as a design/implementation plan but should not be treated as current truth. It still includes old implementation targets such as probability decay for duplicate equipment and an older `EventEffect` union that lacks current `randomCard`.
- Current source event facts: `SIDE_EVENTS` has 11 entries; `side_needle_stage2` has `actRequirement: 2`, clears `needle_stage1`, grants `equipment_ziwuliuzhu` plus `maxHpChange -2`, and the store adds an extra `maxHp -3` only if the marker path was `needle`.
- `NEW_PLAYER_TUTORIAL_ART_PLAN.md` references missing runtime paths: `intro/background.png`, `main_menu/v2/background.png`, `background_map_act2.png`, and `combat/v2/background.png`. Current existing equivalents are `intro/background.gif` plus `.webp`, `main_menu/v2/background.gif` plus `.webp`, `background_map_act2.webp`, and `combat/v2/background.webp`.
- `卡牌清单.xlsx` has 108 matching card IDs but 31 rows differ from source fields, mostly stale costs. Its `统计` sheet is closer to current totals and includes notes about current event queue/loading behavior.
- `游戏战斗数据.xlsx` has 108 matching card IDs but 31 rows differ from source fields, mostly stale costs; 85 card rows have blank category; the `统计总览` sheet is stale (`药材牌=0`, `攻击牌=27`, `技能牌=45`), and `系统常量` still says `强制事件保底 combatSinceEvent >= 2`.

## Versioning policy notes (2026-06-02)
- Current release version is `1.0.0`.
- The intro/home screen should display the version from `game/package.json`.
- Future README/AI_HANDOFF/BALANCE_GUIDE/design-doc/data-sheet updates must include the relevant version number; player-visible rule/content changes should update `game/package.json` first.

## 1.0.0 P1-P5 balance implementation notes (2026-06-02)
- `山药平补` must keep `description`, `effectValue`, `end_turn_heal_power` fallback, tests, and `BALANCE_GUIDE.md` aligned at 1 end-turn heal after the P1 healing-density reduction.
- Current ordinary enemy double-action probabilities are Act 2 = 55% and Act 3 = 85%; old 45%/80% values only belong to prior historical notes, not current truth tables.
- Current P5 enemy complexity rows include conditional actions: 风寒客 reads player 寒邪, 风热袭 reads player 热邪, 湿浊缠/臃肿肉山 read player 湿邪, 紫荆囚徒 reads player 血瘀, and 夺息雾妖 reads player 真气压制.

## 1.0.0 starting attack density follow-up findings (2026-06-02)
- Before this follow-up, 阴虚质、痰湿质、特禀质 each had 5 attack cards in 15; a 5-card opening hand had about 43.4% chance to contain 0 or 1 attack.
- 平和质、气虚质、阳虚质、气郁质 each had 6 attack cards in 15; a 5-card opening hand had about 29.4% chance to contain 0 or 1 attack.
- 湿热质 already had 8 attack cards and 血瘀质 already had 10 attack cards, so this follow-up should leave them unchanged.
- Reward/shop low-offense threshold is currently 45% in `game/src/utils/cardBalance.ts`; raising starting decks to 7 attack cards is enough for the opening-hand issue without pushing that threshold higher.
