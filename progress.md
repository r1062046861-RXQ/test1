Original prompt: 鍙傝€冭繖涓や釜璁捐绋匡紝瀹屽杽鍗＄墝/鏁屼汉瀹炵幇锛岃璁捐绋垮唴瀹圭粏鑺傚叏閮ㄨ惤鍦般€傚弬鑰冦€婃潃鎴皷濉斻€嬬殑鐜╂硶璁捐锛岄€傚綋鐨勫娓告垙鐜╂硶缁嗚妭杩涜浼樺寲璋冩暣銆?

Notes:
- Initialized progress tracking for the design-driven expansion work.

- 2026-03-16: ????? shared/core/gameCore.ts??? applyCardUpgrade??? Web store ????? Web ???
- 2026-03-16: ????????????????????????? no_yin_gain / fire_growth / ????????????????????????????????? Boss ?????
- 2026-03-16: Web ? Reward/Rest/Shop/Event ???????????? mini ???????????/?????/???????/????
- 2026-03-16: game-mini store ?????????????Taro ????????? external TS???? game-mini/src/shared/ ??????? shared/ ??????????????????????????
- 2026-03-16: ??? game-mini/src/components/EnemyItem.tsx ? fallback ????????????? enemy.id/behavior ??????
- 2026-03-16: ??/?????game ? vitest 8/8 ???npm run build ???game-mini ? npm run build:weapp ????????? warning??
- 2026-03-16: Playwright/???????? output/playwright-checks/???? combat/reward/shop/rest/event ???????????????????????????????????? JSON?
- TODO: ?????????????????? Taro compile/include ? alias ????? game-mini/src/shared/ ?????
- 2026-03-18: Web 绔晫鏂规敾鍑绘紨鍑哄凡鏀逛负 cue 椹卞姩鐨?windup/lunge/impact/recover锛涚帺瀹朵晶鏂板鍙楀嚮鎶栧姩涓庨棯灞忚仈鍔ㄣ€?
- 2026-03-18: Web store 鏂板闈炴寔涔呭寲 enemyActionCue/playerImpactCue锛屽苟灏?advanceTime 鎺ュ叆缁熶竴璋冨害闃熷垪锛屼究浜?Playwright 绋冲畾鎺ㄨ繘銆?
- 2026-03-18: Web 绔凡閫氳繃 vitest 涓?npm run build锛汸laywright 楠屾敹浜х墿杈撳嚭鍒?output/web-enemy-attack/锛岀敤浜庡鏍告晫鏂瑰嚭鎵嬩笌鐜╁鍙楀嚮鑱斿姩銆?
- 2026-03-18: 浜屾寰皟宸叉敹绱ф晫鏂瑰墠鎽囦笌鍛戒腑鍋滈】锛岀帺瀹堕棯灞忓帇鐭苟鍑忓急锛屽弽棣堥噸蹇冭浆鍚戣交鎶栧姩銆?

- 2026-03-18: Web ???????????????/??/???????????????????? 1366x768???? 100% ?????????
- 2026-03-18: Web ?????????????????????????????????????
- 2026-03-18: PlayerStats ????????????????????????????+????????????????????????CombatView ????????????????? STS ???
- 2026-03-18: ?????game ?? `npm test -- --run` ? `npm run build` ???????????????? output/web-ui-checks/?
- 2026-03-18: ????????????????????????? README????? Web???????????? *.md/*.txt ????????????/??????
- 2026-03-18: Web ?????????card_codex???????????????????????????? + ????????????? 85 ????
- 2026-03-18: ????????????/???/Act/???????????????????????????????????? effectId??????????? phase?
- 2026-03-18: ?????game ?? `npm test -- --run` ? `npm run build` ???Playwright ? web_game_playwright_client ??????? output/web-card-codex/?

- 2026-03-18: Web ????????`game/src/components/CardCodexView.tsx` ??????????????/??/????????Act/??/??????????????
- 2026-03-18: `game/src/data/codex.ts` ???? registry ???????????????????????????????????????
- 2026-03-18: ??? `game` ? `npm test -- --run` ? `npm run build`?Playwright + MCP ??????? -> ???? -> ???? -> ???? -> ??????????????? `output/web-codex-v2/`?`output/codex-enemies.png`?`output/codex-glossary-filtered.png`?

- 2026-03-18: Web UI ?????????? `components/ui/PageShell.tsx`??? `index.css` ?????/??/??/??/???????? token?
- 2026-03-18: ?????????????????????????????? STS ??????`Card` / `Enemy` / `PlayerStats` / `Hand` / `CombatLog` / `PassiveEffects` ????????????????
- 2026-03-18: `game` ????? `npm test -- --run` ? `npm run build`?Playwright/Web ???????? `output/ui-start-menu-sts.png`?`output/ui-combat-sts.png`?`output/ui-shop-sts.png`?`output/web-ui-sts/`?
- TODO: ???????????????????? `PageShell`/`Panel` ???????/??????? reveal/confirm ?????

- 2026-03-18: Web 图鉴页已完全切入 PageShell/Panel/Badge/TabButton 母版，统一顶部章节头、分页签条、双栏审阅布局与详情 reveal。
- 2026-03-18: Web 战斗页已继续收口 hover / 出牌 / 回合 reveal：Hand 新增单卡聚焦与邻牌让位、出牌短停顿释放、结束回合按钮提交感与轻量 turn banner。
- 2026-03-18: 本轮已通过 game 的 npm test -- --run 与 npm run build，并用 Playwright + web_game_playwright_client 复核开始菜单、图鉴总览、战斗 hover/出牌/结束回合链路。

- 2026-03-18: Web ?????????????CombatView ???????? + ????? + ????/??????CombatLog / PassiveEffects ??? absolute ???????????????????????????
- 2026-03-18: Hand ????????????????hover ????????????????? release ???????????
- 2026-03-18: StartMenu / MapView / ShopView ????? PageShell ??????????? ??? ????????index.html ?????????????????? favicon???? Playwright ???? favicon 404?
- 2026-03-18: ?????`game` ????? `npm test -- --run` ? `npm run build`?Playwright MCP + web_game_playwright_client ?????????????????hover ????????????? `output/ui-phase4-*.png`?`output/web-ui-phase4-client-final/`?
- TODO: ???????????????????????????????????????????? footer ??????

- 2026-03-18: Web UI ???????? intro ?????? Web ??????????????????????App ?????? intro?render_game_to_text ??? intro ???
- 2026-03-18: ???????????? + ????????Card ?? hand ?? layoutVariant?????????????????? spread / angle / neighborShift??????????????
- 2026-03-18: ???????? 1366x768 ??????????????????????????????? footer ??????????????????
- 2026-03-18: ?????? `game` ? `npm test -- --run` ? `npm run build`?Playwright MCP + web_game_playwright_client ??? intro / ??? / ?? / ?? / ?? hover / ???????? `output/ui-phase5-*.png` ? `output/web-ui-phase5-client/`?
- TODO: ???????????? 9+ ????????? hover ??????? intro ????????? reveal????????????????????

- 2026-03-19: Web UI ??????Hand ?????? 1~6 ? spread?Card ?? reward ???RewardView ???????????/????????????
- 2026-03-19: shared/core/gameCore.ts ? generateMap(15) ????? start + ?????? + chest/boss ????MapView ??????????? hover ?????????????????????
- 2026-03-19: EventView ??? currentAct + currentNodeId??????? free_event???????????????????????????????????????????????
- 2026-03-19: game ????? `npm test -- --run` ? `npm run build`?Playwright ?????? output/web-ui-phase6-client/?output/ui-phase6-map-hover.png?output/ui-phase6-event-result.png?output/ui-phase6-combat-hand.png?
- 2026-04-17: Added a new start-menu new-run flow with local stages closed/cinematic/select so Start/Restart route through a cinematic card intro before constitution selection.
- 2026-04-17: Added ConstitutionIntroOverlay with layered foil cards, skip handling, reduced-motion fallback, and a dark-gold constitution selection stage that still calls startGame directly.
- 2026-04-17: Verified in game/ with npm test -- --run and npm run build, then used Playwright to capture constitution-flow entry/stack/merge/select screenshots plus map transition and continue-run regression.
[2026-04-17 16:20:20] Cardistry constitution intro refresh
- Reworked ConstitutionIntroOverlay packet choreography around a fixed 12-card / 3-packet CSS cardistry animation so the intro now reads as cut shuffle -> squared deck -> dealt constitution cards.
- Kept the existing stage flow intact: Start and Restart enter cinematic/select, Continue still jumps straight to map.
- Validation passed: npm test -- --run, npm run build.
- Playwright validation passed for start/restart cinematic, constitution select, continue-run bypass, early skip, later skip, and mobile width check (scrollWidth 390, innerWidth 390, no horizontal overflow).
- New screenshots saved under output/playwright: constitution-cut-start-cardistry.png, constitution-shuffle-mid-cardistry.png, constitution-squared-cardistry.png, constitution-select-desktop-cardistry.png, constitution-select-mobile-cardistry.png.
- develop-web-game client also ran successfully and wrote output/playwright/webgame-client-cardistry/shot-0.png.[2026-04-17 17:31:00] Combat overlap cleanup at browser 100% zoom
- Reworked CombatView into viewport-tiered combat layout (
egular / compact / 	ight) so the arena and hand band no longer fight for the same vertical space on common desktop heights.
- Updated Enemy to stop treating enemy card assets as readable front-facing art: intent moved into a stable inline badge, status icons moved inside the enemy frame, and the image is now a muted watermark behind the combat UI.
- Updated Hand + Card so battle hand cards use a muted watermark treatment instead of a readable card-face image window, while spread / hover / release motion and card size now scale down on shorter viewports.
- Validation passed: game -> 
pm test -- --run, 
pm run build.
- Playwright validation passed at 1440x900, 1366x768, plus a higher-resolution 1600x1000 regression check. Console remained clean aside from the standard React DevTools info log.
- Final screenshots saved under output/playwright/: combat-1440x900-final.png, combat-1440x900-hover-fixed.png, combat-1366x768-final-v5.png, combat-1600x1000-fixed.png.
- 2026-04-17: Follow-up combat header cleanup confirmed the old full-width battle strip is gone; battle title/turn/Act now live in the left context card, while enemy count and return action stay in a compact arena-top control cluster.
- 2026-04-17: Visual validation screenshot saved to output/playwright/combat-header-removed-validation.png; enemy card header area is no longer blocked, and game -> npm test -- --run still passes.
- 2026-04-17: Rebuilt the web codex overview into a single-page scroll with no tabs, search, or dropdown filters; cards, enemies, and glossary now render sequentially in one parchment directory.
- 2026-04-17: Codex entries now expand inline and allow multiple open items at once; Playwright validation covered overview, inline card/enemy/glossary detail states, mobile width 390 with scrollWidth 390, and __cardCodexState now reports single-page counts plus expanded entry ids.
- 2026-04-17: 鍥鹃壌鎬昏宸蹭粠鈥滃崟椤靛垪琛?+ 鍘熶綅灞曞紑鈥濈户缁敼鎴愨€滃崟椤靛垎娈电綉鏍煎崱鐗?+ 灞呬腑寮瑰眰璇︽儏鈥濓紱鍗＄墝/鏁屼汉/鐘舵€佽瘝鍏镐繚鎸佸悓椤佃繛缁祻瑙堬紝涓嶆仮澶?tab銆佹悳绱㈡垨绛涢€夈€?
- 2026-04-18: Fixed HTTP start-run regression on the custom domain: constitution selection was crashing in `startGame` because `crypto.randomUUID()` is unavailable on insecure origins.
- 2026-04-18: Added `game/src/utils/id.ts` with a `crypto.randomUUID` -> `crypto.getRandomValues` -> `Math.random` fallback chain, and switched runtime card/enemy IDs in `game/src/store/gameStore.ts` to use it.
- 2026-04-18: Added `game/src/utils/id.test.ts`; `game` now passes `npm test -- --run` and `npm run build`, and local HTTP Playwright validation confirmed `start -> skip cinematic -> choose constitution -> map` works again with no console/page errors.
- 2026-04-17: `game/src/components/CardCodexView.tsx` 鐜版敼涓哄崟涓€ `activeEntry` 寮瑰眰鐘舵€侊紝`window.__cardCodexState` 鍒囧埌 `layout: 'single-page-grid'`锛屽苟鏆撮湶 `modalOpen / activeEntryId / activeEntryKind`銆?
- 2026-04-17: `game/src/index.css` 宸茶ˉ榻愬浘閴寸綉鏍间笌寮瑰眰鏍峰紡锛屽苟鎸夌害瀹氳惤鍦板搷搴斿紡鍒楁暟锛氬崱鐗?璇嶅吀 `1/2/3/4` 鍒椼€佹晫浜?`1/2/3` 鍒楋紝鍚屾椂娓呮帀涓婁竴鐗堝垪琛ㄨ鎯呴仐鐣欐柇鐐广€?
- 2026-04-17: 楠岃瘉閫氳繃锛歚game -> npm test -- --run`銆乣npm run build`銆丳laywright 妗岄潰 `1440x900` 涓庣Щ鍔?`390x844` 瀹炴満妫€鏌ワ紱纭鏃?tab/search/filter銆佹闈㈠垪鏁颁负 cards 4 / enemies 3 / glossary 4锛岀Щ鍔ㄧ `scrollWidth === 390`锛屽脊灞傚彲閫氳繃鍏抽棴鎸夐挳 / 閬僵鐐瑰嚮 / `Esc` 鍏抽棴銆?
- 2026-04-17: 鏂伴獙鏀舵埅鍥句綅浜?`output/playwright/`锛歚codex-grid-overview-desktop.png`銆乣codex-grid-card-modal.png`銆乣codex-grid-enemy-modal.png`銆乣codex-grid-glossary-modal.png`銆乣codex-grid-mobile.png`銆乣codex-grid-mobile-modal.png`銆?

[2026-04-17 ASCII handoff] Codex overview now uses single-page segmented grid cards with centered modal details.
[2026-04-17 ASCII handoff] No tabs, no search, no filters. Sections remain cards -> enemies -> glossary on one page.
[2026-04-17 ASCII handoff] window.__cardCodexState now reports layout='single-page-grid', sectionCounts, modalOpen, activeEntryId, activeEntryKind.
[2026-04-17 ASCII handoff] Responsive grid targets validated: desktop 1440x900 => cards 4, enemies 3, glossary 4; mobile 390x844 => scrollWidth 390, no horizontal overflow.
[2026-04-17 ASCII handoff] Modal interactions validated: close button, backdrop click, and Escape all close the modal.
[2026-04-17 ASCII handoff] Screenshots: output/playwright/codex-grid-overview-desktop.png, codex-grid-card-modal.png, codex-grid-enemy-modal.png, codex-grid-glossary-modal.png, codex-grid-mobile.png, codex-grid-mobile-modal.png.
[2026-04-17 ASCII handoff] Codex density follow-up: PageShell now supports scrollable pages so the codex title block and directory navigator scroll away with the content instead of staying fixed in view.
[2026-04-17 ASCII handoff] Card grid density increased for desktop; large screens now render 6 card columns, with compact card tiles and cropped thumbnails so more cards remain visible per viewport.
[2026-04-17 ASCII handoff] Validation: 1600x900 codex grid reports cards=6, enemies=3, glossary=3; after scrolling the internal page scroller, header and navigator move out of view. Screenshots: output/playwright/codex-grid-density-top.png and output/playwright/codex-grid-density-scrolled.png.
[2026-04-17 ASCII handoff] Player-facing brand text pass completed: visible "药灵无双" references in intro, start menu, constitution flow, map/reward/rest/shop/event/chest, codex, browser title, and render_game_to_text intro payload were updated to "五行医道".
[2026-04-17 ASCII handoff] Helper copy was lightly rewritten around wuxing / bianzheng / xunzhen participation, knowledge translation, and cultural subjectivity; direct STS / Slay the Spire wording was removed from player-facing UI copy.
[2026-04-17 ASCII handoff] Static search in game/src plus game/index.html found no remaining matches for 药灵无双, 杀戮尖塔, STS, Chapter Prelude, TCM deckbuilding adventure, 卷轴药典, or 巡诊启程.
[2026-04-17 ASCII handoff] Validation passed in game/: npm test -- --run, npm run build, plus browser text checks for intro, start menu, and codex. Screenshots: output/playwright/branding-intro-visible.png, branding-start-menu-visible.png, branding-codex-visible.png.
[2026-04-17 ASCII handoff] Generated first card-art batch via vectorengine OpenAI-compatible image endpoint using gpt-image-1.5 after confirming the local environment could not reliably reach api.openai.com and the provider-specific image routes differed.
[2026-04-17 ASCII handoff] New unified art replaced cards_player 4/5/10/21/34 for 薏苡除湿 / 生姜发散 / 小柴胡汤 / 黄芪固表 / 当归补血. High-res outputs saved under output/imagegen/card-art-batch-01/masters and runtime 400x600 assets under output/imagegen/card-art-batch-01/runtime.
[2026-04-17 ASCII handoff] Backups of the previous runtime assets were preserved in output/imagegen/card-art-batch-01/pre-replace. A quick contact sheet was also written to output/imagegen/card-art-batch-01/contact-sheet.png.
[2026-04-17 ASCII handoff] Validation passed: runtime files are all 400x600, game npm test -- --run passed, game npm run build passed, and Playwright verified codex overview plus modal rendering with no new console errors. Screenshots: output/playwright/card-art-gpt15/codex-overview.png, danggui-modal.png, and per-card tile captures.

- 2026-04-18: Started GitHub Pages /test1 deployment prep for the web build; added a web-only asset URL resolver and began routing combat/background/codex/constitution/menu image usage through BASE_URL-safe helpers so shared mini-program data can stay unchanged.
- 2026-04-18: Completed GitHub Pages prep for `renxuanqi.top/test1`: `game/vite.config.ts` now builds with base `/test1/`, a new `game/src/utils/assets.ts` resolver keeps web asset URLs BASE_URL-safe, and `.github/workflows/pages.yml` publishes `game/dist` via GitHub Pages.
- 2026-04-18: Added a minimal root `.gitignore` for generated artifacts (`output/`, `.playwright-cli/`, build folders, temp files) so first-time repo creation for `test1` does not accidentally commit deployment byproducts.
- 2026-04-18: Validation passed in `game` with `npm test -- --run` and `npm run build`; built `dist/index.html` emits `/test1/assets/...` URLs, Playwright verified intro, start menu, codex, and combat under a local `http://127.0.0.1:4173/test1/` mount, and `eval` confirmed combat background/enemy images resolve to `/test1/assets/...` with no broken `img` tags.
- 2026-04-18: Deployment artifacts captured under `output/playwright/`: `github-pages-intro-test1.png`, `github-pages-start-menu-test1.png`, `github-pages-codex-test1.png`, `github-pages-combat-test1.png`, plus `webgame-pages-test1/shot-0.png` and `state-0.json` for the `render_game_to_text` smoke check.
- 2026-04-20: Added `game/sync_ai_card_art.py` to batch-sync AI card art from `ai卡牌/` into `game/public/assets/cards_player/` as 450x600 runtime PNGs while leaving the source folder untouched.
- 2026-04-20: Sync audit now lands in `output/ai-card-sync/manifest.json` and `manifest.csv`, recording 53 source files compressed into 51 runtime slots because `01` and `16` intentionally use the selected `2` variants.
- 2026-04-20: Patched `shared/data/cards.ts` so all covered AI-art cards now have `/assets/cards_player/<slot>.png` image fields, including the Act 2 herb cards and the 67-75 treatment cards that previously had no image wiring.
- 2026-04-20: Reworked `game/src/components/Card.tsx` into an image-first card layout: outer card ratio stays unchanged, art uses `object-fit: contain`, hand cards now keep full art visible, and battle hand text is reduced to cost/name/effect summary.
- 2026-04-20: Updated `game/src/components/CardCodexView.tsx` and `game/src/index.css` so codex card tiles, constitution shuffle fronts, and constitution choice cards no longer crop art with `cover`.
- 2026-04-20: Validation passed in `game/` with `npm test -- --run` and `npm run build`; dev-server Playwright checks produced `output/playwright/ai-card-sync/` screenshots for constitution select (desktop/mobile), combat hand, reward, chest, rest upgrade, shop, codex grid, and codex modal, with `summary.json` confirming no console/page errors.
- 2026-04-20: Added root one-click launch helpers `open-web-game.cmd` + `open-web-game.ps1`; double-clicking the `.cmd` now checks Node/npm, installs dependencies on first run, starts `npm run dev -- --host 127.0.0.1 --port 5173`, and opens the browser automatically.
- 2026-04-20: Reworked `game/src/components/Card.tsx` from the boxed art-window layout into a full-card art treatment with translucent overlay UI; header/title/cost now float over the artwork and the old bottom-heavy text stack is gone.
- 2026-04-20: Added a compact `layoutVariant="codex"` card presentation and switched `CardCodexView` card grids to render real mini card faces instead of a separate thumbnail + body tile, so codex browsing now feels art-first and denser.
- 2026-04-20: Updated `game/src/index.css` card shell styling for full-art overlay cards across default/reward/hand/codex, and increased codex card density to 2 / 3 / 4 / 6 columns across the configured breakpoints.
- 2026-04-20: Validation passed in `game/` with `npm test -- --run` and `npm run build`; Playwright confirmed the codex grid now shows 6 cards in the first desktop row at 1440px and captured fresh screenshots under `output/playwright/` (`card-overlay-codex-grid.png`, `card-overlay-codex-modal.png`, `card-overlay-combat.png`, `card-overlay-combat-mobile.png`) with no new console errors on the dev server.
- 2026-04-21: Follow-up readability pass completed around the new full-art cards. `game/src/components/Card.tsx` now opens a centered full-text modal for non-combat description areas, while battle hand cards keep single-click play behavior.
- 2026-04-21: `game/src/index.css` shifted card overlays to a light-paper / dark-ink treatment, softened top and bottom scrims to remove the old black-bar feel around rounded cards, and kept full-art presentation without reverting to the old boxed illustration window.
- 2026-04-21: `game/src/components/Hand.tsx` widened the default spread so the battle hand reads less tightly stacked at desktop 100% zoom, and `game/src/components/IntroView.tsx` brightened the intro hero kicker/button copy for the dark opening scene.
- 2026-04-21: `game/src/components/StartMenu.tsx` now includes a `联系作者` entry plus a dedicated author modal for 王熠 / 任玄奇, and the modal supports backdrop-close. Placeholder QR assets were added at `game/public/assets/author_qr/wang-yi-placeholder.svg` and `game/public/assets/author_qr/ren-xuanqi-placeholder.svg`.
- 2026-04-21: Validation passed in `game/` with `npm test -- --run` and `npm run build`.
- 2026-04-21: Playwright validation on `http://127.0.0.1:4180` confirmed intro readability, the new contact modal, looser combat hand spacing, reward-card description modal, and codex-detail description modal. No console errors were reported in the tested sessions.
- 2026-04-21: New screenshots saved under `output/playwright/`: `intro-readable-uifix.png`, `start-menu-contact-modal-uifix.png`, `combat-hand-uifix.png`, `reward-cards-uifix.png`, `reward-description-modal-uifix.png`, `codex-card-modal-uifix.png`, `codex-description-modal-uifix.png`.
- 2026-04-21: develop-web-game smoke check reran successfully with `output/playwright/webgame-uifix/shot-0.png` and `state-0.json`.
- 2026-04-21: Added root `optimize_repo_images.py` to run repo-wide in-place image optimization with duplicate hash grouping, `source` / `all` modes, and audit output under `output/image-optimization-report/`.
- 2026-04-21: Updated `game/src/components/IntroView.tsx` to remove the standalone “五行初引” kicker node instead of hiding it, keeping the hero block naturally shifted upward.
- 2026-04-21: Updated `game/src/components/StartMenu.tsx` contact data so 任玄奇 now uses `/assets/author_qr/ren-xuanqi.jpg`, while 王熠 keeps the placeholder SVG with distinct alt/copy states for real-vs-placeholder QR display.
- 2026-04-21: Copied the real QR asset from `rxq_qrcode.jpg` into `game/public/assets/author_qr/ren-xuanqi.jpg`; after optimization the runtime asset is 866x848 at 114.53 KB.
- 2026-04-21: Ran `python optimize_repo_images.py --mode source` before builds. Audit summary: scanned 281 images / 224 unique groups, changed 215 groups, saved 285,375,059 bytes, and `output/image-optimization-report/source-summary.json` reports `violationCount: 0`.
- 2026-04-21: Source-mode spot checks after optimization: `game/public/assets/cards_player/4.png` -> 450x600 / 28.02 KB, `game/public/assets/cards_special/86.png` -> 840x630 / 121.53 KB, `game/public/assets/background_combat_act1.png` -> 1366x768 / 245.27 KB, `ai卡牌/01陈皮2.png` -> 131.43 KB.
- 2026-04-21: Validation/build chain passed after source optimization: `game -> npm test -- --run`, `game -> npm run build`, `game-mini -> npm run build:weapp`, `game-mini -> npm run audit:weapp-size`.
- 2026-04-21: Fixed one stale invalid raster artifact at `tmp/gh-pages-clean-check/game/public/assets/cards_special/87.png` by refreshing it from the live source asset before the full-repo pass.
- 2026-04-21: Ran `python optimize_repo_images.py --mode all` after builds to compress generated `dist/`, `tmp/`, and `output/` copies as well. Audit summary: scanned 908 images / 397 unique groups, changed 71 groups, saved 103,427 bytes, and `output/image-optimization-report/all-summary.json` plus `violations.json` confirm `violationCount: 0`.
- 2026-04-21: Re-ran `develop-web-game` smoke validation against `http://127.0.0.1:4181`, producing `output/playwright/webgame-image-optimization-intro/shot-0.png` with no new error artifacts.
- 2026-04-21: Playwright CLI visual validation on `http://127.0.0.1:4181` confirmed the intro no longer shows “五行初引”, the contact modal copy now reads “扫码可联系作者；视觉作者二维码暂为占位图。”, and the modal exposes `img` alt text `王熠二维码占位图` / `任玄奇二维码`.
- 2026-04-21: Fresh screenshots saved to `output/playwright/image-opt-intro-page.png` and `output/playwright/image-opt-contact-modal.png`; Playwright console inspection reported 0 error-level messages in the validated session.
- 2026-04-21: Added immersive `PageShell` support for `tone="immersive"` with plain header/footer chrome options plus extra class hooks, then used it to rebuild the web start menu and map around dark background-forward three-column layouts.
- 2026-04-21: `game/src/components/CardCodexView.tsx` no longer exposes the player-visible `实现备注 / effectId` block inside card detail modals; this remains internal-only in shared data and combat logic.
- 2026-04-21: Player-visible English cleanup for touched pages landed in the codex/menu/map UI: visible `Boss` labels are now `首领`, contact/settings/admin modal kickers are Chinese, and map legend no longer shows internal English node keys.
- 2026-04-21: Found that `game/public/assets/background_map.png` still contained placeholder English (`1920 x 1080 (16:9)` / `Map Selection`), so `MapView` now uses the moonlit `background_main_menu.png` backdrop with a darker overlay instead of exposing placeholder text on the live map screen.
- 2026-04-21: Final validation after the immersive menu/map pass succeeded in `game/` with `npm test -- --run`, `npm run build`, Playwright console error scan (`0` errors), and a develop-web-game smoke run to `output/playwright/webgame-immersive-pass/shot-0.png` + `state-0.json`.
- 2026-04-21: Final visual review screenshots saved to `output/playwright/immersive-start-menu-final.png`, `output/playwright/immersive-contact-modal-final.png`, `output/playwright/immersive-map-final.png`, and `output/playwright/immersive-codex-card-modal-final.png`.
- 2026-04-21: Follow-up trim pass tightened the immersive menu and map further: `StartMenu.tsx` now removes the extra status badges/footnote and shortens the subtitle plus card descriptions; `MapView.tsx` reduces side-copy to one short route note, keeps the right rail to the legend only, and shortens the central map hint.
- 2026-04-21: Card art fill was tightened again in `game/src/components/Card.tsx` + `game/src/index.css`: the main card art now uses a stronger base scale with hover scale handled in CSS, while codex/constitution image previews switched from `contain + padding` to `cover` so rounded cards stop showing pale top/bottom bands.
- 2026-04-21: Fresh validation reran successfully in `game/` with `npm test -- --run` and `npm run build`.
- 2026-04-21: Fresh Playwright pass against `http://127.0.0.1:4182` covered intro, start menu, contact modal, constitution -> map transition, map at `1366x768`, codex overview, codex card modal, and a shop page spot-check. Error-level console scan remained clean (`0`).
- 2026-04-21: New screenshots saved under `output/playwright/immersive-final/`: `intro.png`, `start-menu.png`, `contact-modal.png`, `map.png`, `map-1366x768.png`, `codex-overview.png`, `codex-card-modal.png`, and `shop.png`.
- 2026-04-21: Second deep-theme cleanup pass landed across menu/map/combat/event/codex follow-ups. `StartMenu` contact/settings/admin modals now use dedicated immersive modal chrome, `Card` full-description modal is fully dark, combat leftover parchment panels were rethemed, and reward hover switched from upward translate to scale/shadow-only.
- 2026-04-21: `Enemy.tsx` now renders a right-side stats rail on non-tight desktop viewports so HP/block no longer steals vertical space from the portrait, while `MapView.tsx` keeps the start visible on early floors and renders the legend as a responsive two-column grid.
- 2026-04-21: `EventView.tsx` removed the old stone shrine upgrade outcome; the replacement now grants one random current-act common/uncommon card, so event copy no longer exposes upgrade/strengthen wording.
- 2026-04-21: Follow-up reward layout tightening landed in `RewardView.tsx` + `index.css`; at `1366x768` the three reward cards now stay on a single visible row with no top hover clipping.
- 2026-04-21: Validation after the follow-up passed in `game/` with `npm test -- --run`, `npm run build`, Playwright reward-page verification on `http://127.0.0.1:4183` at `1366x768`, and a console error scan that remained clean (`0` errors).
- 2026-04-21: Started the next UI/system pass for battle/shop/rest. `Enemy.tsx` is being converted from a horizontal HP strip to a vertical HP bar inside the existing right-side stats rail, `ShopView.tsx` was restructured into cards-left / services-right / purify-bottom-left, and `RestView.tsx` was rewritten from heal-or-upgrade into heal-or-remove-two with local removal-step state.
- 2026-04-21: `Card.tsx` gained a local `descriptionModalEnabled` escape hatch so destructive selection contexts (shop purify and camp remove flow) can use whole-card clicks without the description overlay intercepting them.
- 2026-04-21: Validation for the battle/shop/rest pass succeeded in `game/` with `npm test -- --run` and `npm run build`.
- 2026-04-21: Browser validation on `http://127.0.0.1:4183` confirmed the new enemy vertical HP rail at `1366x768`, the reflowed shop layout at desktop plus `390x844` single-column ordering, and the camp remove-two flow through first-pick and completed states. Console error scan stayed clean (`0` errors).
- 2026-04-21: develop-web-game smoke validation also reran successfully via `web_game_playwright_client.js`, writing fresh artifacts to `output/playwright/webgame-battle-shop-rest-pass/`.
- 2026-04-21: Follow-up shop stability fix landed after validation: service effects are no longer stored as closures in offer state, so buying `固本培元` no longer regenerates the entire shop when max HP changes.
- 2026-04-21: Revalidated after the shop fix with a second `npm test -- --run`, `npm run build`, Playwright interaction on `固本培元`, and a final console error scan (`0` errors).
- 2026-04-21: Fixed the enemy-portrait batch mapping issue from `图片2/图片2`: battle enemies were still reading `shared/data/enemies.ts -> /assets/cards_enemy/89-103.png`, while the new art had only been imported to `cards_player/76-85`.
- 2026-04-21: Extended `import_image2_assets.py` so the same compressed source batch now also writes explicit enemy portrait replacements to `cards_enemy/93.png`, `94.png`, `95.png`, `97.png`, `99.png`, and `101.png` for `boss_wind_cold`, `boss_liver_fire`, `qi_blood_stasis`, `heart_kidney_gap`, `boss_spleen_damp`, and `chong_ren_instability`.
- 2026-04-21: Re-ran `python import_image2_assets.py`; the audit manifest now includes `enemy_portrait` records, and the replaced runtime files are 64.5 KB to 124.5 KB instead of the old white placeholder text cards.
- 2026-04-21: Validation passed in `game/` with `npm test -- --run` and `npm run build`.
- 2026-04-21: Browser validation used a Vite dev server plus Playwright CLI dynamic imports of `/src/store/gameStore.ts` and `/src/data/enemies.ts` to force each mapped enemy into combat; DOM inspection confirmed the combat portrait `img` src now resolves to `/assets/cards_enemy/93.png`, `94.png`, `95.png`, `97.png`, `99.png`, and `101.png` respectively.
- 2026-04-21: Left `79 / 80 / 83 / 84` as codex-only enemy-status art for now; they were not force-mapped onto live combat enemies in this pass.
- 2026-04-21: Added a web-only `startAdminEnemyChallenge(enemyId)` store action. It boots a fresh balanced run shell at the selected enemy's codex act, creates direct combat against that exact enemy, and keeps the admin battle independent from normal map pool selection.
- 2026-04-21: Admin debug victories now short-circuit inside `completeCombat()` when `currentNodeId` starts with `admin_enemy_`, routing to `reward` and clearing the fake node id instead of touching map completion or boss act progression.
- 2026-04-21: Rebuilt the StartMenu admin modal to keep the 4 existing quick actions while adding a collapsible enemy picker grouped by `幕次 -> 普通 / 精英 / 首领`. The picker shows portrait, name, act/tier badges, HP, and a one-line summary, with single-select highlighting plus a disabled-until-selected start button.
- 2026-04-21: Added lightweight DOM hooks for regression checks: `#open-admin-panel-btn`, `#admin-picker-toggle-btn`, `#admin-start-enemy-challenge-btn`, and `[data-enemy-id]` on each picker card.
- 2026-04-21: Extended `game/src/store/gameStore.test.ts` with coverage for selected-enemy act routing and the admin reward-path semantics.
- 2026-04-21: Final validation after the admin enemy challenge pass succeeded in `game/` with `npm test -- --run`, `npm run build`, a fresh `develop-web-game` smoke run on `http://127.0.0.1:4184/?admin`, and Playwright browser checks covering picker expansion, close/reopen reset, and direct launches for Act 1 (`boss_wind_cold`), Act 2 (`qi_blood_stasis`), and Act 3 (`chong_ren_instability`) enemies. Artifacts were saved under `output/playwright/admin-enemy-challenge/`.
- 2026-04-21: Admin enemy picker follow-up landed. `StartMenu.tsx` now treats enemy cards as direct-launch buttons, removing the old selected-enemy footer and second "开始挑战" step; clicking a picker card closes the admin modal and starts that exact enemy challenge immediately.
- 2026-04-21: `gameStore.ts` cleanup removed the dead duplicated `startGame()` branch that had been left behind after the newer `buildNewRunState()` path, keeping the start/run bootstrap logic single-sourced.
- 2026-04-21: Battle enemy presentation was reworked in `Enemy.tsx` + `index.css`: mapped enemy portraits now render as the main readable artwork instead of a blurred watermark, while the right-side rail and vertical HP bar remain in place.
- 2026-04-21: `CardCodexView.tsx` now separates player cards from enemy ability cards by filtering `effectId === 'status_enemy'`; the main player card codex no longer includes slots 76-85, and a new standalone `敌方牌库` section now sits between `敌人图鉴` and `状态词典`.
- 2026-04-21: Enemy codex overview/detail were rebuilt around a dedicated `CodexEnemyTile` and a 2:3 portrait modal preview so enemy art now matches the same overall aspect logic as card faces while staying visually larger than the old wide enemy media frame.
- 2026-04-21: Web-only cleanup completed by deleting `game-mini/`, `project.config.json`, `project.private.config.json`, and `WECHAT_MINIPROGRAM_MIGRATION_PLAN.md`; this repo now only retains the web build/game paths plus shared data and asset tooling.
- 2026-04-21: Validation after the web-only/admin-enemy/codex pass succeeded in `game/` with `npm test -- --run` and `npm run build`.
- 2026-04-21: Desktop browser validation on `http://127.0.0.1:4186/?admin` confirmed direct admin launch for `boss_liver_fire`, correct runtime portrait slots for `boss_wind_cold / boss_liver_fire / qi_blood_stasis / heart_kidney_gap / boss_spleen_damp / chong_ren_instability`, zero console errors, and 2:3 enemy codex portrait ratios (`0.667` for both overview tile and detail modal). Artifacts saved under `output/playwright/webonly-admin-enemy-codex/`.
- 2026-04-21: Additional DOM audit saved to `output/playwright/webonly-admin-enemy-codex/codex-aria-check.json` confirms `#cards` now contains 75 player-card entries while `#enemyCards` contains the 10 separated enemy ability cards (`肝火旺` through `冲任不固`).
- 2026-04-21: Combat enemy cards were rebuilt into full-bleed portrait frames in `game/src/components/Enemy.tsx` + `game/src/index.css`; the old inset portrait-window layout is gone and mapped enemy art now covers the entire enemy card with overlay intent/name/status UI on top.
- 2026-04-21: Follow-up desktop fit fix landed in `game/src/components/CombatView.tsx` + `game/src/components/Enemy.tsx`; 1366x768 now keeps the enemy stats rail on the right side again via a desktop-side-rail preference, instead of dropping the vertical HP rail below the card.
- 2026-04-21: Validation passed in `game/` with `npm test -- --run` and `npm run build` after the full-bleed enemy pass.
- 2026-04-21: Browser validation on `http://127.0.0.1:4187/?admin` force-started `boss_liver_fire`, `boss_wind_cold`, `qi_blood_stasis`, `heart_kidney_gap`, `boss_spleen_damp`, and `chong_ren_instability` into combat at both `1440x900` and `1366x768`. Screenshots and DOM metrics were saved to `output/playwright/enemy-fullbleed-4187-r2/`, with `summary.json` confirming `object-fit: cover`, portrait/frame coverage, right-side HP rail visibility, and `consoleErrors: 0`.
- 2026-04-21: Visual spot checks on `boss_liver_fire`, `qi_blood_stasis`, and `heart_kidney_gap` screenshots confirmed the new combat enemy card reads like the full-art hand-card treatment rather than a small inset portrait.
- 2026-04-21: develop-web-game smoke validation reran against `http://127.0.0.1:4187/?admin`; fresh smoke artifacts were updated in `output/web-game/` (`shot-0.png`, `state-0.json`) with no new error-level console output.
- 2026-04-21: Follow-up combat readability pass landed in `game/src/components/Enemy.tsx`, `game/src/components/PlayerStats.tsx`, `game/src/components/PassiveEffects.tsx`, and `game/src/index.css`. Battle enemies now use a three-part desktop layout (`left info + center full portrait + right vertical rail`), the battle intent number is hidden from enemy UI, and local feedback cues were strengthened for enemy hits plus player damage/heal/block/status gain.
- 2026-04-21: `game/src/components/CardCodexView.tsx` + `game/src/index.css` were also tightened for the glossary density pass; the desktop `#glossary .codex-grid--glossary` now renders 6 columns at both `1366x768` and `1440x900`.
- 2026-04-21: Fresh validation reran in `game/` with `npm test -- --run` and `npm run build`; current head still passes 3 test files / 13 tests and a clean production build after the final feedback-strengthening pass.
- 2026-04-21: Final desktop browser verification used Playwright CLI on `http://127.0.0.1:4188/` and `http://127.0.0.1:4188/?admin` at `1366x768`. Confirmed `heart_kidney_gap` combat layout shows left info column, centered full portrait, right vertical HP rail, and no digits in the intent text; DOM metrics and screenshots saved under `output/playwright/enemy-feedback-pass/` (`battle-heart-kidney-gap-1366x768.png`, `codex-glossary-1366x768.png`).
- 2026-04-21: Additional inline feedback captures at `1366x768` confirmed the strengthened local cues remain visible on desktop: `enemy-hit-feedback-1366x768-fixed.png`, `player-hit-feedback-1366x768-inline.png`, `player-block-feedback-1366x768-inline.png`, `player-heal-feedback-1366x768-inline.png`, and `player-status-feedback-1366x768-inline.png` in `output/playwright/enemy-feedback-pass/`.
- 2026-04-21: Console health stayed clean in the final Playwright passes (`consoleErrors: 0` for both battle and codex sessions). For transient combat cues, the reliable verification path was `playwright-cli run-code --filename ...` with in-script `await page.waitForTimeout(...)` before `page.screenshot(...)`; external shell sleeps were not reliable enough to catch the short-lived feedback badges.
