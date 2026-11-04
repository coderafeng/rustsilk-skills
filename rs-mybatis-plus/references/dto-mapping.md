# DTO 映射与结果类型

## 扁平 DTO（最常见）

```java
@Data
public class UserDTO {
    private Long id;
    private String name;
    // 来自 address 表
    private String city;
    private String address;
}
```

```java
.selectAll(User.class)
.select(Address::getCity, Address::getAddress)
.leftJoin(Address.class, Address::getUserId, User::getId)
// selectJoinList(UserDTO.class, wrapper)
```

字段名与类型需与 SELECT 列可映射；冲突用 `selectAs`：

```java
.selectAs(Address::getAddress, UserDTO::getUserAddress)
```

## 嵌套 DTO（MPJ 映射）

```java
@Data
public class UserDTO {
    private Long id;
    private String name;
    private List<AddressDTO> addressList;
    private AddressDTO address;  // 一对一
}
```

```java
.selectCollection(Address.class, UserDTO::getAddressList)
// 或
.selectAssociation(Address.class, UserDTO::getAddress)
```

MPJ 在内存中按主表行聚合集合，**不是** MyBatis 嵌套 `<collection>` XML 的 N+1 方案，而是一条 SQL + 结果拆分。

## selectAll 与重复列

`selectAll(User.class)` + join 多表时，重复列名（如 `id`）MPJ 会自动加别名；优先用 DTO 接结果而非实体 + 关联实体混用。

## 注解映射（可选）

MPJ 支持 `@TableField` 式注解做一对一/一对多（见 MPJ 文档「注解映射」）；Lambda 方式更常用，注解适合固定结构。

## 与 MP 单表 VO 区别

| 方式 | 适用 |
|------|------|
| `selectList` + 实体 | 单表 |
| 自定义 `@Select` XML | 任意 SQL |
| `selectJoinList(DTO, MPJWrapper)` | 连表 + DTO |
| `selectCollection` | 连表一对多嵌套 |

不要把 `selectJoinList` 当成 MyBatis `resultMap` 的自动替代品而不写 `select`/`join`。
