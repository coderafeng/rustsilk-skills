# Spring Boot 接入

## 依赖（Maven）

```xml
<properties>
  <easy-query.version>3.2.x</easy-query.version>
</properties>
<dependency>
  <groupId>com.easy-query</groupId>
  <artifactId>sql-springboot-starter</artifactId>
  <version>${easy-query.version}</version>
</dependency>
<!-- 方言包必选其一 -->
<dependency>
  <groupId>com.easy-query</groupId>
  <artifactId>sql-mysql</artifactId>
  <version>${easy-query.version}</version>
</dependency>
<!-- 实体模块还需 -->
<dependency>
  <groupId>com.easy-query</groupId>
  <artifactId>sql-processor</artifactId>
  <version>${easy-query.version}</version>
  <scope>provided</scope>
</dependency>
```

## application.yml（必填）

```yaml
easy-query:
  enable: true
  database: mysql          # 不能留空/UNKNOWN
  name-conversion: underlined  # 默认 Java 驼峰 → DB 下划线
  delete-throw: true         # 无 where 删除抛错
```

常见 `database` 值：`mysql`、`pgsql`、`mssql`、`h2`、`oracle`、`clickhouse` 等（见 README 方言表）。

启动报错 `Please select the correct database dialect` → 补 `easy-query.database`。

## 注入 Bean

Starter 自动注册：

- `EasyQueryClient easyQueryClient`
- `EasyEntityQuery easyEntityQuery`（`DefaultEasyEntityQuery`）

```java
@Service
@RequiredArgsConstructor
public class UserService {
    private final EasyEntityQuery easyEntityQuery;
}
```

## 与数据源

eq 使用 Spring 的 `DataSource`；多数据源需自定义 `StarterConfigurer` 或 `EasyQueryBootstrapper` 扩展（高级场景查 doc 分片/多数据源章节）。

## tracking（可选）

差量更新需启用 track；Spring 场景查 doc `track` 章节，注意 `@EnableEasyQueryTrack` 与事务边界。

文档：https://www.easy-query.com/easy-query-doc/plugin/spring-boot.html
