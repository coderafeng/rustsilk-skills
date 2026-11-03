# MyBatis-Plus-Join 连表

## 基本连表

```java
MPJLambdaWrapper<User> wrapper = JoinWrappers.lambda(User.class)
    .selectAll(User.class)
    .select(Address::getCity, Address::getAddress)
    .selectAs(Address::getAddress, UserDTO::getUserAddress)  // 别名映射到 DTO
    .leftJoin(Address.class, Address::getUserId, User::getId)
    .eq(User::getId, 1L)
    .like(Address::getCity, "北京");

List<UserDTO> list = userMapper.selectJoinList(UserDTO.class, wrapper);
```

等价 SQL 形态（[GitHub README](https://github.com/yulichang/mybatis-plus-join)）：

```sql
SELECT t.id, t.name, ..., t1.city, t1.address AS userAddress
FROM user t
LEFT JOIN address t1 ON t1.user_id = t.id
WHERE t.id = ? AND t1.city LIKE ?
```

## Join 类型

```java
.leftJoin(Entity.class, on...)
.rightJoin(...)
.innerJoin(...)
```

## 同表多次 join

```java
.leftJoin(TableA.class, "aaaaa", TableA::getId, TableT::getAid1)
.leftJoin(TableA.class, "bbbbb", TableA::getId, TableT::getAid2)
.selectAssociation("aaaaa", TableA.class, TableDTO::getTable1)
```

## selectCollection（一对多）

```java
MPJLambdaWrapper<User> wrapper = new MPJLambdaWrapper<User>()
    .selectAll(User.class)
    .selectCollection(Address.class, UserDTO::getAddressList)
    .leftJoin(Address.class, Address::getUserId, User::getId);

List<UserDTO> list = userMapper.selectJoinList(UserDTO.class, wrapper);
```

嵌套多层可在 `selectCollection` 回调里继续 join + `selectCollection`（见 [selectCollection 文档](https://mybatis-plus-join.github.io/pages/core/lambda/select/selectCollection.html)）。

## selectAssociation（一对一）

```java
.selectAssociation(Address.class, UserDTO::getAddress)
.leftJoin(Address.class, Address::getUserId, User::getId)
```

见 [selectAssociation 文档](https://mybatis-plus-join.github.io/pages/core/lambda/select/selectAssociation.html)。

## selectSub / 子查询

MPJ 支持 wrapper 内子查询 select（见 MPJ 文档「子查询」章节）；版本 API 以用户 MPJ 版本 doc 为准，不确定时让用户贴版本。

## 分页

```java
Page<UserDTO> page = userMapper.selectJoinPage(
    new Page<>(2, 10), UserDTO.class, wrapper);
```

**必须**配置 MP `PaginationInnerInterceptor`。

## updateJoin / deleteJoin

连表更新/删除（见 MPJ 文档 MPJBaseMapper 章节）：

```java
userMapper.deleteJoin(MPJWrappers.lambdaJoin(User.class)
    .leftJoin(Address.class, Address::getUserId, User::getId)
    .eq(Address::getCity, "北京"));
```

## 硬规则（回答时必须强调）

1. `MPJLambdaWrapper<User>` 泛型 = 主表 `User`
2. 调用 `userMapper.selectJoinList`（主表 Mapper）
3. 不会 MPJ 前先确认 MP `LambdaQueryWrapper` **不能**替代 join
4. MPJ 只做增强，单表仍可用原 `BaseMapper` 方法
