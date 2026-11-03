---
name: rustsilk-mybatis-plus
description: >
  MyBatis-Plus (MP) 与 MyBatis-Plus-Join (MPJ) 专家 skill，面向中文 Java / Spring Boot 编码场景。
  当用户询问 mybatis、mybatis-plus、BaseMapper/IService、LambdaQueryWrapper/Wrappers、
  分页 PaginationInnerInterceptor、MPJBaseMapper、MPJLambdaWrapper/JoinWrappers、
  selectJoinList/selectJoinPage、selectCollection/selectAssociation、连表 leftJoin、
  SQL 打印/p6spy/getSqlSegment、@TableName/@TableLogic、Spring Boot starter 配置、
  MP 3.5 jsqlparser 依赖时使用。
  即使用户只说「mybatis」「mybatis-plus」「MP」「MPJ」「mybatis-plus-join」「baomidou」也应触发。
  不用于 JPA/Hibernate/easy-query 对比或无关 ORM 讨论。
---

# MyBatis-Plus / MPJ Agent Skill

## 适用范围

- **MyBatis-Plus**（[baomidou/mybatis-plus](https://github.com/baomidou/mybatis-plus)，文档 [baomidou.com](https://baomidou.com/getting-started/)）
- **MyBatis-Plus-Join**（[yulichang/mybatis-plus-join](https://github.com/yulichang/mybatis-plus-join)，文档 [mybatis-plus-join.github.io](https://mybatis-plus-join.github.io/pages/quickstart/introduce.html)）
- 默认受众：**中文 Java 开发者**，**Spring Boot 优先**。
- 不确定时让用户补充：**MP 版本、MPJ 版本、Spring Boot 2/3/4、数据库类型**。

## Source Priority

按**已解析版本**查证（版本：用户口述 → 工作区全部 pom → 无 pom 则 GitHub 最新）：

1. **`vendor/<framework>/<version>/`**
2. **`~/.m2/.../*-sources.jar`**
3. **GitHub tag**（有具体版本时不用 main）
4. **官方文档**

版本不在 [vendor/versions.json](../../vendor/versions.json)：继续 2、3。

## 回答流程

### 信息不足时，最多问 3 个

1. 工作区是否有 `pom.xml`
2. Spring Boot 2/3/4（starter artifactId）
3. 数据库 / 报错栈

**未写版本时：** 扫描工作区全部 `pom.xml`；空白项目用 GitHub 最新。

### 1. 分类问题

| 类型 | 关键词 |
|------|--------|
| 概念 | BaseMapper、Wrapper、MP vs MPJ 边界 |
| 配置接入 | starter、@MapperScan、分页插件、jsqlparser |
| 单表 CRUD | selectList、save、updateById、逻辑删除 |
| 条件构造 | LambdaQueryWrapper、Wrappers.lambdaQuery |
| 连表 / DTO | MPJBaseMapper、leftJoin、selectJoinList |
| 一对多映射 | selectCollection、selectAssociation |
| 分页 | Page、selectPage、selectJoinPage |
| SQL 预览 | log-impl、p6spy、getSqlSegment/getTargetSql |
| Service 封装 | IService、MPJBaseService |
| 故障排查 | Invalid bound statement、分页无效、join 报错 |

### 2. 信息不足时，最多问 3 个

1. MyBatis-Plus 与 MPJ 版本？Spring Boot 2/3/4？
2. 单表还是连表？是否已让 Mapper 继承 `MPJBaseMapper`？
3. 完整报错或期望 SQL 形态？

### 3. 输出顺序

1. **结论**
2. **最短可用示例**（Mapper + Wrapper + 调用）
3. **2–5 条注意事项**

默认中文，简洁直接。

## MP 与 MPJ 边界（必须区分）

| 能力 | MyBatis-Plus | MyBatis-Plus-Join |
|------|--------------|-------------------|
| 单表 CRUD | `BaseMapper` | 继承 `MPJBaseMapper` 仍可用单表 API |
| 条件构造 | `LambdaQueryWrapper` | **`MPJLambdaWrapper` / `JoinWrappers.lambda`** |
| 连表查询 | 手写 XML / 子查询 | **`selectJoinList/Page/One/Count`** |
| 一对多结果映射 | 需手动或 XML | **`selectCollection` / `selectAssociation`** |
| Mapper 基类 | `BaseMapper<T>` | **`MPJBaseMapper<T>`**（连表必选） |

**规则**：连表、DTO 嵌套集合 → 用 MPJ；纯单表 → MP 即可，不必引入 MPJ Wrapper。

## 高频 API 速查

### MyBatis-Plus（单表）

```java
@Mapper
public interface UserMapper extends BaseMapper<User> {}

// 推荐：Lambda + Service 或 Mapper
List<User> list = userMapper.selectList(
    Wrappers.<User>lambdaQuery().eq(User::getName, "Jone").ge(User::getAge, 18));

Page<User> page = userMapper.selectPage(new Page<>(1, 10),
    Wrappers.<User>lambdaQuery().like(User::getEmail, "baomidou"));

userMapper.insert(user);
userMapper.updateById(user);
userMapper.delete(Wrappers.<User>lambdaQuery().eq(User::getId, 1L));
```

### MyBatis-Plus-Join（连表）

```java
@Mapper
public interface UserMapper extends MPJBaseMapper<User> {}

MPJLambdaWrapper<User> wrapper = JoinWrappers.lambda(User.class)
    .selectAll(User.class)
    .select(Address::getCity, Address::getAddress)
    .leftJoin(Address.class, Address::getUserId, User::getId)
    .eq(User::getId, 1L);

List<UserDTO> list = userMapper.selectJoinList(UserDTO.class, wrapper);
Page<UserDTO> page = userMapper.selectJoinPage(new Page<>(2, 10), UserDTO.class, wrapper);
```

**硬约束**（MPJ 文档明确要求）：

- `MPJLambdaWrapper` 泛型 = **主表**实体；
- **必须用主表 Mapper** 调用 `selectJoinList` 等。

## SQL 预览 vs 真实执行

| 方式 | 适用 |
|------|------|
| `mybatis-plus.configuration.log-impl: StdOutImpl` | 开发看完整 SQL（MP 官方） |
| p6spy / MP 内置 P6Spy 集成 | 含耗时；见 [SQL 分析与打印](https://baomidou.com/guides/p6spy/) |
| `wrapper.getCustomSqlSegment()` / `getSqlSegment()` | 仅 **WHERE/ORDER 片段**，不是完整 SELECT |
| MPJ `getTargetSql()` / `getSqlSelect()` | 预览 join 相关片段；**仍建议执行或日志验证** |

不要把 `getSqlSegment()` 当成最终发往 JDBC 的完整 SQL。

## Spring Boot 前置（高频）

```yaml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl  # 开发可选
  global-config:
    db-config:
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
```

```java
@Configuration
public class MybatisPlusConfig {
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor; // 多插件时：分页放最后
    }
}
```

- SB2：`mybatis-plus-boot-starter`
- SB3：`mybatis-plus-spring-boot3-starter`
- SB4：`mybatis-plus-spring-boot4-starter`
- MP **≥3.5.9** 常需额外 `mybatis-plus-jsqlparser`（见 references）
- MPJ：`mybatis-plus-join-boot-starter`（需 MP ≥3.1.2）

## 常见陷阱

| 现象 | 方向 |
|------|------|
| `selectJoinList` 找不到 | Mapper 未继承 `MPJBaseMapper` |
| 分页 total=0 或 SQL 不对 | 未注册 `PaginationInnerInterceptor`；join 分页需 MP 分页插件 |
| 连表用 `LambdaQueryWrapper` | 应换 `MPJLambdaWrapper` |
| 一对多变笛卡尔积 | 用 `selectCollection` 映射，或 DTO 扁平字段 + 业务组装 |
| `Invalid bound statement` | `@MapperScan` 路径、XML namespace、方法名不匹配 |
| 逻辑删除不生效 | `@TableLogic` + 全局 db-config |
| 条件丢失 | Wrapper 被复用修改；每次 `new` 或 `clone()` |

## References（按需加载）

| 文件 | 何时读 |
|------|--------|
| [references/core-api.md](references/core-api.md) | Mapper、Service、Wrapper 体系 |
| [references/spring-boot-setup.md](references/spring-boot-setup.md) | 依赖、分页、jsqlparser |
| [references/query-patterns.md](references/query-patterns.md) | 单表查询、更新、批量 |
| [references/mpj-join.md](references/mpj-join.md) | 连表、selectCollection、updateJoin |
| [references/dto-mapping.md](references/dto-mapping.md) | selectAs、嵌套 DTO |
| [references/sql-preview-and-testing.md](references/sql-preview-and-testing.md) | SQL 观察与测试 |
| [references/troubleshooting.md](references/troubleshooting.md) | 报错排查 |

## 最小示例索引

<details>
<summary>MPJ selectJoinList</summary>

```java
List<UserDTO> list = userMapper.selectJoinList(UserDTO.class,
    JoinWrappers.lambda(User.class)
        .selectAll(User.class)
        .select(Address::getCity)
        .leftJoin(Address.class, Address::getUserId, User::getId));
```

</details>

<details>
<summary>selectCollection 一对多</summary>

```java
List<UserDTO> list = userMapper.selectJoinList(UserDTO.class,
    new MPJLambdaWrapper<User>()
        .selectAll(User.class)
        .selectCollection(Address.class, UserDTO::getAddressList)
        .leftJoin(Address.class, Address::getUserId, User::getId));
```

</details>

<details>
<summary>SQL 片段预览</summary>

```java
LambdaQueryWrapper<User> w = Wrappers.lambdaQuery(User.class).eq(User::getId, 1L);
String segment = w.getCustomSqlSegment(); // 仅条件片段，非完整 SQL
```

</details>

<details>
<summary>分页</summary>

```java
Page<User> page = userMapper.selectPage(new Page<>(1, 10),
    Wrappers.lambdaQuery(User.class).ge(User::getAge, 18));
```

</details>

<details>
<summary>Spring Boot 3 依赖</summary>

```xml
<dependency>
  <groupId>com.baomidou</groupId>
  <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
  <version>3.5.16</version>
</dependency>
<dependency>
  <groupId>com.github.yulichang</groupId>
  <artifactId>mybatis-plus-join-boot-starter</artifactId>
  <version>1.5.7</version>
</dependency>
```

</details>
