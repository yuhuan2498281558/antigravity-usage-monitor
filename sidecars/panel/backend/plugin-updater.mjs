/**
 * @fileoverview 云端价格表同步与插件双通道更新器（Git Fast-Forward / Release ZIP 覆盖）。
 *
 * 核心能力与多重防御不变量：
 * 1. `syncCloudCatalog`：定期或手动从 GitHub 主干拉取最新 `pricing-catalog.json`，
 *    经 Schema 与可信域名白名单清洗后落盘至 `DATA_DIR/remote_pricing_cache.json` 并热更新内存价格字典；
 * 2. `performPluginUpdate` 严格执行以下防降级与防损坏门禁：
 *    - 开发仓库自动更新隔离：非 `.gemini/config/plugins/` 目录一律禁止后台自动更新（`dev_repo_auto_disabled`），
 *      且若手动更新撞上正在进行的后台自动检查，等待自动检查结束后再执行手动更新；
 *    - 全量工作区干净度门禁（含未跟踪文件）：执行 `git status --porcelain`（不带 `--untracked-files=no`），
 *      只要存在任何已修改或未跟踪文件（`??`），立即终止（`dirty_worktree`），绝不执行 `git stash`；
 *    - 分支门禁：仅允许 `main` 或 `release/*` 发布分支执行快进更新（`not_on_main_branch`），防止污染特性分支或游离 HEAD；
 *    - 强制远端版本门禁（Git 通道）：必须且只能从 `git show origin/<branch>:plugin.json` 解析出合法 SemVer，
 *      严禁回退使用缓存的 `cloudSyncState.latestPluginVersion`；仅当 `remoteVersion > previousVersion` 时才继续；
 *    - 提交拓扑与核心文件门禁：通过 `git merge-base --is-ancestor HEAD origin/<branch>` 确认本地无分叉提交（`diverged_worktree`）；
 *    - ZIP 通道安全覆盖与多余旧文件裁剪：覆盖前备份关键文件，覆盖后清理新版已删除的旧源码文件，异常回滚时同步删除残留新文件。
 */

import { execFile } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  CLOUD_CATALOG_URLS,
  CLOUD_SYNC_RETRY_COOLDOWN_MS,
  CLOUD_SYNC_TTL_MS,
  DATA_DIR,
  DEFAULT_ARCHIVE_FALLBACK_URL,
  DEFAULT_DOWNLOAD_URL,
  LS_ADDR,
  PLUGIN_ROOT,
  REMOTE_CATALOG_CACHE_FILE,
  cloudSyncState,
  loadJson,
  loadSettings,
  pluginUpdateState,
  saveJson,
} from './config.mjs';
import {
  compareSemver,
  getCloudStatus,
  isValidSemver,
  readInstalledPluginVersion,
  rebuildActiveCatalog,
  sanitizeCatalogPayload,
} from './pricing-catalog.mjs';

/**
 * 以 Promise 形式安全执行外部子进程命令（默认隐藏 Windows 控制台窗口并设置 25 秒超时）。
 *
 * @param {string} cmd 可执行文件名
 * @param {string[]} args 参数列表
 * @param {object} [opts] `execFile` 附加选项
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
function runExecFile(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    if (typeof execFile !== 'function') {
      reject(new Error('execFile unavailable in current environment'));
      return;
    }
    execFile(cmd, args, { windowsHide: true, timeout: 25000, ...opts }, (err, stdout, stderr) => {
      if (err) {
        const detail = String(stderr || stdout || err.message || '').trim();
        reject(new Error(detail || err.message));
        return;
      }
      resolve({ stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

/**
 * 更新完成后调度 Sidecar 进程平滑退出，让宿主进程监督器自动重启新代码。
 * 在单元测试环境（`!LS_ADDR || LS_ADDR === 'test.invalid'`）下自动跳过。
 *
 * @param {number} [delayMs=350] 延迟毫秒数，确保当前 HTTP 响应先发回前端
 */
export function scheduleSidecarRestart(delayMs = 350) {
  if (!LS_ADDR || LS_ADDR === 'test.invalid' || typeof process?.exit !== 'function') return;
  setTimeout(() => {
    try {
      process.exit(0);
    } catch {
      // 忽略退出异常
    }
  }, delayMs);
}

/**
 * 在解压后的临时目录中定位包含 `plugin.json` 的插件根目录（兼容顶层平铺或单层子目录包装）。
 *
 * @param {string} extractDir 解压目标目录
 * @returns {string|null}
 */
function locateExtractedPluginRoot(extractDir) {
  if (existsSync(join(extractDir, 'plugin.json'))) return extractDir;
  try {
    for (const name of readdirSync(extractDir)) {
      const sub = join(extractDir, name);
      if (existsSync(join(sub, 'plugin.json'))) {
        return sub;
      }
    }
  } catch {
    // 忽略目录读取错误
  }
  return null;
}

/**
 * `cpSync` 安全过滤函数：严格禁止覆盖 `.git`、`.data`、`node_modules`、`plan` 或临时更新目录。
 *
 * @param {string} srcPath
 * @returns {boolean}
 */
function isSafeCopyPath(srcPath) {
  const name = basename(String(srcPath || '')).toLowerCase();
  if (
    name === '.git' ||
    name === '.data' ||
    name === 'node_modules' ||
    name === 'plan' ||
    name.startsWith('.update-staging-')
  ) {
    return false;
  }
  return true;
}

/**
 * 递归清理 `targetDir` 中在 `referenceDir` 已不存在的多余文件/目录（保护 `.git`/`.data`/`node_modules`/`plan`）。
 * 用于 ZIP 升级后清理旧版废弃源码文件，以及在覆盖中途异常回滚时清除半途写入的新增文件。
 *
 * @param {string} targetDir
 * @param {string} referenceDir
 */
function pruneExtraneousFiles(targetDir, referenceDir) {
  if (!existsSync(targetDir) || !existsSync(referenceDir)) return;
  let names = [];
  try {
    names = readdirSync(targetDir);
  } catch {
    return;
  }
  for (const name of names) {
    const targetChild = join(targetDir, name);
    if (!isSafeCopyPath(targetChild)) continue;
    const refChild = join(referenceDir, name);
    if (!existsSync(refChild)) {
      try {
        rmSync(targetChild, { recursive: true, force: true });
      } catch {
        // 忽略单项删除异常
      }
    } else {
      pruneExtraneousFiles(targetChild, refChild);
    }
  }
}

/**
 * 在真实运行环境下对目标目录的核心 JS 文件执行 `node --check` 语法预检。
 *
 * @param {string} rootDir 插件根目录或解压目录
 */
async function verifyPluginJsSyntax(rootDir) {
  if (!LS_ADDR || LS_ADDR === 'test.invalid') return;
  const nodeBin = process?.execPath || 'node';
  const filesToCheck = [
    join(rootDir, 'sidecars', 'panel', 'main.mjs'),
    join(rootDir, 'sidecars', 'panel', 'app.js'),
  ];
  for (const file of filesToCheck) {
    if (existsSync(file)) {
      await runExecFile(nodeBin, ['--check', file]);
    }
  }
}

/**
 * 执行插件本体更新（支持手动一键更新与后台静默更新）。
 *
 * @param {{ isAuto?: boolean }} [options]
 * @returns {Promise<object>} 更新结果对象
 */
export async function performPluginUpdate({ isAuto = false } = {}) {
  if (pluginUpdateState.inFlight) {
    if (isAuto || !pluginUpdateState.inFlightIsAuto) {
      return pluginUpdateState.inFlight;
    }
    // 若用户点击手动更新时恰好有一轮后台自动更新检查正在运行，等待其收尾后再按手动模式继续执行
    await pluginUpdateState.inFlight.catch(() => {});
    if (pluginUpdateState.inFlight) {
      return pluginUpdateState.inFlight;
    }
  }

  pluginUpdateState.inFlightIsAuto = Boolean(isAuto);
  pluginUpdateState.inFlight = (async () => {
    pluginUpdateState.isUpdating = true;
    pluginUpdateState.lastError = null;
    const previousVersion = readInstalledPluginVersion();
    const hasGit = existsSync(join(PLUGIN_ROOT, '.git'));
    const normalizedRoot = PLUGIN_ROOT.replace(/\\/g, '/').toLowerCase();
    const isInstalledPluginDir = normalizedRoot.includes('/.gemini/config/plugins/');

    try {
      if (hasGit) {
        // 0. 开发仓库（非 ~/.gemini/config/plugins/）一律禁止后台自动更新
        if (isAuto && !isInstalledPluginDir) {
          const msg = '当前处于本地开发仓库，已自动禁用后台静默更新';
          const result = {
            ok: false,
            skipped: true,
            mode: 'git',
            reason: 'dev_repo_auto_disabled',
            previousVersion,
            currentVersion: previousVersion,
            message: msg,
            updatedAtMs: Date.now(),
          };
          pluginUpdateState.lastResult = result;
          return result;
        }

        // 1. 全量工作区检查（包含未跟踪文件 ??）：只要存在任何未提交改动或新增未跟踪文件，立即中止
        const statusRes = await runExecFile('git', ['-C', PLUGIN_ROOT, 'status', '--porcelain']);
        const isDirty = statusRes.stdout.trim().length > 0;
        if (isDirty) {
          const msg = isInstalledPluginDir
            ? '本地文件有改动，已跳过覆盖更新'
            : '开发目录有未提交修改，已跳过更新';
          pluginUpdateState.lastError = isAuto ? null : msg;
          pluginUpdateState.lastResult = {
            ok: false,
            skipped: true,
            mode: 'git',
            reason: 'dirty_worktree',
            previousVersion,
            currentVersion: previousVersion,
            message: msg,
            updatedAtMs: Date.now(),
          };
          return pluginUpdateState.lastResult;
        }

        // 2. 分支检查：仅当处于 main 或 release/* 发布分支时才允许快进拉取，防止污染特性分支或游离 HEAD
        const branchRes = await runExecFile('git', [
          '-C',
          PLUGIN_ROOT,
          'rev-parse',
          '--abbrev-ref',
          'HEAD',
        ]);
        const currentBranch = branchRes.stdout.trim();
        const isAllowedBranch =
          !currentBranch ||
          currentBranch === 'main' ||
          /^release\/[0-9A-Za-z._-]+$/.test(currentBranch);
        if (!isAllowedBranch) {
          const msg = `当前分支为 ${currentBranch}，已跳过更新`;
          pluginUpdateState.lastError = isAuto ? null : msg;
          pluginUpdateState.lastResult = {
            ok: false,
            skipped: true,
            mode: 'git',
            reason: 'not_on_main_branch',
            branch: currentBranch,
            previousVersion,
            currentVersion: previousVersion,
            message: msg,
            updatedAtMs: Date.now(),
          };
          return pluginUpdateState.lastResult;
        }

        const targetBranch = currentBranch || 'main';
        const remoteRef = `origin/${targetBranch}`;

        // 3. 只读拉取远端分支引用，并严格从 origin/<branch>:plugin.json 读取远端版本号（严禁回退使用缓存版本）
        await runExecFile('git', ['-C', PLUGIN_ROOT, 'fetch', 'origin', targetBranch, '--tags']);

        let remoteVersion = '';
        try {
          const showRes = await runExecFile('git', [
            '-C',
            PLUGIN_ROOT,
            'show',
            `${remoteRef}:plugin.json`,
          ]);
          const parsedManifest = JSON.parse(showRes.stdout || '{}');
          const rawVer =
            typeof parsedManifest?.version === 'string' ? parsedManifest.version.trim() : '';
          if (isValidSemver(rawVer)) {
            remoteVersion = rawVer.replace(/^v/i, '');
          }
        } catch {
          remoteVersion = '';
        }

        // 4. 强制版本门禁：远端版本无法确认或不高于当前版本时，严禁执行 git pull 降级/覆盖
        if (!remoteVersion || compareSemver(remoteVersion, previousVersion) <= 0) {
          const msg = `当前已是最新版本 (v${previousVersion})`;
          const result = {
            ok: false,
            skipped: true,
            upToDate: true,
            mode: 'git',
            reason: 'already_up_to_date',
            previousVersion,
            currentVersion: previousVersion,
            remoteVersion: remoteVersion || previousVersion,
            message: msg,
            updatedAtMs: Date.now(),
          };
          pluginUpdateState.lastResult = result;
          return result;
        }

        // 5. 提交拓扑预检：确保当前 HEAD 是远端分支的祖先提交（无本地超前或分叉提交）
        try {
          await runExecFile('git', [
            '-C',
            PLUGIN_ROOT,
            'merge-base',
            '--is-ancestor',
            'HEAD',
            remoteRef,
          ]);
        } catch {
          const msg = '本地分支存在未推送提交，已跳过更新';
          pluginUpdateState.lastError = isAuto ? null : msg;
          pluginUpdateState.lastResult = {
            ok: false,
            skipped: true,
            mode: 'git',
            reason: 'diverged_worktree',
            previousVersion,
            currentVersion: previousVersion,
            message: msg,
            updatedAtMs: Date.now(),
          };
          return pluginUpdateState.lastResult;
        }

        // 6. 确认全部门禁通过后，执行快进合并并校验 JS 语法
        await runExecFile('git', ['-C', PLUGIN_ROOT, 'pull', '--ff-only', 'origin', targetBranch]);
        await verifyPluginJsSyntax(PLUGIN_ROOT);
        rebuildActiveCatalog();
        const currentVersion = readInstalledPluginVersion();
        const result = {
          ok: true,
          mode: 'git',
          previousVersion,
          currentVersion,
          restarting: true,
          message: `已升级至 v${currentVersion}，正在重启面板…`,
          updatedAtMs: Date.now(),
        };
        pluginUpdateState.lastResult = result;
        scheduleSidecarRestart();
        return result;
      }

      // Release ZIP 归档更新通道（适用于无 .git 的压缩包安装目录）
      const targetVersion = cloudSyncState.latestPluginVersion || '';
      if (!isValidSemver(targetVersion) || compareSemver(targetVersion, previousVersion) <= 0) {
        const msg = `当前已是最新版本 (v${previousVersion})`;
        const result = {
          ok: false,
          skipped: true,
          upToDate: true,
          mode: 'zip',
          reason: 'already_up_to_date',
          previousVersion,
          currentVersion: previousVersion,
          remoteVersion: targetVersion || previousVersion,
          message: msg,
          updatedAtMs: Date.now(),
        };
        pluginUpdateState.lastResult = result;
        return result;
      }

      const candidateUrls = [
        cloudSyncState.downloadUrl || DEFAULT_DOWNLOAD_URL,
        cloudSyncState.archiveFallbackUrl || DEFAULT_ARCHIVE_FALLBACK_URL,
      ].filter(Boolean);

      let lastZipErr = null;
      for (const zipUrl of candidateUrls) {
        const stagingDir = join(DATA_DIR, `.update-staging-${Date.now()}`);
        const zipFile = join(stagingDir, 'bundle.zip');
        const extractDir = join(stagingDir, 'extracted');
        const backupDir = join(stagingDir, 'backup');
        try {
          mkdirSync(extractDir, { recursive: true });
          const res = await fetch(zipUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(25000),
          });
          if (!res.ok) {
            throw new Error(`下载更新包失败 (HTTP ${res.status})`);
          }
          const buf = Buffer.from(await res.arrayBuffer());
          // 校验 ZIP 文件头魔数 ('PK') 与最小合理体积
          if (buf.length < 1024 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
            throw new Error('下载的更新包格式校验未通过');
          }
          writeFileSync(zipFile, buf);

          if (process.platform === 'win32') {
            await runExecFile('powershell.exe', [
              '-NoProfile',
              '-NonInteractive',
              '-Command',
              `Expand-Archive -LiteralPath '${zipFile.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force`,
            ]);
          } else {
            await runExecFile('unzip', ['-oq', zipFile, '-d', extractDir]);
          }

          const extractedRoot = locateExtractedPluginRoot(extractDir);
          if (
            !extractedRoot ||
            !existsSync(join(extractedRoot, 'sidecars', 'panel', 'main.mjs')) ||
            !existsSync(join(extractedRoot, 'sidecars', 'panel', 'app.js')) ||
            !existsSync(join(extractedRoot, 'sidecars', 'panel', 'styles.css')) ||
            !existsSync(join(extractedRoot, 'sidecars', 'panel', 'index.html'))
          ) {
            throw new Error('更新包缺少核心插件文件');
          }

          const extractedManifest = loadJson(join(extractedRoot, 'plugin.json'), null);
          const rawExtractedVer =
            typeof extractedManifest?.version === 'string'
              ? extractedManifest.version.trim()
              : '';
          const extractedVer = isValidSemver(rawExtractedVer)
            ? rawExtractedVer.replace(/^v/i, '')
            : '';
          if (!extractedVer || compareSemver(extractedVer, previousVersion) <= 0) {
            throw new Error(
              `下载包版本 (v${extractedVer || '未知'}) 不高于当前已安装版本 (v${previousVersion})，已拒绝降级覆盖`
            );
          }
          if (
            zipUrl !== candidateUrls[candidateUrls.length - 1] &&
            compareSemver(targetVersion, extractedVer) > 0
          ) {
            throw new Error(
              `Release 压缩包版本 (v${extractedVer}) 尚未同步至 v${targetVersion}，切换至主干归档源`
            );
          }

          // 覆盖前先对解压目录执行 JS 语法预检，防止损坏代码覆盖现有安装
          await verifyPluginJsSyntax(extractedRoot);

          // 备份当前插件根目录关键文件，覆盖后清理已废弃旧文件；若覆盖途中异常则完整回滚并移除残留新文件
          mkdirSync(backupDir, { recursive: true });
          cpSync(PLUGIN_ROOT, backupDir, { recursive: true, force: true, filter: isSafeCopyPath });
          try {
            cpSync(extractedRoot, PLUGIN_ROOT, {
              recursive: true,
              force: true,
              filter: isSafeCopyPath,
            });
            pruneExtraneousFiles(PLUGIN_ROOT, extractedRoot);
          } catch (copyErr) {
            try {
              cpSync(backupDir, PLUGIN_ROOT, {
                recursive: true,
                force: true,
                filter: isSafeCopyPath,
              });
              pruneExtraneousFiles(PLUGIN_ROOT, backupDir);
            } catch {
              // 忽略回滚二级异常
            }
            throw copyErr;
          }

          try {
            rmSync(stagingDir, { recursive: true, force: true });
          } catch {
            // 忽略临时目录清理错误
          }

          rebuildActiveCatalog();
          const currentVersion = readInstalledPluginVersion();
          const result = {
            ok: true,
            mode: 'zip',
            previousVersion,
            currentVersion,
            restarting: true,
            message: `已下载并更新至 v${currentVersion}，正在重载面板…`,
            updatedAtMs: Date.now(),
          };
          pluginUpdateState.lastResult = result;
          scheduleSidecarRestart();
          return result;
        } catch (err) {
          lastZipErr = err;
          try {
            rmSync(stagingDir, { recursive: true, force: true });
          } catch {
            // 忽略临时目录清理错误
          }
        }
      }
      throw lastZipErr || new Error('未能下载可用的插件更新包');
    } catch (err) {
      const errMsg = err?.message || '插件更新失败';
      pluginUpdateState.lastError = errMsg;
      const result = {
        ok: false,
        mode: hasGit ? 'git' : 'zip',
        previousVersion,
        currentVersion: readInstalledPluginVersion(),
        message: errMsg,
        updatedAtMs: Date.now(),
      };
      pluginUpdateState.lastResult = result;
      return result;
    } finally {
      pluginUpdateState.isUpdating = false;
      pluginUpdateState.inFlightIsAuto = false;
      pluginUpdateState.inFlight = null;
    }
  })();
  return pluginUpdateState.inFlight;
}

/**
 * 同步云端 `pricing-catalog.json` 目录并在满足条件时触发插件自动更新。
 *
 * @param {{ force?: boolean, urls?: string[] }} [options]
 * @returns {Promise<ReturnType<typeof getCloudStatus>>}
 */
export async function syncCloudCatalog({ force = false, urls = CLOUD_CATALOG_URLS } = {}) {
  if (cloudSyncState.inFlight) return cloudSyncState.inFlight;
  const now = Date.now();
  if (!force) {
    if (cloudSyncState.fetchedAtMs > 0 && now - cloudSyncState.fetchedAtMs < CLOUD_SYNC_TTL_MS) {
      return getCloudStatus();
    }
    if (
      cloudSyncState.lastAttemptMs > 0 &&
      now - cloudSyncState.lastAttemptMs < CLOUD_SYNC_RETRY_COOLDOWN_MS
    ) {
      return getCloudStatus();
    }
  }

  cloudSyncState.inFlight = (async () => {
    cloudSyncState.isSyncing = true;
    cloudSyncState.lastAttemptMs = Date.now();
    let lastErr = null;
    try {
      for (const url of urls) {
        try {
          const sep = url.includes('?') ? '&' : '?';
          const reqUrl = force ? `${url}${sep}_t=${Date.now()}` : url;
          const res = await fetch(reqUrl, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Cache-Control': 'no-cache',
            },
            signal: AbortSignal.timeout(4500),
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const raw = await res.json();
          const sanitized = sanitizeCatalogPayload(raw);
          if (!sanitized) {
            throw new Error('Invalid cloud catalog schema');
          }
          const persisted = {
            ...sanitized,
            fetchedAtMs: Date.now(),
            sourceUrl: url,
          };
          saveJson(REMOTE_CATALOG_CACHE_FILE, persisted);
          cloudSyncState.fetchedAtMs = persisted.fetchedAtMs;
          cloudSyncState.sourceUrl = url;
          cloudSyncState.lastError = null;
          rebuildActiveCatalog();

          const statusAfter = getCloudStatus();
          const settings = loadSettings();
          if (
            statusAfter.updateAvailable &&
            settings.autoUpdatePlugin &&
            !pluginUpdateState.isUpdating &&
            pluginUpdateState.lastAutoAttemptVersion !== statusAfter.latestPluginVersion
          ) {
            pluginUpdateState.lastAutoAttemptVersion = statusAfter.latestPluginVersion;
            performPluginUpdate({ isAuto: true }).catch(() => {});
          }
          return statusAfter;
        } catch (err) {
          lastErr = err;
        }
      }
      cloudSyncState.lastError = lastErr?.message || '云端价格表同步失败';
      return getCloudStatus();
    } finally {
      cloudSyncState.isSyncing = false;
      cloudSyncState.inFlight = null;
    }
  })();

  return cloudSyncState.inFlight;
}
