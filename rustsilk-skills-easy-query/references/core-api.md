# Core API 与模式

## EasyEntityQuery vs EasyQueryClient

| | EasyEntityQuery | EasyQueryClient |
|--|-----------------|-----------------|
| 包 | `com.easy.query.api.proxy.client` | `com.easy.query.core.api.client` |
| DSL | 强类型代理：`user.name().eq("x")` | 字符串/ClientQueryable：`t.eq("name","x")` |
| include/selectAutoInclude | 支持 | 不支持直接链式 |
| 默认推荐 | **是** | 底层扩展、无代理实体 |

关系：`EasyEntityQuery` 包装 `EasyQueryClient`；可通过 `easyEntityQuery.getEasyQueryClient()` 降级。

非 Spring 手动构建：

```java
EasyQueryClient client = EasyQueryBootstrapper.defaultBuilderConfiguration()
    .setDefaultDataSource(dataSource)
    .useDatabaseConfigure(new MySQLDatabaseConfiguration())
    .build();
EasyEntityQuery eq = new DefaultEasyEntityQuery(client);
```

## 代理模式（默认编码路径）

1. 实体 `@EntityProxy`（或 `@EntityFileProxy`）
2. 实现 `ProxyEntityAvailable<Entity, EntityProxy>`
3. 编译时 APT 生成 `EntityProxy`（需 `sql-processor`，scope provided）
4. 运行时依赖 `sql-api-proxy`

```java
@Data
@Table("t_sys_user")
@EntityProxy
public class SysUser implements ProxyEntityAvailable<SysUser, SysUserProxy> {
    @Column(primaryKey = true)
    private String id;
    private String name;
    @Navigate(value = RelationTypeEnum.OneToMany, targetProperty = "uid")
    private List<SysBankCard> bankCards;
}
```

`@EntityFileProxy`：代理类写入源目录旁，适合不想依赖 APT 生成路径的场景；仍需处理器或插件。

## 实体无接口上下文模式

当实体**不加** `@EntityProxy` / 不实现 `ProxyEntityAvailable` 时，用 `EasyQueryClient`：

```java
@Autowired EasyQueryClient easyQueryClient;

List<BlogEntity> list = easyQueryClient.queryable(BlogEntity.class)
    .where(t -> {
        t.eq("id", "123");
        t.like("title", "blog");
    })
    .toList();
```

也可 `select(BlogEntity.class, o -> o.column(BlogEntity::getId).column(BlogEntity::getTitle))`（ClientQueryable API）。

限制：无 `user.bankCards().any(...)` 导航 DSL；复杂关系用显式 join 或改用代理模式。

## CRUD 入口

```java
easyEntityQuery.queryable(T.class)   // 查
easyEntityQuery.insertable(entity)     // 增
easyEntityQuery.updatable(entity)      // 实体跟踪更新
easyEntityQuery.updatable(T.class).setColumns(...).where(...)  // 表达式更新
easyEntityQuery.deletable(T.class).where(...).executeRows()     // 删（默认逻辑删需条件）
```

文档：https://www.easy-query.com/easy-query-doc/startup/quick-start.html
