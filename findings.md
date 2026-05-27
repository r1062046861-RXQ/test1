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
