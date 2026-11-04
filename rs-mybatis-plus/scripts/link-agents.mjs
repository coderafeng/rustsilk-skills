#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 把本技能同步到各 agent 的技能目录（唯一源 → 多目录分发）
// ---------------------------------------------------------------------------
// 用法（默认 dry-run，不写任何文件；确认计划后加 --apply）：
//   node link-agents.mjs --list                                   # 打印支持的 agent 与目录
//   node link-agents.mjs --agent claude-code,cursor --scope project
//   node link-agents.mjs --agent all --scope project --mode copy --apply
//   node link-agents.mjs --agent qoder-cn --scope user --mode link --apply
// 参数：
//   --agent  id 列表 | all        必填（除 --list）
//   --scope  project|user|both    默认 project
//   --mode   copy|link            默认 copy（link：Windows 用 junction，其他系统用符号链接）
//   --apply                       真正写入；缺省只打印计划
//   --force                       目标已存在时，先把旧目录改名为 <name>.bak-<时间戳>（不删除任何文件）
// 退出码：0 成功；1 存在失败项；2 参数错误。
// 目录路径来源见 ../agent-compat.md（均按官方文档核实）。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// 每项：label 展示名；project 项目级目录（相对仓库根，可多个）；user 用户级目录（相对 home）
const AGENTS = {
    'claude-code': { label: 'Claude Code', project: ['.claude/skills'], user: ['.claude/skills'] },
    'cursor': { label: 'Cursor', project: ['.cursor/skills', '.agents/skills'], user: ['.cursor/skills'] },
    'codex': { label: 'OpenAI Codex CLI', project: ['.agents/skills'], user: ['.codex/skills', '.agents/skills'] },
    'opencode': { label: 'opencode', project: ['.opencode/skills'], user: ['.config/opencode/skills'] },
    'qoder': { label: 'Qoder', project: ['.qoder/skills'], user: ['.qoder/skills'] },
    'qoder-cn': { label: 'Qoder CN', project: ['.qoder/skills'], user: ['.qoder-cn/skills'] },
    'deep-code': { label: 'DeepSeek Deep Code', project: ['.deepcode/skills'], user: ['.agents/skills'] },
    'dsh': { label: 'DeepSeek Harness', project: ['.dsh/skills'], user: ['.dsh/skills', '.agents/skills'] },
    'pi': { label: 'pi (Pi Coding Agent)', project: ['.pi/skills'], user: ['.pi/agent/skills', '.agents/skills'] },
    'codebuddy': { label: 'CodeBuddy', project: ['.codebuddy/skills'], user: ['.codebuddy/skills'] },
    'workbuddy': { label: 'WorkBuddy', project: ['.workbuddy/skills'], user: ['.workbuddy/skills'] },
};

const args = process.argv.slice(2);
const opt = (name, dft) => {
    const i = args.indexOf('--' + name);
    return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : dft;
};
const flag = (name) => args.includes('--' + name);
const HELP = '用法：node link-agents.mjs --list | --agent <id[,id]>|all [--scope project|user|both] [--mode copy|link] [--apply] [--force]';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 用 frontmatter 的 name 决定目标目录名：各 agent 都要求 name 与目录名一致，
// 以脚本所在目录名为准会漏掉「目录被改名而 name 没改」这种不一致，这里显式核对。
// 本仓库约定源码目录名与 name 完全相同（均为 rs-<主题名>），因此这里不留例外。
const front = (/^---\r?\n([\s\S]*?)\r?\n---/).exec(fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8'));
const nameLine = front && /^name:[ \t]*(\S+)[ \t]*$/m.exec(front[1]);
if (!nameLine) { console.error(`SKILL.md 的 frontmatter 缺 name 字段：${SKILL_DIR}`); process.exit(2); }
const SKILL_NAME = nameLine[1];
const SKILL_DIR_NAME = path.basename(SKILL_DIR);
if (SKILL_NAME !== SKILL_DIR_NAME) {
    console.error(`frontmatter name「${SKILL_NAME}」与目录名「${SKILL_DIR_NAME}」不一致——多数 agent 会拒绝加载或行为不一致，请先改一致`);
    process.exit(2);
}

if (flag('list')) {
    console.log(`技能源 ${SKILL_DIR}\n支持的目标：`);
    for (const [id, a] of Object.entries(AGENTS)) {
        console.log(`  ${id.padEnd(13)} ${a.label}`);
        console.log(`  ${''.padEnd(13)}   项目级 ${(a.project || []).join(' , ')}`);
        console.log(`  ${''.padEnd(13)}   用户级 ${(a.user || []).map((d) => '~/' + d).join(' , ')}`);
    }
    process.exit(0);
}

const agentArg = opt('agent', '');
if (!agentArg) { console.error(HELP); process.exit(2); }
const ids = agentArg === 'all' ? Object.keys(AGENTS) : agentArg.split(',').map((s) => s.trim()).filter(Boolean);
const unknown = ids.filter((id) => !AGENTS[id]);
if (unknown.length) { console.error(`未知 agent：${unknown.join(',')}（--list 查看全部）`); process.exit(2); }
const scope = opt('scope', 'project');
if (!['project', 'user', 'both'].includes(scope)) { console.error(`--scope 只接受 project|user|both，收到「${scope}」`); process.exit(2); }
const mode = opt('mode', 'copy');
if (!['copy', 'link'].includes(mode)) { console.error(`--mode 只接受 copy|link，收到「${mode}」`); process.exit(2); }
const apply = flag('apply');
const force = flag('force');
const ROOTS = { project: process.cwd(), user: os.homedir() };
const SCOPES = scope === 'both' ? ['project', 'user'] : [scope];

// 组计划：同一目标目录被多个 agent 共用时只处理一次（如 .agents/skills）
const plan = new Map();
for (const sc of SCOPES) {
    for (const id of ids) {
        for (const dir of AGENTS[id][sc === 'project' ? 'project' : 'user'] || []) {
            const parent = path.join(ROOTS[sc], ...dir.split('/'));
            const dest = path.join(parent, SKILL_NAME);
            const key = path.resolve(dest).toLowerCase();
            if (!plan.has(key)) plan.set(key, { dest, parent, ids: [], scope: sc });
            plan.get(key).ids.push(id);
        }
    }
}

let failed = 0, done = 0, skipped = 0;
for (const { dest, parent, ids: who, scope: sc } of plan.values()) {
    const tag = `${who.join('/')} [${sc}]`;
    if (path.resolve(dest) === path.resolve(SKILL_DIR)) { console.log(`跳过 ${dest} —— 它就是技能源本身（${tag}）`); skipped++; continue; }
    const exists = fs.existsSync(dest);
    if (exists && !force) { console.log(`跳过 ${dest} —— 已存在同名技能，加 --force 才会备份后替换（${tag}）`); skipped++; continue; }
    if (!apply) { console.log(`[计划] ${mode} → ${dest}（${tag}）${exists ? '；--force 会把现有目录备份为 ' + path.basename(dest) + '.bak-<时间戳>' : ''}`); continue; }
    try {
        fs.mkdirSync(parent, { recursive: true });
        if (exists) fs.renameSync(dest, `${dest}.bak-${Date.now()}`);
        if (mode === 'copy') {
            fs.cpSync(SKILL_DIR, dest, { recursive: true });
        } else if (process.platform === 'win32') {
            // junction 不需要管理员权限；符号链接在 Windows 上要么开开发者模式要么提权，故不采用
            execFileSync('cmd', ['/c', 'mklink', '/J', dest, SKILL_DIR], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
        } else {
            fs.symlinkSync(SKILL_DIR, dest, 'dir');
        }
        console.log(`[完成] ${mode} → ${dest}（${tag}）`);
        done++;
    } catch (e) {
        const msg = (e.stderr || e.message || '').toString().replace(/\r?\n/g, ' ').slice(0, 200);
        console.log(`  ✗ ${dest} 失败：${msg}${mode === 'link' ? '（链接失败常见于权限或跨盘，可改用 --mode copy）' : ''}`);
        failed++;
    }
}
if (!apply) console.log(`\ndry-run：共 ${plan.size} 个目标待处理，未写入任何文件。确认无误后加 --apply`);
else console.log(`\n完成 ${done} 个，跳过 ${skipped} 个，失败 ${failed} 个${mode === 'copy' ? '；副本各自独立，改正文请改唯一源后重新执行' : ''}`);
if (failed) process.exitCode = 1;
