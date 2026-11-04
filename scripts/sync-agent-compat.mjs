#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 把跨 agent 分发的两份公共文件同步到仓库内其余 rs-* 技能
// ---------------------------------------------------------------------------
// 唯一源（canonical）：rs-rec-video/agent-compat.md 与 rs-rec-video/scripts/link-agents.mjs
// 为什么各技能要各带一份：技能一旦被复制/链接进 agent 的技能目录（~/.cursor/skills 等），
// 目录外什么都不存在，指向仓库根的共享脚本会当场失效；自包含是硬约束。
// 代价是三份副本会漂移，因此本脚本负责生成、--check 负责报警，禁止手工编辑副本。
//
// 用法：
//   node scripts/sync-agent-compat.mjs              # dry-run，只打印计划
//   node scripts/sync-agent-compat.mjs --apply      # 真正写入副本
//   node scripts/sync-agent-compat.mjs --check      # 只校验；有漂移 exit 1，不改任何文件
// 退出码：0 一致/已写入；1 存在漂移或写入失败；2 唯一源缺失或参数错误。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANON = 'rs-rec-video';
// agent-compat.md 里出现技能名的位置要用各技能自己的名字替换；
// link-agents.mjs 从所在技能的 SKILL.md 读 name，内容与技能无关，原样复制即可
const SYNCED = [
    { rel: 'agent-compat.md', substituteName: true },
    { rel: path.join('scripts', 'link-agents.mjs'), substituteName: false },
];

const APPLY = process.argv.includes('--apply');
const CHECK = process.argv.includes('--check');
if (APPLY && CHECK) { console.error('--apply 与 --check 互斥（前者写入，后者只校验）'); process.exit(2); }

const canonicalDir = path.join(REPO, CANON);
if (!fs.existsSync(canonicalDir)) { console.error(`唯一源不存在：${canonicalDir}`); process.exit(2); }

// 仓库里所有 rs-* 技能目录（目录名即技能名），唯一源自身除外
const skills = fs.readdirSync(REPO, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^rs-/.test(e.name) && fs.existsSync(path.join(REPO, e.name, 'SKILL.md')))
    .map((e) => e.name)
    .filter((n) => n !== CANON)
    .sort();
if (!skills.length) { console.log(`仓库内除唯一源外没有其它 rs-* 技能，无需同步。`); process.exit(0); }

let changed = 0, same = 0, missing = 0, failed = 0;
for (const skill of skills) {
    console.log(`\n技能 ${skill}`);
    for (const { rel, substituteName } of SYNCED) {
        const src = path.join(canonicalDir, rel);
        const dest = path.join(REPO, skill, rel);
        if (!fs.existsSync(src)) { console.error(`  ✗ 唯一源缺文件：${src}`); process.exit(2); }
        let want = fs.readFileSync(src, 'utf8');
        if (substituteName) want = want.split(CANON).join(skill);
        const have = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null;
        const label = path.relative(REPO, dest).replace(/\\/g, '/');
        if (have === null) { missing++; console.log(`  · ${label} 不存在，待新建`); }
        else if (have === want) { same++; console.log(`  ✓ ${label} 与唯一源一致`); continue; }
        else { changed++; console.log(`  ≠ ${label} 与唯一源不一致（副本被手工改过，或唯一源已更新）`); }
        if (CHECK) continue;
        if (!APPLY) { console.log(`    [计划] ${have === null ? '新建' : '覆盖'} ${label}；确认后加 --apply`); continue; }
        try {
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, want, 'utf8');
            console.log(`    [完成] 写入 ${label}`);
        } catch (e) {
            failed++;
            console.error(`    ✗ 写入 ${label} 失败：${e.message}`);
        }
    }
}

const drift = changed + missing;
if (CHECK) {
    console.log(`\n校验：一致 ${same}，需新建 ${missing}，已漂移 ${changed}（共 ${skills.length} 个技能 × ${SYNCED.length} 个文件）`);
    if (drift) console.log('请执行 node scripts/sync-agent-compat.mjs --apply 重新生成，副本不要手工编辑。');
    process.exitCode = drift || failed ? 1 : 0;
} else if (APPLY) {
    console.log(`\n完成：新建 ${missing}，覆盖 ${changed}，未动 ${same}，失败 ${failed}。`);
    process.exitCode = failed ? 1 : 0;
} else {
    console.log(`\ndry-run：需新建 ${missing}、覆盖 ${changed}、已一致 ${same}。确认无误后加 --apply，提交前用 --check 把关。`);
    process.exitCode = 0;
}
