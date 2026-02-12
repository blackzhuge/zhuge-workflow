# .NET Core 开发规范

作者：wwj
版本：v1.0
日期：2026-01-13
状态：草稿

> **部署位置**: `~/.claude/skills/dotnet-dev/`
> **作用范围**: 所有 .NET Core 项目
> **参考来源**: Microsoft C# 编码约定、Furion 官方文档、SqlSugar 官方文档

---
paths:
  - "**/*.cs"
  - "**/*.csproj"
  - "**/*.sln"
  - "**/appsettings.json"
---

## 工具链

<!-- [注释] 可根据项目调整 -->

- 格式化: dotnet format / IDE 内置格式化
- 静态检查: Roslyn Analyzers、StyleCop.Analyzers
- 构建工具: dotnet CLI / MSBuild
- 测试: xUnit + Moq

```bash
# dotnet CLI 常用命令
dotnet build                         # 编译
dotnet test                          # 运行测试
dotnet run                           # 运行项目
dotnet publish -c Release            # 发布
dotnet format                        # 格式化代码

# 带分析器的构建
dotnet build /p:TreatWarningsAsErrors=true
dotnet build /p:EnforceCodeStyleInBuild=true
```

## 命名约定

<!-- [注释] 遵循 Microsoft 官方规范 -->

### 命名空间
- PascalCase，公司.产品.模块: `MyCompany.Project.Services`
- 避免与类名冲突

```csharp
// ✅ 好
namespace MyCompany.ECommerce.Services;
namespace MyCompany.ECommerce.Models;

// ❌ 差
namespace mycompany.ecommerce;    // 应使用 PascalCase
namespace My_Company.E_Commerce;  // 不要用下划线
```

### 类命名
- PascalCase: `UserService`、`HttpClient`
- 类名应是名词或名词短语
- 接口以 I 前缀: `IUserRepository`、`IDisposable`

```csharp
// ✅ 好
public class UserService { }
public class HttpRequestHandler { }
public interface IUserRepository { }

// ❌ 差
public class userService { }    // 应大写开头
public class Do_Something { }   // 不要用下划线
public interface UserRepository { }  // 接口应以 I 开头
```

### 方法命名
- PascalCase: `GetUserById`、`IsValid`
- 动词或动词短语开头
- 异步方法以 Async 后缀: `GetUserByIdAsync`

```csharp
// ✅ 好
public User FindById(long id) { }
public async Task<User> FindByIdAsync(long id) { }
public bool IsActive() { }
public bool HasPermission(string role) { }

// ❌ 差
public User findById(long id) { }        // 应 PascalCase
public async Task<User> FindById() { }   // 异步应加 Async 后缀
```

### 字段与属性命名
- 公共属性: PascalCase `UserId`
- 私有字段: _camelCase `_userId`
- 常量: PascalCase `MaxRetryCount`
- 静态只读: PascalCase `DefaultTimeout`

```csharp
// ✅ 好
private readonly long _userId;
private readonly IUserRepository _userRepository;
public long UserId { get; set; }
public const int MaxRetryCount = 3;
public static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(30);

// ❌ 差
private long userId;           // 私有字段应加下划线前缀
public long userId { get; }    // 属性应 PascalCase
private const int MAX_RETRY;   // 常量不用全大写
```

### 泛型类型参数
- 单个大写字母或描述性名称: `T`、`TEntity`、`TKey`、`TValue`

```csharp
// ✅ 好
public class Repository<TEntity> where TEntity : class { }
public interface IDictionary<TKey, TValue> { }
public T Find<T>(int id) where T : class { }
```

## 代码组织

### 类成员顺序

<!-- [注释] 建议顺序，可根据团队习惯调整 -->

```csharp
public class Example
{
    // 1. 常量
    public const string DefaultName = "value";

    // 2. 静态只读字段
    private static readonly ILogger<Example> _logger;

    // 3. 静态字段
    private static int _instanceCount;

    // 4. 实例只读字段
    private readonly IUserRepository _userRepository;

    // 5. 实例字段
    private long _id;

    // 6. 构造函数
    public Example() { }
    public Example(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    // 7. 属性
    public long Id { get; set; }
    public string Name { get; init; }

    // 8. 公共方法
    public void DoSomething() { }
    public async Task DoSomethingAsync() { }

    // 9. 私有方法
    private void HelperMethod() { }
}
```

### using 规范
- System 命名空间优先
- 按字母顺序排列
- 使用 global using 减少重复

```csharp
// ✅ 好 - 文件顶部
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

using MyCompany.Project.Models;
using MyCompany.Project.Services;

// ✅ 好 - GlobalUsings.cs
global using System;
global using System.Collections.Generic;
global using Microsoft.Extensions.Logging;
```

### 项目结构

<!-- [注释] 遵循 Clean Architecture 或分层架构 -->

```
Project/
├── src/
│   ├── Project.Api/                 # Web API 层
│   │   ├── Controllers/
│   │   ├── Filters/
│   │   ├── Middleware/
│   │   └── Program.cs
│   ├── Project.Application/         # 应用层
│   │   ├── Services/
│   │   ├── DTOs/
│   │   └── Interfaces/
│   ├── Project.Domain/              # 领域层
│   │   ├── Entities/
│   │   ├── ValueObjects/
│   │   └── Interfaces/
│   └── Project.Infrastructure/      # 基础设施层
│       ├── Data/
│       │   ├── DbContext.cs
│       │   └── Repositories/
│       └── Services/
├── tests/
│   ├── Project.UnitTests/
│   └── Project.IntegrationTests/
└── Project.sln
```

## 异常处理

<!-- [注释] 异常处理是 .NET 开发的重点 -->

### 基本原则
- 优先使用内置异常类型
- 不要捕获 `Exception`（除非在最顶层）
- 不要忽略异常（空 catch 块）
- 异常信息要有意义

```csharp
// ✅ 好：捕获具体异常，添加上下文
try
{
    user = await _userRepository.FindByIdAsync(id);
}
catch (DbUpdateException ex)
{
    throw new ServiceException($"Failed to find user: {id}", ex);
}

// ✅ 好：资源自动释放
await using var stream = File.OpenRead(filePath);
await using var connection = new SqlConnection(connectionString);

// ❌ 差：捕获过宽
try
{
    DoSomething();
}
catch (Exception ex)  // 太宽泛
{
    Console.WriteLine(ex);  // 不要用 Console.WriteLine
}

// ❌ 差：忽略异常
try
{
    DoSomething();
}
catch (IOException)
{
    // 空的 catch 块，异常被吞掉
}
```

### 自定义异常
- 业务异常继承 `Exception`
- 必须提供有意义的消息
- 实现序列化构造函数（如需跨进程传递）

```csharp
public class BusinessException : Exception
{
    public string ErrorCode { get; }

    public BusinessException(string errorCode, string message)
        : base(message)
    {
        ErrorCode = errorCode;
    }

    public BusinessException(string errorCode, string message, Exception innerException)
        : base(message, innerException)
    {
        ErrorCode = errorCode;
    }
}

// 使用
throw new BusinessException("USER_NOT_FOUND", $"User with id {id} not found");
```

## 空值处理

<!-- [注释] NRE 是最常见的错误，使用 Nullable Reference Types -->

### 基本原则
- 启用 Nullable Reference Types (`<Nullable>enable</Nullable>`)
- 使用 `?` 标记可空类型
- 参数校验放在方法开头

```csharp
// ✅ 好：启用 Nullable Reference Types
public User? FindById(long id)
{
    return _context.Users.FirstOrDefault(u => u.Id == id);
}

// ✅ 好：参数校验
public void UpdateUser(User user)
{
    ArgumentNullException.ThrowIfNull(user);
    ArgumentNullException.ThrowIfNull(user.Id);
    // ...
}

// ✅ 好：安全的空值处理
var name = user?.Name ?? "Unknown";
var length = user?.Name?.Length ?? 0;

// ✅ 好：模式匹配
if (user is { Name: var name, Age: > 18 })
{
    Console.WriteLine($"Adult user: {name}");
}

// ❌ 差：返回 null 且未标记可空
public User FindById(long id)  // 应该是 User?
{
    return _context.Users.FirstOrDefault(u => u.Id == id);
}
```

## 注释规范

<!-- [注释] XML 文档注释是 .NET 文档的标准方式 -->

### XML 文档注释
- 所有公共 API 应有文档注释
- 描述"做什么"而非"怎么做"

```csharp
/// <summary>
/// Finds a user by their unique identifier.
/// </summary>
/// <param name="id">The user's unique identifier.</param>
/// <returns>The user if found; otherwise, null.</returns>
/// <exception cref="ArgumentException">Thrown when id is less than 1.</exception>
public async Task<User?> FindByIdAsync(long id)
{
    if (id < 1)
        throw new ArgumentException("Id must be positive", nameof(id));

    return await _context.Users.FindAsync(id);
}
```

### 行内注释
- 解释"为什么"而非"是什么"
- 避免废话注释

```csharp
// ✅ 好：解释原因
// 使用 lock 而非 ConcurrentDictionary，因为需要原子地检查并更新多个字段
lock (_syncLock)
{
    // ...
}

// ❌ 差：废话注释
// 获取用户 ID
var userId = user.Id;  // 代码已经很清楚了
```

## 异步编程

<!-- [注释] async/await 是 .NET 异步编程的核心 -->

### 基本原则
- IO 操作使用 async/await
- 不要阻塞异步调用（`.Result`、`.Wait()`）
- 正确传递 CancellationToken

```csharp
// ✅ 好：使用 async/await
public async Task<User?> GetUserAsync(long id, CancellationToken cancellationToken = default)
{
    return await _context.Users
        .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
}

// ✅ 好：并行执行
var tasks = userIds.Select(id => GetUserAsync(id));
var users = await Task.WhenAll(tasks);

// ✅ 好：带超时的操作
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
var result = await GetDataAsync(cts.Token);

// ❌ 差：阻塞异步调用（可能死锁）
var user = GetUserAsync(id).Result;
GetUserAsync(id).Wait();

// ❌ 差：async void（除了事件处理器）
public async void DoSomething() { }  // 应该返回 Task
```

### 并发控制

```csharp
// ✅ 使用 SemaphoreSlim 限制并发
private readonly SemaphoreSlim _semaphore = new(10);

public async Task ProcessAsync()
{
    await _semaphore.WaitAsync();
    try
    {
        await DoWorkAsync();
    }
    finally
    {
        _semaphore.Release();
    }
}

// ✅ 使用 Channel 进行生产者-消费者
var channel = Channel.CreateBounded<WorkItem>(100);

// Producer
await channel.Writer.WriteAsync(item);

// Consumer
await foreach (var item in channel.Reader.ReadAllAsync())
{
    await ProcessItemAsync(item);
}
```

## 测试规范

<!-- [注释] 使用 xUnit + Moq -->

### 测试方法命名
- 描述测试场景和预期结果
- 格式: `MethodName_Scenario_ExpectedResult`

```csharp
public class UserServiceTests
{
    private readonly Mock<IUserRepository> _mockRepository;
    private readonly UserService _sut;  // System Under Test

    public UserServiceTests()
    {
        _mockRepository = new Mock<IUserRepository>();
        _sut = new UserService(_mockRepository.Object);
    }

    [Fact]
    public async Task FindByIdAsync_WhenUserExists_ReturnsUser()
    {
        // Arrange
        var expected = new User { Id = 1, Name = "test" };
        _mockRepository
            .Setup(r => r.FindByIdAsync(1))
            .ReturnsAsync(expected);

        // Act
        var result = await _sut.FindByIdAsync(1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("test", result.Name);
    }

    [Fact]
    public async Task FindByIdAsync_WhenUserNotExists_ReturnsNull()
    {
        // Arrange
        _mockRepository
            .Setup(r => r.FindByIdAsync(It.IsAny<long>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.FindByIdAsync(999);

        // Assert
        Assert.Null(result);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task FindByIdAsync_WhenIdInvalid_ThrowsArgumentException(long id)
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(
            () => _sut.FindByIdAsync(id));
    }
}
```

### 测试结构
- 使用 Arrange-Act-Assert 模式
- 每个测试只验证一个行为

```csharp
[Fact]
public async Task CreateOrder_WithValidData_CreatesAndReturnsOrder()
{
    // Arrange
    var request = new CreateOrderRequest { /* ... */ };
    _mockProductService
        .Setup(s => s.CheckStockAsync(It.IsAny<long>()))
        .ReturnsAsync(true);

    // Act
    var result = await _sut.CreateOrderAsync(request);

    // Assert
    Assert.NotNull(result);
    Assert.Equal(OrderStatus.Created, result.Status);
    _mockOrderRepository.Verify(r => r.AddAsync(It.IsAny<Order>()), Times.Once);
}
```

## 日志规范

<!-- [注释] 使用 Microsoft.Extensions.Logging 或 Serilog -->

### 基本原则
- 使用结构化日志
- 使用消息模板，避免字符串拼接
- 选择合适的日志级别

```csharp
// ✅ 好：结构化日志
private readonly ILogger<UserService> _logger;

_logger.LogDebug("Finding user by id: {UserId}", userId);
_logger.LogInformation("User {Username} logged in from {IpAddress}", username, ip);
_logger.LogWarning("Failed to send email to {Email}, will retry", email);
_logger.LogError(exception, "Failed to process order {OrderId}", orderId);

// ✅ 好：高性能日志（.NET 6+）
[LoggerMessage(Level = LogLevel.Information, Message = "User {UserId} logged in")]
partial void LogUserLogin(long userId);

// ❌ 差：字符串拼接（即使不输出也会执行拼接）
_logger.LogDebug("Finding user by id: " + userId);
_logger.LogDebug($"Finding user by id: {userId}");
```

### 日志级别
- `Critical`: 系统崩溃，需要立即处理
- `Error`: 操作失败，需要关注
- `Warning`: 警告，可能的问题
- `Information`: 重要业务事件
- `Debug`: 调试信息
- `Trace`: 详细追踪信息

## Furion 框架规范

<!-- [注释] Furion 最佳实践 -->

### 动态 API
- 使用 `IDynamicApiController` 自动生成 RESTful API
- 方法名自动映射为 HTTP 动词

```csharp
// ✅ 好：动态 API（自动生成路由）
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

    // GET /api/user/list
    public async Task<List<User>> GetListAsync()
    {
        return await _repository.GetListAsync();
    }

    // POST /api/user
    public async Task<long> AddAsync(CreateUserDto dto)
    {
        var user = dto.Adapt<User>();
        return await _repository.InsertReturnIdentityAsync(user);
    }

    // PUT /api/user
    public async Task UpdateAsync(UpdateUserDto dto)
    {
        var user = dto.Adapt<User>();
        await _repository.UpdateAsync(user);
    }

    // DELETE /api/user/{id}
    public async Task DeleteAsync(long id)
    {
        await _repository.DeleteByIdAsync(id);
    }
}
```

### 依赖注入
- Furion 自动扫描并注册服务
- 使用接口约定：`ITransient`、`IScoped`、`ISingleton`

```csharp
// ✅ 好：使用接口约定自动注册
public class UserService : IUserService, ITransient
{
    private readonly ISqlSugarRepository<User> _repository;

    public UserService(ISqlSugarRepository<User> repository)
    {
        _repository = repository;
    }
}

// ✅ 好：手动注册（需要更多控制时）
services.AddScoped<IUserService, UserService>();
```

### 统一返回与异常处理

```csharp
// ✅ 好：使用 Furion 统一返回格式
[DynamicApiController]
public class UserService : IDynamicApiController
{
    // 自动包装为 { code: 200, data: {...}, message: "success" }
    public async Task<User> GetAsync(long id)
    {
        var user = await _repository.GetByIdAsync(id);
        return user ?? throw Oops.Oh("用户不存在");
    }
}

// ✅ 好：友好异常
throw Oops.Oh(ErrorCodes.UserNotFound);
throw Oops.Bah("业务异常提示");

// ✅ 好：自定义错误码
[ErrorCodeType]
public enum ErrorCodes
{
    [ErrorCodeItemMetadata("用户不存在")]
    UserNotFound,

    [ErrorCodeItemMetadata("用户名已存在")]
    UserNameExists
}
```

### 数据验证

```csharp
// ✅ 好：使用 DataAnnotations
public class CreateUserDto
{
    [Required(ErrorMessage = "用户名不能为空")]
    [MaxLength(50, ErrorMessage = "用户名最长50个字符")]
    public string Name { get; set; }

    [Required, EmailAddress]
    public string Email { get; set; }

    [Range(1, 150, ErrorMessage = "年龄范围1-150")]
    public int Age { get; set; }
}

// ✅ 好：使用 FluentValidation
public class CreateUserDtoValidator : AbstractValidator<CreateUserDto>
{
    public CreateUserDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}
```

### 传统 Controller（需要更多控制时）

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<UserDto>> GetById(long id)
    {
        var user = await _userService.GetAsync(id);
        return user is null ? NotFound() : Ok(user);
    }
}

## SqlSugar ORM

<!-- [注释] SqlSugar 最佳实践 -->

### 基础配置

```csharp
// ✅ Program.cs 配置
builder.Services.AddSqlSugar(new ConnectionConfig
{
    ConnectionString = builder.Configuration.GetConnectionString("Default"),
    DbType = DbType.MySql,
    IsAutoCloseConnection = true,
    InitKeyType = InitKeyType.Attribute
});

// ✅ 实体定义
[SugarTable("user")]
public class User
{
    [SugarColumn(IsPrimaryKey = true, IsIdentity = true)]
    public long Id { get; set; }

    [SugarColumn(Length = 50)]
    public string Name { get; set; }

    [SugarColumn(IsNullable = true)]
    public string? Email { get; set; }

    [SugarColumn(IsIgnore = true)]  // 忽略映射
    public string FullName => $"{Name}";

    // 导航属性
    [Navigate(NavigateType.OneToMany, nameof(Order.UserId))]
    public List<Order> Orders { get; set; }
}
```

### 仓储模式

```csharp
// ✅ 使用内置仓储
public class UserService : ITransient
{
    private readonly ISqlSugarRepository<User> _repository;

    public UserService(ISqlSugarRepository<User> repository)
    {
        _repository = repository;
    }

    public async Task<User?> GetByIdAsync(long id)
    {
        return await _repository.GetByIdAsync(id);
    }

    public async Task<List<User>> GetListAsync(UserQueryDto query)
    {
        return await _repository.AsQueryable()
            .WhereIF(!string.IsNullOrEmpty(query.Name), u => u.Name.Contains(query.Name))
            .WhereIF(query.Status.HasValue, u => u.Status == query.Status)
            .OrderByDescending(u => u.CreateTime)
            .ToPageListAsync(query.PageIndex, query.PageSize);
    }
}
```

### 查询优化

```csharp
// ❌ N+1 查询问题
var users = await _db.Queryable<User>().ToListAsync();
foreach (var user in users)
{
    var orders = await _db.Queryable<Order>().Where(o => o.UserId == user.Id).ToListAsync();
}

// ✅ 使用 Includes 导航查询
var users = await _db.Queryable<User>()
    .Includes(u => u.Orders)
    .ToListAsync();

// ✅ 多级导航
var users = await _db.Queryable<User>()
    .Includes(u => u.Orders, o => o.OrderItems)
    .ToListAsync();

// ✅ 只查询需要的字段
var userDtos = await _db.Queryable<User>()
    .Select(u => new UserDto
    {
        Id = u.Id,
        Name = u.Name,
        OrderCount = SqlFunc.Subqueryable<Order>().Where(o => o.UserId == u.Id).Count()
    })
    .ToListAsync();

// ✅ 分页查询
var (list, total) = await _db.Queryable<User>()
    .Where(u => u.Status == 1)
    .OrderByDescending(u => u.CreateTime)
    .ToPageListAsync(pageIndex, pageSize);
```

### 事务处理

```csharp
// ✅ 使用 UnitOfWork
public class OrderService : ITransient
{
    private readonly ISqlSugarRepository<Order> _orderRepo;
    private readonly ISqlSugarRepository<OrderItem> _itemRepo;

    public async Task CreateOrderAsync(CreateOrderDto dto)
    {
        try
        {
            _orderRepo.Ado.BeginTran();

            var order = dto.Adapt<Order>();
            var orderId = await _orderRepo.InsertReturnIdentityAsync(order);

            var items = dto.Items.Select(i => new OrderItem
            {
                OrderId = orderId,
                ProductId = i.ProductId,
                Quantity = i.Quantity
            }).ToList();

            await _itemRepo.InsertRangeAsync(items);

            _orderRepo.Ado.CommitTran();
        }
        catch
        {
            _orderRepo.Ado.RollbackTran();
            throw;
        }
    }
}

// ✅ 使用 Furion 工作单元
[UnitOfWork]
public async Task CreateOrderAsync(CreateOrderDto dto)
{
    // 自动开启事务，方法结束自动提交，异常自动回滚
    var order = dto.Adapt<Order>();
    await _orderRepo.InsertAsync(order);
    await _itemRepo.InsertRangeAsync(dto.Items);
}
```

### 批量操作

```csharp
// ✅ 批量插入
await _db.Insertable(users).ExecuteCommandAsync();

// ✅ 批量更新
await _db.Updateable(users).ExecuteCommandAsync();

// ✅ 批量删除
await _db.Deleteable<User>().In(ids).ExecuteCommandAsync();

// ✅ 条件更新（只更新指定字段）
await _db.Updateable<User>()
    .SetColumns(u => u.Status == 0)
    .Where(u => u.ExpireTime < DateTime.Now)
    .ExecuteCommandAsync();
```

## 性能考虑

<!-- [注释] 先写正确的代码，再优化性能 -->

### 核心原则

| 原则 | 说明 |
|------|------|
| **先正确后优化** | 先确保功能正确，再考虑性能 |
| **先测量后优化** | 用 BenchmarkDotNet / dotTrace 定位瓶颈 |
| **避免过早优化** | 可读性优先，除非有明确的性能需求 |

### 避免常见陷阱

| 陷阱 | 解决方案 |
|------|---------|
| N+1 查询 | 使用 Includes 导航查询 |
| 循环中拼接字符串 | 使用 `StringBuilder` |
| 频繁分配临时对象 | 使用 `Span<T>`、`ArrayPool<T>` |
| 阻塞异步调用 | 使用 async/await |
| 未使用只读查询 | 只查询不修改时避免跟踪 |
| 加载过多数据 | 使用分页、投影 |

### 字符串处理

```csharp
// ❌ 差：循环拼接字符串
var result = "";
foreach (var s in strings)
{
    result += s;  // 每次创建新对象
}

// ✅ 好：使用 StringBuilder
var sb = new StringBuilder(estimatedSize);
foreach (var s in strings)
{
    sb.Append(s);
}
var result = sb.ToString();

// ✅ 好：使用 string.Join
var result = string.Join(",", strings);

// ✅ 好：使用字符串插值（少量拼接）
var message = $"User {name} created at {DateTime.Now}";
```

### 集合与 LINQ 优化

```csharp
// ✅ 预分配容量
var list = new List<User>(expectedSize);
var dict = new Dictionary<long, User>(expectedSize);

// ✅ 使用 HashSet 进行包含检查
var ids = userIds.ToHashSet();
var filtered = allUsers.Where(u => ids.Contains(u.Id));

// ❌ 差：多次枚举 IEnumerable
var query = GetUsers();  // IEnumerable
var count = query.Count();      // 第一次枚举
var first = query.First();      // 第二次枚举

// ✅ 好：先具体化
var users = GetUsers().ToList();
var count = users.Count;
var first = users[0];
```

### 性能分析工具

```bash
# 使用 BenchmarkDotNet
dotnet add package BenchmarkDotNet

# 运行基准测试
dotnet run -c Release

# 使用 dotnet-counters 监控
dotnet counters monitor --process-id <pid>

# 使用 dotnet-trace 采集性能数据
dotnet trace collect --process-id <pid>
```

## 规则溯源要求

当回复明确受到本规则约束时，在回复末尾声明：

```
> 📋 本回复遵循规则：`dotnet-style.md` - [具体章节]
```

---

## 参考资料

- [Microsoft C# Coding Conventions](https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)
- [Furion 官方文档](https://furion.baiqian.ltd/)
- [SqlSugar 官方文档](https://www.donet5.com/Home/Doc)
