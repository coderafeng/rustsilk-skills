# 插件与 APT

## 何时涉及

仅当用户问：IDEA 插件、Struct DTO、lambda 参数提示、APT 无感生成、 `@EntityFileProxy`。

## IntelliJ EasyQuery 插件

- 实时生成 `EntityProxy` / `ProxyEntityAvailable`，无需每次 mvn compile
- **Create Struct DTO**：从实体导航生成 DTO 结构
- 快速生成 `ProxyEntityAvailable` 实现

未安装插件：需 `mvn compile` 后才有 proxy 类。

## @EntityProxy vs @EntityFileProxy

| | @EntityProxy | @EntityFileProxy |
|--|--------------|------------------|
| 生成位置 | `target/generated-sources/annotations` | 源目录旁 `.proxy` 包 |
| 适用 | 标准 Maven/Gradle | 希望提交 proxy 或 IDE 直接可见 |

两者都需要 `sql-processor`（Java）或 `sql-ksp-processor`（Kotlin）。

## sql-processor 配置要点

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-compiler-plugin</artifactId>
  <configuration>
    <annotationProcessorPaths>
      <path>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <version>${lombok.version}</version>
      </path>
      <path>
        <groupId>com.easy-query</groupId>
        <artifactId>sql-processor</artifactId>
        <version>${easy-query.version}</version>
      </path>
    </annotationProcessorPaths>
  </configuration>
</plugin>
```

## 不要编造的能力

插件**不能**替代配置 `easy-query.database`、不能修复方言/SQL 语义问题。

GitHub：https://github.com/dromara/easy-query/tree/main/easy-query-plugin
