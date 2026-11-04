# Core API 体系

## 分层

```
Controller
  → Service (IService / MPJBaseService)  可选封装
    → Mapper (BaseMapper / MPJBaseMapper)
      → MyBatis SqlSession → JDBC
```

编码优先推荐：**Mapper + Lambda Wrapper**；复杂业务可 `ServiceImpl` 继承。

## BaseMapper（MP）

常用方法（`com.baomidou.mybatisplus.core.mapper.BaseMapper`）：

| 方法 | 用途 |
|------|------|
| `insert(T)` | 插入 |
| `deleteById` / `delete(Wrapper)` | 删除 |
| `updateById` / `update(T, Wrapper)` | 更新 |
| `selectById` / `selectBatchIds` | 按主键查 |
| `selectOne(Wrapper)` | 单条（多条会抛异常） |
| `selectList(Wrapper)` | 列表 |
| `selectPage(IPage, Wrapper)` | 分页 |
| `selectCount(Wrapper)` | 计数 |

## MPJBaseMapper（MPJ）

继承 `BaseMapper`，额外提供（`com.github.yulichang.base.MPJBaseMapper`）：

| 方法 | 用途 |
|------|------|
| `selectJoinList(Class<D>, MPJBaseJoin)` | 连表列表 |
| `selectJoinOne` | 单条 |
| `selectJoinPage` | 连表分页 |
| `selectJoinCount` | 连表 count |
| `selectJoinMaps` / `selectJoinMap` | Map 结果 |
| `deleteJoin` / `updateJoin` | 连表删改 |

## Wrapper 选择

| 场景 | Wrapper |
|------|---------|
| 单表条件 | `LambdaQueryWrapper` / `Wrappers.lambdaQuery()` |
| 单表更新 | `LambdaUpdateWrapper` / `Wrappers.lambdaUpdate()` |
| 字符串列名 | `QueryWrapper` / `UpdateWrapper` |
| **连表** | **`MPJLambdaWrapper`** / **`JoinWrappers.lambda(主表.class)`** |

静态工厂：

```java
Wrappers.<User>lambdaQuery()
Wrappers.<User>lambdaUpdate()
JoinWrappers.lambda(User.class)  // MPJ
```

## Service 层（可选）

```java
public interface UserService extends IService<User> {}

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {}

// 用法
userService.list(Wrappers.lambdaQuery(User.class).eq(User::getAge, 18));
userService.page(new Page<>(1, 10), wrapper);
userService.saveBatch(list);
userService.updateById(user);
```

MPJ Service（可选）：

```java
public interface UserService extends MPJBaseService<User> {}

@Service
public class UserServiceImpl extends MPJBaseServiceImpl<UserMapper, User> implements UserService {}
```

MPJ 1.5.2+ 还可 `JoinCrudRepository`（需 MP 3.5.9+）。

## 实体注解

```java
@Data
@TableName("user")
public class User {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private String name;
    @TableField("user_age")
    private Integer age;
    @TableLogic
    private Integer deleted;
}
```

文档：[注解配置](https://baomidou.com/reference/annotation/)
