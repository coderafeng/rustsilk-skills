# 故障排查

## Mapper / 绑定

| 报错 | 处理 |
|------|------|
| `Invalid bound statement (not found)` | `@MapperScan` 包路径；XML `namespace` = Mapper 全类名；方法名一致 |
| `Could not autowire UserMapper` | 接口加 `@Mapper` 或 `@MapperScan` |

## MPJ 专用

| 现象 | 处理 |
|------|------|
| 无 `selectJoinList` | `extends MPJBaseMapper<T>` |
| `MPJLambdaWrapper` 编译错误 | 检查 MPJ starter 是否引入 |
| join 分页 total 异常 | 注册 `PaginationInnerInterceptor`；join 表加别名 |
| 用 `BaseMapper.selectList` + join wrapper | 必须用 `selectJoinList` |
| 主从表搞反 | Wrapper 泛型与 `selectJoinList` 调用方必须是**主表** Mapper |

## 分页不生效

- 缺少 `MybatisPlusInterceptor` + `PaginationInnerInterceptor`
- 多插件顺序错误（分页应最后）
- 自定义 XML 分页未接收 `IPage` 参数

## 逻辑删除

- 忘记 `@TableLogic` 或全局 `logic-delete-field`
- 原生 SQL / `@Select` 手写语句不会自动带逻辑删除

## 版本兼容

| 问题 | 处理 |
|------|------|
| JSqlParser 相关异常 | MP ≥3.5.9 加 `mybatis-plus-jsqlparser` |
| SB3 包名 jakarta | 用 `mybatis-plus-spring-boot3-starter` |
| MPJ 与 MP 版本 | MPJ 1.5.7 需 MP ≥3.1.2；以用户 pom 为准 |

## 一对多结果重复

- 扁平 DTO + 多行 join → 用户看到重复主表字段：**正常**，改 `selectCollection` 或 DISTINCT 业务设计
- 不要误导为「MP 按主键自动合并」

## SQL 打印 null（p6spy）

- `excludecategories` 增加 `commit`（见 MP p6spy 文档）
- 批量操作检查 `batch` 类别配置

## 官方 FAQ

- MP：[常见问题](https://baomidou.com/reference/questions/)（若 404 则查 baomidou.com 导航）
- MPJ 文档站「常见问题」章节
- GitHub Issues：[mybatis-plus](https://github.com/baomidou/mybatis-plus/issues) / [mybatis-plus-join](https://github.com/yulichang/mybatis-plus-join/issues)

## 回答约束

- 不确定的 MPJ 小版本 API → 让用户提供 MPJ 版本 + 贴 doc 链接核对
- 不编造 `selectJoinXXX` 不存在的方法名
