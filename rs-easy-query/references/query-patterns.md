# 查询模式

## 单表

```java
SysUser user = easyEntityQuery.queryable(SysUser.class)
    .where(u -> u.id().eq("1"))
    .firstOrNull();

EasyPageResult<SysUser> page = easyEntityQuery.queryable(SysUser.class)
    .where(u -> u.name().like("张"))
    .orderBy(u -> u.createTime().desc())
    .toPageResult(1, 20);
```

## 隐式 Join（OneToOne / ManyToOne）

```java
List<SysUser> list = easyEntityQuery.queryable(SysUser.class)
    .where(u -> u.company().name().like("科技"))
    .orderBy(u -> u.company().registerMoney().desc())
    .toList();
```

## 隐式子查询 any / where（OneToMany）

```java
List<Company> companies = easyEntityQuery.queryable(Company.class)
    .where(c -> {
        c.users().any(u -> u.name().like("小明"));
        c.users().where(u -> u.name().like("小明"))
            .max(u -> u.birthday()).gt(LocalDateTime.of(2000,1,1,0,0));
    }).toList();
```

## subQueryToGroupJoin（合并多个子查询为 group join）

```java
List<Company> list = easyEntityQuery.queryable(Company.class)
    .subQueryToGroupJoin(c -> c.users())
    .where(c -> {
        c.users().any(u -> u.name().like("小明"));
        c.users().max(u -> u.birthday()).gt(LocalDateTime.now());
    }).toList();
```

或在 `@Navigate` / DTO 上配置 `subQueryToGroupJoin = true`。

## 显式 Join

```java
List<SysUser> list = easyEntityQuery.queryable(SysUser.class)
    .leftJoin(SysBankCard.class, (u, c) -> u.id().eq(c.uid()))
    .where((u, c) -> c.code().eq("6222"))
    .select((u, c) -> u)
    .toList();
```

## 显式子查询 in / exists

```java
var idQuery = easyEntityQuery.queryable(BlogEntity.class)
    .where(b -> b.star().gt(100))
    .select(b -> new StringProxy(b.id()));

List<Topic> topics = easyEntityQuery.queryable(Topic.class)
    .where(t -> t.id().in(idQuery))
    .toList();
```

## groupBy / having

```java
List<Draft2<String, Integer>> rows = easyEntityQuery.queryable(BlogEntity.class)
    .where(b -> b.content().like("blog"))
    .groupBy(b -> GroupKeys.of(b.title()))
    .having(g -> g.groupTable().star().sum().lt(10))
    .select(g -> Select.DRAFT.of(g.key1(), g.groupTable().star().sum()))
    .toList();
```

## 动态条件

使用 `where` 内布尔开关：`u.name().like(true, name)` — 第二个参数 false 时跳过。

或使用 `whereObject(dto)` / `orderByObject(dto)`（DTO 查询，见 dto-and-include.md）。

文档：https://www.easy-query.com/easy-query-doc/query/
