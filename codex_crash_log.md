# Codex Crash Log

This file tracks observed Codex desktop crashes or abnormal exits for later debugging.

## 2026-05-25 19:52:10 Asia/Shanghai

- Source: Windows Error Reporting, Application log
- Event ID: 1001
- Event name: RADAR_PRE_LEAK_64
- App: Codex.exe
- App version: 3044.0.0.0
- Fault bucket: 1863072461365216345
- Report ID: 2323556d-7a65-41dc-94b8-a3906b5c973a
- Hashed bucket: 8e5ae6f34b384d6f59daf6885a7c8459
- Report status: 268435456
- Cab ID: 0
- WER location: NULL
- Attached temp files reported by WER:
  - `C:\Users\C2H6O\AppData\Local\Temp\RDR64E.tmp\empty.txt`
  - `C:\ProgramData\Microsoft\Windows\WER\Temp\WER.f160912a-192e-4519-a6a3-5b0124b3b47a.tmp.WERInternalMetadata.xml`
  - `C:\ProgramData\Microsoft\Windows\WER\Temp\WER.83c30c7f-c8dd-41c6-a78e-de3e26a9b8cf.tmp.csv`
  - `C:\ProgramData\Microsoft\Windows\WER\Temp\WER.01c29602-f998-4bb7-bd55-b1eedb561338.tmp.txt`
  - `C:\ProgramData\Microsoft\Windows\WER\Temp\WER.2a283da0-fde3-4a62-b1fc-b04696168601.tmp.xml`

Command used to inspect recent events:

```powershell
Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Windows Error Reporting'; StartTime=(Get-Date).AddDays(-7)} |
  Where-Object { $_.Message -like '*Codex.exe*' } |
  Select-Object TimeCreated,Id,ProviderName,Message |
  Format-List
```

## 2026-05-25 22:06:00 Asia/Shanghai

- Repair applied for in-app browser crash on open.
- Confirmed `wire_api = "responses"` in `C:\Users\C2H6O\.codex\config.toml`; earlier logs showed `wire_api = "chat"` was rejected by the current Codex build.
- Found repeated `chrome@openai-bundled` install failures: `plugin_cache_windows_file_lock` / access denied while backing up the old cache.
- Stopped only the locked `extension-host.exe` process for the bundled Chrome plugin, isolated the partial cache, and reinstalled the bundled plugin with:

```powershell
codex plugin add chrome@openai-bundled
```

- Verified plugin status:
  - `browser@openai-bundled (installed, enabled)`
  - `chrome@openai-bundled (installed, enabled)`
- Verified the Codex in-app browser can create and show an `about:blank` tab without crashing.

## 2026-05-25 22:33:00 Asia/Shanghai

- Follow-up repair for crash when closing the in-app browser.
- Observed close-time lifecycle in Codex logs:
  - `webcontents-destroyed`
  - `syncing browser use active state ... isActive=false`
  - `renderer detached visible browser sidebar webview`
  - followed by a new Codex process a few seconds later.
- Found the external Chrome plugin host had respawned and was again locking `chrome@openai-bundled`, causing startup reconciliation to fail with `plugin_cache_windows_file_lock`.
- Stopped the stale `extension-host.exe` and its parent `cmd.exe`.
- Disabled the external Chrome extension plugin in `C:\Users\C2H6O\.codex\config.toml`:

```toml
[plugins."chrome@openai-bundled"]
enabled = false
```

- Kept the actual Codex in-app browser plugin enabled:

```toml
[plugins."browser@openai-bundled"]
enabled = true
```

- Reset sidebar local-server state by renaming:
  - `C:\Users\C2H6O\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Roaming\Codex\browser-sidebar-local-servers.json`
  - to `browser-sidebar-local-servers.json.before-close-crash-reset-20260525-223209`
- Attempted to rename the in-app browser Chromium partition, but the running Codex process still held it open:
  - `C:\Users\C2H6O\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Roaming\Codex\Partitions\codex-browser-app`
- Verified open-close behavior through the in-app browser interface:
  - show browser panel
  - hide browser panel
  - result: no Codex crash, tab remained on `about:blank`
- Verified logs after the fix:
  - no new `plugin_cache_windows_file_lock`
  - no new `render-process-gone`
  - no new Windows Error Reporting event for Codex
  - bundled plugin reconciliation completed successfully

## 2026-05-26 02:06:00 Asia/Shanghai

- Follow-up repair after another crash when closing the in-app browser.
- `chrome@openai-bundled` was still disabled in `C:\Users\C2H6O\.codex\config.toml`, but Google Chrome had the Codex Chrome extension installed:
  - extension id: `hehggadaopoacecdllhhajmbjkdcmajg`
  - native messaging host: `com.openai.codexextension`
- The Chrome extension launched:
  - `C:\Users\C2H6O\.codex\plugins\cache\openai-bundled\chrome\latest\extension-host\windows\x64\extension-host.exe`
- This reintroduced the plugin cache lock even though Codex's plugin config had the Chrome plugin disabled.
- Backed up and removed the Chrome native messaging host registry key:
  - key: `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.openai.codexextension`
  - backup: `C:\Users\C2H6O\.codex\backups\codex-browser-crash-20260526-020425\com.openai.codexextension.reg`
  - manifest backup: `C:\Users\C2H6O\.codex\backups\codex-browser-crash-20260526-020425\com.openai.codexextension.json`
- Stopped the stale `extension-host.exe` and its parent `cmd.exe`.
- Verified after waiting:
  - registry key no longer exists
  - `extension-host.exe` did not respawn
  - no new `plugin_cache_windows_file_lock`
  - no new Windows Error Reporting event for Codex
- Verified in-app browser open/close path via automation:
  - opened `about:blank`
  - closed/hid panel
  - Codex process stayed alive
- Also tested a webview teardown path:
  - `browser sidebar guest torn down`
  - `webcontents-destroyed`
  - no Codex crash or restart occurred
- The in-app browser profile directory is still locked by the running Codex process and network service:
  - `C:\Users\C2H6O\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Roaming\Codex\Partitions\codex-browser-app`
- Installed a one-time hidden cleanup watcher:
  - script: `C:\Users\C2H6O\.codex\backups\codex-browser-crash-20260526-020425\reset-codex-browser-profile-after-exit.ps1`
  - behavior: waits until Codex fully exits, then renames `codex-browser-app` to a timestamped backup
  - log: `C:\Users\C2H6O\.codex\backups\codex-browser-crash-20260526-020425\reset-codex-browser-profile-after-exit.log`
