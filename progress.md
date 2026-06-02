# Codex crash repair progress

## 2026-05-27
- Started from prior handoff summary and confirmed config drift plus zero-byte new logs.
- Planning files created to preserve recovery state if Codex exits again during repair.
- Quarantined the suspicious historical browser-use thread and backed it up under `C:\Users\C2H6O\.codex\backups\codex-browser-thread-quarantine-20260527-004509`.
- Rewrote `config.toml` to IAB-only browser backend.
- Removed the active bundled marketplace `chrome` plugin entry/source and isolated old Chrome cache leftovers.
- Installed a clean after-exit watcher: `C:\Users\C2H6O\.codex\backups\codex-browser-thread-quarantine-20260527-004509\after-exit-root-repair-and-guard.ps1`.
- Watcher log: `C:\Users\C2H6O\.codex\backups\codex-browser-thread-quarantine-20260527-004509\after-exit-root-repair-and-guard.log`.
- Remaining action: fully quit Codex once. The watcher will then reset the in-app browser profile/caches and prune any global-state references that the running Codex process rewrites from memory.

---

# Project reading progress

## 2026-05-27
- Confirmed existing planning files were from the previous Codex crash repair, not the current project-reading task.
- Ran `git status --short`; working tree already contains modified runtime assets/script/manifest and untracked planning files. No gameplay/source edits made.
- Read `README.md`, `AI_HANDOFF.md` overview sections, `BALANCE_GUIDE.md` overview sections, `NEW_PLAYER_TUTORIAL_ART_PLAN.md`, `游戏事件系统-落地方案.md`, `游戏逻辑框架-展墙信息图谱.md`, and `offline-windows/README_OFFLINE.txt`.
- Switched PowerShell output to UTF-8 for doc reads after initial terminal output showed garbled Chinese.
- Encountered non-destructive command errors while trying Bash heredoc syntax and direct Chinese path literals for spreadsheet inspection; logged resolutions in `task_plan.md`.
- Successfully inspected both `.xlsx` files by filesystem glob with bundled Python/pandas.
- Read core schema, map generation, store flow, event data, enemy data, formula blueprints, card data header, resource loading code, major UI route/components, and asset manifest generation script.
- Resumed from handoff, reread planning files, scanned repository docs/source/test files, and confirmed test locations with Windows-safe `rg --glob` usage.
- Checked `game/package.json`, `tsconfig.json`, and `vite.config.ts` to verify stack, scripts, strict TypeScript settings, aliasing, and build base behavior.
- Project-reading task is complete; no gameplay/source implementation files were changed.

## Intro page UI replacement progress
- Started first-page UI replacement request.
- Confirmed working tree already has unrelated modified assets/scripts/manifest; will avoid overwriting existing intro assets by adding new v2 filenames.
- Inspected new source asset dimensions, current `IntroView`, relevant intro CSS, and manifest generation.
- Viewed the sample composite and derived exact 1920x1080 coordinates for all usable new assets.
- Copied seven usable new UI assets into `game/public/assets/intro/v2/` with ASCII filenames, leaving `示例图.png` out.
- Updated `IntroView` to use v2 intro assets and exact sample coordinates.
- Updated intro CSS overlay/filter treatment and regenerated `runtimeAssetManifest.ts` with `npm run assets:manifest`.
- Ran `npm test -- --run`: 6 test files / 90 tests passed.
- Ran `npm run build`: production build passed.
- Started Vite at `http://127.0.0.1:5173/`, captured the intro page in the in-app browser, and confirmed no console warnings or errors.

## Intro and main menu clarity pass progress
- Started follow-up request to brighten the intro page and replace blurry intro/main-menu backgrounds with clearer source exports.
- Located original GIF sources for intro and main menu under `未使用/root/新UI/`.
- Re-exported `game/public/assets/intro/background.webp` and `game/public/assets/main_menu/v2/background.webp` from source GIFs with higher-quality animated WebP compression.
- Tuned intro CSS brightness/overlay so the screenshot is materially brighter and closer to `示例图.png`.
- Regenerated `runtimeAssetManifest.ts`; current manifest total is 84,274,826 bytes.
- Verified locally in browser: intro and main menu render without console warnings/errors.
- Ran `npm test -- --run`: 6 test files / 90 tests passed.
- Ran `npm run build`: production build passed.

## Intro/main menu sub-10MB clarity pass progress
- Started follow-up request to make intro/main-menu animations clearer while keeping each runtime animated WebP below 10MB.
- Confirmed working tree contains only local crash/planning files before this pass.
- Confirmed current runtime sizes and source GIF metadata; proceeding with candidate exports from the original GIFs.
- Generated candidate animated WebP files at original, 1280, and 1920 widths; selected 1920x1080 pre-scaled versions for better full-screen sharpness under 10MB.
- Replaced `game/public/assets/intro/background.webp` and `game/public/assets/main_menu/v2/background.webp`, regenerated `runtimeAssetManifest.ts`, and updated README/AI_HANDOFF asset totals.
- Ran `npm test -- --run`: 6 test files / 90 tests passed.
- Ran `npm run build`: production build passed.
- Browser verification confirmed the intro background loads as 1920x1080 and the main menu background URL points to `/assets/main_menu/v2/background.webp`.

## Trae handoff progress (2026-05-27)
- Read all project docs to understand game architecture, systems, and conventions.
- Task 1: Tried re-encoding intro/main-menu animated WebP with stronger sharpening at higher quality (q=84/86). User rejected the result as too blurry.
- Task 1 (revised): Replaced `game/public/assets/intro/background.webp` with original `未使用/root/新UI/首页/首页.gif` (46MB) and `game/public/assets/main_menu/v2/background.webp` with original `未使用/root/新UI/第二页/第二页.gif` (37MB). Updated `IntroView.tsx` and `StartMenu.tsx` to reference `.gif` instead of `.webp`.
- Task 2: Modified `.start-menu-home-button` CSS in `game/src/index.css`:
  - Position: top-left → bottom-right (`right:60, bottom:40`)
  - `border-radius`: 4px → 12px (rounded rectangle)
  - `font-family`: KaiTi → JingHuaSongti/SimSun (unified with main menu fonts)
  - `width`: 190px → 210px
- Regenerated `runtimeAssetManifest.ts`: 348 assets, ~161 MiB.
- Ran `npm test -- --run`: 6 files / 90 tests passed.
- Ran `npm run build`: production build passed.
- Updated README.md, AI_HANDOFF.md (date, asset stats, recent changes).

## Documentation consistency audit progress (2026-06-02)
- Started a documentation/source consistency audit at the user's request.
- Added a scoped audit plan to `task_plan.md`.
- No gameplay/source/asset edits made for the audit.
- Read current `README.md` and `AI_HANDOFF.md`.
- Initial potential mismatches spotted: README asset total appears internally inconsistent (`118MiB` in tree vs `198MiB` later), and AI handoff still mentions intro background `.webp` while recent changes claim GIF runtime assets.
- Completed source-vs-doc audit across README, AI handoff, balance guide, event/design docs, tutorial art plan, runtime assets, and both Excel files.
- Verified current source truth by loading TypeScript data and inspecting `gameStore.ts`/`gameCore.ts`: card costs/targets, event queue behavior, equipment drop rates, map event force threshold, equipment caps, and asset totals.
- Confirmed the audit did not modify gameplay/source/assets; only `task_plan.md`, `findings.md`, and `progress.md` were updated with audit notes.

## Versioning policy progress (2026-06-02)
- Set the project/game version to `1.0.0` in `game/package.json` and `game/package-lock.json`.
- Added an intro/home screen version label sourced from `game/package.json`.
- Added documentation rules requiring README/AI_HANDOFF/BALANCE_GUIDE/design docs/data-sheet notes to include the relevant version number on future updates.

## 1.0.0 hand overview progress (2026-06-02)
- Extracted the map-only hand overview into shared `HandOverview`.
- Kept the map label as `手牌一览`; added `查看现有手牌` entries to the shop and combat reward pages.
- Updated README and AI_HANDOFF with the `1.0.0` behavior note.

## 1.0.0 combat readability progress (2026-06-02)
- Planned and implemented the map stat wording change from `真气` to `真气上限`.
- Split the combat effect panel into `增益效果`, `负面效果`, and `装备` tabs.
- Made the long-hover hand preview use an explicit 3000ms delay and 1.5x preview scale.
- Scoped card text readability improvements to combat hand cards.

## 1.0.0 effect details and classification progress (2026-06-02)
- Made folded combat effect and equipment rows clickable, opening a full-text detail dialog.
- Split mixed constitution passives into visible buff/drawback status entries while keeping original passive IDs for rules.
- Hid the `warm_yang_start_count` rules counter so 阳虚质的启动代价只通过负面效果展示.
- Bumped the internal persisted store version to `15` so old saves refresh constitution display statuses.

## 1.0.0 balance guide audit progress (2026-06-02)
- Read `BALANCE_GUIDE.md` and checked current card/enemy/reward facts against `shared/` and `game/src/store/gameStore.ts`.
- Updated the balance guide with `1.0.0` version metadata and current data sources.
- Corrected current formula/herb value statistics and enemy status rows for `cost_up` and `shenbunaqi`.
- Clarified that `boss_spleen_damp` currently logs the water-damp summon hint but does not directly insert `damp_minion`.

## 1.0.0 P1-P5 balance implementation progress (2026-06-02)
- Resumed after interruption from the existing dirty worktree and added a scoped P1-P5 implementation plan to `task_plan.md`.
- Confirmed the previous handoff says code/test changes are mostly implemented, while `BALANCE_GUIDE.md` still has stale changed-card, formula, enemy HP/action, and boss summon rows to finish before final verification.
- Fixed a source/doc mismatch in `山药平补`: card text said end-turn heal 1, while `effectValue` and the core fallback still resolved as 2. Updated `shared/data/cards.ts`, `shared/core/gameCore.ts`, and `gameCore.test.ts`.
- Corrected `BALANCE_GUIDE.md` stale rows for reduced healing cards, formula card effects, formula blueprint effects, enemy HP/pool statistics, ordinary enemy action probabilities, and added the new state-linked enemy actions/status rows.
- First verification run failed on the new `山药平补` assertion, then passed after the contextual data fix.
- Ran `npm test -- --run`: 6 test files / 90 tests passed.
- Ran `npm run build`: production build passed.
- Search checks confirmed map status label is `真气上限`, map hand overview remains `手牌一览`, shop/reward use `HandOverview` default `查看现有手牌`, `LONG_HOVER_PREVIEW_DELAY_MS` is 3000, combat preview scale is 1.5, and low-offense threshold / enemy double-action probabilities are updated.

## 1.0.0 starting attack density follow-up progress (2026-06-02)
- Started implementation from user-approved P1-P5 order for raising low-attack starting decks.
- Computed current attack counts and opening-hand low-attack risk: 5-attack decks have about 43.4% chance to open 0 or 1 attacks; 6-attack decks have about 29.4%.
- Added the follow-up plan to `task_plan.md` and recorded the current balance findings in `findings.md`.
- P1 completed: 阴虚质、痰湿质、特禀质 now each have 7 attack cards while staying at 15 total cards.
- P2 completed: 平和质、气虚质、阳虚质、气郁质 now each have 7 attack cards while staying at 15 total cards.
- P3/P4 completed by verification: 湿热质 remains 8 attacks, 血瘀质 remains 10 attacks, and reward/shop low-offense threshold remains 45%.
- P5 completed: added exact starting-deck attack-count assertions, updated README/AI_HANDOFF/BALANCE_GUIDE and homepage notice with the detailed replacement list.
- Ran `npm test -- --run`: 6 test files / 90 tests passed.
- Ran `npm run build`: production build passed, main JS chunk about 497.30 kB.

## 1.0.0 production deploy progress (2026-06-02)
- Started publish request for repository `https://github.com/r1062046861-RXQ/test1` and online address `test1.renxuanqi.top`.
- Confirmed current branch is `main` tracking `origin/main`, and `origin` points to `git@github.com:r1062046861-RXQ/test1.git`.
- Confirmed `.github/workflows/pages.yml` builds `game` and deploys GitHub Pages on pushes to `main`.
- Confirmed EdgeOne CLI is logged in as account `C2H6O`; production deploy script is `npm run edgeone:deploy`.
- Release staging should exclude untracked `qzj.txt`.
- Committed the release as `9bba413 Release 1.0.0 gameplay and UI updates` and pushed it to `origin/main`.
- GitHub Pages workflow run `26814435965` completed successfully for commit `9bba413`.
- `npm run edgeone:deploy` built successfully and uploaded files, but the EdgeOne deployment `dpxljvq3fmpf` returned cloud status `Failed`.
- Verified `https://test1.renxuanqi.top/` returned HTTP 200 and served `assets/index-Cvmim8hH.js`, the same main JS asset produced by the local production build.
- Verified the online JS contains `1.0.0`, `真气上限`, `查看现有手牌`, and `起始牌组攻击密度`.
