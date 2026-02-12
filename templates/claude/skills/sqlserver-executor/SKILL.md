---
name: sqlserver-executor
description: SQL Server 数据库执行器技能。用于连接 SQL Server 数据库并执行除 DELETE 以外的所有 SQL 操作，包括 SELECT 查询、INSERT 插入、UPDATE 更新、CREATE/ALTER 结构管理、存储过程执行等。当用户需要查询数据库、修改数据、管理表结构或执行存储过程时触发此技能。
---

# SQL Server 执行器

连接 SQL Server 数据库并执行除 DELETE 以外的所有 SQL 操作。

## 功能范围

支持的操作：
- **SELECT**: 数据查询
- **INSERT**: 数据插入
- **UPDATE**: 数据更新
- **CREATE/ALTER/DROP**: 表、索引、存储过程等结构管理
- **EXEC**: 执行存储过程
- **其他**: TRUNCATE、MERGE 等

禁止的操作：
- **DELETE**: 为安全起见，禁止执行任何 DELETE 语句

## 前置条件

确保已安装 pymssql 库：

```bash
pip install pymssql
```

## 配置文件

支持通过 JSON 配置文件管理多个数据库连接。配置文件会按以下顺序自动搜索：

1. `<技能目录>/config.json`（优先）
2. `~/.sqlserver-executor.json`
3. `~/.config/sqlserver-executor/config.json`
4. `./sqlserver-config.json`（当前目录）

### 配置文件格式

参考 `assets/config-example.json` 或直接编辑技能目录下的 `config.json`：

```json
{
    "default": "dev",
    "connections": {
        "dev": {
            "server": "localhost",
            "database": "DevDB",
            "user": "sa",
            "password": "your_password_here",
            "port": 1433
        },
        "test": {
            "server": "test-server.example.com",
            "database": "TestDB",
            "user": "test_user",
            "password": "test_password",
            "port": 1433
        },
        "prod": {
            "server": "prod-server.example.com",
            "database": "ProdDB",
            "user": "app_user",
            "password": "prod_password",
            "port": 1433
        }
    }
}
```

### 配置说明

| 字段 | 说明 |
|------|------|
| default | 默认使用的配置名称 |
| connections | 连接配置集合 |
| server | SQL Server 服务器地址 |
| database | 数据库名称 |
| user | 登录用户名 |
| password | 登录密码 |
| port | 端口号，默认 1433 |

## 使用方式

### 使用配置文件

```bash
# 使用默认配置执行 SQL
python scripts/sql_executor.py -q "SELECT * FROM Users"

# 使用指定配置
python scripts/sql_executor.py --profile prod -q "SELECT * FROM Users"

# 使用指定配置文件
python scripts/sql_executor.py -c /path/to/config.json -q "SELECT * FROM Users"

# 列出所有可用配置
python scripts/sql_executor.py --list-profiles
```

### 命令行参数（覆盖配置文件）

命令行参数优先级高于配置文件，可混合使用：

```bash
# 使用配置文件的连接信息，但覆盖数据库名
python scripts/sql_executor.py --profile dev -d OtherDB -q "SELECT * FROM Users"

# 完全使用命令行参数
python scripts/sql_executor.py -s localhost -d MyDB -u sa -p "Password123" -q "SELECT * FROM Users"
```

### 参数说明

| 参数 | 缩写 | 说明 |
|------|------|------|
| --config | -c | 指定配置文件路径 |
| --profile | | 使用指定的配置名称 |
| --list-profiles | | 列出所有可用配置 |
| --server | -s | 服务器地址（覆盖配置） |
| --database | -d | 数据库名（覆盖配置） |
| --user | -u | 用户名（覆盖配置） |
| --password | -p | 密码（覆盖配置） |
| --port | -P | 端口号（覆盖配置） |
| --query | -q | SQL 语句 |
| --file | -f | SQL 文件路径 |
| --output | -o | 输出格式：table/json/csv，默认 table |

## 工作流程示例

### 查询数据

```bash
# 使用配置文件
python scripts/sql_executor.py -q "SELECT TOP 10 * FROM Orders WHERE Status = 'Pending'"

# 使用命令行参数
python scripts/sql_executor.py \
  -s localhost -d MyDB -u sa -p "Password123" \
  -q "SELECT TOP 10 * FROM Orders WHERE Status = 'Pending'"
```

### 切换环境执行

```bash
# 在开发环境执行
python scripts/sql_executor.py --profile dev -q "SELECT COUNT(*) FROM Users"

# 在测试环境执行
python scripts/sql_executor.py --profile test -q "SELECT COUNT(*) FROM Users"

# 在生产环境执行
python scripts/sql_executor.py --profile prod -q "SELECT COUNT(*) FROM Users"
```

### 从文件执行 SQL

```bash
python scripts/sql_executor.py --profile dev -f query.sql
```

### 导出为不同格式

```bash
# 导出为 JSON
python scripts/sql_executor.py -q "SELECT * FROM Products" -o json > products.json

# 导出为 CSV
python scripts/sql_executor.py -q "SELECT * FROM Products" -o csv > products.csv
```

### 执行存储过程

```bash
python scripts/sql_executor.py --profile prod -q "EXEC sp_GetUserOrders @UserId = 1"
```

## 安全注意事项

1. **禁止 DELETE**：脚本会自动检测并拒绝执行任何 DELETE 语句
2. **配置文件权限**：确保配置文件权限为 600，仅所有者可读写
3. **避免提交配置**：将配置文件加入 .gitignore，避免密码泄露
4. **最小权限原则**：使用具有最小必要权限的数据库账户

### 保护配置文件

```bash
chmod 600 ~/.sqlserver-executor.json
```

## 错误处理

脚本会返回清晰的错误信息：

- 连接失败：检查服务器地址、端口、用户名和密码
- 配置不存在：检查配置文件路径和配置名称
- SQL 语法错误：检查 SQL 语句
- DELETE 拦截：尝试执行 DELETE 语句时会被拒绝
- 权限不足：联系数据库管理员
