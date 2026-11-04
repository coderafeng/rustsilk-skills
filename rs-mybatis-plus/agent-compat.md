# 跨 Agent 兼容目录对照

> 本技能按 [Agent Skills 开放规范](https://agentskills.io/specification) 编写：一个技能 = 一个含 `SKILL.md` 的目录，YAML frontmatter 必填 `name`（≤64 字符，小写字母/数字/单连字符，且**与目录名一致**）与 `description`（≤1024 字符），可选 `license` / `compatibility` / `metadata` / `allowed-tools`；正文建议 < 500 行，细节走 `scripts/`、参考文档按需加载。
> 下表目录路径以官方文档为准核实（核实日期 2026-11）。**目录名不同、技能内容相同**：同一份文件复制/链接到对应目录即可，不需要为某个 agent 改写正文。
> **本仓库命名惯例**：源码目录名、frontmatter `name` 与安装后的目录名三者完全一致，统一为 `rs-<主题名>`（如本技能的 `rs-mybatis-plus`）。因此下文 `skills/rs-mybatis-plus/...` 形式的命令路径，无论指向本仓库源码目录还是分发到目标项目后的副本，写法相同。

## 各 Agent 的技能目录

| Agent | 项目级目录（相对仓库根） | 用户级目录（相对 home） | 来源 |
|---|---|---|---|
| Claude Code | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` | code.claude.com/docs/en/skills（另有企业受管目录与 `--add-dir` 目录） |
| Cursor | `.cursor/skills/`、`.agents/skills/` | `~/.cursor/skills/` | cursor.com/docs/context/skills（官方列出 `.agents/skills/` 为项目级入口） |
| OpenAI Codex CLI | `.agents/skills/` | `~/.codex/skills/`（也读 `~/.agents/skills/`） | 官方文档以 `.agents/skills` 为仓库级、`~/.agents/skills` 为个人级；部分版本需在 `~/.codex/config.toml` 开 `[features] skills` |
| opencode | `.opencode/skills/`、`.claude/skills/`、`.agents/skills/` | `~/.config/opencode/skills/`、`~/.claude/skills/`、`~/.agents/skills/` | opencode.ai/docs/skills（兼容 Claude 与 agents 目录，未知 frontmatter 字段忽略） |
| Qoder | `.qoder/skills/` | `~/.qoder/skills/` | docs.qoder.com/zh/cli/Skills |
| Qoder CN | `.qoder/skills/` | `~/.qoder-cn/skills/`（**带 `-cn` 后缀**，照抄国际版会配错位置） | help.aliyun.com/zh/lingma/qodercli-cn/user-guide/skills |
| DeepSeek Deep Code | `.deepcode/skills/<name>/SKILL.md` | `~/.agents/skills/<name>/SKILL.md` | api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/deepcode |
| DeepSeek Harness（DSH） | `.dsh/skills/`（优先级高于 `.agents/skills/`） | `~/.dsh/skills/`、`~/.agents/skills/` | DSH 文档与社区实测汇总；另支持 `customSkillDirs` 自定义路径 |
| pi（Pi Coding Agent） | `.pi/skills/`、`.agents/skills/`（项目须先授予信任） | `~/.pi/agent/skills/`、`~/.agents/skills/` | pi.dev/docs/latest/skills |
| CodeBuddy | `.codebuddy/skills/` | `~/.codebuddy/skills/` | codebuddy.ai/docs/zh/cli/skills（兼容 `.claude/skills/` 格式） |
| WorkBuddy | `.workbuddy/skills/` | `~/.workbuddy/skills/` | 腾讯云 WorkBuddy 文档（同一 CodeBuddy 产品线，遵循 AgentSkills 规范，也支持后台下发 `.zip` 技能包） |

**跨工具标准目录**：`.agents/skills/`（项目级）与 `~/.agents/skills/`（用户级）被 Codex、Cursor、opencode、DSH、pi、Deep Code 等原生识别。想一次覆盖最多 agent，就把技能放 `.agents/skills/`，再给只有专属目录的 agent（Claude Code、Qoder、CodeBuddy/WorkBuddy）建链接或副本。

## 加载差异与已知坑

| 现象 | 说明 | 处置 |
|---|---|---|
| 技能不出现 | 安装目录名与 frontmatter `name` 不一致，或文件名写成 `skill.md` | 目录名与 `name` 保持完全一致（本仓库统一为 `rs-<主题名>`）；文件名固定大写 `SKILL.md` |
| 技能被静默丢弃 | `description` 含冒号却未加引号，YAML 解析失败 | 含 `：`/`:` 的描述统一用引号包裹，或改用中文冒号 |
| 改了不生效 | 多数 agent 只在会话启动时扫描技能目录 | Qoder `/skills reload`、Claude Code 新会话、pi `/reload`、opencode 重启 |
| 名称冲突 | 同名技能存在于多个目录时，各 agent 的优先级不同（Claude：企业 > 个人 > 项目；DSH：`.dsh` > `.agents`） | 同一技能只保留一份源，其余目录用链接/副本指过去 |
| 自动触发不生效 | 部分 agent 需要模型按描述自主选中才会加载 | 用 `/技能名`、`/skill:技能名`、`@技能名` 显式调用验证内容可用，再优化 `description` 的触发词 |
| 脚本找不到相对路径 | `scripts/xxx.mjs` 的相对路径以技能目录为基准，而执行时 CWD 通常在项目根 | 正文里写清「从技能目录还是项目根执行」，脚本内部用 `import.meta.url` 定位自身 |

## 分发与同步

```bash
# 1) 查看支持的 agent 与本次计划（默认 dry-run，不写任何文件）
node skills/rs-mybatis-plus/scripts/link-agents.mjs --list
node skills/rs-mybatis-plus/scripts/link-agents.mjs --agent claude-code,cursor,qoder --scope project

# 2) 确认计划无误后落地：copy 为副本，link 为目录链接/符号链接
node skills/rs-mybatis-plus/scripts/link-agents.mjs --agent all --scope project --mode copy --apply
```

- **唯一源建议**：技能正文只维护在项目根的 `skills/rs-mybatis-plus/`（或 `.agents/skills/`），其余目录一律由脚本生成，禁止直接编辑副本——副本漂移是这类多 agent 方案的主要失败模式。
- 目标目录已存在同名技能时脚本默认跳过；`--force` 只把旧目录改名为 `<name>.bak-<时间戳>`，**不删除**任何文件。
- 用户级目录写入会影响本机所有项目，执行前看清 dry-run 输出；IDE/Agent 内置技能同名时不要用 `--force` 覆盖。
- Windows 下 `--mode link` 用目录 junction（无需管理员权限），Linux/macOS 用符号链接；链接失败会明确报错并提示改用 `--mode copy`，不会静默退化成副本。
