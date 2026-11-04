# 故障排查

## Proxy 未生成

**报错**：`java: 程序包 com.xxx.entity.proxy 不存在`

检查清单：

1. 实体类 `@EntityProxy` 或 `@EntityFileProxy`
2. 实现 `ProxyEntityAvailable<T, TProxy>`（`@EntityFileProxy` 时插件生成接口）
3. 模块 pom 含 `sql-processor`（provided）
4. 依赖 `sql-api-proxy`
5. IDEA：**EasyQuery** 插件，开启 APT 实时生成
6. `mvn clean compile` — 查看 `target/generated-sources/annotations`
7. **整个项目能编译**；Controller 语法错误会导致 APT 连锁失败
8. 注解处理器顺序：**lombok → mapstruct → easy-query sql-processor**

Maven compiler 插件需声明 `sql-processor` 的 annotationProcessorPaths（与 lombok 并列）。

## 数据库方言未配置

```
Please select the correct database dialect...
easy-query.database: mysql
```

Spring：`easy-query.enable=true` + `easy-query.database=mysql` + 对应 `sql-mysql` 依赖。

非 Spring：`.useDatabaseConfigure(new MySQLDatabaseConfiguration())`。

## 删除报错

```
'DELETE' statement without 'WHERE' clears all data
```

默认 `deleteThrow=true`。解决：

```java
easyEntityQuery.deletable(User.class)
    .disableLogicDelete()
    .allowDeleteStatement(true)
    .where(u -> u.id().isNotNull())
    .executeRows();
```

或配置 `easy-query.delete-throw=false`（慎用）。

## tracking / AOP

- 差量 `updatable(entity)` 需先 `easyEntityQuery.track(entity)` 或查询时开启 track
- 启动失败：查 `@EnableEasyQueryTrack`、是否混用多个 `EasyQueryClient` 实例
- 事务：表达式 `executeRows(expected, msg)` 非事务内会自动开事务做并发控制

## SQL 理解混淆

| 用户误解 | 事实 |
|----------|------|
| include 是一条 SQL | 多条 |
| toSQL 能看 include | 不能 |
| distinct = 按 id 去重 | 按投影行 |
| tree 结果不会重复 id | 可能重复 |

## 关键字/列名

配置 `easy-query.name-conversion`：`underlined`（默认）、`upper_underlined`、`lower_camel_case` 等。

## 版本敏感

API 如 `asTreeCTE` 选项、Spring Boot 3/4 starter（`sql-springboot-starter` vs `sql-springboot4-starter`）因版本而异 — 让用户提供 **eq 版本号**。

文档：https://www.easy-query.com/easy-query-doc/question.html

## 插件/IDEA 专用

- `Slow operations are prohibited on EDT` → Registry 关闭 `ide.slow.operations.assertion`
- Struct DTO：包右键 **Create Struct DTO**
- Proxy 接口生成：**EasyQueryAssistant**

见 `references/plugin-and-apt.md`。
