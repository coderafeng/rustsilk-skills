# CTE 与 Tree

## asTreeCTE

递归树查询，生成 `WITH [RECURSIVE] as_tree_cte AS (...)`。

```java
List<MyCategoryVO3> list = easyEntityQuery.queryable(MyCategory.class)
    .where(m -> m.id().eq("1"))
    .asTreeCTE(op -> {
        op.setDeepColumnName("deep");      // 深度列名
        op.setUp(true);                     // true=向上找父节点；false=向下找子节点
        op.setDeepInCustomSelect(true);     // 深度参与自定义 select
    })
    .selectAutoInclude(MyCategoryVO3.class)
    .toTreeList();   // 组装 children 树结构
```

配合 `selectAutoInclude` 的 DTO 需含 `children` 集合与 `@Navigate` 树关系。

## asTreeCTECustom

自定义父子列：

```java
.asTreeCTECustom(s -> s.id(), s -> s.pid())
```

## toCteAs（通用 CTE）

```java
ClientQueryable<BlogEntity> cte = easyQueryClient.queryable(BlogEntity.class)
    .where(t -> t.eq("id", "456"));

List<BlogEntity> list = easyQueryClient.queryable(BlogEntity.class)
    .leftJoin(cte.cloneQueryable().toCteAs("aa"), (a, b) -> a.eq(b, "id", "id"))
    .toList();
```

## distinct 语义

```java
easyEntityQuery.queryable(SysUser.class)
    .leftJoin(SysBankCard.class, (u, c) -> u.id().eq(c.uid()))
    .select((u, c) -> u)
    .distinct()   // SELECT DISTINCT 当前投影所有列
    .toList();
```

- **是**：投影行完全相同才去重。
- **不是**：按实体主键/id 去重。
- join 一对多后再 `distinct()` 仍可能因投影列不同而保留多行。

## Tree 去重

`asTreeCTE().toTreeList()` **不保证**按主键唯一：

- 同一节点可从多条匹配路径进入 CTE（尤其 `setUp(true)` 向上展开）。
- 测试样例中同一 `id=2` 可出现多次不同 `deep` 的节点。
- 需要唯一树：业务层按 id 合并，或调整 where/CTE 选项，而非假设框架自动 PK 去重。

文档：doc 中 tree/CTE 章节；源码参考 [sql-test](https://github.com/dromara/easy-query/tree/main/sql-test) 中 `QueryTest19.java`、`MySQL8Test5.testSysDeptCTE`。
