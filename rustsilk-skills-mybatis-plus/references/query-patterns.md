# 单表查询与 CRUD

## Lambda 条件（首选）

```java
List<User> users = userMapper.selectList(
    Wrappers.<User>lambdaQuery()
        .eq(User::getName, "Tom")
        .ge(User::getAge, 18)
        .like(StringUtils.isNotBlank(kw), User::getEmail, kw)
        .orderByDesc(User::getId));

User one = userMapper.selectOne(
    Wrappers.lambdaQuery(User.class).eq(User::getId, 1L).last("LIMIT 1"));
```

动态条件：Wrapper 方法 overload `condition, column, val` — `false` 时不拼条件。

## 分页

```java
Page<User> page = userMapper.selectPage(new Page<>(current, size),
    Wrappers.lambdaQuery(User.class).eq(User::getAge, 18));
// page.getRecords(), page.getTotal()
```

`IPage` 入参不能为 null；临时不分页可 `new Page<>(1, -1)`。

## 更新

```java
// 按实体非 null 字段（策略可配置）
userMapper.updateById(user);

// 表达式更新
userMapper.update(null, Wrappers.<User>lambdaUpdate()
    .set(User::getAge, 20)
    .eq(User::getId, 1L));
```

## 删除与逻辑删除

```java
userMapper.deleteById(1L);
userMapper.delete(Wrappers.lambdaQuery(User.class).eq(User::getName, "test"));
```

实体字段 `@TableLogic` + 全局 `logic-delete-*` 配置 → 实际 `UPDATE` 置删除标记。

## 批量

```java
userService.saveBatch(userList, 500);
userService.updateBatchById(userList);
```

## 子查询 / exists（单表 Wrapper）

```java
Wrappers.lambdaQuery(User.class)
    .inSql(User::getId, "select user_id from address where city = '北京'")
    .exists("select 1 from address a where a.user_id = user.id");
```

复杂多表仍建议 MPJ 或 XML。

## 字段策略

`InsertStrategy` / `UpdateStrategy` / `@TableField(insertStrategy = NOT_NULL)` 控制 null 是否写入。

文档：[条件构造器](https://baomidou.com/guides/wrapper/)
