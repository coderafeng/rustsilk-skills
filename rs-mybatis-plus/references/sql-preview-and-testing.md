# SQL 预览与测试

## 三类方案

| 方案 | 看到什么 | 场景 |
|------|----------|------|
| MyBatis `log-impl` | **完整** JDBC SQL + 参数 | 本地开发 |
| p6spy | SQL + 耗时 | 调试慢 SQL |
| Wrapper `getSqlSegment` | **片段**（WHERE 等） | 单元测试断言条件 |

## 1. StdOutImpl（MP 官方推荐开发用）

```yaml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

执行 `selectList` / `selectJoinList` 后在控制台看 `==> Preparing:` 行。

## 2. p6spy

见 [SQL 分析与打印](https://baomidou.com/guides/p6spy/)：

- `driver-class-name: com.p6spy.engine.spy.P6SpyDriver`
- `url: jdbc:p6spy:mysql://...`
- `spy.properties` 配置 `modulelist` 含 `MybatisPlusLogFactory`

**生产慎用**（性能损耗）。

## 3. Wrapper 片段（非完整 SQL）

```java
LambdaQueryWrapper<User> w = Wrappers.lambdaQuery(User.class)
    .eq(User::getId, 1L)
    .like(User::getName, "J");
// WHERE 片段（含 AND 前缀）
String segment = w.getCustomSqlSegment();
Map<String, Object> params = w.getParamNameValuePairs();
```

MPJ：

```java
MPJLambdaWrapper<User> jw = JoinWrappers.lambda(User.class)
    .selectAll(User.class)
    .leftJoin(Address.class, Address::getUserId, User::getId)
    .eq(User::getId, 1L);
String wherePart = jw.getCustomSqlSegment();
String selectPart = jw.getSqlSelect();   // SELECT 相关
// getTargetSql() 视版本组合片段，仍建议以实际日志为准
```

**禁止**向用户声称 `getSqlSegment()` = 最终执行 SQL。

## 单元测试建议

```java
@SpringBootTest
class UserMapperTest {
    @Autowired UserMapper userMapper;

    @Test
    void joinQuery() {
        MPJLambdaWrapper<User> w = JoinWrappers.lambda(User.class)
            .selectAll(User.class)
            .leftJoin(Address.class, Address::getUserId, User::getId);
        List<UserDTO> list = userMapper.selectJoinList(UserDTO.class, w);
        assertFalse(list.isEmpty());
    }

    @Test
    void wrapperSegment() {
        LambdaQueryWrapper<User> w = Wrappers.lambdaQuery(User.class).eq(User::getId, 1L);
        assertTrue(w.getCustomSqlSegment().contains("id"));
    }
}
```

集成测试要断言 SQL 时：开 `StdOutImpl` 或 mock + 捕获日志；或测业务结果而非硬编码 SQL 字符串（防方言/版本差异）。

## MPJ vs MP 日志

两者共用 MyBatis 执行链；`selectJoinList` 同样走 `log-impl` 输出**一条** join SQL（与 include 式 ORM 不同）。
