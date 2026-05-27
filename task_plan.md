# Codex crash root repair plan

## Goal
Stop recurring Codex Desktop exits related to the in-app browser by removing stale browser-use state, forcing browser backend selection to the in-app browser only, and resetting browser/Electron persisted state after Codex fully exits.

## Phases
- [x] Phase 1: Confirm current crash symptoms and configuration drift.
- [x] Phase 2: Quarantine the stale historical browser-use thread and remove index/global-state references.
- [x] Phase 3: Re-apply IAB-only configuration and block Chrome bridge leftovers.
- [x] Phase 4: Install an after-exit repair watcher to reset locked app/browser state safely.
- [x] Phase 5: Update diagnostics and give restart instructions.

## Constraints
- Do not open the in-app browser during repair.
- Preserve backups for every file or directory moved.
- Avoid project code changes unrelated to diagnostics.

---

# Project reading plan

## Goal
Deeply understand the WeChat/Web card game project from README, handoff docs, balance docs, event/design docs, spreadsheet data, and core source files without changing gameplay code.

## Phases
- [x] Phase 1: Inventory existing docs, planning files, and repository structure.
- [x] Phase 2: Read README, AI handoff, balance guide, tutorial art plan, event plan, exhibit narrative, and offline package docs.
- [x] Phase 3: Inspect spreadsheet data summaries.
- [x] Phase 4: Inspect core types, game rules, store flow, and data sources.
- [x] Phase 5: Inspect key UI routing/components and asset loading strategy.
- [x] Phase 6: Summarize project architecture, gameplay systems, modification rules, and known risks.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| PowerShell rejected Bash-style `<<'PY'` heredoc while reading spreadsheets | Tried to pipe inline Python with Unix heredoc syntax | Use a PowerShell here-string piped to the bundled Python executable instead |
| Python received Chinese workbook path literals as `????.xlsx` through the PowerShell pipeline | Embedded Chinese file names directly in piped Python source | Let Python discover workbooks with `Path('.').glob('*.xlsx')` so paths come from the filesystem |
| `rg game\src\*.test.ts game\src\**\*.test.ts` failed on Windows glob syntax | Used shell glob patterns as positional paths | Use `rg --glob "*.test.ts" ... game/src` instead |

---

# Intro page UI replacement plan

## Goal
Replace the first intro page UI with the new provided assets from `未使用/root/新UI/起始页修改(1)/起始页修改`, excluding only `示例图.png`, and match the sample image's 1920x1080 proportions, positions, and color mood.

## Phases
- [x] Phase 1: Inspect working tree, current intro implementation, CSS, manifest generation, and source asset dimensions.
- [x] Phase 2: Derive exact sample coordinates for every usable new asset.
- [x] Phase 3: Copy renamed runtime assets into `game/public/assets/intro/v2/`.
- [x] Phase 4: Update `IntroView` and intro CSS to use the new v2 pieces and matching overlay treatment.
- [x] Phase 5: Regenerate runtime asset manifest.
- [x] Phase 6: Run tests/build and browser screenshot verification.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| OpenCV `imread` could not read Chinese filenames directly on Windows | Used raw Chinese paths in `cv2.imread` | Read images through Pillow and pass arrays to OpenCV |
| Chinese filenames in piped Python source appeared as `???` | Used literal Chinese dictionary keys in PowerShell-piped Python | Identify images by dimensions/order instead of embedding names |

---

# Intro and main menu clarity pass

## Goal
Make the intro page brighter to match `示例图.png` more closely, and replace the blurry intro/main-menu animated/background assets with clearer original-source exports using modest compression.

## Phases
- [x] Phase 1: Check working tree and current asset dimensions.
- [x] Phase 2: Locate candidate original/high-quality source assets for intro and main menu backgrounds.
- [x] Phase 3: Re-export clearer runtime WebP assets with reasonable compression.
- [x] Phase 4: Adjust intro CSS brightness/overlay.
- [x] Phase 5: Regenerate manifest and verify with tests/build/browser screenshots.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Pillow script could not open Chinese paths embedded in piped Python source | Used direct Chinese literals in Python source piped through PowerShell | Use environment variables, shell literals, or avoid embedding Chinese path text in Python |

---

# Intro and main menu sub-10MB clarity pass

## Goal
Re-export the intro and main-menu animated backgrounds from the original GIF assets so each runtime WebP is clearer while staying under 10MB per file.

## Phases
- [x] Phase 1: Confirm working tree and current runtime/source asset sizes.
- [x] Phase 2: Generate multiple WebP candidates from the original GIFs.
- [x] Phase 3: Pick the sharpest candidates under 10MB and replace runtime assets.
- [x] Phase 4: Regenerate runtime asset manifest and update documentation if asset totals change.
- [x] Phase 5: Run tests/build and browser verification.

## Constraints
- Keep `game/public/assets/intro/background.webp` and `game/public/assets/main_menu/v2/background.webp` as the runtime paths.
- Each animated background must be below 10MB.
- Do not stage or commit local crash/planning files unless explicitly asked.
