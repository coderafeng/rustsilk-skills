# SQL 预览与测试

## toSQL() vs toSQLResult()

```java
// 仅 SQL 字符串
String sql = easyEntityQuery.queryable(BlogEntity.class)
    .where(b -> b.id().eq("1"))
    .toSQL();

// SQL + 参数上下文（测试推荐）
ToSQLResult result = easyEntityQuery.queryable(BlogEntity.class)
    .where(b -> b.id().notLikeMatchLeft("id"))
    .toSQLResult();
String sql = result.getSQL();
List<SQLParameter> params = result.getSqlContext().getParameters();
```

适用：insertable/updatable/deletable 也有 `toSQL` / `toSQLResult`。

## 局限（必须告知用户）

1. **include / selectAutoInclude 多段 SQL**：`toSQLResult()` 只见当前表达式，不见 include 后续执行。
2. **any() 等**：谓词可能生成 EXISTS/子查询，但终结方法 `any()` 本身不返回 SQL；要对最终执行 SQL 用 Listener。
3. **分片**：可能多条 SQL，`toSQLResult()` 仅预览路由前的一条表达式。

## JdbcExecutorListener

监听**真实 JDBC 执行**，适合集成测试断言 SQL。

```java
// 注册（Bootstrapper 或测试 BaseTest）
EasyQueryClient client = EasyQueryBootstrapper.defaultBuilderConfiguration()
    .setDefaultDataSource(dataSource)
    .useDatabaseConfigure(new MySQLDatabaseConfiguration())
    .replaceService(JdbcExecutorListener.class, myJdbcListener)
    .build();
```

```java
// 测试用法（见 GitHub sql-test 模块）
ListenerContext ctx = new ListenerContext();
listenerContextManager.startListen(ctx);

easyEntityQuery.queryable(SysUser.class)
    .include(s -> s.firstCard())
    .toList();

JdbcExecuteAfterArg arg = ctx.getJdbcExecuteAfterArg();
String executedSql = arg.getBeforeArg().getSql();
// include 场景：可能只捕获最后一条；完整观察需 listener 记录所有 onExecuteAfter
listenerContextManager.clear();
```

## 两类测试策略

| 目标 | 方案 |
|------|------|
| 只验证表达式 SQL | `toSQLResult()` + Assert SQL/params |
| 验证运行时含 include/分片 | `JdbcExecutorListener` + 真实 `toList()`/`any()` |

## 日志

`easy-query.log-class` 或默认 Slf4j 可打印 SQL；生产环境用 Listener 或 AOP 更可控。

文档：https://www.easy-query.com/easy-query-doc/question.html
