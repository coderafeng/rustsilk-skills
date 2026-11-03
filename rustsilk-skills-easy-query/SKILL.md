---
name: rustsilk-easy-query
description: >
  easy-query (eq) ORM 专家 skill，面向中文 Java / Spring Boot 编码场景。
  当用户询问 easy-query 的查询 DSL、EasyEntityQuery/easyEntityQuery、selectAutoInclude、
  include、Navigate 导航属性、DTO 结构化返回、toSQL/toSQLResult、JdbcExecutorListener、
  asTreeCTE、代理模式/@EntityProxy、sql-processor、Spring Boot 配置 easy-query.database、
  编译/Proxy 未生成、更新删除、子查询/any/groupJoin、IDEA 插件时使用。
  即使用户只说「eq」「easy query」「easy-query」「EasyEntityQuery」「Navigate」「dromara easy-query」也应触发。
  不用于 JPA/Hibernate/MyBatis 对比或无关 ORM 讨论。
---

# easy-query Agent Skill

## 适用范围

- 仅回答 **easy-query**、**easy-query-doc**、**easy-query-plugin**、IntelliJ 插件集成。
- 默认受众：**中文 Java 开发者**，**Spring Boot 优先**。
- 不确定 API/版本行为时，明确说不确定，并让用户补充：eq 版本、数据库类型、是否代理模式、是否 Spring Boot。

## Source Priority（回答前按序查证）

用户提到版本号，或工作区 `pom.xml` / 依赖可读出版本时，**按该版本**向下查找，无需用户额外说明「用 vendor」：

1. **`vendor/<framework>/<version>/`** — 若本仓库已 sync（见 [vendor/versions.json](../../vendor/versions.json)）
2. **`~/.m2/.../{artifactId}-{version}-sources.jar`** — 无则建议 `mvn dependency:get -Dartifact=...:jar:sources`
3. **GitHub 对应 tag**（非 main）— [dromara/easy-query](https://github.com/dromara/easy-query) 的 `sql-test/`
4. **easy-query-doc** — https://www.easy-query.com/easy-query-doc/
5. **插件** — 仅 IDE/插件问题时

**版本不在 `versions.json` 中**：正常，json 只是预缓存列表；继续步骤 2、3，勿要求用户先改 json。

**版本解析（用户未写版本时）：** 扫描工作区全部 `pom.xml` → 仍无则 GitHub 最新 + 文档。

## 回答流程

### 1. 分类问题

| 类型 | 关键词 |
|------|--------|
| 概念 | EasyEntityQuery、代理、APT、导航属性 |
| 配置接入 | starter、yml、方言、依赖 |
| 查询写法 | queryable、where、join、any、子查询 |
| 更新删除 | updatable、deletable、tracking、乐观锁 |
| DTO/结构化 | selectAutoInclude、whereObject |
| include/多层级 | include、includes、selectAutoInclude 组合 |
| SQL 预览 | toSQL、toSQLResult |
| CTE/tree | asTreeCTE、toTreeList、toCteAs |
| 插件/IDEA | Create Struct DTO、EasyQueryAssistant |
| 编译故障 | proxy 不存在、sql-processor、APT 顺序 |
| 测试/SQL 观察 | JdbcExecutorListener、单元测试断言 SQL |

### 2. 信息不足时，最多问 3 个

1. 工作区是否有 `pom.xml`（无则按 GitHub 最新）
2. Spring Boot 2/3/4（`sql-springboot-starter` vs `sql-springboot4-starter`）
3. 数据库类型

### 3. 输出顺序

1. **结论**（1–3 句）
2. **最短可用示例**（Spring Boot + `EasyEntityQuery` + `sql-springboot4-starter` / `sql-processor`）
3. **2–5 条注意事项**

默认中文，简洁直接。

## 核心 API 定位（必须区分）

| API | 用途 | 默认选择 |
|-----|------|----------|
| `EasyEntityQuery` | 代理 DSL：`o.id().eq()`、include、selectAutoInclude | **优先** |
| `EasyQueryClient` | 底层 `ClientQueryable`：字符串列名 `t.eq("id","1")` | 无代理/legacy/CTE 组合时补充 |

Spring Boot 注入：

```java
@Autowired EasyEntityQuery easyEntityQuery;
@Autowired EasyQueryClient easyQueryClient; // 需要底层 API 时
```

## 高频 API 速查

```java
// 查询
easyEntityQuery.queryable(User.class).where(u -> u.name().like("张")).toList();
easyEntityQuery.queryable(User.class).where(u -> u.orders().any(o -> o.status().eq(1))).toList();

// DTO 结构化（导航属性用 @Navigate 或 DTO 插件生成）
easyEntityQuery.queryable(User.class)
    .where(u -> u.id().eq("1"))
    .selectAutoInclude(UserDetailDTO.class)
    .firstOrNull();

// include：主查询 + 额外 SQL 填充关联（不是单条 SQL）
easyEntityQuery.queryable(User.class)
    .include(u -> u.bankCards())
    .toList();

// SQL 预览（仅当前表达式，不含 include 后续 SQL）
ToSQLResult r = easyEntityQuery.queryable(User.class).where(u -> u.id().eq("1")).toSQLResult();
String sql = r.getSQL();
List<SQLParameter> params = r.getSqlContext().getParameters();

// 树 CTE
easyEntityQuery.queryable(Dept.class)
    .where(d -> d.id().eq("1"))
    .asTreeCTE(op -> op.setUp(true))
    .selectAutoInclude(DeptTreeDTO.class)
    .toTreeList();
```

## 必须遵守的语义

### SQL 预览 vs 真实执行

- `toSQL()` / `toSQLResult()`：生成**当前链式表达式**的 SQL+参数。
- `include()` / `selectAutoInclude` 含一对多：**常有多条 SQL**；`toSQLResult()` 看不到后续 include SQL。
- `any()` 等终结执行：不能靠猜 SQL；用 `JdbcExecutorListener` 或测试里监听实际执行。

### distinct

- `distinct()` 对**当前 SELECT 投影整行**去重，**不是**按主键去重。
- `asTreeCTE().toTreeList()` 结果**不默认**按主键去重；同一节点可因多路径出现多次。

### 数据库方言

Spring Boot **必须**配置，否则启动报错：

```yaml
easy-query:
  enable: true
  database: mysql   # 不能为空 UNKNOWN
```

## 常见陷阱（先排查）

| 现象 | 方向 |
|------|------|
| `程序包 xxx.proxy 不存在` | 实体 `@EntityProxy`、模块引入 `sql-processor`、IDEA EasyQuery 插件、mvn compile 顺序（lombok→mapstruct→eq） |
| 启动 `Please select the correct database dialect` | 配置 `easy-query.database` |
| include 的 SQL 和 toSQL 不一致 | 正常；include 是额外执行 |
| tracking/AOP 启动失败 | 检查 `@EnableEasyQueryTrack`、事务、版本 |
| 无接口写法报错 | 应用 `EasyQueryClient.queryable` + `column()`/`eq("prop",val)`，见 references |

## 回答风格

- 给**准确类名/方法名/注解名**，示例尽量可编译。
- 文档链接用 **easy-query.com** 公开 URL，不写本地路径。
- 插件内容**仅**在用户问插件/DTO 生成/IDE 报错时展开 → 读 `references/plugin-and-apt.md`
- 复杂专题按需读 references（见下），不要一次倾倒全文。

## References（按需加载）

| 文件 | 何时读 |
|------|--------|
| [references/core-api.md](references/core-api.md) | API 定位、代理、无接口模式 |
| [references/spring-boot-setup.md](references/spring-boot-setup.md) | 依赖、yml、Bean |
| [references/query-patterns.md](references/query-patterns.md) | 查询、join、any、子查询、groupJoin |
| [references/dto-and-include.md](references/dto-and-include.md) | selectAutoInclude、include、导航 |
| [references/sql-preview-and-testing.md](references/sql-preview-and-testing.md) | toSQLResult、Listener、测试 |
| [references/cte-and-tree.md](references/cte-and-tree.md) | asTreeCTE、distinct、toTreeList |
| [references/troubleshooting.md](references/troubleshooting.md) | proxy/APT/方言/tracking 排查 |

## 最小示例索引（回答时可引用）

<details>
<summary>selectAutoInclude</summary>

```java
List<SysUserFirstCardDTO> list = easyEntityQuery.queryable(SysUser.class)
    .where(u -> u.id().in("u1", "u2"))
    .selectAutoInclude(SysUserFirstCardDTO.class)
    .toList();
```

</details>

<details>
<summary>include 多 SQL 观察</summary>

```java
ListenerContext ctx = new ListenerContext();
listenerContextManager.startListen(ctx);
easyEntityQuery.queryable(SysUser.class).include(s -> s.firstCard()).toList();
// ctx.getJdbcExecuteAfterArg() 可能只有 include 那条 SQL；主查询需看完整 listener 记录
listenerContextManager.clear();
```

</details>

<details>
<summary>toSQLResult</summary>

```java
ToSQLResult sqlResult = easyEntityQuery.queryable(BlogEntity.class)
    .where(b -> b.id().notLikeMatchLeft("id"))
    .toSQLResult();
Assert.assertEquals("...", sqlResult.getSQL());
```

</details>

<details>
<summary>asTreeCTE + 去重说明</summary>

```java
List<SysDeptTreeResp> tree = easyEntityQuery.queryable(SysDept.class)
    .where(s -> s.name().in(List.of("abc-算法部")))
    .asTreeCTE(op -> { op.setUp(true); op.setDeepColumnName("deep"); })
    .selectAutoInclude(SysDeptTreeResp.class)
    .toTreeList();
// 同一 id 可多次出现；distinct() 不等于按主键去重
```

</details>

<details>
<summary>代理未生成排查</summary>

1. 实体加 `@EntityProxy`，实现 `ProxyEntityAvailable<T, TProxy>`
2. 模块 pom 加 `sql-processor`（provided）
3. IDEA 安装 EasyQuery 插件；`mvn compile` 后检查 `target/generated-sources/annotations`
4. 项目整体能编译；lombok/mapstruct/eq 注解处理器顺序

</details>

<details>
<summary>Spring Boot 方言</summary>

```yaml
easy-query:
  enable: true
  database: mysql
```

依赖：`sql-springboot-starter` + `sql-mysql`（或对应方言包）

</details>

<details>
<summary>无接口上下文模式</summary>

```java
// EasyQueryClient：字符串属性名，无需 XxxProxy
List<BlogEntity> list = easyQueryClient.queryable(BlogEntity.class)
    .where(t -> t.eq("id", "123"))
    .toList();
```

</details>
