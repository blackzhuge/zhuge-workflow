---
name: dotnet-dev
description: .NET Core 开发规范，包含命名约定、异常处理、Furion + SqlSugar 最佳实践等
version: v3.0
paths:
  - "**/*.cs"
  - "**/*.csproj"
  - "**/*.sln"
  - "**/appsettings.json"
  - "**/appsettings.*.json"
---

# .NET Core 开发规范

> 参考来源: Microsoft C# 编码约定、Furion 官方文档

---

## 工具链

```bash
# dotnet CLI
dotnet build                         # 编译
dotnet test                          # 运行测试
dotnet run                           # 运行项目
dotnet publish -c Release            # 发布

# 格式化与分析
dotnet format                        # 格式化代码
dotnet build /p:TreatWarningsAsErrors=true  # 严格检查
```

---

## 命名约定

| 类型 | 规则 | 示例 |
|------|------|------|
| 命名空间 | PascalCase，公司.产品.模块 | `MyCompany.Project.Services` |
| 类/接口 | PascalCase，名词/名词短语 | `UserService`, `IUserRepository` |
| 方法名 | PascalCase，动词开头 | `FindById`, `IsValid` |
| 常量 | PascalCase | `MaxRetryCount` |
| 私有字段 | _camelCase 前缀下划线 | `_userRepository` |
| 布尔属性 | Is/Has/Can 前缀 | `IsActive`, `HasPermission` |

---

## 类成员顺序

```csharp
public class Example
{
    // 1. 常量
    public const string DefaultName = "value";

    // 2. 静态字段
    private static readonly ILogger<Example> _logger;

    // 3. 实例字段
    private readonly IUserRepository _userRepository;
    private long _id;

    // 4. 构造函数
    public Example(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    // 5. 属性
    public long Id { get; set; }

    // 6. 公共方法
    public void DoSomething() { }

    // 7. 私有方法
    private void HelperMethod() { }
}
```

---

## 异常处理

```csharp
// ✅ 好：捕获具体异常，添加上下文
try
{
    user = await _userRepository.FindByIdAsync(id);
}
catch (DbException ex)
{
    throw new ServiceException($"Failed to find user: {id}", ex);
}

// ✅ 好：资源自动释放
await using var stream = File.OpenRead(filePath);

// ❌ 差：捕获过宽
catch (Exception ex) { Console.WriteLine(ex); }
```

---

## 空值处理

```csharp
// ✅ 使用 Nullable Reference Types
public User? FindById(long id)
{
    return _userRepository.FindById(id);
}

// ✅ 参数校验
public void UpdateUser(User user)
{
    ArgumentNullException.ThrowIfNull(user);
}

// ✅ 安全的空值处理
var name = user?.Name ?? "Unknown";
```

---

## 异步编程

```csharp
// ✅ 使用 async/await
public async Task<User> GetUserAsync(long id)
{
    return await _userRepository.FindByIdAsync(id);
}

// ✅ 并行执行
var tasks = userIds.Select(id => GetUserAsync(id));
var users = await Task.WhenAll(tasks);

// ❌ 差：阻塞异步调用
var user = GetUserAsync(id).Result;  // 可能死锁
```

---

## 测试规范 (xUnit)

```csharp
public class UserServiceTests
{
    [Fact]
    public async Task FindById_WhenUserExists_ReturnsUser()
    {
        // Arrange
        var mockRepo = new Mock<IUserRepository>();
        mockRepo.Setup(r => r.FindByIdAsync(1L))
            .ReturnsAsync(new User { Id = 1, Name = "test" });
        var service = new UserService(mockRepo.Object);

        // Act
        var result = await service.FindByIdAsync(1L);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("test", result.Name);
    }
}
```

---

## Furion 框架规范

```csharp
// ✅ 动态 API（自动生成路由）
[DynamicApiController]
public class UserService : IDynamicApiController
{
    private readonly ISqlSugarRepository<User> _repository;

    public UserService(ISqlSugarRepository<User> repository)
    {
        _repository = repository;
    }

    // GET /api/user/{id}
    public async Task<User> GetAsync(long id)
    {
        return await _repository.GetByIdAsync(id);
    }

    // POST /api/user
    public async Task<long> AddAsync(UserDto dto)
    {
        var user = dto.Adapt<User>();
        return await _repository.InsertReturnIdentityAsync(user);
    }
}

// ✅ 传统 Controller（需要更多控制时）
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetById(long id)
    {
        var user = await _userService.GetAsync(id);
        return user is null ? NotFound() : Ok(user);
    }
}
```

---

## 性能优化

| 陷阱 | 解决方案 |
|------|---------|
| N+1 查询 | 使用 Includes() 或导航属性 |
| 循环拼接字符串 | 使用 `StringBuilder` |
| 频繁装箱拆箱 | 使用泛型集合 |
| 未使用异步 IO | 使用 async/await |

---

## 日志规范

```csharp
// ✅ 结构化日志
_logger.LogDebug("Finding user by id: {UserId}", userId);
_logger.LogInformation("User {Username} logged in", username);
_logger.LogError(exception, "Failed to process order {OrderId}", orderId);

// ❌ 差：字符串拼接
_logger.LogDebug("Finding user by id: " + userId);
```

---

## 详细参考

完整规范见 `references/dotnet-style.md`，包含：
- 完整命名约定和示例
- 详细异常处理模式
- Furion 动态 API 最佳实践
- 异步编程详解
- SqlSugar ORM 使用

---

> 📋 本回复遵循：`dotnet-dev` - [具体章节]
