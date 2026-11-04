# DTO 与 Include

## selectAutoInclude

按 DTO 结构与实体 `@Navigate` 关系**自动**组装 SELECT/JOIN/子查询，一次调用返回嵌套对象。

```java
// DTO 由 IDEA 插件 Create Struct DTO 生成，或手写 @Navigate 对应字段
List<SysUserFirstCardDTO> list = easyEntityQuery.queryable(SysUser.class)
    .where(u -> u.id().in("u1", "u2"))
    .selectAutoInclude(SysUserFirstCardDTO.class)
    .toList();
```

与 `include` 区别：

| | selectAutoInclude | include |
|--|-------------------|---------|
| 目的 | 投影到 DTO/指定结构 | 填充实体导航属性 |
| SQL | 尽量合并到主查询或结构化 SQL | 主查询 + **额外** SQL |
| 典型场景 | API 返回 VO/DTO | 查实体再 lazy 拉子表 |

可组合：

```java
easyEntityQuery.queryable(SysUser.class)
    .include(s -> s.firstCard())
    .selectAutoInclude(SysUserFirstCardDTO.class)
    .toList();
```

## include / includes

```java
// 单层
List<SysUser> users = easyEntityQuery.queryable(SysUser.class)
    .include(u -> u.bankCards())
    .toList();

// 多层 + 条件
List<SysUser> users = easyEntityQuery.queryable(SysUser.class)
    .include(u -> u.bankCards(), then -> {
        then.where(c -> c.type().eq("DEBIT"));
        then.include(c -> c.bank());
    })
    .toList();
```

**重要**：`include` 执行时通常先发主查询，再按主键 IN 发关联 SQL。`toSQLResult()` 只反映主链，不含 include 批次。

## 导航属性 @Navigate

```java
@Navigate(value = RelationTypeEnum.OneToMany,
    selfProperty = "id", targetProperty = "uid",
    subQueryToGroupJoin = true)
private List<SysBankCard> bankCards;

@Navigate(value = RelationTypeEnum.OneToOne,
    selfProperty = "id", targetProperty = "uid",
    orderByProps = @OrderByProperty(property = "openTime", asc = true),
    limit = 1)
private SysBankCard firstCard;
```

## whereObject / orderByObject

```java
UserQueryDTO q = new UserQueryDTO();
q.setName("张");
q.setMinAge(18);
easyEntityQuery.queryable(SysUser.class)
    .whereObject(q)
    .orderByObject(q)
    .selectAutoInclude(UserListVO.class)
    .toList();
```

DTO 字段用 `@EasyWhereCondition` 等注解声明匹配规则（见 doc DTO 章节）。

文档：https://www.easy-query.com/easy-query-doc/examples/include-example
