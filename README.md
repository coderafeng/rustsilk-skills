# rustsilk-skills

面向 **Cursor / Codex / Claude Code Agent** 的 Java 领域 Skill 集合，帮助 AI 在编码场景中准确回答框架使用、配置与排错问题，减少 API 幻觉与空泛建议。

- 仓库内每个子目录为一个独立 Skill，命名前缀 **`rustsilk-skills-*`**
- 每个 Skill 含 **`SKILL.md`**（核心约束与回答流程）及可选 **`references/`**（按需展开的专题文档）
- 默认服务 **中文 Java 开发者**，**Spring Boot 优先**，编码示例优先于概念介绍

---

## Skill 列表

| Skill | 典型触发词 | 功能描述 |
|-------|------------|----------|
| `rustsilk-easy-query` | `eq`、`easy-query`、`EasyEntityQuery`、`easyEntityQuery`、`Navigate`、`selectAutoInclude`、`include`、`toSQLResult` | easy-query ORM：DSL、`EasyEntityQuery`、Navigate 导航、DTO/结构化返回、SQL 预览、`asTreeCTE`、代理/`@EntityProxy`/`sql-processor`、Spring Boot 配置与排错。 |
| `rustsilk-mybatis-plus` | `mybatis`、`mybatis-plus`、`MP`、`MPJ`、`baomidou`、`selectJoinList`、`MPJLambdaWrapper` | MyBatis-Plus + MPJ：Wrapper、分页、`MPJBaseMapper`、连表与 `selectCollection`、SQL 日志、starter/jsqlparser、连表 DTO 与排错。 |

> 源码目录：`rustsilk-skills-<主题>/`。新增 Skill 时创建对应子目录并追加一行。

### 如何选择 Skill

| 你的问题涉及… | 应触发的 Skill |
|---------------|----------------|
| easy-query / eq / `EasyEntityQuery` / `easyEntityQuery` / `Navigate` / 代理 APT | `rustsilk-easy-query` |
| MyBatis / MyBatis-Plus / MPJ / `BaseMapper` / `MPJLambdaWrapper` | `rustsilk-mybatis-plus` |
| 「JPA 和 MyBatis 哪个好」等框架选型对比 | **均不触发**（Skill 不覆盖 ORM 对比） |

两个 Skill 可同时安装；Agent 会根据问题中的框架关键词自动选择。

---

## 目录结构

```
rustsilk-skills/
├── README.md
├── vendor/
│   ├── versions.json           # 保留版本清单（入库）
│   ├── README.md
│   └── <framework>/<version>/  # sync 生成，gitignore
├── scripts/
│   ├── install.sh
│   ├── install.ps1
│   ├── sync-vendor-sources.sh   # Maven sources → vendor/
│   └── scan-pom-versions.py     # 扫描 pom 更新 versions.json
├── rustsilk-skills-easy-query/
│   ├── SKILL.md
│   └── references/
│       ├── core-api.md
│       ├── spring-boot-setup.md
│       ├── query-patterns.md
│       ├── dto-and-include.md
│       ├── sql-preview-and-testing.md
│       ├── cte-and-tree.md
│       ├── troubleshooting.md
│       └── plugin-and-apt.md
├── rustsilk-skills-mybatis-plus/
│   ├── SKILL.md
│   └── references/
│       ├── core-api.md
│       ├── spring-boot-setup.md
│       ├── query-patterns.md
│       ├── mpj-join.md
│       ├── dto-mapping.md
│       ├── sql-preview-and-testing.md
│       └── troubleshooting.md
└── rustsilk-skills-xxx/          # 后续 Skill（预留）
```

---

## 安装

### 安装方式对比

| 方式 | 路径 | 适用场景 |
|------|------|----------|
| **用户级（默认）** | `~/.cursor/skills/` | 本机所有项目通用，个人开发推荐 |
| **项目级** | 本仓库 `.cursor/skills/` | 团队共享、随 git 克隆即用，需提交到版本库 |
| **Codex / Claude** | `~/.codex/skills/`、`~/.claude/skills/` | 对应 CLI / Claude Code 环境 |

**Cursor 项目级安装是支持的**：将 Skill 复制到仓库内 `.cursor/skills/<skill-name>/` 即可（与 Cursor 官方 [create-skill](https://cursor.com) 约定一致）。克隆本仓库后执行 `./scripts/install.sh --project` 即可写入项目级目录。

> 注意：项目级 Skill **不会**自动从用户级目录读取；二者择一或同时安装均可，重复安装同名 Skill 时以后写入的路径为准（视 Cursor 索引策略而定）。

### 一键安装（推荐）

在仓库根目录执行脚本，自动扫描并安装全部 `rustsilk-skills-*` 子目录：

```bash
# Bash — 用户级 Cursor（默认）
chmod +x scripts/install.sh
./scripts/install.sh

# 项目级（写入 .cursor/skills/，适合团队）
./scripts/install.sh --project

# Codex / Claude
./scripts/install.sh --codex
./scripts/install.sh --claude

# 一次装到 Cursor + Codex + Claude 用户目录
./scripts/install.sh --all
```

```powershell
# Windows PowerShell
.\scripts\install.ps1
.\scripts\install.ps1 -Target Project
.\scripts\install.ps1 -All
```

### 更新本地 Skill

本仓库更新后，**已安装的 Skill 不会自动同步**，需手动拉代码并重新安装（安装脚本会先删除旧目录再复制，等同于覆盖更新）。

**用户级（Cursor / Codex / Claude）— 三步：**

```bash
cd /path/to/rustsilk-skills
git pull origin main

# 与首次安装相同；装过三平台的用 --all
./scripts/install.sh --all
```

```powershell
cd D:\path\to\rustsilk-skills
git pull origin main
.\scripts\install.ps1 -All
```

完成后 **重启 Cursor / 重新加载窗口**（Codex、Claude 同理），让 Agent 重新索引 Skill。

**只更新某一平台：**

| 平台 | 命令 |
|------|------|
| 仅 Cursor | `./scripts/install.sh --cursor` 或 `.\scripts\install.ps1` |
| 仅 Codex | `./scripts/install.sh --codex` 或 `.\scripts\install.ps1 -Target Codex` |
| 仅 Claude | `./scripts/install.sh --claude` 或 `.\scripts\install.ps1 -Target Claude` |

**项目级（`.cursor/skills/`）：**

```bash
git pull origin main
./scripts/install.sh --project
# 若 .cursor/skills/ 有变更，提交到 git 供团队拉取
git add .cursor/skills && git commit -m "chore: update project skills"
```

**说明：**

- 更新 Skill **不需要**重新跑 `sync-vendor-sources.sh`；vendor 缓存与 Skill 文本是独立的，见 [什么时候才需要手动执行 sync？](#什么时候才需要手动执行-sync)。
- 若只关心某一个 Skill，也可只复制对应目录（见下方「只安装某一个 Skill」）。

**一行速记：**

```bash
cd rustsilk-skills && git pull && ./scripts/install.sh --all
```

### 手动安装

```bash
# Linux / macOS / Git Bash — Cursor 用户级
mkdir -p ~/.cursor/skills
cp -r rustsilk-skills-easy-query ~/.cursor/skills/rustsilk-easy-query
cp -r rustsilk-skills-mybatis-plus ~/.cursor/skills/rustsilk-mybatis-plus

# 项目级
mkdir -p .cursor/skills
cp -r rustsilk-skills-easy-query .cursor/skills/rustsilk-easy-query
cp -r rustsilk-skills-mybatis-plus .cursor/skills/rustsilk-mybatis-plus
```

```powershell
# Windows PowerShell — Cursor 用户级
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cursor\skills"
Copy-Item -Recurse rustsilk-skills-easy-query "$env:USERPROFILE\.cursor\skills\rustsilk-easy-query"
Copy-Item -Recurse rustsilk-skills-mybatis-plus "$env:USERPROFILE\.cursor\skills\rustsilk-mybatis-plus"
```

### 各平台路径

| 平台 | Skills 目录 | 说明 |
|------|-------------|------|
| Cursor 用户级 | `~/.cursor/skills/` | 全项目可用 |
| Cursor 项目级 | `<repo>/.cursor/skills/` | 随仓库分发，需 `git commit` |
| Codex CLI | `$CODEX_HOME/skills/`（默认 `~/.codex/skills/`） | 与 `SKILL.md` 中 `name` 字段对应 |
| Claude Code | `~/.claude/skills/` | 每 Skill 一个子目录 + `SKILL.md` |

### 前置要求

- Skill 目录内必须包含带 YAML frontmatter（`name`、`description`）的 **`SKILL.md`**
- 安装后建议 **重启 IDE 或重新加载窗口**，使 Agent 重新索引 Skill

### 只安装某一个 Skill

```bash
cp -r rustsilk-skills-easy-query ~/.cursor/skills/rustsilk-easy-query
# 或
cp -r rustsilk-skills-mybatis-plus ~/.cursor/skills/rustsilk-mybatis-plus
```

---

## 源码查证与版本说明

### 版本从哪来（Agent 自动，无需长描述）

| 情况 | 版本来源 |
|------|----------|
| 用户写了版本号 | 用该版本 |
| 未写版本，工作区有 `pom.xml` | **扫描工作区所有 pom**（含子模块、`dependencyManagement`、`* .version` 属性） |
| 空白项目、无 pom | **GitHub 默认分支 / 最新 Release** + 官方文档 |

有版本后查证顺序：`vendor/` → `.m2` sources → GitHub **tag**（非 main）→ 文档。

> **是否需要先跑 sync？** 日常提问**不需要**；仅在你想预缓存 `vendor/` 或维护 `versions.json` 时才手动执行，详见 [什么时候才需要手动执行 sync？](#什么时候才需要手动执行-sync)。

### easy-query 日常 artifacts（Spring Boot）

业务 pom 常见写法：

```xml
<dependency>
  <groupId>com.easy-query</groupId>
  <artifactId>sql-springboot4-starter</artifactId>
</dependency>
<dependency>
  <groupId>com.easy-query</groupId>
  <artifactId>sql-processor</artifactId>
  <scope>provided</scope>
</dependency>
```

| artifactId | 作用 |
|------------|------|
| `sql-springboot4-starter` | Spring Boot 4 集成（**日常主依赖**） |
| `sql-springboot-starter` | Spring Boot 2/3 |
| `sql-processor` | APT 生成 `@EntityProxy`（provided） |
| `sql-api-proxy` | 代理 DSL API（starter 会传递，vendor 仍单独拉 sources 便于查阅） |
| `sql-core` | 核心实现（**已在 starter 传递依赖中**；查底层实现时可额外 sync） |

`vendor/versions.json` 默认 artifacts 为 Boot4 场景；Boot3 用 `--profile springBoot3`。

---

## sync-vendor-sources.sh 使用说明

从 Maven Central 下载 `*-sources.jar` 解压到 `vendor/<framework>/<version>/`（**不入 git**）。

### 什么时候才需要手动执行 sync？

**结论：日常用 Skill 提问时，不需要手动 sync。**

Agent 回答问题时**不会**自动运行 sync，也**不会**要求你每次提问前先执行 sync。它会按 [源码查证与版本说明](#源码查证与版本说明) 中的顺序自行查源码：`vendor/`（若本地已有）→ 本机 `.m2` sources → GitHub **tag** → 官方文档。

| 场景 | 是否需要手动 sync | 说明 |
|------|:-----------------:|------|
| 在业务项目里日常问 eq / MP 问题 | **否** | 工作区有 `pom.xml` 时 Agent 自动读版本；无 `vendor/` 也能从 `.m2` 或 GitHub 查证 |
| 预缓存常用版本，加快离线或重复查证 | 可选 | 将 sources 落到 `vendor/`，减少反复从 Maven Central 下载 |
| 项目升级依赖后，希望 `vendor/` 与 pom 对齐 | **是** | 见下方 `--scan-pom . --update-manifest` |
| 维护 rustsilk-skills 仓库、更新 `versions.json` | **是** | 扫业务 pom，或 `--fallback-github` 填默认版本 |
| 本机 `.m2` 无 sources、网络不稳定 | 可选 | 提前 sync 到 `vendor/` 可提高查证稳定性 |
| 需查 `sql-core` 等未进默认 artifacts 的底层包 | 可选 | 单版本 sync，或扩展 `versions.json` 后全量 sync |

补充说明：

- **`vendor/versions.json` 是预缓存清单，不是白名单。** 未写入 json 的版本仍可被 Agent 查证（通过 pom 版本 + `.m2` / GitHub tag）。
- **sync 属于维护/加速操作**，不是 Agent 工作流的一步；安装 Skill 后即可直接提问，无需额外配置 vendor。

### 前置

- 已安装 **Maven**、**Python 3**、**unzip**
- 建议在 **rustsilk-skills 仓库根目录** 执行

```bash
chmod +x scripts/sync-vendor-sources.sh scripts/scan-pom-versions.py
```

### 常用命令

| 场景 | 命令 |
|------|------|
| 按 `versions.json` 全量同步 | `./scripts/sync-vendor-sources.sh` |
| **推荐：扫业务项目 pom 并更新 json** | `./scripts/sync-vendor-sources.sh --scan-pom /path/to/你的Java项目 --update-manifest` |
| 在当前目录扫 pom（Cursor 工作区根） | `./scripts/sync-vendor-sources.sh --scan-pom . --update-manifest` |
| 无 pom 时用 GitHub 最新 Release 填 json | `./scripts/sync-vendor-sources.sh --scan-pom . --update-manifest --fallback-github` |
| Spring Boot 3 的 eq starter | `./scripts/sync-vendor-sources.sh --profile springBoot3` |
| 单版本临时缓存（不在 json 里） | `./scripts/sync-vendor-sources.sh --framework easy-query --version 3.2.7 --no-prune` |
| easy-query 额外拉 `sql-test` | `./scripts/sync-vendor-sources.sh --with-git-tests` |

### 参数说明

| 参数 | 说明 |
|------|------|
| `--scan-pom [DIR]` | 递归扫描 DIR 下所有 `pom.xml`（跳过 `target/`） |
| `--update-manifest` | 将扫到的版本**合并写入** `vendor/versions.json`（新的在前，保留 `retainCount` 个） |
| `--fallback-github` | 扫不到 pom 时，从 GitHub Releases 取最新版写入 json |
| `--profile springBoot3\|springBoot4` | 使用 `versions.json` 里 `artifactsAlt` 的 starter 组合 |
| `--framework` / `--version` | 只同步指定框架的单个版本 |
| `--no-prune` | 不删除 json 外的旧 vendor 目录 |
| `--with-git-tests` | easy-query 额外 sparse clone `sql-test` |

### 推荐工作流（需要手动 sync 时）

以下适用于 [上表](#什么时候才需要手动执行-sync) 中标注为「是」或「可选」的场景，**不是**日常提问的前置步骤。

**在 Java 业务仓库里开发时**（Cursor 工作区 = 业务项目）：

```bash
/path/to/rustsilk-skills/scripts/sync-vendor-sources.sh --scan-pom . --update-manifest
```

**维护 rustsilk-skills 本身、无业务 pom 时**：

```bash
./scripts/sync-vendor-sources.sh --scan-pom . --update-manifest --fallback-github
```

合并进 `versions.json` 后若需提交：

```bash
git add vendor/versions.json && git commit -m "chore(vendor): sync framework versions from pom scan"
```

### 输出目录示例

```
vendor/easy-query/3.2.10/
├── sql-api-proxy/          # 解压后的 Java 源码
├── sql-springboot4-starter/
├── sql-processor/
└── git-sql-test/sql-test/  # 仅 --with-git-tests
```

更多见 [vendor/README.md](./vendor/README.md)。

---

## 使用方式

Skill 由 Agent **自动触发**，一般无需手动 `@` 引用。

1. **直接提问** — 带上框架名与具体场景（配置、写法、报错栈）
2. **Agent 读 SKILL.md** — 按回答流程、source priority 与语义约束作答
3. **复杂专题** — Agent 按需加载 `references/` 下的文档，避免一次输出过长教程

### 提问示例

**easy-query**

- easy-query 3.2.8，`selectAutoInclude` 和 `include` 有什么区别？
- Spring Boot 启动报 `Please select the correct database dialect`
- `@EntityProxy` 编译后 proxy 包不存在

**MyBatis-Plus / MPJ**

- MPJ 1.5.7，`selectCollection` 一对多怎么写？
- `selectJoinList` 报错，Mapper 要继承什么？
- 开发环境怎么打印 SQL？

### 触发建议

带上 **框架名 + 场景** 即可；有 `pom.xml` 在 workspace 里时 Agent 会自己读版本。

版本敏感时可顺带写版本号，例如 `easy-query 3.2.8` 或 `MP 3.5.16`，**不必**说明 vendor / sources 用法。

### 验证 Skill 是否生效

| Skill | 合格回答应… |
|-------|-------------|
| `rustsilk-easy-query` | 优先 `EasyEntityQuery`；区分 `include` / `selectAutoInclude` / `toSQLResult`；不编造 eq API |
| `rustsilk-mybatis-plus` | 单表用 `LambdaQueryWrapper`，连表用 `MPJLambdaWrapper` + `selectJoinList`；说明 `getSqlSegment` 仅为片段 |

---

## 开发与贡献

### 新增 Skill 步骤

1. 创建 `rustsilk-skills-<主题>/`
2. 编写 `SKILL.md`（frontmatter 含 `name`、`description`；description 写清触发场景）
3. 专题示例、排查清单放入 `references/`，主文件保持精简（progressive disclosure）
4. 更新本 README **Skill 列表** 与 **目录结构**

### 设计原则

| 原则 | 说明 |
|------|------|
| 编码优先 | 可运行的 Spring Boot 示例，避免伪代码与宣传文案 |
| 不硬编 API | 不确定时明确说明，并让用户补充版本与环境 |
| 边界清晰 | 不扩展无关 ORM 对比、不写框架选型软文 |
| 语义准确 | 如 eq 的 `distinct` vs 主键去重、MP 的 `getSqlSegment` vs 完整 SQL |

---

## 官方文档与源码

### easy-query

- [官方文档](https://www.easy-query.com/easy-query-doc/)
- [GitHub — dromara/easy-query](https://github.com/dromara/easy-query)

### MyBatis-Plus

- [快速开始](https://baomidou.com/getting-started/)
- [GitHub — baomidou/mybatis-plus](https://github.com/baomidou/mybatis-plus)

### MyBatis-Plus-Join

- [介绍与快速开始](https://mybatis-plus-join.github.io/pages/quickstart/introduce.html)
- [GitHub — yulichang/mybatis-plus-join](https://github.com/yulichang/mybatis-plus-join)

---

## 许可证

本仓库 Skill 内容仅供学习与团队内部 Agent 增强使用。  
easy-query、MyBatis-Plus、MyBatis-Plus-Join 等框架遵循各自官方仓库许可证（Apache-2.0）。
