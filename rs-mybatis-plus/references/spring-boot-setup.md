# Spring Boot 接入

## 依赖矩阵

| Spring Boot | MyBatis-Plus Starter |
|-------------|----------------------|
| 2.x | `mybatis-plus-boot-starter` |
| 3.x | `mybatis-plus-spring-boot3-starter` |
| 4.x（≥3.5.13） | `mybatis-plus-spring-boot4-starter` |

MyBatis-Plus-Join（与 MP 版本独立）：

```xml
<dependency>
  <groupId>com.github.yulichang</groupId>
  <artifactId>mybatis-plus-join-boot-starter</artifactId>
  <version>1.5.7</version>
</dependency>
```

要求：**MP ≥ 3.1.2**（[MPJ 安装文档](https://mybatis-plus-join.github.io/pages/quickstart/install.html)）。

## MP 3.5.9+ jsqlparser

分页、防全表更新等插件依赖 JSqlParser，MP 3.5.9 起需**额外**引入：

```xml
<!-- JDK 11+ -->
<dependency>
  <groupId>com.baomidou</groupId>
  <artifactId>mybatis-plus-jsqlparser</artifactId>
  <version>${mybatis-plus.version}</version>
</dependency>
<!-- JDK 8 用 mybatis-plus-jsqlparser-4.9 -->
```

缺依赖时常见运行时错误与 SQL 解析相关；让用户对照 [快速开始](https://baomidou.com/getting-started/) 的说明。

## 启动类

```java
@SpringBootApplication
@MapperScan("com.example.mapper")
public class Application { }
```

## application.yml 示例

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/demo
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver

mybatis-plus:
  mapper-locations: classpath*:/mapper/**/*.xml
  type-aliases-package: com.example.entity
  configuration:
    map-underscore-to-camel-case: true
    # 开发 SQL 日志（生产关闭）
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
  global-config:
    db-config:
      id-type: assign_id
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
```

## 分页插件（必选才能 selectPage / selectJoinPage）

```java
@Bean
public MybatisPlusInterceptor mybatisPlusInterceptor() {
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
    return interceptor;
}
```

注意（[分页插件文档](https://baomidou.com/plugins/pagination/)）：

- 多个 InnerInterceptor 时，**分页放最后**；
- `left join` 不参与 where 时 count 可能被优化掉 join；
- join 分页建议表和字段加别名。

## Mapper 修改（MPJ）

```java
// 前
public interface UserMapper extends BaseMapper<User> {}
// 后 — 单表 API 保留，连表可用
public interface UserMapper extends MPJBaseMapper<User> {}
```
