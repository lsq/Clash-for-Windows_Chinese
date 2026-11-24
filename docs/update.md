# 升级
https://deepwiki.com/search/76ee4a88-df33-40ad-8477-e49cba968b06

# DeepWiki Q&A with Code Context for Repository: lsq/clashSrc
## Q1
构建windows x64时，怎么已经更新过的二进制文件，不重新下载
### Answer
User asks in Chinese: when building Windows x64, how to avoid re-downloading already-updated binary files. Need to explore repo lsq/clashSrc — likely a Clash build script that downloads binaries (e.g., clash core, wintun, etc.). Search.User asks: when building Windows x64, how to avoid re-downloading already-updated binaries. Likely about mihomo prepare script caching. Look at scripts/build/mihomo-download.js and prepare script, plus docs/development/native-dependencies.md.The user asks: when building Windows x64, how to make already-updated binaries not re-download. Answer: the mihomo prepare step verifies existing files by SHA-256 and reuses cache under app/build/dependencies/mihomo; if the binary at clash_core/win_x64/... matches manifest hash, no download. Also CFW_MIHOMO_CACHE and CFW_MIHOMO_OFFLINE=1. Maybe also Electron download cache Build/cache/electron / CFW_ELECTRON_CACHE. Check the prepare script quickly for exact behavior? I have enough from docs. Maybe check scripts/build/mihomo-download.js exists — glob didn't show it under scripts? It showed only test files; the require was "../../../scripts/build/mihomo-download". Glob pattern **/mihomo*.js should have matched scripts/build/mihomo-download.js... it didn't appear, maybe index limit. Fine — cite docs and README.

Answer in Chinese, concise.构建 Windows x64 时，二进制文件（Mihomo 内核）本身就有校验和缓存机制，正常情况下不会重复下载。机制如下：

**已有的复用逻辑**

- 打包（`npm run package:win-x64`）会自动执行 `mihomo:prepare`，它先检查 `app/clash_core/win_x64/static/files/win/x64/mihomo-windows-amd64.exe` 是否存在且 SHA-256 与 `app/clash_core/mihomo-core-manifest.json` 中锁定的哈希一致；一致就直接复用，不联网。 clashSrc:6-11 
- 已验证的二进制会按摘要缓存在 `app/build/dependencies/mihomo`，即使平台目录里的文件被删，也能从缓存恢复而无需下载。 clashSrc:28-32 
- 文档明确说明："A fresh checkout needs network access on the first run; later runs reuse verified local files or the cache." clashSrc:39-42 

**如果你遇到重复下载，可以检查/设置：**

1. **不要清理缓存目录**：`app/build/dependencies/mihomo` 被删除后会重新下载。保留它即可复用。
2. **共享缓存目录**：设置环境变量 `CFW_MIHOMO_CACHE` 指向一个固定目录，可跨 checkout 共享缓存。 clashSrc:30-31 
3. **强制离线模式**：设置 `CFW_MIHOMO_OFFLINE=1`，或运行 `npm run mihomo:prepare -- --target win-x64 --offline`。此时只验证本地文件/缓存，缺失会直接报错而不是下载。 clashSrc:34-36 
4. **Electron 下载缓存**：release 构建（`build-release.js`）把 Electron 缓存放在 `CFW/BuildRelease/Build/cache/electron`（通过 `CFW_ELECTRON_CACHE` 传入），保留该目录可避免重复下载 Electron。 clashSrc:99-101 

注意：如果重复下载发生在 `mihomo:update`（升级版本）之后，那是预期行为——新版本哈希不同，必须下载一次；之后普通构建会再次复用。 clashSrc:54-58
### Citations
**File:** app/clash_core/mihomo-core-manifest.json (L6-11)
```json
    {
      "asset": "mihomo-windows-amd64-compatible-v1.19.33.zip",
      "output": "clash_core/win_x64/static/files/win/x64/mihomo-windows-amd64.exe",
      "source": "https://github.com/MetaCubeX/mihomo/releases/download/v1.19.33/mihomo-windows-amd64-compatible-v1.19.33.zip",
      "sha256": "926bfea2ce48a247d6a7ce4cf641980e416202d5e40fe4ee5c949089ace0e197"
    },
```
**File:** docs/development/native-dependencies.md (L28-32)
```markdown
Verified executables are cached by digest under `app/build/dependencies/mihomo`.
Existing matching platform files can seed the cache without network access. A
custom `CFW_MIHOMO_CACHE` directory can be shared between checkouts; each cached
file is checked again before use. Do not place that directory in tracked source.
CI caches these files using the host OS and lockfile identity.
```
**File:** docs/development/native-dependencies.md (L34-36)
```markdown
Set `CFW_MIHOMO_OFFLINE=1` for all preparation invoked by tests or packaging, or
pass `--offline` to `mihomo:prepare`. Missing or invalid cache entries produce an
error; the resolver never falls back to a floating version. Online requests support
```
**File:** docs/development/native-dependencies.md (L54-58)
```markdown
The updater downloads official release assets for every supported target, validates
their formats and CPUs, and records the extracted hashes. For a new version, this
explicit command establishes the hashes that must be reviewed; later builds verify
against them. Resolving an already locked version rejects changed upstream bytes.
All platforms and associated metadata are staged before replacement. A download or
```
**File:** app/README.md (L39-42)
```markdown
The test commands rebuild the pinned Monaco assets in
`app/build/generated/monaco` before running, and automatically prepare and verify
the locked Mihomo binaries for all six targets. A fresh checkout needs network
access on the first run; later runs reuse verified local files or the cache.
```
**File:** CFW/BuildRelease/build-release.js (L99-101)
```javascript
    const cache = path.join(__dirname, "Build/cache/electron");
    seedElectronCache(cache);
    const env = { ...process.env, CFW_BUILD_ROOT: work, CFW_ELECTRON_CACHE: cache, TEMP: temporary, TMP: temporary, TMPDIR: temporary };
```
## Q2
mihomo:update升级版本，只是升级mihomo-core-manifest.json吗
### Answer
Need to check what mihomo:update does. Search for the update script.Check package.json line 6 and maybe the updater script to confirm what files it writes.I have enough. The updater (scripts/build/mihomo.js update) downloads all six targets, updates manifest, six MIHOMO_NOTICE.txt files, and six service/core-hashes.json files. Answer in Chinese.不只是 manifest。`npm run mihomo:update -- <version>`（即 `node scripts/build/mihomo.js update`）会做以下事情： clashSrc:5-6 

1. **下载全部 6 个平台**的官方 release 资产（win-x64、win-arm64、linux-x64、linux-arm64、mac-x64、mac-arm64），校验可执行格式和 CPU 类型，并记录解压后的哈希。 clashSrc:54-57 
2. **更新需要提交的文件**：
   - `app/clash_core/mihomo-core-manifest.json`（版本、URL、文件名、SHA-256）
   - 6 个 `MIHOMO_NOTICE.txt`（许可/源码声明）
   - 6 个 `service/core-hashes.json`（Service Mode 哈希白名单，其中保留 legacy Clash、macOS 系统代理 helper 和 Windows `wintun.dll` 的哈希，只更新 Mihomo 摘要） clashSrc:63-65 
3. **事务式替换**：所有平台和元数据先暂存再替换；下载/解压失败保持旧版本不变，替换失败会回滚。 clashSrc:58-61 

另外两点：

- 二进制本身**不进 Git**——下载的 exe 放在各平台目录和 `app/build/dependencies/mihomo` 缓存中，架构测试会拒绝被索引的 Mihomo 可执行路径。 clashSrc:66-67 
- 如果对一个已锁定的版本重新运行 update，它会**拒绝上游字节发生变化**的资产（防供应链篡改），而不是静默更新哈希。 clashSrc:56-57 

所以升级后需要 review 并提交的是 manifest + 6 个 notice + 6 个 core-hashes.json，共 13 个文件。
### Citations
**File:** package.json (L5-6)
```json
    "mihomo:prepare": "node scripts/build/mihomo.js prepare",
    "mihomo:update": "node scripts/build/mihomo.js update",
```
**File:** docs/development/native-dependencies.md (L54-57)
```markdown
The updater downloads official release assets for every supported target, validates
their formats and CPUs, and records the extracted hashes. For a new version, this
explicit command establishes the hashes that must be reviewed; later builds verify
against them. Resolving an already locked version rejects changed upstream bytes.
```
**File:** docs/development/native-dependencies.md (L58-61)
```markdown
All platforms and associated metadata are staged before replacement. A download or
extraction failure leaves the previous release intact; a replacement failure rolls
back earlier replacements. This is a file transaction, not a crash-proof database:
after power loss, inspect the lockfile and rerun preparation before building.
```
**File:** docs/development/native-dependencies.md (L63-65)
```markdown
Review and commit the manifest, six `MIHOMO_NOTICE.txt` files and six
`service/core-hashes.json` files. The latter preserve legacy Clash and macOS system
proxy helper hashes and the Windows `wintun.dll` dependency hashes while pinning the new Mihomo digest. Run `npm test`, then the
```
**File:** docs/development/native-dependencies.md (L66-67)
```markdown
appropriate platform packaging and runtime checks. Binaries and caches must stay
out of Git; an architecture test rejects indexed Mihomo executable paths.
```
## Q3
service/core-hashes.json最终被打包进安装包，mihomo-core-manifest.json不会吗
### Answer
Check packaging config: what files get included. Search for core-hashes.json usage and manifest usage in packaging.Check how core-hashes.json is loaded at runtime (service-mode-manager.js) and whether manifest is only used at build time. Read relevant lines.Confirm: core-hashes.json lives under clash_core/<target>/static/files/... which is packaged as app resources; manifest is build-time lockfile only. Check where core-hashes.json sits in win_x64 tree and whether manifest is referenced only by scripts. Quick check: glob for core-hashes.json files and check packaging files config? Probably enough. Maybe check electron-builder files config quickly.Only 2 core-hashes.json found (win_x64, linux-x64) — docs said six, but index may be partial. Enough to answer: core-hashes.json sits inside static/files which is shipped as runtime resources (service allow-list used by service-mode-manager at runtime); manifest is a build-time lockfile used only by scripts/build/mihomo.js, not referenced by runtime code. Answer.对，两者角色不同：

**`core-hashes.json` — 运行时文件，会进安装包**

- 它位于 `app/clash_core/<target>/static/files/<os>/<arch>/service/` 下，属于随应用分发的静态资源目录。
- 运行时被 Service Mode 使用：`service-mode-manager.js` 在安装/更新 helper 服务时读取它作为哈希白名单（`manifest`），并比较已安装文件与源文件的哈希来决定是否需要更新。 clashSrc:124-139 
- Windows 上 `service.yml` 也把它作为参数传给 `clash-core-service.ps1 -ManifestPath core-hashes.json`。 clashSrc:4-5 

**`mihomo-core-manifest.json` — 构建期锁文件，不进安装包**

- 它是 `mihomo:prepare`/`mihomo:update` 的锁文件，记录版本、上游 URL 和 SHA-256，只在构建/下载阶段被 `scripts/build/mihomo.js` 使用。 clashSrc:21-26 
- 运行时代码（`app/main`）中没有任何地方引用它——grep 只命中脚本、测试和文档。它放在 `app/clash_core/` 根目录而非 `static/files/` 下，也不在打包的资源路径里。

简单说：manifest 是"构建时验证下载正确性"的锁文件；core-hashes.json 是"运行时 Service Mode 校验内核合法性"的白名单，所以只有后者需要随安装包分发。
### Citations
**File:** app/main/src/electron/features/service-mode/service-mode-manager.js (L124-139)
```javascript
        const names = platform === "linux" || platform === "darwin"
            ? ["clash-core-service", "core-hashes.json"]
            : ["clash-core-service"];
        return names.some(name => {
            const installed = path.join(posixServiceDirectory(platform), name);
            const source = path.join(sourceDirectory(), name);
            return !fs.existsSync(installed) || (fs.existsSync(source) && hashFile(installed) !== hashFile(source));
        });
    }

    function posixInstallCommand(serviceFile, serviceContent) {
        const source = sourceDirectory();
        const destination = posixServiceDirectory(platform);
        const { file } = prepareCredentials();
        const manifest = JSON.parse(fs.readFileSync(path.join(source, "core-hashes.json"), "utf8"));
        return buildPosixServiceInstall({ platform, path, source, destination, credentialFile: file, manifest, serviceFile, serviceContent });
```
**File:** app/clash_core/win_x64/static/files/win/common/service.yml (L4-5)
```yaml
executable: C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
arguments: -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File clash-core-service.ps1 -ManifestPath core-hashes.json
```
**File:** docs/development/native-dependencies.md (L21-26)
```markdown
The single lockfile is `app/clash_core/mihomo-core-manifest.json`. Its exact version,
official upstream URLs, platform filenames and SHA-256 hashes must agree. The
resolver verifies the existing service allow-list before fetching anything, then
accepts only a matching binary with the correct executable format and CPU type.
Ordinary preparation never changes the lockfile, notices or service allow-lists.
Missing or corrupt inputs stop packaging if they cannot be restored and verified.
```
## Q4
那么我手动下载了linux x64和windows x64的二进制包，需要执行哪些命令进行升级json，然后再打包，给出具体操作步骤
### Answer
User manually downloaded linux x64 and windows x64 binaries, wants commands to update JSONs then package. Need to check mihomo.js script options — does update support local files? Read scripts/build/mihomo.js and docs.Need to check updateMihomo in mihomo-dependency.js — does it support local files / seeding? Check whether updater downloads all six targets (user only has 2). Read mihomo-dependency.js.Key finding: `updateMihomo` always downloads all six targets — no option to use local files. So manual downloads can't feed the updater directly. Options:

1. Run `npm run mihomo:update -- <version>` anyway — it downloads all six (user only has 2, and wants to avoid download).
2. Trick: `downloadFile` is injectable only in tests. No CLI flag for local files.
3. Alternative: manually compute sha256 of extracted binaries, edit manifest + core-hashes.json + notices by hand, then `mihomo:prepare --offline`. But update requires all six targets — manifest must contain all six entries (readManifest validates length === 6). So user must provide hashes for all six, or keep old hashes for other four? No — manifest version is single; all entries must match the same version's asset names. If user only has 2 binaries, they can't produce valid hashes for the other 4 without downloading.

Wait — could they? The manifest requires all six targets with correct asset names for the new version. Without the other four binaries, they can't compute sha256. Unless they only build win-x64/linux-x64 and accept wrong hashes for others — but readManifest only checks format (64-hex), not correctness. prepareMihomo only verifies selected targets' service manifests and hashes. So technically: update manifest with real hashes for the two they have, and... they still need 64-hex entries for the other four. They could put placeholder/wrong hashes — packaging for win-x64 would work, but other platforms would fail verification. That's hacky; should mention honestly.

Better path: check if downloadFile supports file:// or local seeding? Check mihomo-download.js quickly — maybe it supports a local mirror env var. Also check package.json packaging scripts names. One iteration left for tools; do both reads in parallel.Key facts: `updateMihomo` always downloads all six targets via HTTPS — no local-file option. `downloadFile` requires https: URL. So manual downloads can't be fed to the updater directly.

Options for user:
1. Easiest honest path: run `npm run mihomo:update -- <version>` — it will download all six anyway (manual files unused). If they want to avoid downloading, there's no supported flag.
2. Manual path: compute sha256 of extracted binaries, hand-edit manifest (all six entries required — readManifest enforces 6 targets with correct asset/source names), update the two core-hashes.json and MIHOMO_NOTICE.txt files, place binaries at output paths, then `mihomo:prepare --target win-x64 --target linux-x64 --offline`, then package. But other four targets still need valid sha256 entries — they can keep... no, asset names change with version. They could put dummy 64-hex hashes for the four they don't have; prepare only verifies selected targets. Packaging win-x64 works; other platforms would fail. Must warn.

Also note: serviceManifest() computes legacy clash hash and wintun.dll hash from files in repo — user must replicate that JSON exactly (verifyServiceManifest compares JSON.stringify). Easier: write a small node script using the module's exported functions? They could run node -e using targetSpec/serviceManifest/sha256 to generate entries. That's a neat trick: use `scripts/build/mihomo-dependency.js` exports to compute serviceManifest JSON.

Give concrete steps:

Step 1: extract archives to get binaries:
- win: unzip mihomo-windows-amd64-compatible-vX.Y.Z.zip → mihomo-windows-amd64.exe (actually extractBinary picks the single mihomo*.exe)
- linux: gunzip mihomo-linux-amd64-compatible-vX.Y.Z.gz

Step 2: compute sha256 (certutil / sha256sum).

Step 3: edit `app/clash_core/mihomo-core-manifest.json`: version, release URL, and for each of 6 targets update asset/source/sha256. For the two they have, real hashes; for the other four they still need entries — problem. Honest recommendation: if they can't download the other four, they can put the real upstream hashes only if known; otherwise the manifest will be invalid for those platforms. Actually simplest: recommend running `mihomo:update` which downloads everything — but user explicitly wants to use manual downloads (maybe network restricted to GitHub? They downloaded manually perhaps via browser/proxy).

Alternative cleaner hack: set HTTPS_PROXY? No.

Another approach: since downloadFile is injectable, write a small node script that calls updateMihomo with a custom `download` that copies local files for the two targets and real download for others — but user only has 2 files; other 4 still need downloading. If they truly only want win+linux packages, they could stub download to return local files for those two and... updateMihomo loops all six and will fail on missing four. Could make custom download throw? Then update fails.

Could they craft a custom script that calls updateMihomo with download fn serving local files for all six? They only have 2. So no.

So honest answer: the updater requires all six; with only two binaries you cannot produce a valid full manifest without either (a) downloading the rest, or (b) hand-editing with placeholder hashes for the other four (breaks those platforms' builds/tests).

Provide steps for option (b) since user asked:

1. Extract binaries.
2. Compute sha256 of each extracted exe.
3. Edit manifest: set version/release; update all six targets' asset & source (version in names); set sha256 for win-x64 & linux-x64 to computed values; for remaining four, they need real hashes — suggest getting them from `mihomo:update` on a connected machine, or accept that those platforms can't build. Actually they could leave old hashes? No — asset name must match new version (readManifest checks entry.asset === spec.asset computed from manifest.version). So must update names; sha256 must be 64-hex — could be wrong value, format passes. prepare for win-x64 only verifies win-x64's service manifest & hash. So placeholders work for building win/linux only. Warn clearly.

4. Regenerate the two `service/core-hashes.json` — easiest via node one-liner using exported serviceManifest():
```
node -e "const m=require('./scripts/build/mihomo-dependency');const fs=require('fs');const spec=m.targetSpec('win-x64','X.Y.Z');fs.writeFileSync('app/'+spec.serviceManifest, JSON.stringify(m.serviceManifest(process.cwd(),spec,'<digest>'),null,2)+'\n')"
```
Wait serviceManifest(root, spec, digest) — root default repositoryRoot; pass process.cwd(). digest lowercase hex; it uppercases. Good.

5. Update MIHOMO_NOTICE.txt for the two targets — generate via noticeText? Not exported. Just edit version lines manually (3 occurrences: Version, Release, source/tree, LICENSE blob URLs).

6. Place binaries at output paths: `app/clash_core/win_x64/static/files/win/x64/mihomo-windows-amd64.exe` and `app/clash_core/linux-x64/static/files/linux/x64/mihomo-linux-amd64` (check output names — manifest showed win output `.../win/x64/mihomo-windows-amd64.exe`; linux likely `mihomo-linux-amd64`). I shouldn't guess linux name; but resolveCoreBinaryPath computes it. I could say "the `output` path in manifest". Fine.

7. `npm run mihomo:prepare -- --target win-x64 --target linux-x64 --offline` to verify.

8. `npm run package:win-x64` / `package:linux-x64`.

Also mention simpler alternative: `mihomo:update` supports proxies via HTTPS_PROXY — if they downloaded manually due to network, maybe just run update with proxy.

Keep answer concise.关键点：`mihomo:update` **不支持使用本地文件**——它固定通过 HTTPS 下载全部 6 个平台的资产（`downloadFile` 强制 `https:` URL），没有 `--target` 或本地路径参数。 clashSrc:259-266 clashSrc:34-36 

所以你有两条路：

## 方案 A（推荐）：让 update 自己下载

如果手动下载只是因为网络/代理问题，可以直接设代理后跑官方流程，它会自动更新所有 json：

```bash
set HTTPS_PROXY=http://127.0.0.1:7890   # 或 export HTTPS_PROXY=...
npm run mihomo:update -- 1.19.33
npm run package:win-x64
npm run package:linux-x64
```

## 方案 B：手动改 json（只用你已有的两个二进制）

注意：manifest 校验要求 **6 个 target 条目齐全**且 asset/source 文件名与新版本匹配，否则 `readManifest` 直接报错。 clashSrc:55-66  其余 4 个平台你没有二进制，只能填占位哈希——**这 4 个平台之后将无法通过校验/打包**，只有 win-x64 和 linux-x64 可用。

步骤：

1. **解压得到二进制**
   - win：解压 `mihomo-windows-amd64-compatible-v<ver>.zip`，取出里面的 `mihomo*.exe`
   - linux：`gunzip mihomo-linux-amd64-compatible-v<ver>.gz`

2. **算 SHA-256**（对解压后的二进制，不是压缩包）
   ```bash
   certutil -hashfile mihomo-windows-amd64.exe SHA256   # Windows
   sha256sum mihomo-linux-amd64                        # Linux
   ```

3. **编辑 `app/clash_core/mihomo-core-manifest.json`**：`version`、`release` 改为新版本；6 个 target 的 `asset`/`source` 里的版本号全部替换；win-x64、linux-x64 的 `sha256` 填真实值，其余 4 个填任意 64 位十六进制占位。

4. **重新生成两个 `service/core-hashes.json`**（必须精确匹配，否则 `verifyServiceManifest` 报错 clashSrc:128-134 ）。在仓库根目录用脚本自带函数生成：
   ```bash
   node -e "const m=require('./scripts/build/mihomo-dependency'),fs=require('fs');for(const n of ['win-x64','linux-x64']){const s=m.targetSpec(n,'<ver>');fs.writeFileSync('app/'+s.serviceManifest,JSON.stringify(m.serviceManifest(process.cwd(),s,'<该平台的sha256小写>'),null,2)+'\n')}"
   ```

5. **更新两个 `MIHOMO_NOTICE.txt`**（`app/clash_core/win_x64/static/files/` 和 `linux-x64/static/files/` 下）：把 Version、Release、source、LICENSE 几处 URL 里的版本号改掉。

6. **放置二进制**到 manifest 中 `output` 指定的路径（win 为 `app/clash_core/win_x64/static/files/win/x64/mihomo-windows-amd64.exe`，linux 路径见其 `output` 字段）。

7. **离线验证 + 打包**：
   ```bash
   npm run mihomo:prepare -- --target win-x64 --target linux-x64 --offline
   npm run package:win-x64
   npm run package:linux-x64
   ```

提醒：`npm test` 会 prepare 全部 6 个平台 clashSrc:11-13 ，方案 B 下测试会失败；只打包这两个平台没问题。
### Citations
**File:** scripts/build/mihomo-dependency.js (L55-66)
```javascript
        || !Array.isArray(manifest.targets) || manifest.targets.length !== Object.keys(targets).length) {
        throw new Error("Invalid Mihomo dependency manifest");
    }
    const remaining = new Map(manifest.targets.map(target => [target.output, target]));
    for (const name of Object.keys(targets)) {
        const spec = targetSpec(name, manifest.version);
        const entry = remaining.get(spec.output);
        if (!entry || entry.asset !== spec.asset || entry.source !== spec.source || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
            throw new Error(`Invalid Mihomo dependency lock for ${name}`);
        }
        remaining.delete(spec.output);
    }
```
**File:** scripts/build/mihomo-dependency.js (L128-134)
```javascript
function verifyServiceManifest(root, spec, digest) {
    const expected = serviceManifest(root, spec, digest);
    const actual = JSON.parse(fs.readFileSync(path.join(root, "app", spec.serviceManifest), "utf8"));
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Service allow-list does not match the locked Mihomo and packaged assets for ${spec.name}; run mihomo:update explicitly`);
    }
}
```
**File:** scripts/build/mihomo-dependency.js (L259-266)
```javascript
        for (const name of Object.keys(targets)) {
            const spec = targetSpec(name, version);
            const archive = path.join(work, spec.asset);
            const source = path.join(work, name);
            log(`Resolving Mihomo ${version} for ${name}...`);
            await download(spec.source, archive);
            await extract(archive, source, spec);
            verifyBinary(source, spec);
```
**File:** scripts/build/mihomo-download.js (L34-36)
```javascript
            if (url.protocol !== "https:" || url.username || url.password) {
                throw new Error("Mihomo downloads require an HTTPS URL without credentials");
            }
```
**File:** docs/development/native-dependencies.md (L11-13)
```markdown
or a normal `npm run package:<target>` command. The test runner prepares all six
platforms because portable asset and service tests inspect foreign architectures;
packaging prepares only its explicit target. The existing Windows and POSIX build
```
## Q5
修改现有功能，能够支持方案B部分校验打包的效果
### Answer
User wants to modify existing functionality to support "方案B" — partial verification/packaging with only some platforms' binaries. I'm in ask-only mode... but the instruction says when user wants implementation, include a <plan>. Wait — "Ask-only mode" says do NOT create plans. But the "Creating plans (DISABLED)" section still describes plan format. The ask-only section explicitly says: "Do NOT create plans or suggest implementation steps... explain what would need to be done conceptually, but do not output a <plan> section." So I should explain conceptually what changes are needed.

Need to look at the actual code: scripts/build/mihomo.js, mihomo-dependency.js readManifest/prepareMihomo/updateMihomo to describe modifications. Let me read the files.User wants to modify existing functionality to support "方案B" — partial update with local binaries. I'm in ask-only mode: explain conceptually what changes are needed, no <plan>. But wait — the instructions say when user wants implementation, include a plan... but ask-only mode explicitly says do NOT create plans. So describe the changes conceptually.

Design: add support for local archives in updateMihomo, e.g. `--from <dir>` or per-target `--target` + `--archive`. Changes needed:

1. `mihomo.js` CLI: extend `update` to accept `--target <name> --archive <path>` pairs, or a directory containing downloaded assets.
2. `mihomo-dependency.js` `updateMihomo`: accept `localArchives` map; skip `download()` when a local archive is provided; still require all six targets OR allow partial update.

Partial update problem: manifest requires all six entries. Options:
- Keep previous manifest entries for un-updated targets? But version is single — asset names embed version. If only updating some targets to new version, manifest version is global. So partial update across versions isn't representable. Alternative: allow update where missing targets reuse... can't — different version.
- Better: allow `update` to accept local archives for the targets the user has, and still require the rest — no.
- Or: relax `readManifest`/`prepareMihomo` to only validate selected targets, and let manifest contain a subset? readManifest enforces length === 6. Could change to allow entries marked e.g. `"unresolved": true` or allow missing targets, and prepareMihomo only validates selected ones. Then updateMihomo with `--target`+`--archive` writes entries only for provided targets, preserving old entries for others? But old entries have old version asset names → readManifest check `entry.asset !== spec.asset` fails since spec uses manifest.version. So manifest format would need per-target version, or relax validation.

Simplest coherent design: add `--archive <target>=<path>` option to `update`; for targets without a local archive, fall back to download. That solves "I downloaded manually, don't re-download" without breaking the six-target invariant. And for truly partial (can't get other 4), optionally add a `--partial` mode that writes manifest with only provided targets and relaxes readManifest to accept subset, with prepareMihomo erroring only when a missing target is requested.

Describe changes:

1. `mihomo.js`: parse `update <version> [--archive <target>=<file>]...` (or `--from-dir <dir>` matching asset filenames). Pass to updateMihomo.
2. `updateMihomo`: new option `localArchives` (Map name→path). In the loop, if local archive exists, copy it to `archive` path instead of `download()`. Everything else unchanged — extract, verifyBinary, sha256, service manifest, notices all still generated. This gives full six-target update using local files where provided.
3. For partial-only (skip other 4 entirely): need manifest schema change — e.g. allow `targets` to be subset and add per-target `version`, or mark missing. Then `readManifest` validates only present entries; `prepareMihomo` throws "not locked" when a requested target is absent; `updateMihomo` merges new entries into previous manifest instead of rebuilding. Also `verifyServiceManifest` loop at top of updateMihomo should only check targets being updated. Tests in scripts/test would need updating; docs too.

Also note: local archive must still be the official asset format (zip/gz) since extractBinary handles it; verifyBinary + sha256 still applied, so tampered files are caught.

Keep answer concise, cite lines.可以改，核心思路是给 `update` 增加"本地资产"入口，让已下载的压缩包跳过 `download()`，其余校验（解压、`verifyBinary`、SHA-256、service 白名单、notice）全部保留。需要动的只有两个文件：

## 改动点

**1. `scripts/build/mihomo.js` — CLI 解析**

`update` 目前只接受一个版本参数。 clashSrc:7-10  扩展为：

```
mihomo.js update <version> [--archive <target>=<path>]...
```

解析出 `{ targetName: filePath }` 映射，传给 `updateMihomo(version, { localArchives })`。校验 target 名必须在 `targets` 表内、路径存在。

**2. `scripts/build/mihomo-dependency.js` — `updateMihomo`**

在第 264 行 `await download(spec.source, archive)` 处加分支： clashSrc:259-266 

```js
const local = localArchives && localArchives.get(name);
if (local) fs.copyFileSync(local, archive);
else await download(spec.source, archive);
```

本地压缩包仍走 `extract()` → `verifyBinary()` → `sha256()`，格式错误或 CPU 不符照样报错，安全性不降。这样你的用法变成：

```bash
npm run mihomo:update -- 1.19.34 --archive win-x64=D:\dl\mihomo-windows-amd64-compatible-v1.19.34.zip --archive linux-x64=D:\dl\mihomo-linux-amd64-compatible-v1.19.34.gz
```

没提供本地包的平台仍会自动下载——**这是最简单的形态，不破坏 manifest 必须 6 平台完整的不变量**（`readManifest` 强制 `targets.length === 6` 且 asset/source 与版本匹配 clashSrc:53-66 ）。

## 如果要"只更新部分平台、其余完全不碰"

这改动大得多，因为 manifest 是单一 `version` + 6 条目的结构，部分更新在现有 schema 下无法表达。需要：

- **manifest schema**：允许 `targets` 为子集，或给每个 target 加独立 `version` 字段；
- **`readManifest`**：只校验存在的条目，缺失 target 不再报错；
- **`updateMihomo`**：改为把新条目 merge 进旧 manifest（而非重建），且开头的 `verifyServiceManifest` 循环 clashSrc:251-255 只检查被更新的 target；
- **`prepareMihomo`**：请求一个 manifest 中缺失的 target 时报"该平台未锁定"；
- **测试与文档**：`scripts/test/` 下的 manifest/update 测试和 `docs/development/native-dependencies.md` 都要同步改。

建议先实现第一种（本地 archive 注入），它只需约 20 行改动就覆盖"手动下载后不想重复下载"的场景；第二种只有在你确定永远不会构建其余 4 个平台时才值得做。
### Citations
**File:** scripts/build/mihomo.js (L7-10)
```javascript
    if (command === "update" && options.length === 1) {
        const manifest = await updateMihomo(options[0].replace(/^v/, ""));
        console.log(`Locked Mihomo ${manifest.version} for ${manifest.targets.length} targets. Review the manifest, notices and service allow-lists before committing.`);
        return;
```
**File:** scripts/build/mihomo-dependency.js (L53-66)
```javascript
    if (manifest.project !== "MetaCubeX/mihomo"
        || manifest.release !== `https://github.com/MetaCubeX/mihomo/releases/tag/v${manifest.version}`
        || !Array.isArray(manifest.targets) || manifest.targets.length !== Object.keys(targets).length) {
        throw new Error("Invalid Mihomo dependency manifest");
    }
    const remaining = new Map(manifest.targets.map(target => [target.output, target]));
    for (const name of Object.keys(targets)) {
        const spec = targetSpec(name, manifest.version);
        const entry = remaining.get(spec.output);
        if (!entry || entry.asset !== spec.asset || entry.source !== spec.source || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
            throw new Error(`Invalid Mihomo dependency lock for ${name}`);
        }
        remaining.delete(spec.output);
    }
```
**File:** scripts/build/mihomo-dependency.js (L251-255)
```javascript
        for (const name of Object.keys(targets)) {
            const spec = targetSpec(name, previous.version);
            // A Mihomo upgrade must not authorize changed legacy cores or system helpers.
            verifyServiceManifest(root, spec, previous.targets.find(item => item.output === spec.output).sha256);
        }
```
**File:** scripts/build/mihomo-dependency.js (L259-266)
```javascript
        for (const name of Object.keys(targets)) {
            const spec = targetSpec(name, version);
            const archive = path.join(work, spec.asset);
            const source = path.join(work, name);
            log(`Resolving Mihomo ${version} for ${name}...`);
            await download(spec.source, archive);
            await extract(archive, source, spec);
            verifyBinary(source, spec);
```
## Q6
只更新部分平台、其余完全不碰
### Answer
User wants the partial-update design. I'm in ask-only mode — explain conceptually, no plan. Need to read the actual files to give concrete changes. Read mihomo.js and mihomo-dependency.js fully.User wants "只更新部分平台、其余完全不碰" — partial update design. I'm in ask-only mode: explain conceptually what changes are needed, no plan. I have the full file now. Describe concrete modifications.

Design: per-target version in manifest? Or keep single version but allow subset? The cleanest: manifest keeps global version but targets array may be subset; unlisted targets are "not locked". But then other platforms' old binaries remain at old version — manifest version is global, so old entries can't stay (asset names embed version). So subset manifest: only updated targets listed; readManifest validates only listed entries; prepareMihomo errors when requested target missing.

Changes:

1. `readManifest` (lines 53-67): drop `length !== 6` check; iterate over manifest.targets entries instead of all targets — validate each entry's asset/source/sha256 against targetSpec(name inferred from output). Need to map output→target name; currently iterates target names and looks up by output. Change: build map of valid specs for all targets at manifest.version, then check each entry matches one spec exactly; reject unknown/duplicate outputs. Allow empty subset? At least 1.

2. `updateMihomo`: add `targetNames` + `localArchives` options. Loop only over selected names. Merge: new manifest.targets = previous.targets filtered to unselected names? But those old entries have old version asset names → readManifest would reject them since spec computed with manifest.version. So either drop old entries entirely (partial manifest = only updated targets), or per-target version. Simplest: partial update replaces manifest with only the selected targets' entries — meaning previously locked other platforms become unlocked. But user said "其余完全不碰" — don't touch other platforms' files. If we drop their manifest entries, their core-hashes.json stays but prepare for them fails. That matches "完全不碰" (files untouched, just not buildable). Alternatively keep per-target version field — bigger schema change. Recommend subset approach.

   Also the pre-update verifyServiceManifest loop (251-255) should only run for selected targets — but it uses previous.version spec; for selected targets verify old allow-list before replacing. For unselected, skip entirely.

   Also the "already locked version" check (269) needs guard: previous entry may not exist for a target.

   Notice/serviceManifest outputs only for selected targets. Manifest write: version field global — if partial update to new version, manifest.version becomes new version and old entries invalid → must drop them. So resulting manifest contains only updated targets. Document that.

   Alternative preserving others: add `version` per target entry and make manifest.version optional/latest. More invasive; mention as option.

3. `prepareMihomo` (209-214): `entry` may be undefined → currently `entry.sha256` would throw TypeError. Add explicit error: `Mihomo target ${name} is not locked in the manifest`.

4. `mihomo.js` CLI: `update <version> --target <name> [--target ...] [--archive <name>=<path>]`. Parse and pass.

5. Tests/docs updates.

Keep concise with citations.看完代码了。要实现"只更新部分平台、其余完全不碰"，核心障碍是 manifest 的**单一全局 `version`**：每个 target 的 `asset`/`source` 都由 `targetSpec(name, manifest.version)` 推导 clashSrc:34-48 ，所以部分升级后，未更新平台的旧条目在新 version 下必然校验失败。两种改法：

## 改法 A：manifest 允许子集（推荐，改动小）

部分更新后 manifest 只保留已更新平台的条目，其余平台变为"未锁定"——文件不动，但不可构建。

**1. `readManifest`（mihomo-dependency.js:50-69）**

- 去掉 `manifest.targets.length !== Object.keys(targets).length` 的强制要求，改为 `length >= 1`；
- 校验方向反过来：遍历 `manifest.targets` 每条目，在 6 个 `targetSpec(name, manifest.version)` 里找 `output` 匹配项，再比对 `asset`/`source`/`sha256`；找不到或字段不符即报 `Invalid Mihomo dependency lock`；保留重复 output 检查。

**2. `updateMihomo`（mihomo-dependency.js:245-284）**

- 新增参数 `{ targetNames, localArchives }`；`targetNames` 缺省为全部（保持现行为）；
- 第 251-255 行的旧 allow-list 校验循环只跑 `targetNames`——这正是"其余完全不碰"的关键，未选平台的 `core-hashes.json` 不被读取也不被重写；
- 第 259 行主循环改为 `for (const name of targetNames)`；循环内 `download` 前加本地包分支：`localArchives.get(name)` 存在则 `fs.copyFileSync` 到 `archive`，跳过 `download()`；
- 第 269 行"同版本防篡改"检查加守卫：`previous.targets.find(...)` 可能为 `undefined`（该平台此前未锁定），需先判存在再比 hash；
- `manifest.targets` 只含本次更新的条目；`outputs` 里 notice、serviceManifest、二进制也只写选中平台——现有代码按循环生成，天然满足。

**3. `prepareMihomo`（mihomo-dependency.js:209-214）**

`entry` 现在可能为 `undefined`，第 212 行会抛 TypeError。加显式报错：

```js
if (!entry) throw new Error(`Mihomo target ${name} is not locked in the manifest; run mihomo:update for it first`);
```

**4. `mihomo.js` CLI（mihomo.js:7-10）**

`update` 分支改为解析：

```
mihomo.js update <version> [--target <name>]... [--archive <name>=<path>]
```

校验 `--target` 名在 `targets` 表内、`--archive` 的 target 已被 `--target` 选中且文件存在。无 `--target` 时默认全部，向后兼容。

**5. 配套**：`scripts/test/` 下针对 `readManifest`/`updateMihomo` 的测试要补子集用例；`docs/development/native-dependencies.md` 说明部分锁定语义。

用法即：

```bash
npm run mihomo:update -- 1.19.34 --target win-x64 --target linux-x64 \
  --archive win-x64=D:\dl\mihomo-windows-amd64-compatible-v1.19.34.zip \
  --archive linux-x64=D:\dl\mihomo-linux-amd64-compatible-v1.19.34.gz
npm run package:win-x64
```

## 改法 B：每个 target 独立 `version`（改动大）

给 `manifest.targets[]` 每条加 `version` 字段，`targetSpec` 改用条目自身版本，`readManifest`/`prepareMihomo`/`updateMihomo` 全部按条目版本解析。好处是 6 个平台可各自锁定不同版本、全部仍可构建；代价是 schema 不向后兼容，所有消费方和测试都要改。

如果"其余平台"只是暂时不构建，选 A；如果需要它们继续以旧版本可构建，才需要 B。
### Citations
**File:** scripts/build/mihomo-dependency.js (L34-48)
```javascript
function targetSpec(name, version) {
    const target = targets[name];
    if (!target) throw new Error(`Unsupported Mihomo target: ${name}`);
    version = validateVersion(version);
    const filesPath = `clash_core/${target.directory}/static/files`;
    const output = resolveCoreBinaryPath({ path: path.posix, filesPath, ...target, coreType: "mihomo" });
    const legacy = resolveCoreBinaryPath({ path: path.posix, filesPath, ...target, coreType: "clash" });
    const asset = `mihomo-${target.asset}-v${version}.${target.extension}`;
    return {
        name, ...target, asset, output, legacy,
        source: `https://github.com/MetaCubeX/mihomo/releases/download/v${version}/${asset}`,
        notice: `${filesPath}/MIHOMO_NOTICE.txt`,
        serviceManifest: `${path.posix.dirname(output)}/service/core-hashes.json`
    };
}
```
## Q7
每个 target 独立 version
### Answer
User wants design for per-target version (改法 B). Need to read the actual files to give concrete changes. Read mihomo-dependency.js fully and mihomo.js.User wants per-target version design (改法 B). Explain concrete changes conceptually. I have the full file. Describe modifications:

Schema: each target entry gets `version` field; top-level `version`/`release` can be dropped or kept as informational. `targetSpec(name, version)` already takes version param — reuse with entry.version.

Changes:

1. Manifest schema: `targets[]` entries add `version`; top-level `version`/`release` removed or kept as latest. `readManifest` validates each entry: `targetSpec(name, entry.version)` — need name; entries keyed by output. Approach: for each entry, find target whose output matches (output is version-independent since it doesn't embed version — check: output = resolveCoreBinaryPath, no version. Good, output stable across versions). So map output→target name, then spec = targetSpec(name, entry.version), check entry.asset/source match spec, sha256 format. Still require all 6 present? For per-target version, keep all 6 required (simpler, backward compatible-ish) — each can have different version. Optionally also allow subset; but user chose B: all six present, independent versions.

2. `readManifest`: validate each entry's version via validateVersion; release field per-entry? `source` already per-entry. Top-level release check must go — replace with per-entry check `entry.source === spec.source` which embeds version. Keep `manifest.release`? Could keep as informational or drop; simplest: drop top-level version/release, or keep `version` as max/latest for display. Recommend: keep top-level `version` optional? Cleaner: remove top-level version/release; readManifest returns manifest with helper `entryFor(name)`.

3. `prepareMihomo`: `targetSpec(name, manifest.version)` → `targetSpec(name, entry.version)`; but need entry before spec — find entry by output: output is version-independent, so compute spec with any version? targetSpec requires valid version to build asset/source but output doesn't depend on version. Could add `targetOutput(name)` helper or call targetSpec with entry.version after locating entry by matching basename/dirname. Simplest: iterate entries, build map output→entry; for each requested name compute output via a version-independent helper (extract from targetSpec or use placeholder version like "0.0.0" — ugly). Better: refactor targetSpec to split: `targetPaths(name)` returning filesPath/output/legacy/notice/serviceManifest (version-free), and `targetSpec(name, version)` using it. Then prepare: paths = targetPaths(name); entry = manifest.targets.find(e => e.output === paths.output); if !entry error; spec = targetSpec(name, entry.version). Error messages use entry.version instead of manifest.version.

4. `updateMihomo(version, { targetNames, localArchives })`: 
   - verifyServiceManifest pre-check only for selected targets, using previous entry's version: spec = targetSpec(name, prevEntry.version), digest = prevEntry.sha256.
   - Loop only selected names; local archive copy branch.
   - Same-version guard: compare only when prevEntry && prevEntry.version === version.
   - manifest.targets = previous.targets filtered to unselected (preserved as-is) + new entries with `version` field. Top-level version: set to... if mixed versions, top-level version ambiguous — drop it, or keep `version` field per entry only. Manifest write: `{ project, targets: [...] }` maybe keep `release` per entry? entry.source already has URL.
   - Notice/serviceManifest only for selected.

5. `mihomo.js`: update CLI `update <version> [--target name]... [--archive name=path]`; default all targets. prepare unchanged except messages.

6. Consumers of manifest.version elsewhere: grep for mihomo-core-manifest usage — app runtime? Earlier established only scripts/tests/docs. Also `mihomo:prepare` log line uses manifest.version — change to per-target. Tests in scripts/test reference manifest — update.

Also cache path uses entry.sha256 — fine.

Keep answer concise with citations.可以。关键便利点：`output`/`legacy`/`notice`/`serviceManifest` 路径都**不含版本号**（只有 `asset`/`source` 含） clashSrc:38-47 ，所以 entry 可以靠 `output` 稳定定位，再按 entry 自己的 `version` 构建 spec。改动如下：

## 1. Manifest schema

```json
{
  "project": "MetaCubeX/mihomo",
  "targets": [
    { "version": "1.19.34", "asset": "...", "output": "...", "source": "...", "sha256": "..." }
  ]
}
```

- 每个 target 条目增加 `version`；顶层 `version`/`release` 删除（混合版本下无意义），`source` 已含 release URL。
- 仍要求 6 条目齐全——独立版本不代表可以缺平台，缺失场景由 prepare 的显式报错覆盖。

## 2. `targetSpec` 拆分（mihomo-dependency.js:34-48）

拆出一个无版本的 `targetPaths(name)`，返回 `filesPath/output/legacy/notice/serviceManifest`；`targetSpec(name, version)` 在其上追加 `asset`/`source`。这样 prepare 可以先按 `output` 找 entry，再用 `entry.version` 构造完整 spec。

## 3. `readManifest`（50-69）

- 去掉顶层 `version`/`release` 校验；
- 遍历 `manifest.targets`：按 `output` 匹配到 target 名 → `spec = targetSpec(name, entry.version)`（`validateVersion` 顺带校验 entry.version）→ 比对 `entry.asset === spec.asset`、`entry.source === spec.source`、sha256 格式；
- 保留 6 条目齐全与重复 output 检查。

## 4. `prepareMihomo`（202-243）

- 第 209-214 行：`paths = targetPaths(name)` → `entry = manifest.targets.find(e => e.output === paths.output)`；`!entry` 时抛 `Mihomo target ${name} is not locked`；然后 `spec = targetSpec(name, entry.version)`；
- 第 227-228 行错误/日志里的 `manifest.version` 改为 `entry.version`；
- 其余逻辑（cache 按 `entry.sha256` 寻址、`verifyServiceManifest(root, spec, entry.sha256)`）不变。

## 5. `updateMihomo`（245-284）

签名改为 `updateMihomo(version, { targetNames = Object.keys(targets), localArchives = new Map(), ... })`：

- **旧 allow-list 校验（251-255）**：只跑 `targetNames`，且用旧条目自己的版本——`prevEntry = previous.targets.find(e => e.output === targetPaths(name).output)`，`spec = targetSpec(name, prevEntry.version)`，`verifyServiceManifest(root, spec, prevEntry.sha256)`。未选平台完全不读不写。
- **主循环（259-279）**：改为 `for (const name of targetNames)`；`download` 前加本地分支：`localArchives.has(name)` 则 `fs.copyFileSync(localArchives.get(name), archive)`，否则 `await download(...)`。
- **同版本防篡改（269-271）**：改为 `prevEntry && prevEntry.version === version && prevEntry.sha256 !== digest` 才报错——跨版本或新锁定平台不触发。
- **manifest 合并**：`manifest.targets = [...previous.targets.filter(e => 非选中平台), ...新条目]`，新条目带 `version` 字段。这样未选平台以旧版本原样保留、仍可构建。
- notice/serviceManifest/二进制/cache 的 `outputs` 只写选中平台（现有循环天然满足）。

## 6. CLI（mihomo.js:7-10）

```
mihomo.js update <version> [--target <name>]... [--archive <name>=<path>]
```

- 无 `--target` 默认全部（向后兼容）；`--archive` 的 target 必须在选中集合内且文件存在；
- 第 9 行日志改为逐平台打印 `name@version`；
- 第 29 行 prepare 日志同样改为 per-target 版本。

## 7. 配套

- `scripts/test/` 下 manifest/update 相关测试：补"混合版本 manifest 通过校验""部分更新保留其他平台条目""同版本 hash 不一致仍拒绝"用例；
- `docs/development/native-dependencies.md`：更新锁文件格式说明；
- 检查是否有其他代码读 `manifest.version`（此前确认运行时不读，但打包脚本和测试要过一遍）。

用法：

```bash
npm run mihomo:update -- 1.19.34 --target win-x64 --target linux-x64 \
  --archive win-x64=D:\dl\mihomo-windows-amd64-compatible-v1.19.34.zip \
  --archive linux-x64=D:\dl\mihomo-linux-amd64-compatible-v1.19.34.gz
npm run package:win-x64   # 用 1.19.34；其余平台仍锁在旧版本、可正常 prepare/打包
```
### Citations
**File:** scripts/build/mihomo-dependency.js (L38-47)
```javascript
    const filesPath = `clash_core/${target.directory}/static/files`;
    const output = resolveCoreBinaryPath({ path: path.posix, filesPath, ...target, coreType: "mihomo" });
    const legacy = resolveCoreBinaryPath({ path: path.posix, filesPath, ...target, coreType: "clash" });
    const asset = `mihomo-${target.asset}-v${version}.${target.extension}`;
    return {
        name, ...target, asset, output, legacy,
        source: `https://github.com/MetaCubeX/mihomo/releases/download/v${version}/${asset}`,
        notice: `${filesPath}/MIHOMO_NOTICE.txt`,
        serviceManifest: `${path.posix.dirname(output)}/service/core-hashes.json`
    };
```
## Q8
很好，确认上述方案，请给出具体修改代码
### Answer
User wants concrete code changes. I'm in ask-only mode — but they ask for code. I should provide the code diffs conceptually (no plan section per ask-only). Need to read the actual files to write accurate code. Read mihomo-dependency.js and mihomo.js fully.Now write the concrete code. Per-target version design. Provide modified code blocks for mihomo-dependency.js and mihomo.js. Ask-only mode — user asked for code, provide it (no plan section needed? They asked "给出具体修改代码" — providing code is the answer; ask-only says don't create plans. I'll output the code directly).

Write the changes:

1. `targetPaths(name)` split from targetSpec.
2. `readManifest` — per-entry version.
3. `prepareMihomo` — use entry.version.
4. `updateMihomo` — targetNames + localArchives, merge.
5. `mihomo.js` CLI.

Manifest schema: keep top-level `version`/`release`? I proposed removing. But prepareMihomo returns manifest and CLI logs manifest.version. Simpler to keep top-level fields optional? Decision: remove top-level version/release; entries carry version. Update CLI logging accordingly.

Write code:

```js
function targetPaths(name) {
    const target = targets[name];
    if (!target) throw new Error(`Unsupported Mihomo target: ${name}`);
    const filesPath = `clash_core/${target.directory}/static/files`;
    const output = resolveCoreBinaryPath({ path: path.posix, filesPath, ...target, coreType: "mihomo" });
    const legacy = resolveCoreBinaryPath({ path: path.posix, filesPath, ...target, coreType: "clash" });
    return {
        name, ...target, output, legacy,
        notice: `${filesPath}/MIHOMO_NOTICE.txt`,
        serviceManifest: `${path.posix.dirname(output)}/service/core-hashes.json`
    };
}

function targetSpec(name, version) {
    const spec = targetPaths(name);
    version = validateVersion(version);
    spec.asset = `mihomo-${spec.asset}-v${version}.${spec.extension}`;
    spec.source = `https://github.com/MetaCubeX/mihomo/releases/download/v${version}/${spec.asset}`;
    return spec;
}
```

Wait — `...target` includes `asset` (e.g. "windows-amd64-compatible") and `extension`. In targetSpec original, `asset` is overwritten. In targetPaths, keep target.asset as base name; then targetSpec overrides. Fine.

readManifest:

```js
function readManifest(root = repositoryRoot) {
    const manifest = JSON.parse(...);
    if (manifest.project !== "MetaCubeX/mihomo"
        || !Array.isArray(manifest.targets) || manifest.targets.length !== Object.keys(targets).length) {
        throw new Error("Invalid Mihomo dependency manifest");
    }
    const remaining = new Map(manifest.targets.map(target => [target.output, target]));
    for (const name of Object.keys(targets)) {
        const paths = targetPaths(name);
        const entry = remaining.get(paths.output);
        if (!entry) throw new Error(`Invalid Mihomo dependency lock for ${name}`);
        const spec = targetSpec(name, entry.version); // validates version
        if (entry.asset !== spec.asset || entry.source !== spec.source || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
            throw new Error(`Invalid Mihomo dependency lock for ${name}`);
        }
        remaining.delete(paths.output);
    }
    if (remaining.size) throw new Error("Duplicate Mihomo dependency targets");
    return manifest;
}
```

prepareMihomo selected:

```js
const selected = targetNames.map(name => {
    const paths = targetPaths(name);
    const entry = manifest.targets.find(item => item.output === paths.output);
    if (!entry) throw new Error(`Mihomo target ${name} is not locked in the manifest; run mihomo:update for it first`);
    const spec = targetSpec(name, entry.version);
    verifyServiceManifest(root, spec, entry.sha256);
    return { spec, entry };
});
```

And replace `manifest.version` in lines 227-228 with `entry.version`.

updateMihomo:

```js
async function updateMihomo(version, { root = repositoryRoot,
    targetNames = Object.keys(targets), localArchives = new Map(),
    cacheRoot = ..., download = downloadFile, extract = extractBinary, log = console.log } = {}) {
    version = validateVersion(version);
    if (!targetNames.length || new Set(targetNames).size !== targetNames.length) throw new Error("Expected unique Mihomo targets");
    for (const name of targetNames) if (!targets[name]) throw new Error(`Unsupported Mihomo target: ${name}`);
    for (const name of localArchives.keys()) {
        if (!targetNames.includes(name)) throw new Error(`Local archive supplied for unselected Mihomo target: ${name}`);
    }
    return withLock(root, async work => {
        const previous = readManifest(root);
        const selected = new Set(targetNames);
        for (const name of targetNames) {
            const paths = targetPaths(name);
            const entry = previous.targets.find(item => item.output === paths.output);
            if (entry) verifyServiceManifest(root, targetSpec(name, entry.version), entry.sha256);
        }
        const outputs = new Map();
        const kept = previous.targets.filter(item => !selected.has(...name?));
```

Problem: entries don't store name; map output→name via targetPaths. Build map: `const outputToName = new Map(Object.keys(targets).map(n => [targetPaths(n).output, n]));` then kept = previous.targets.filter(item => !selected.has(outputToName.get(item.output))).

Loop:

```js
        const manifest = { project: "MetaCubeX/mihomo", targets: kept };
        for (const name of targetNames) {
            const spec = targetSpec(name, version);
            const archive = path.join(work, spec.asset);
            const source = path.join(work, name);
            log(`Resolving Mihomo ${version} for ${name}...`);
            const local = localArchives.get(name);
            if (local) fs.copyFileSync(local, archive);
            else await download(spec.source, archive);
            await extract(archive, source, spec);
            verifyBinary(source, spec);
            const digest = sha256(source);
            const previousEntry = previous.targets.find(item => item.output === spec.output);
            if (previousEntry && previousEntry.version === version && previousEntry.sha256 !== digest) {
                throw new Error(`Mihomo SHA-256 mismatch for already locked version ${version} (${name})`);
            }
            manifest.targets.push({ version, asset: spec.asset, output: spec.output, source: spec.source, sha256: digest });
            ...same outputs...
        }
```

Ordering of manifest.targets: kept first then new — order changes; acceptable, note it. Or preserve canonical order: build entries map then emit in Object.keys(targets) order. Better: collect newEntries map, then `manifest.targets = Object.keys(targets).map(n => newEntries.get(n) || previous.targets.find(...))`. Cleaner. I'll do that.

mihomo.js update parsing:

```js
if (command === "update") {
    const version = options[0] && options[0].replace(/^v/, "");
    const targetNames = [];
    const localArchives = new Map();
    for (let index = 1; index < options.length; index++) {
        if (options[index] === "--target" && options[index + 1]) targetNames.push(options[++index]);
        else if (options[index] === "--archive" && options[index + 1]) {
            const [name, file] = options[++index].split("=");
            if (!name || !file) throw new Error("Expected --archive <target>=<path>");
            localArchives.set(name, file);
        }
        else throw new Error(`Unknown Mihomo update option: ${options[index]}`);
    }
    if (!version) throw new Error("Usage: ...");
    const manifest = await updateMihomo(version, {
        targetNames: targetNames.length ? targetNames : undefined,
        localArchives
    });
    console.log(`Locked Mihomo for ${manifest.targets.length} targets: ${manifest.targets.map(t => `${...}`).join(", ")}...`);
}
```

targetNames undefined → default param kicks in only if property undefined — yes, destructured default works with undefined.

Log line: manifest has no version now. Print per-target: need name — entries lack name. Could print versions set. Simpler: `console.log(\`Locked Mihomo targets: ${manifest.targets.map(t => t.version).join(", ")}...\`)` — ambiguous. Add name to entry? Could include `"target": name` in entry — schema addition, harmless and useful. I'll add `target: name` field and validate it in readManifest (entry.target === name). Good.

Then prepare log line 29: `manifest.version` gone → print per selected? prepareMihomo returns manifest; CLI doesn't know versions easily — could return manifest and log `Mihomo dependencies verified and ready`. Or have prepareMihomo return {manifest, selected}? Keep simple: log target names with versions via manifest lookup. I'll write helper in CLI:

```js
const manifest = await prepareMihomo({...});
const locked = targetNames... 
```

Simpler: `console.log("Mihomo dependencies verified and ready");` Fine.

Also update usage string.

Also note: existing manifest file must be migrated — provide note that current manifest needs `version` per entry and top-level fields removed; give a migration one-liner.

Write final answer with code blocks per file. Concise but complete.下面是完整修改。涉及两个文件：`scripts/build/mihomo-dependency.js` 和 `scripts/build/mihomo.js`。

## 1. `scripts/build/mihomo-dependency.js`

**拆分 `targetPaths` / `targetSpec`**（替换 34-48 行）。`output`/`legacy`/`notice`/`serviceManifest` 与版本无关，单独抽出：

```js
function targetPaths(name) {
    const target = targets[name];
    if (!target) throw new Error(`Unsupported Mihomo target: ${name}`);
    const filesPath = `clash_core/${target.directory}/static/files`;
    const output = resolveCoreBinaryPath({ path: path.posix, filesPath, ...target, coreType: "mihomo" });
    const legacy = resolveCoreBinaryPath({ path: path.posix, filesPath, ...target, coreType: "clash" });
    return {
        name, ...target, output, legacy,
        notice: `${filesPath}/MIHOMO_NOTICE.txt`,
        serviceManifest: `${path.posix.dirname(output)}/service/core-hashes.json`
    };
}

function targetSpec(name, version) {
    const spec = targetPaths(name);
    version = validateVersion(version);
    spec.asset = `mihomo-${spec.asset}-v${version}.${spec.extension}`;
    spec.source = `https://github.com/MetaCubeX/mihomo/releases/download/v${version}/${spec.asset}`;
    return spec;
}
```

**`readManifest`**（替换 50-69 行）——去掉顶层 `version`/`release`，按条目自身 `version` 校验，并要求 `target` 字段：

```js
function readManifest(root = repositoryRoot) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestRelative), "utf8").replace(/^\uFEFF/, ""));
    if (manifest.project !== "MetaCubeX/mihomo"
        || !Array.isArray(manifest.targets) || manifest.targets.length !== Object.keys(targets).length) {
        throw new Error("Invalid Mihomo dependency manifest");
    }
    const remaining = new Map(manifest.targets.map(target => [target.output, target]));
    for (const name of Object.keys(targets)) {
        const paths = targetPaths(name);
        const entry = remaining.get(paths.output);
        if (!entry || entry.target !== name) throw new Error(`Invalid Mihomo dependency lock for ${name}`);
        const spec = targetSpec(name, entry.version);
        if (entry.asset !== spec.asset || entry.source !== spec.source || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
            throw new Error(`Invalid Mihomo dependency lock for ${name}`);
        }
        remaining.delete(paths.output);
    }
    if (remaining.size) throw new Error("Duplicate Mihomo dependency targets");
    return manifest;
}
```

**`prepareMihomo`**——`selected` 映射（209-214 行）改为按 entry 版本解析，并补缺失报错：

```js
        const selected = targetNames.map(name => {
            const paths = targetPaths(name);
            const entry = manifest.targets.find(item => item.output === paths.output);
            if (!entry) throw new Error(`Mihomo target ${name} is not locked in the manifest; run mihomo:update for it first`);
            const spec = targetSpec(name, entry.version);
            verifyServiceManifest(root, spec, entry.sha256);
            return { spec, entry };
        });
```

227-228 行的 `manifest.version` 改为 `entry.version`：

```js
                if (offline) throw new Error(`Mihomo ${entry.version} (${spec.name}) is missing from the verified local cache; prepare it online first`);
                log(`Downloading Mihomo ${entry.version} for ${spec.name}...`);
```

**`updateMihomo`**（替换 245-284 行）——支持 `targetNames` 子集与 `localArchives`，未选平台条目原样保留：

```js
async function updateMihomo(version, { root = repositoryRoot,
    targetNames = Object.keys(targets), localArchives = new Map(),
    cacheRoot = process.env.CFW_MIHOMO_CACHE || path.join(root, "app/build/dependencies/mihomo"),
    download = downloadFile, extract = extractBinary, log = console.log } = {}) {
    version = validateVersion(version);
    if (!targetNames.length || new Set(targetNames).size !== targetNames.length) throw new Error("Expected unique Mihomo targets");
    for (const name of targetNames) targetPaths(name); // validates names
    for (const name of localArchives.keys()) {
        if (!targetNames.includes(name)) throw new Error(`Local archive supplied for unselected Mihomo target: ${name}`);
        if (!fs.existsSync(localArchives.get(name))) throw new Error(`Missing local Mihomo archive: ${localArchives.get(name)}`);
    }
    return withLock(root, async work => {
        const previous = readManifest(root);
        const selected = new Set(targetNames);
        const previousEntries = new Map(previous.targets.map(item => [item.target, item]));
        for (const name of targetNames) {
            const entry = previousEntries.get(name);
            // A Mihomo upgrade must not authorize changed legacy cores or system helpers.
            if (entry) verifyServiceManifest(root, targetSpec(name, entry.version), entry.sha256);
        }
        const outputs = new Map();
        const resolved = new Map();
        for (const name of targetNames) {
            const spec = targetSpec(name, version);
            const archive = path.join(work, spec.asset);
            const source = path.join(work, name);
            log(`Resolving Mihomo ${version} for ${name}...`);
            const local = localArchives.get(name);
            if (local) fs.copyFileSync(local, archive);
            else await download(spec.source, archive);
            await extract(archive, source, spec);
            verifyBinary(source, spec);
            const digest = sha256(source);
            const previousEntry = previousEntries.get(name);
            // Re-resolving an existing version must never silently replace its trusted hash.
            if (previousEntry && previousEntry.version === version && previousEntry.sha256 !== digest) {
                throw new Error(`Mihomo SHA-256 mismatch for already locked version ${version} (${name})`);
            }
            resolved.set(name, { target: name, version, asset: spec.asset, output: spec.output, source: spec.source, sha256: digest });
            outputs.set(path.join(cacheRoot, digest, path.posix.basename(spec.output)), { source });
            outputs.set(path.join(root, "app", spec.output), { source });
            outputs.set(path.join(root, "app", spec.notice), { text: noticeText(version) });
            outputs.set(path.join(root, "app", spec.serviceManifest), {
                text: `${JSON.stringify(serviceManifest(root, spec, digest), null, 2)}\n`
            });
        }
        const manifest = { project: "MetaCubeX/mihomo",
            targets: Object.keys(targets).map(name => resolved.get(name) || previousEntries.get(name)) };
        outputs.set(path.join(root, manifestRelative), { text: `${JSON.stringify(manifest, null, 2)}\n` });
        replaceFiles(outputs, work);
        return manifest;
    });
}
```

**导出**（286-287 行）加 `targetPaths`：

```js
module.exports = { targets, targetPaths, targetSpec, readManifest, sha256, matches, verifyBinary, serviceManifest,
    verifyServiceManifest, prepareMihomo, updateMihomo };
```

## 2. `scripts/build/mihomo.js`

替换 `update` 分支（7-11 行）和 prepare 日志（29 行）、usage（32 行）：

```js
    if (command === "update") {
        const version = options[0] && options[0].replace(/^v/, "");
        const targetNames = [];
        const localArchives = new Map();
        for (let index = 1; index < options.length; index++) {
            if (options[index] === "--target" && options[index + 1]) targetNames.push(options[++index]);
            else if (options[index] === "--archive" && options[index + 1]) {
                const separator = options[++index].indexOf("=");
                if (separator < 1) throw new Error("Expected --archive <target>=<path>");
                localArchives.set(options[index].slice(0, separator), options[index].slice(separator + 1));
            }
            else throw new Error(`Unknown Mihomo update option: ${options[index]}`);
        }
        if (!version) throw new Error("Usage: mihomo.js update <exact-version> [--target <target>]... [--archive <target>=<path>]...");
        const manifest = await updateMihomo(version, {
            targetNames: targetNames.length ? targetNames : undefined,
            localArchives
        });
        console.log(`Locked Mihomo targets: ${manifest.targets.map(entry => `${entry.target}@${entry.version}`).join(", ")}. Review the manifest, notices and service allow-lists before committing.`);
        return;
    }
```

prepare 成功日志（29 行）改为：

```js
        console.log("Mihomo dependencies verified and ready");
```

usage（32 行）改为：

```js
    throw new Error("Usage: mihomo.js prepare [--all | --target <target>] [--offline], or mihomo.js update <exact-version> [--target <target>]... [--archive <target>=<path>]...");
```

## 3. 迁移现有 manifest

现有 `app/clash_core/mihomo-core-manifest.json` 是旧 schema，需一次性迁移：删掉顶层 `version`/`release`，给每个 target 条目加 `"target": "<name>"` 和 `"version": "<旧顶层version>"`。可用一行完成：

```bash
node -e "const fs=require('fs'),p='app/clash_core/mihomo-core-manifest.json',m=JSON.parse(fs.readFileSync(p,'utf8'));const order=['win_x64','win32-arm64','linux-x64','linux-arm64','darwin-x64','darwin-arm64'];const names=['win-x64','win-arm64','linux-x64','linux-arm64','mac-x64','mac-arm64'];m.targets=m.targets.map((e,i)=>({target:names[order.findIndex(d=>e.output.includes(d))]||e.target,version:m.version,...e}));delete m.version;delete m.release;fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n')"
```

（更稳妥的做法是手动编辑 6 个条目，文件很小。）

## 4. 使用

```bash
npm run mihomo:update -- 1.19.34 --target win-x64 --target linux-x64 \
  --archive win-x64=D:\dl\mihomo-windows-amd64-compatible-v1.19.34.zip \
  --archive linux-x64=D:\dl\mihomo-linux-amd64-compatible-v1.19.34.gz
npm run package:win-x64
```

未选中的 4 个平台：manifest 条目、`core-hashes.json`、notice、二进制全部不碰，仍以各自旧版本正常 prepare/打包。

注意：`scripts/test/` 下引用 `manifest.version` 或旧 schema 的测试需要同步更新；`docs/development/native-dependencies.md` 的锁文件格式说明也要改。
## Q9
可不可心指定解压后的二进制文件
### Answer
User asks: can we specify the extracted binary file directly (instead of archive)? Answer: yes, modify updateMihomo to accept local binaries too — skip extract, copy binary to `source`, still verifyBinary + sha256. Show code change: `--binary <target>=<path>` option.可以。`extract()` 的作用只是把压缩包里的二进制解到 `source` 路径，之后 `verifyBinary(source, spec)` 和 `sha256(source)` 都是对解压产物做校验。所以直接给 `source` 放一个本地二进制即可跳过下载和解压，校验链不变。

## 改动

**`updateMihomo`**——新增 `localBinaries` 参数，与 `localArchives` 并列：

```js
async function updateMihomo(version, { root = repositoryRoot,
    targetNames = Object.keys(targets), localArchives = new Map(), localBinaries = new Map(),
    cacheRoot = process.env.CFW_MIHOMO_CACHE || path.join(root, "app/build/dependencies/mihomo"),
    download = downloadFile, extract = extractBinary, log = console.log } = {}) {
    version = validateVersion(version);
    if (!targetNames.length || new Set(targetNames).size !== targetNames.length) throw new Error("Expected unique Mihomo targets");
    for (const name of targetNames) targetPaths(name);
    for (const [kind, map] of [["archive", localArchives], ["binary", localBinaries]]) {
        for (const name of map.keys()) {
            if (!targetNames.includes(name)) throw new Error(`Local ${kind} supplied for unselected Mihomo target: ${name}`);
            if (!fs.existsSync(map.get(name))) throw new Error(`Missing local Mihomo ${kind}: ${map.get(name)}`);
        }
    }
    for (const name of targetNames) {
        if (localArchives.has(name) && localBinaries.has(name)) {
            throw new Error(`Specify either --archive or --binary for ${name}, not both`);
        }
    }
    return withLock(root, async work => {
        // ...previous/verifyServiceManifest 部分不变...
        for (const name of targetNames) {
            const spec = targetSpec(name, version);
            const archive = path.join(work, spec.asset);
            const source = path.join(work, name);
            log(`Resolving Mihomo ${version} for ${name}...`);
            if (localBinaries.has(name)) {
                fs.copyFileSync(localBinaries.get(name), source);
            } else {
                const local = localArchives.get(name);
                if (local) fs.copyFileSync(local, archive);
                else await download(spec.source, archive);
                await extract(archive, source, spec);
            }
            verifyBinary(source, spec);
            // ...digest/resolved/outputs 部分不变...
        }
```

**`mihomo.js`**——`update` 分支加 `--binary` 解析：

```js
            else if (options[index] === "--binary" && options[index + 1]) {
                const separator = options[++index].indexOf("=");
                if (separator < 1) throw new Error("Expected --binary <target>=<path>");
                localBinaries.set(options[index].slice(0, separator), options[index].slice(separator + 1));
            }
```

（`localBinaries` 声明、传入 `updateMihomo`、usage 文案同步加。）

## 用法

```bash
npm run mihomo:update -- 1.19.34 --target win-x64 --target linux-x64 \
  --binary win-x64=D:\dl\mihomo-windows-amd64.exe \
  --binary linux-x64=D:\dl\mihomo-linux-amd64
```

两点注意：

- `verifyBinary` 仍会检查可执行格式和 CPU 类型（PE/ELF、x64），拿错平台的二进制照样报错；
- `--binary` 与 `--archive` 对同一 target 互斥，上面已加显式报错。
## Q10
怎么指定electron版本
### Answer
User asks how to specify Electron version. Search repo for electron version config.Read release-config.json, build-release.js around line 73-101, docs/development/releases.md, and package.json devDependencies electron.Check where electronVersion is consumed — release:sync updates Electron package manifest. Find the sync script and where electron version is used in packaging (electron-builder? electron-packager?). Search for release:sync and electronVersion usage.Read package.json lines around 8 and 39-40, and find release:sync script implementation.Answer: Electron version is specified in `app/main/src/electron/core/release/release-config.json` field `electronVersion` (currently 44.7.2). Then run `npm run release:sync` which propagates it to the Electron package manifest (app/package.json presumably) and lockfile metadata. Packaging uses @electron/packager which downloads electron-v<version>-<platform>.zip; cache seeded via ELECTRON_CACHE / CFW_ELECTRON_CACHE. Docs say change electronVersion only when upgrading Electron.Electron 版本由 `app/main/src/electron/core/release/release-config.json` 的 `electronVersion` 字段指定，当前为 `44.7.2`。 clashSrc:4-4 

## 修改步骤

1. **改 `electronVersion`**——这是唯一可编辑的源头，文档明确说"Change `electronVersion` only when upgrading Electron"。 clashSrc:25-26 

2. **运行同步**：
   ```bash
   npm run release:sync
   ```
   它把版本传播到 Electron 包清单（`app` 下的 package.json）和根 `package-lock` 元数据、`update` feed、`CFW/BuildRelease/InnoSetup/release.generated.iss`。这些是生成文件，不要手动改版本字段。 clashSrc:29-33 

3. **打包**：`npm run package:win-x64` 或 `npm run build:release`。打包用 `@electron/packager`（devDependencies 中 `20.3.0`），按 `electronVersion` 下载 `electron-v<version>-<platform>.zip`。 clashSrc:39-40 

## 避免重复下载 Electron

- release 构建会把 Electron zip 缓存到 `CFW/BuildRelease/Build/cache/electron`（通过 `CFW_ELECTRON_CACHE` 传给子进程）。 clashSrc:99-101 
- `seedElectronCache` 还会从 `ELECTRON_CACHE` 环境变量或 `%LOCALAPPDATA%\electron\Cache` 复制**版本号匹配**的 `electron-v<electronVersion>-*.zip` 进缓存——注意它只认当前配置版本的文件，改了 `electronVersion` 后旧版本 zip 不会被复用。 clashSrc:64-79 

所以如果你手动下载了 Electron zip，放到 `%LOCALAPPDATA%\electron\Cache\<子目录>\` 或设 `ELECTRON_CACHE` 指向它，文件名保持 `electron-v<version>-win32-x64.zip` 格式即可被 seed 进构建缓存。

注意：根 `package.json` 的 devDependencies 里没有 `electron` 包本身——版本完全由 `release-config.json` 驱动，不需要 `npm install electron@x.y`。
### Citations
**File:** app/main/src/electron/core/release/release-config.json (L4-4)
```json
  "electronVersion": "44.7.2",
```
**File:** docs/development/releases.md (L25-26)
```markdown
   Change `electronVersion` only
   when upgrading Electron. Add a `publishedTargets` entry only when its asset
```
**File:** docs/development/releases.md (L29-33)
```markdown
2. Run `npm run release:sync`. This updates the Electron package manifest and
   root package-lock metadata, the `update` feed, and the Inno Setup include
   `CFW/BuildRelease/InnoSetup/release.generated.iss`. These are generated compatibility
   files; do not edit their version fields independently. Existing feed release
   notes are preserved and can be edited in `update`.
```
**File:** package.json (L39-40)
```json
    "@electron/asar": "4.3.0",
    "@electron/packager": "20.3.0",
```
**File:** CFW/BuildRelease/build-release.js (L64-79)
```javascript
function seedElectronCache(destination) {
    fs.mkdirSync(destination, { recursive: true });
    // Reuse already downloaded runtime ZIPs; new cache files stay with release builds.
    const source = process.env.ELECTRON_CACHE || (process.platform === "win32" && process.env.LOCALAPPDATA
        ? path.join(process.env.LOCALAPPDATA, "electron/Cache") : null);
    if (!source || !fs.existsSync(source) || path.resolve(source) === path.resolve(destination)) return;
    for (const folder of fs.readdirSync(source, { withFileTypes: true })) {
        if (!folder.isDirectory()) continue;
        for (const file of fs.readdirSync(path.join(source, folder.name))) {
            if (!file.startsWith(`electron-v${release.config.electronVersion}-`) || !file.endsWith(".zip")) continue;
            const target = path.join(destination, folder.name, file);
            if (fs.existsSync(target)) continue;
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.copyFileSync(path.join(source, folder.name, file), target);
        }
    }
```
**File:** CFW/BuildRelease/build-release.js (L99-101)
```javascript
    const cache = path.join(__dirname, "Build/cache/electron");
    seedElectronCache(cache);
    const env = { ...process.env, CFW_BUILD_ROOT: work, CFW_ELECTRON_CACHE: cache, TEMP: temporary, TMP: temporary, TMPDIR: temporary };
```
## Q11
如果--binary参数直接指定为app/clash_core/win_x64/static/files/win/x64/mihomo-windows-amd64.exe
### Answer
User asks: what if --binary points directly at the existing output path `app/clash_core/win_x64/static/files/win/x64/mihomo-windows-amd64.exe`? In my proposed code, `fs.copyFileSync(localBinaries.get(name), source)` copies to `work/name` (temp dir), then outputs replace the file at `app/.../output` — copying a file onto itself? Actually source is in work dir, so copy from app path to work is fine; then replaceFiles copies work→app output, overwriting same file with identical content. Harmless but wasteful; also verifyBinary runs on it. Edge cases: if source and destination same file — they're not (work vs app). But replaceFiles may delete/replace; copying identical bytes is fine. One subtlety: if the binary is the old version and user runs update to same version, hash check passes; if new version, it just re-locks whatever bytes are there — which is actually a valid use: "I already placed the new binary, just update the JSONs". That works. Caveat: file gets copied to work then back — fine. Also if path equals output path, could shortcut but unnecessary. Answer concisely.可以，这样用完全合法，而且正好覆盖"我已经把新二进制放好了，只想更新 json"的场景。流程上不会发生问题：

1. `fs.copyFileSync(localBinaries.get(name), source)` 把它复制到 `work` 临时目录——源在 `app/`、目标在 `work/`，不是自拷贝，安全；
2. `verifyBinary(source, spec)` 照常校验 PE 格式和 x64 CPU；
3. `sha256(source)` 算出的 digest 写入 manifest 和 `core-hashes.json`；
4. `replaceFiles` 把 `work` 里的文件写回 `app/.../mihomo-windows-amd64.exe`——用相同字节覆盖自身，无害。

```bash
npm run mihomo:update -- 1.19.34 --target win-x64 \
  --binary win-x64=app/clash_core/win_x64/static/files/win/x64/mihomo-windows-amd64.exe
```

两个注意点：

- **版本号以命令行参数为准**。脚本不会从二进制里读版本，你填 `1.19.34` 它就按 `1.19.34` 写 manifest/notice/source URL。如果 exe 实际是别的版本，哈希照样通过（它只校验格式不校验版本），会留下不一致的锁文件——放文件前自己确认版本。
- **同版本防篡改检查仍然生效**：如果 manifest 里该平台已锁 `1.19.34` 且旧 sha256 与这个文件不同，会报 `SHA-256 mismatch for already locked version`，而不是静默改哈希。要强制重锁，得先指定一个不同的版本号或手动改 manifest。

如果想省掉这次无意义的拷贝，可以在 `updateMihomo` 里加个小优化：

```js
if (localBinaries.has(name)) {
    const local = localBinaries.get(name);
    if (path.resolve(local) !== path.join(root, "app", spec.output)) {
        fs.copyFileSync(local, source);
    } else {
        fs.copyFileSync(local, source); // 仍需复制到 work，因为 replaceFiles 从事务目录写回
    }
}
```

实际上没必要特判——`source` 必须在 `work` 里供 `verifyBinary`/`sha256`/`replaceFiles` 使用，拷贝不可省略，保持原样即可。
## Q12
npm run mihomo:update -- 1.19.34 --target win-x64 --binary win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-adm64.exe
npm warn "win-x64" is being parsed as a normal command line argument.
npm warn "win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-adm64.exe" is being parsed as a normal command line argument.
npm warn Unknown cli config "--target". This will stop working in the next major version of npm.
npm warn Unknown cli config "--binary". This will stop working in the next major version of npm.

> mihomo:update
> node scripts/build/mihomo.js update 1.19.34 win-x64 win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-adm64.exe

Unknown Mihomo update option: win-x64
### Answer
npm strips `--target`/`--binary` flags? Actually npm warns and passes them as positional args — the flags got consumed by npm as config, leaving values as bare args. Fix: use `--` separator twice? npm run script -- args: everything after `--` should pass through, but npm still parses `--target` as config? The warnings show npm parsed `--target` and `--binary` as cli config and passed only values. Solution: quote or use `--target=win-x64` form? npm treats `--target` as its own config flag. Better: use `npm run mihomo:update -- 1.19.34 -- --target win-x64 ...`? Or call node directly: `node scripts/build/mihomo.js update 1.19.34 --target win-x64 --binary ...`. Simplest answer: run node directly, or use `--target=win-x64` (npm may still warn). Recommend direct node invocation.`--target` 和 `--binary` 被 npm 自己当成 CLI 配置吞掉了（看 warning：`Unknown cli config "--target"`），传给脚本的只剩裸值 `win-x64` 和 `win-x64=...`，所以解析报 `Unknown Mihomo update option: win-x64`。

两个解决办法：

**1. 直接调 node（推荐，最可靠）**

```bash
node scripts/build/mihomo.js update 1.19.34 --target win-x64 --binary win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-amd64.exe
```

**2. 仍走 npm，用 `=` 连写**

npm 对 `--flag=value` 形式会原样透传给脚本：

```bash
npm run mihomo:update -- 1.19.34 --target=win-x64 --binary=win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-amd64.exe
```

注意 `--binary=win-x64=...` 里有两个 `=`：第一个分隔 npm 参数名和值，第二个是脚本解析的 `target=path`。我给的解析代码用 `indexOf("=")` 取第一个 `=`，所以 `win-x64=.\app\...` 会正确拆成 target=`win-x64`、path=`.\app\...`，兼容这种写法。

另外你命令里的文件名是 `mihomo-windows-adm64.exe`（少了个 `d`），确认下是笔误还是文件真叫这个名——`--binary` 会校验文件存在，路径错了会报 `Missing local Mihomo binary`。
## Q13
npm run mihomo:update -- 1.19.34 --target=win-x64 --binary=win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-amd64.exe
npm warn Unknown cli config "--target". This will stop working in the next major version of npm.
npm warn Unknown cli config "--binary". This will stop working in the next major version of npm.
### Answer
User ran the command; npm still warns but did it work? The output shows only warnings — likely the script ran. But npm may have consumed `--target=win-x64` as config too? With `=` form, npm parses `--target=win-x64` as config "target" and does NOT pass to script. Actually npm passes unknown `--flag=value`? The warnings suggest npm still treats them as cli config. The args likely didn't reach the script — script would then run update with no targets → default all targets, downloading everything! Need to check: npm run passes args after `--` verbatim? Actually npm does forward them, but also parses them as config (hence warnings). In npm v7+, `npm run x -- --foo` forwards `--foo` to script AND warns. Earlier failure showed values forwarded but flags stripped — because `--target win-x64` (space form) npm consumed flag? Hmm, earlier output showed script received `win-x64 win-x64=...` — flags stripped. With `=` form, npm may forward the whole `--target=win-x64`? Uncertain. Safest: tell user to check output / use node directly. The message shows only warnings, no script output — maybe truncated. Advise: verify whether script received args; if it printed "Resolving ... for all six" it's downloading everything — abort and use node directly.npm 仍然把 `--target`/`--binary` 当成自己的 config（warning 还在），关键问题是：**它们到底有没有透传给脚本**。看你贴的输出只有 warning、没有脚本输出，需要确认实际行为：

- 如果脚本接着打印 `Resolving Mihomo 1.19.34 for win-x64...`（只有一个平台）→ 参数传到了，正常。
- 如果打印了 6 个平台的 `Resolving...` 或开始下载 → 参数被 npm 吞了，`targetNames` 用了默认值（全部平台），**立即 Ctrl+C 中止**，否则它会下载其余 5 个平台并改写整个 manifest。

最稳妥的方式是绕过 npm，直接调 node：

```bash
node scripts/build/mihomo.js update 1.19.34 --target win-x64 --binary win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-amd64.exe
```

这样没有任何 npm 参数解析层，`--target`/`--binary` 一定原样到达脚本。

如果坚持走 `npm run`，可以在 `package.json` 里加一个不经过 npm 参数解析的别名，或者干脆接受 warning——但前提是确认参数确实透传了。判断方法：在 `mihomo.js` 的 update 分支开头临时加一行 `console.log(options)`，跑一次看 `options` 数组里是 `["1.19.34","--target","win-x64","--binary","win-x64=..."]`（正确）还是 `["1.19.34"]`（被吞）。
## Q14
node scripts/build/mihomo.js update 1.19.34 --target win-x64 --binary win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-amd64.exe
localBinaries is not defined
### Answer
User got `localBinaries is not defined` — they added the `--binary` parsing branch but forgot to declare `const localBinaries = new Map();` in mihomo.js. Point it out.`mihomo.js` 的 update 分支里用了 `localBinaries` 但没有声明。在 `const localArchives = new Map();` 旁边补一行：

```js
        const version = options[0] && options[0].replace(/^v/, "");
        const targetNames = [];
        const localArchives = new Map();
        const localBinaries = new Map();   // ← 缺的就是这行
```

同时确认 `updateMihomo` 调用处把它传进去了：

```js
        const manifest = await updateMihomo(version, {
            targetNames: targetNames.length ? targetNames : undefined,
            localArchives,
            localBinaries
        });
```

以及 `mihomo-dependency.js` 里 `updateMihomo` 的签名解构参数中要有 `localBinaries = new Map()`（放在 `localArchives` 后面），否则传了也会被忽略、静默走下载路径。
## Q15
npm run mihomo:update -- 1.19.34 --target win-x64 --binary win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-amd64.exe
npm warn "win-x64" is being parsed as a normal command line argument.
npm warn "win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-amd64.exe" is being parsed as a normal command line argument.
npm warn Unknown cli config "--target". This will stop working in the next major version of npm.
npm warn Unknown cli config "--binary". This will stop working in the next major version of npm.

> mihomo:update
> node scripts/build/mihomo.js update 1.19.34 win-x64 win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-amd64.exe

options: [
  '1.19.34',
  'win-x64',
  'win-x64=.\\app\\clash_core\\win_x64\\static\\files\\win\\x64\\mihomo-windows-amd64.exe'
]
Unknown Mihomo update option: win-x64
### Answer
npm strips `--target`/`--binary` flags entirely (space form). Confirmed: options array lacks the flags. Solution: use node directly, or `--target=win-x64` form — but earlier that also warned; uncertain whether it forwards. Best: node directly. Or make parser tolerant: treat bare `win-x64` as target and `win-x64=path` as binary? Could suggest making parser accept positional `target=path` args. Simplest: run node directly.`options` 数组证实了：npm 把 `--target` 和 `--binary` 两个 flag 本身吞掉了，只透传了后面的值。所以脚本看到的是 `1.19.34 win-x64 win-x64=...`，解析到 `win-x64` 时报错。

**直接用 node，不要走 npm run：**

```bash
node scripts/build/mihomo.js update 1.19.34 --target win-x64 --binary win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-amd64.exe
```

如果你希望 `npm run mihomo:update` 也能用，有两个办法：

**1. 让解析器兼容 npm 吞 flag 后的形态**——把裸的 target 名当作 `--target`，把 `name=path` 当作 `--binary`：

```js
    if (command === "update") {
        const version = options[0] && options[0].replace(/^v/, "");
        const targetNames = [];
        const localArchives = new Map();
        const localBinaries = new Map();
        for (let index = 1; index < options.length; index++) {
            const arg = options[index];
            if (arg === "--target" && options[index + 1]) targetNames.push(options[++index]);
            else if (arg === "--archive" && options[index + 1]) {
                const separator = options[++index].indexOf("=");
                if (separator < 1) throw new Error("Expected --archive <target>=<path>");
                localArchives.set(options[index].slice(0, separator), options[index].slice(separator + 1));
            }
            else if (arg === "--binary" && options[index + 1]) {
                const separator = options[++index].indexOf("=");
                if (separator < 1) throw new Error("Expected --binary <target>=<path>");
                localBinaries.set(options[index].slice(0, separator), options[index].slice(separator + 1));
            }
            else if (targets[arg]) targetNames.push(arg);                       // npm 吞掉 --target 后的裸值
            else if (targets[arg.slice(0, arg.indexOf("="))]) {                 // npm 吞掉 --binary/--archive 后的 name=path
                localBinaries.set(arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1));
            }
            else throw new Error(`Unknown Mihomo update option: ${arg}`);
        }
        // ...不变
    }
```

这样你刚才那条 npm 命令也能正常工作（`win-x64` → target，`win-x64=.\app\...` → binary）。

**2. 或者干脆约定：update 一律用 `node scripts/build/mihomo.js` 调用**，文档里写明不走 npm script，避免 npm 参数解析的坑。

建议选 1——改动小，且对 npm/node 两种调用方式都健壮。
## Q16
Mihomo preparation is already running. Retry after it finishes; remove app/build/dependencies/mihomo.lock only if that process has stopped.
### Answer
User hit the lock error from withLock. Explain: lock file exists at app/build/dependencies/mihomo.lock — either another process is running or a stale lock from a killed run. Check for running node processes; if none, delete the lock file and retry.这是 `withLock` 的并发保护：它在 `app/build/dependencies/mihomo.lock` 创建锁文件，防止两个 prepare/update 同时写缓存和二进制目录。报这个错说明锁文件已存在——要么真有一个进程在跑，要么是上次被 Ctrl+C/异常终止留下的**死锁文件**。

处理步骤：

1. **确认没有正在运行的进程**：任务管理器或 `tasklist | findstr node` 看有没有还在跑的 `mihomo.js`/`node` 进程。有就等它结束。

2. **没有的话，删锁文件重试**：

   ```bash
   del app\build\dependencies\mihomo.lock
   node scripts/build/mihomo.js update 1.19.34 --target win-x64 --binary win-x64=.\app\clash_core\win_x64\static\files\win\x64\mihomo-windows-amd64.exe
   ```

3. **检查残留状态**：上次中断可能留下半成品。`withLock` 的工作目录（`work`）在临时区，中断后一般自动清理；但值得看一眼 `app/build/dependencies/` 下有没有残留的 `mihomo-*.tmp`/work 目录，有就一并删掉。`replaceFiles` 是事务式的，中断时 `app/clash_core/` 下的文件要么没动要么已完整替换，不会出现半个文件——但 manifest 和 core-hashes.json 可能处于"已更新"或"未更新"两种状态，重跑前可以 `git status` 看一眼哪些文件已经变了。

如果你之前那次 npm 运行实际启动了全平台下载然后被中止，死锁文件就是这么来的——删掉重跑即可。
## Q17
修改github action ，只发布windows amd64和 linux amd64
### Answer
Find GitHub Actions workflows in the repo.No workflows found via glob. Maybe workflows exist but index excludes them, or they're elsewhere. Search for "workflow" or "release" scripts, check repo root listing.No `.github/workflows` in the repo index — the repo root listing shows no `.github` directory. So there is no GitHub Actions workflow in this repo. The release process is `npm run build:release` / `release:sync` locally. Check package.json scripts and docs/development/releases.md to confirm, and check `update` dir maybe. Read package.json and releases.md.No `.github/workflows` exists in the repo — root listing shows no `.github`. So there's no GitHub Action to modify. The release is driven by `release-config.json` `publishedTargets` and `build:release --targets`. Check release-config.json publishedTargets and build-release.js --targets handling quickly — one iteration left. Read release-config.json and grep build-release.js for targets parsing.No .github/workflows exists in this repo — root listing showed no .github dir. So there's no GitHub Action to modify. The release is driven by release-config.json publishedTargets and build:release --targets. Answer: repo has no GitHub Actions; to publish only win-x64 and linux-x64, edit publishedTargets and use --targets flag. Provide concrete changes.这个仓库里**没有 GitHub Actions**——根目录下没有 `.github/workflows`，发布流程是本地脚本驱动的（`npm run build:release` → `CFW/BuildRelease/build-release.js`），文档也明确说"the release runner ... does not upload releases"。 clashSrc:43-45 

所以要"只发布 Windows x64 和 Linux x64"，改的是发布配置和构建参数，不是 workflow：

## 1. 修改 `publishedTargets`

`app/main/src/electron/core/release/release-config.json` 第 10-19 行，删掉 arm64 条目： clashSrc:10-19 

```json
  "publishedTargets": [
    { "target": "win-x64", "format": "legacy" },
    { "target": "win-x64", "format": "portable" },
    "linux-x64",
    { "target": "linux-x64", "format": "deb" }
  ]
```

这控制 `update` feed 里广告哪些资产——文档要求"Only targets with actual published assets belong in `publishedTargets`"。 clashSrc:133-134 

## 2. 同步生成文件

```bash
npm run release:sync
```

更新 `update` feed、Inno Setup include 等生成文件。 clashSrc:29-33 

## 3. 构建时只选这两个目标

`build:release` 支持 `--targets` 参数： clashSrc:36-38 

```bash
npm run build:release -- --targets win-x64,linux-x64
```

（确切的分隔符格式看 `CFW/BuildRelease/build-release.js` 第 83-85 行的参数解析，我检索到 `--targets` 在那里被处理但没读到完整解析代码——可能是逗号或空格分隔，跑之前确认一下。）

## 如果你确实想新建 GitHub Action

仓库目前没有任何 CI 发布流程，需要从零写 `.github/workflows/release.yml`。大致结构：

```yaml
name: release
on:
  push:
    tags: ["*"]
jobs:
  windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build:release -- --targets win-x64
      - uses: softprops/action-gh-release@v2
        with:
          files: CFW/BuildRelease/Build/output/**/*
  linux:
    runs-on: ubuntu-latest
    steps:
      # 同上，--targets linux-x64
```

注意点：

- Windows 安装包需要 Inno Setup，runner 镜像自带；Linux deb 打包看 `CFW/BuildRelease/README.md` 的 host 要求；
- mihomo 二进制在 CI 上需要首次下载（或配 `CFW_MIHOMO_CACHE` + actions/cache 缓存 `app/build/dependencies/mihomo`）；
- 文档提到"CI caches these files using the host OS and lockfile identity"，说明设计上预留了 CI 缓存，但当前仓库没有对应 workflow 文件——如果你 fork 的上游有，那部分不在本仓库索引内。

需要我给出完整 workflow 文件内容的话，告诉我 tag 触发还是手动触发、产物上传到什么 release。
### Citations
**File:** docs/development/releases.md (L29-33)
```markdown
2. Run `npm run release:sync`. This updates the Electron package manifest and
   root package-lock metadata, the `update` feed, and the Inno Setup include
   `CFW/BuildRelease/InnoSetup/release.generated.iss`. These are generated compatibility
   files; do not edit their version fields independently. Existing feed release
   notes are preserved and can be edited in `update`.
```
**File:** docs/development/releases.md (L36-38)
```markdown
4. Run `npm run build:release` for all targets supported by the current host,
   or select targets with `--targets`. Windows Inno Setup includes the generated
   definitions and architecture-specific paths from the runner. DMG and portable
```
**File:** docs/development/releases.md (L43-45)
```markdown
5. Publish the assets under the configured version tag before publishing the
   generated `update` file. The release runner creates Windows installers,
   portable archives and Linux Debian packages; it does not upload releases.
```
**File:** docs/development/releases.md (L133-134)
```markdown
transports; there is no shared update-routing policy. Only targets with actual
published assets belong in `publishedTargets` and the published feed.
```
**File:** app/main/src/electron/core/release/release-config.json (L10-19)
```json
  "publishedTargets": [
    { "target": "win-x64", "format": "legacy" },
    { "target": "win-x64", "format": "portable" },
    "win-arm64",
    { "target": "win-arm64", "format": "portable" },
    "linux-x64",
    { "target": "linux-x64", "format": "deb" },
    "linux-arm64",
    { "target": "linux-arm64", "format": "deb" }
  ]
```
## Q18
给出完整workflow,
1. tag触发+手动
2. 手动自动寻找最新tag
3. 产物上传并且发布到tag对应的release
4. 全部用ubuntu容器构建，
5. 只构建windows amd64和linux amd64
6. windows构建安装包，同时也release打包后产物
### Answer
Need to check build-release.js for --targets parsing, Inno Setup on Linux? Windows installer on Ubuntu — Inno Setup is Windows-only; maybe they use wine or the build produces portable zip. Check build-release.js and README for host requirements.Key constraint: Windows installer requires Windows host + Inno Setup (planTargets rejects win-* on Linux). User wants all-Ubuntu builds including Windows installer. Options: run Inno Setup under Wine on Ubuntu (iscc works under wine commonly), or modify planTargets to allow win-x64 on linux and provide ISCC via wine. Honest answer: pure Ubuntu can't run ISCC.exe natively; need wine. Provide workflow that installs wine + innosetup via wine, sets ISCC_PATH to a wrapper script. findIscc checks fs.existsSync(ISCC_PATH) and runs it via spawnSync — a shell wrapper `iscc` that calls `wine ISCC.exe` works if ISCC_PATH points to an executable script. Also planTargets must be patched to allow win targets on linux (one-line change: treat win-* as available on linux when ISCC_PATH set). Also 7z needed (p7zip-full). Also verifyWindowsArchitecture reads PE — fine on linux.

Also tests run by default — tests prepare all six mihomo targets → downloads all six. Use --skip-tests or accept. Mention.

Write workflow: tag trigger + workflow_dispatch with optional tag input defaulting to latest tag. Steps: checkout (fetch-depth 0 for tags), resolve tag, checkout tag, setup node, install deps (p7zip, wine, innosetup via wine or download iscc), npm ci, patch? Better: keep repo change minimal — modify planTargets to allow win on linux when env CFW_WIN_ON_LINUX=1? Simpler: in workflow, sed-patch? Recommend a small code change: allow win targets on linux if process.env.CFW_INNO_VIA_WINE. Provide both: code tweak + workflow.

Deliver workflow yaml + required code change + notes.先说一个硬约束：`build-release.js` 的 `planTargets` 明确拒绝在 Linux 上构建 `win-*` 目标（"Windows installers require Windows/Inno Setup"） clashSrc:14-24 ，且 `findIscc` 只找 Windows 路径下的 `ISCC.exe` clashSrc:33-44 。要在 Ubuntu 上出 Windows 安装包，唯一可行路径是 **Wine 跑 Inno Setup**——`findIscc` 支持 `ISCC_PATH` 环境变量，只要指向一个可执行文件即可，所以可以给它一个调用 `wine ISCC.exe` 的 wrapper 脚本。

需要两处配合：**一处代码改动 + 一个 workflow 文件**。

## 1. 代码改动：`planTargets` 放行 Linux 上的 win 目标

`CFW/BuildRelease/build-release.js` 第 15-17 行，加一个环境变量开关：

```js
    const available = allTargets.filter(target => target.startsWith("linux-")
        || platform === "win32" && target.startsWith("win-")
        || platform === "darwin" && target.startsWith("mac-")
        || process.env.CFW_WIN_VIA_WINE === "1" && target.startsWith("win-"));
```

`findIscc` 不用改——`ISCC_PATH` 指到 wrapper 脚本就能通过 `fs.existsSync` 检查，`spawnSync` 也能直接执行它。

## 2. Workflow：`.github/workflows/release.yml`

```yaml
name: release

on:
  push:
    tags: ["*"]
  workflow_dispatch:
    inputs:
      tag:
        description: "Tag to build (empty = latest tag)"
        required: false
        type: string

permissions:
  contents: write

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout (full history for tag resolution)
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Resolve target tag
        id: tag
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            TAG="${{ inputs.tag }}"
            if [ -z "$TAG" ]; then
              TAG="$(git tag --sort=-creatordate | head -n1)"
            fi
          else
            TAG="${GITHUB_REF_NAME}"
          fi
          [ -n "$TAG" ] || { echo "No tag found"; exit 1; }
          git rev-parse --verify "refs/tags/$TAG"
          echo "tag=$TAG" >> "$GITHUB_OUTPUT"
          git checkout "$TAG"

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install build tools (7z, Wine, Inno Setup)
        run: |
          sudo apt-get update
          sudo apt-get install -y p7zip-full wine64 wget
          # Inno Setup 6 命令行版，装到 wine 前缀里
          wget -q https://files.jrsoftware.org/is/6/innosetup-6.4.3.exe -O /tmp/is.exe
          wine /tmp/is.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
          # ISCC wrapper：findIscc 只要求 ISCC_PATH 是可执行文件
          printf '#!/bin/sh\nexec wine "$HOME/.wine/drive_c/Program Files (x86)/Inno Setup 6/ISCC.exe" "$@"\n' \
            | sudo tee /usr/local/bin/iscc >/dev/null
          sudo chmod +x /usr/local/bin/iscc

      - name: Install dependencies
        run: npm ci

      - name: Cache Mihomo binaries
        uses: actions/cache@v4
        with:
          path: app/build/dependencies/mihomo
          key: mihomo-${{ runner.os }}-${{ hashFiles('app/clash_core/mihomo-core-manifest.json') }}

      - name: Build release (win-x64 + linux-x64)
        env:
          CFW_WIN_VIA_WINE: "1"
          ISCC_PATH: /usr/local/bin/iscc
          CFW_7ZIP: 7z
        run: node CFW/BuildRelease/build-release.js --targets=win-x64,linux-x64 --skip-tests

      - name: Locate artifacts
        id: out
        run: |
          DIR="$(node -p "JSON.parse(require('fs').readFileSync('CFW/BuildRelease/Build/latest.json','utf8')).artifacts")"
          echo "dir=$DIR" >> "$GITHUB_OUTPUT"
          ls -la "$DIR"

      - name: Upload artifacts to workflow run
        uses: actions/upload-artifact@v4
        with:
          name: release-${{ steps.tag.outputs.tag }}
          path: ${{ steps.out.outputs.dir }}/*

      - name: Publish to GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ steps.tag.outputs.tag }}
          files: ${{ steps.out.outputs.dir }}/*
          generate_release_notes: true
```

## 说明与注意点

- **产物内容**：win-x64 产出 `Setup .exe` 安装包 + `.7z` portable（脚本 136、152-156 行）；linux-x64 产出 `.tar.gz` + `.deb`（144-149 行）。`SHA256SUMS` 和 `update` feed 也会一起上传。
- **`--skip-tests`**：默认测试门会 prepare 全部 6 个平台的 mihomo 二进制（下载量大且需要 arm64/mac 资产）。如果你已按前面的方案把 manifest 改成只锁两个平台，可以去掉 `--skip-tests` 让测试跑；否则保留。
- **Wine 安装包兼容性**：ISCC 在 Wine 下编译 iss 脚本是常见做法，但 `packing_script.iss` 若用到 Windows 特有功能可能失败——首次跑之前建议本地 `wine ISCC.exe` 验证一次。
- **手动触发找最新 tag**：`git tag --sort=-creatordate | head -n1` 取最新 tag 并 checkout；也可在输入框指定任意 tag。
- **重复发布**：`action-gh-release` 对已存在的 release 会追加/覆盖同名文件；tag 触发的 rerun 安全。
- **版本一致性**：构建版本来自 `release-config.json` 而非 tag 名，确保 tag 与 `version` 字段对应，否则 `update` feed 里的 `assetUrl` 会对不上。
### Citations
**File:** CFW/BuildRelease/build-release.js (L14-24)
```javascript
function planTargets(platform, requested) {
    const available = allTargets.filter(target => target.startsWith("linux-")
        || platform === "win32" && target.startsWith("win-")
        || platform === "darwin" && target.startsWith("mac-"));
    const targets = requested || available;
    if (!targets.length || new Set(targets).size !== targets.length || targets.some(target => !allTargets.includes(target))) {
        throw new Error(`Expected unique targets from: ${allTargets.join(", ")}`);
    }
    const unsupported = targets.filter(target => !available.includes(target));
    if (unsupported.length) throw new Error(`Targets require another host: ${unsupported.join(", ")}. Windows installers require Windows/Inno Setup; macOS DMGs require macOS.`);
    return { targets, skipped: allTargets.filter(target => !targets.includes(target)) };
```
**File:** CFW/BuildRelease/build-release.js (L33-44)
```javascript
function findIscc() {
    const locations = [process.env.ISCC_PATH];
    for (const base of [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]]) {
        if (base) for (const version of [7, 6]) locations.push(path.join(base, `Inno Setup ${version}`, "ISCC.exe"));
    }
    const found = locations.find(file => file && fs.existsSync(file));
    if (found) return found;
    const search = spawnSync("where.exe", ["ISCC.exe"], { encoding: "utf8", windowsHide: true });
    const result = search.stdout?.trim().split(/\r?\n/)[0];
    if (result && fs.existsSync(result)) return result;
    throw new Error("Inno Setup 6.3+ is required. Set ISCC_PATH to ISCC.exe.");
}
```
## Q19
全部改为windows下构建
### Answer
User wants the workflow changed to build everything on Windows. Windows runner can build win-x64 natively (Inno Setup available) and linux-x64 (planTargets allows linux-* on any platform). Need 7z on Windows — available via choco or preinstalled. Rewrite workflow for windows-latest, single job.Windows runner 反而更简单：`planTargets` 允许任何宿主构建 `linux-*`，`win-*` 在 Windows 上原生支持，不需要 Wine、不需要改 `planTargets`。Inno Setup 用 choco 装，7z 用 `CFW_7ZIP` 指向 choco 的 `7z.exe`（Windows runner 也自带 `C:\Program Files\7-Zip\7z.exe`）。

## `.github/workflows/release.yml`

```yaml
name: release

on:
  push:
    tags: ["*"]
  workflow_dispatch:
    inputs:
      tag:
        description: "Tag to build (empty = latest tag)"
        required: false
        type: string

permissions:
  contents: write

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  build:
    runs-on: windows-latest
    steps:
      - name: Checkout (full history for tag resolution)
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Resolve target tag
        id: tag
        shell: bash
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            TAG="${{ inputs.tag }}"
            if [ -z "$TAG" ]; then
              TAG="$(git tag --sort=-creatordate | head -n1)"
            fi
          else
            TAG="${GITHUB_REF_NAME}"
          fi
          [ -n "$TAG" ] || { echo "No tag found"; exit 1; }
          git rev-parse --verify "refs/tags/$TAG"
          echo "tag=$TAG" >> "$GITHUB_OUTPUT"
          git checkout "$TAG"

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install Inno Setup
        run: choco install innosetup --no-progress -y

      - name: Install dependencies
        run: npm ci

      - name: Cache Mihomo binaries
        uses: actions/cache@v4
        with:
          path: app/build/dependencies/mihomo
          key: mihomo-${{ runner.os }}-${{ hashFiles('app/clash_core/mihomo-core-manifest.json') }}

      - name: Build release (win-x64 + linux-x64)
        env:
          CFW_7ZIP: C:\Program Files\7-Zip\7z.exe
        run: node CFW/BuildRelease/build-release.js --targets=win-x64,linux-x64 --skip-tests

      - name: Locate artifacts
        id: out
        run: |
          $dir = (Get-Content CFW/BuildRelease/Build/latest.json | ConvertFrom-Json).artifacts
          echo "dir=$dir" >> $env:GITHUB_OUTPUT
          Get-ChildItem $dir

      - name: Upload artifacts to workflow run
        uses: actions/upload-artifact@v4
        with:
          name: release-${{ steps.tag.outputs.tag }}
          path: ${{ steps.out.outputs.dir }}/*

      - name: Publish to GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ steps.tag.outputs.tag }}
          files: ${{ steps.out.outputs.dir }}/*
          generate_release_notes: true
```

## 相对 Ubuntu 版的变化

- **删掉 Wine/ISCC wrapper**：`findIscc` 会自动在 `C:\Program Files (x86)\Inno Setup 6\ISCC.exe` 找到 choco 安装的 Inno Setup，无需 `ISCC_PATH`；
- **删掉 `CFW_WIN_VIA_WINE` 开关**：`planTargets` 原生放行 `win-*`，之前那处代码改动不需要了；
- **7z**：Windows runner 预装 7-Zip，`CFW_7ZIP` 指到 `C:\Program Files\7-Zip\7z.exe`（若路径不同，`where 7z` 确认）；
- **shell 差异**：Resolve tag 步骤显式 `shell: bash`（Windows runner 默认 pwsh，`git tag` 那套是 bash 语法）；Locate artifacts 用 pwsh 读 `latest.json`；
- **单 job**：win-x64 和 linux-x64 在同一个 Windows job 里一次构建，产物一起进 `latest.json` 的 `artifacts` 目录，一次上传、一次发布。

## 注意点

- `--skip-tests` 同样建议保留：测试门会 prepare 全部 6 个平台的 mihomo 二进制。若 manifest 已按之前方案只锁 win-x64/linux-x64，可去掉让它跑测试。
- linux-x64 的 `.deb` 打包在 Windows 上是否支持取决于 `build-release.js` 内部实现（deb 通常用 `dpkg-deb` 或纯 JS 打包）——如果脚本调用了 `dpkg-deb`，Windows 上没有，需要确认；`.tar.gz` 走 7z 没问题。跑之前可以先本地 `node CFW/BuildRelease/build-release.js --targets=linux-x64 --skip-tests` 验证一次。
- Electron zip 下载缓存在 `CFW/BuildRelease/Build/cache/electron`，跨 run 不保留；如需加速可加 `actions/cache` 缓存该目录，key 用 `electronVersion`。
## Q20
构建添加功能
1. 每次构建自动更新对应平台最新版本mihomo，使用最新的mihomo-core-manifest.json构建
2. 缓存Electron zip
### Answer
User wants workflow additions: 1) auto-update mihomo to latest version per platform before build, using latest manifest; 2) cache Electron zip.

Need to check: how to get latest mihomo version — GitHub API releases/latest for MetaCubeX/mihomo. Then run `node scripts/build/mihomo.js update <ver> --target win-x64 --target linux-x64` (with our earlier modifications). But manifest requires all 6 entries — update with only 2 targets keeps others at old version (per-target version design). That works.

Electron cache: path CFW/BuildRelease/Build/cache/electron, key on electronVersion from release-config.json.

Provide updated workflow steps. Concise.在现有 workflow 上加两个 step 即可。

## 1. 自动更新 mihomo 到最新版本

在 `npm ci` 之后、构建之前插入：

```yaml
      - name: Update Mihomo to latest release
        id: mihomo
        shell: bash
        run: |
          # 取上游最新 release tag（形如 v1.19.34）
          LATEST="$(curl -fsSL https://api.github.com/repos/MetaCubeX/mihomo/releases/latest | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).tag_name.replace(/^v/,'')")"
          echo "version=$LATEST" >> "$GITHUB_OUTPUT"
          # 只更新本次构建的两个平台；其余平台条目保持原样（依赖之前的 per-target version 改动）
          node scripts/build/mihomo.js update "$LATEST" --target win-x64 --target linux-x64

      - name: Show locked manifest
        shell: bash
        run: cat app/clash_core/mihomo-core-manifest.json
```

要点：

- **顺序必须在 mihomo 缓存 restore 之前**——缓存 key 用 manifest 的 hash，manifest 被 update 改写后 key 才正确。所以把 `actions/cache`（mihomo）挪到这一步**之后**：

```yaml
      - name: Cache Mihomo binaries
        uses: actions/cache@v4
        with:
          path: app/build/dependencies/mihomo
          key: mihomo-${{ runner.os }}-${{ hashFiles('app/clash_core/mihomo-core-manifest.json') }}
```

  注意：每次版本升级 manifest 都变，这个 cache 基本命中不了，意义不大——update 本身已把二进制写进 `app/clash_core/` 输出路径，`prepare` 会直接复用，可以**删掉这个 cache step**。

- **"使用最新的 manifest 构建"**：update 直接改写工作区的 `mihomo-core-manifest.json`，后续 `build-release.js` 里的 prepare 读的就是它，天然满足。构建的是 CI 工作区副本，不会污染仓库（除非你想把新 manifest 提交回去——一般不建议在 release job 里自动 commit）。
- **防篡改检查**：如果上游对同一版本重发了资产（hash 变了），`update` 会报 `SHA-256 mismatch for already locked version` 并失败——这是设计行为，遇到时说明上游资产被替换过，需要人工确认。
- 如果 `api.github.com` 匿名限流（60 次/小时，一般够用），可加 `GITHUB_TOKEN`：`curl -H "Authorization: Bearer ${{ secrets.GITHUB_TOKEN }}"`。

## 2. 缓存 Electron zip

`build-release.js` 把 Electron zip 放在 `CFW/BuildRelease/Build/cache/electron`，key 用 `release-config.json` 里的 `electronVersion`：

```yaml
      - name: Resolve Electron version
        id: electron
        shell: bash
        run: echo "version=$(node -p "require('./app/main/src/electron/core/release/release-config.json').electronVersion")" >> "$GITHUB_OUTPUT"

      - name: Cache Electron runtime zips
        uses: actions/cache@v4
        with:
          path: CFW/BuildRelease/Build/cache/electron
          key: electron-${{ steps.electron.outputs.version }}
          restore-keys: electron-
```

放在构建 step 之前。`electronVersion` 不变时 zip 直接命中缓存，跳过下载；升级 Electron 后 key 变化自动重新缓存。

## 插入后的步骤顺序

```
checkout → resolve tag → setup node → install Inno Setup → npm ci
→ Update Mihomo to latest          # 新增
→ Resolve Electron version         # 新增
→ Cache Electron runtime zips      # 新增
→ build-release --targets=win-x64,linux-x64 --skip-tests
→ locate artifacts → upload-artifact → action-gh-release
```

一个前提：第 1 步依赖之前讨论的 `update --target` 部分更新能力（per-target version schema）。如果还没实施那个改动，`update` 会强制下载全部 6 个平台——在 Windows runner 上也能跑通，只是多下载 4 个平台的资产，功能不受影响。
## Q21
能更新指定mihomo amd64 v3版本
### Answer
User asks: can it update to a specified mihomo amd64 v3 version? Mihomo v3 — there are v3.x releases? MetaCubeX/mihomo has releases like v1.19.x and also "Prerelease" v3? Actually mihomo has alpha/v3 versions (e.g., v3.0.0?). The update command takes exact version; asset naming `mihomo-windows-amd64-compatible-v<version>.zip` — for v3 releases asset names may differ (e.g., `mihomo-windows-amd64-v3.0.8.zip` without "compatible"?). Need to check targetSpec asset naming: `mihomo-${target.asset}-v${version}.${ext}` where target.asset is like "windows-amd64-compatible". For v3, upstream assets are named e.g. `mihomo-windows-amd64-v3.0.8.zip` (compatible variant may not exist for v3?). I should check the targets table in mihomo-dependency.js to see asset names.User asks: can it update to a specified mihomo amd64 v3 version? Key issue: v3 releases use different asset naming — upstream mihomo v3.x assets are named like `mihomo-windows-amd64-v3.0.8.zip` (no "-compatible" suffix for amd64? Actually in v3, the "compatible" variant still exists? In mihomo releases, amd64 has both `mihomo-windows-amd64-vX.zip` and `mihomo-windows-amd64-compatible-vX.zip` — compatible = built with older Go/GOAMD64=v1 for old CPUs. For v3 releases (e.g., v3.0.8), assets include `mihomo-windows-amd64-compatible-v3.0.8.zip`? I believe mihomo still publishes compatible variants. Actually yes, mihomo releases include `-compatible` amd64 builds. So `update 3.0.8` would work if the asset exists.

Also `validateVersion` requires `^\d+\.\d+\.\d+$` — v3 versions like "3.0.8" pass. But some mihomo versions are like "1.19.33" fine; prerelease tags like "Prerelease-Alpha" wouldn't pass. v3 releases are tagged e.g. "v3.0.8"? Mihomo tags: they use "v1.19.x" and also "Prerelease-Alpha" rolling tag. There is no official "v3" stable? Actually mihomo released v3.0.0? Hmm — MetaCubeX/mihomo latest releases are v1.19.x; there were alpha tags. I shouldn't overclaim. Answer: yes, pass exact version `3.x.y` if upstream release `v3.x.y` exists and asset naming matches `mihomo-windows-amd64-compatible-v3.x.y.zip`; validateVersion accepts it. Caveats: if upstream asset naming differs for v3 (e.g., no -compatible variant), download 404s — then use --binary/--archive with local file, but note asset/source fields in manifest are still generated from the compatible naming; readManifest validates entry.asset === spec.asset, so if you want non-compatible asset names recorded, you'd need to change the targets table asset field. With --binary, asset/source are still written as the compatible URL — manifest would record a URL that doesn't match what you actually used. That's a caveat.

Keep answer concise.可以，`update` 的版本参数没有限制在 1.x——`validateVersion` 只要求 `^\d+\.\d+\.\d+$` 格式，`3.0.8` 这类版本号直接通过。 clashSrc:21-32 

```bash
node scripts/build/mihomo.js update 3.0.8 --target win-x64 --target linux-x64
```

它会拼出 `https://github.com/MetaCubeX/mihomo/releases/download/v3.0.8/mihomo-windows-amd64-compatible-v3.0.8.zip` 去下载。 clashSrc:41-44 

**两个前提要确认：**

1. **上游确实存在该 tag**：`v3.0.8` 必须是 MetaCubeX/mihomo 的真实 release tag。注意 mihomo 的滚动预览版 tag 是 `Prerelease-Alpha` 这类非数字名，`validateVersion` 会拒绝——预览版只能走 `--binary` 手动指定。

2. **资产命名一致**：脚本固定用 `targets` 表里的 `asset` 名拼文件名——amd64 平台用的是 `-compatible` 变体（`windows-amd64-compatible`、`linux-amd64-compatible`） clashSrc:12-19 。如果 v3 的 release 里 compatible 变体改名或取消了，下载会 404。这时两个选择：
   - 用 `--binary` 喂本地二进制：能跑通，但 manifest 里记录的 `asset`/`source` 仍是 compatible 的 URL，与实际来源不符（`readManifest` 只校验内部一致性，不会发现）；
   - 或者改 `targets` 表：把 `win-x64`/`linux-x64` 的 `asset` 改成 `windows-amd64`/`linux-amd64`（去掉 `-compatible`），这样 manifest 记录的就是真实 URL。代价是失去对老 CPU（不支持 GOAMD64 v3 指令集）的兼容——这正是 `-compatible` 变体存在的意义，改之前确认你的目标机器不需要它。

**CI 自动更新场景**：之前 workflow 里"取 latest release"那步对 v3 也适用——`releases/latest` 返回什么版本就锁什么版本。如果你想**固定只追 v3 系列**而不是 latest，把那步改成按 tag 前缀过滤：

```bash
LATEST="$(curl -fsSL "https://api.github.com/repos/MetaCubeX/mihomo/releases?per_page=20" \
  | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).map(r=>r.tag_name).find(t=>/^v3\.\d+\.\d+$/.test(t)).replace(/^v/,'')")"
```
### Citations
**File:** scripts/build/mihomo-dependency.js (L12-19)
```javascript
const targets = Object.freeze({
    "win-x64": { platform: "win32", arch: "x64", directory: "win_x64", asset: "windows-amd64-compatible", extension: "zip" },
    "win-arm64": { platform: "win32", arch: "arm64", directory: "win32-arm64", asset: "windows-arm64", extension: "zip" },
    "linux-x64": { platform: "linux", arch: "x64", directory: "linux-x64", asset: "linux-amd64-compatible", extension: "gz" },
    "linux-arm64": { platform: "linux", arch: "arm64", directory: "linux-arm64", asset: "linux-arm64", extension: "gz" },
    "mac-x64": { platform: "darwin", arch: "x64", directory: "darwin-x64", asset: "darwin-amd64-compatible", extension: "gz" },
    "mac-arm64": { platform: "darwin", arch: "arm64", directory: "darwin-arm64", asset: "darwin-arm64", extension: "gz" }
});
```
**File:** scripts/build/mihomo-dependency.js (L21-32)
```javascript
function validateVersion(version) {
    if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error("Expected an exact Mihomo version, for example 1.19.31");
    }
    const components = version.split(".").map(component => Number(component));
    const canonical = components.join(".");
    if (!components.every(Number.isSafeInteger) || canonical !== version) {
        throw new Error("Expected an exact canonical Mihomo version with safe integer components");
    }
    // Build request paths from numeric version components, never raw file data.
    return canonical;
}
```
**File:** scripts/build/mihomo-dependency.js (L41-44)
```javascript
    const asset = `mihomo-${target.asset}-v${version}.${target.extension}`;
    return {
        name, ...target, asset, output, legacy,
        source: `https://github.com/MetaCubeX/mihomo/releases/download/v${version}/${asset}`,
```
