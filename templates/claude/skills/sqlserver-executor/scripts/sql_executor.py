#!/usr/bin/env python3
"""
SQL Server 执行器 - 支持除 DELETE 外的所有 SQL 操作
使用 pymssql 连接 SQL Server 数据库
支持 JSON 配置文件配置数据库连接信息
"""

import argparse
import json
import os
import re
import sys
from typing import Optional, Dict, Any

try:
    import pymssql
except ImportError:
    print("错误: 需要安装 pymssql 库")
    print("请执行: pip install pymssql")
    sys.exit(1)


# 获取脚本所在目录
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(SCRIPT_DIR)

# 默认配置文件路径（优先从技能目录读取）
DEFAULT_CONFIG_PATHS = [
    os.path.join(SKILL_DIR, "config.json"),
    os.path.expanduser("~/.sqlserver-executor.json"),
    os.path.expanduser("~/.config/sqlserver-executor/config.json"),
    "./sqlserver-config.json"
]


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    加载配置文件

    Args:
        config_path: 指定的配置文件路径，为 None 时搜索默认路径

    Returns:
        配置字典，未找到时返回空字典
    """
    if config_path:
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            print(f"警告: 指定的配置文件不存在 - {config_path}")
            return {}

    # 搜索默认路径
    for path in DEFAULT_CONFIG_PATHS:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)

    return {}


def get_connection_config(config: Dict[str, Any], profile: Optional[str] = None) -> Dict[str, Any]:
    """
    获取连接配置

    Args:
        config: 完整配置字典
        profile: 配置名称，为 None 时使用 default 或第一个配置

    Returns:
        连接配置字典
    """
    connections = config.get("connections", {})

    if not connections:
        # 兼容旧格式：直接在根级别配置
        return {
            "server": config.get("server"),
            "database": config.get("database"),
            "user": config.get("user"),
            "password": config.get("password"),
            "port": config.get("port", 1433)
        }

    if profile:
        if profile in connections:
            return connections[profile]
        else:
            print(f"警告: 配置 '{profile}' 不存在，使用默认配置")

    # 使用 default 配置或第一个配置
    default_profile = config.get("default", "default")
    if default_profile in connections:
        return connections[default_profile]

    # 返回第一个配置
    if connections:
        first_key = list(connections.keys())[0]
        return connections[first_key]

    return {}


def is_delete_statement(sql: str) -> bool:
    """检查 SQL 是否包含 DELETE 语句"""
    sql_upper = sql.upper().strip()

    # 移除单行注释
    sql_clean = re.sub(r'--.*$', '', sql_upper, flags=re.MULTILINE)
    # 移除多行注释
    sql_clean = re.sub(r'/\*.*?\*/', '', sql_clean, flags=re.DOTALL)

    # 检查是否包含 DELETE 语句
    delete_pattern = r'(^|\s|;)DELETE(\s|$)'
    return bool(re.search(delete_pattern, sql_clean))


def execute_sql(
    server: str,
    database: str,
    user: str,
    password: str,
    sql: str,
    port: int = 1433,
    output_format: str = "table"
) -> dict:
    """
    执行 SQL 语句

    Args:
        server: 服务器地址
        database: 数据库名
        user: 用户名
        password: 密码
        sql: SQL 语句
        port: 端口号，默认 1433
        output_format: 输出格式 (table/json/csv)

    Returns:
        执行结果字典
    """
    # 安全检查：禁止 DELETE 操作
    if is_delete_statement(sql):
        return {
            "success": False,
            "error": "安全限制：不允许执行 DELETE 语句",
            "rows_affected": 0,
            "data": None
        }

    try:
        conn = pymssql.connect(
            server=server,
            port=port,
            user=user,
            password=password,
            database=database,
            charset='utf8'
        )
        cursor = conn.cursor(as_dict=True)

        cursor.execute(sql)

        # 判断是否为查询语句
        sql_type = sql.strip().upper().split()[0] if sql.strip() else ""

        if sql_type == "SELECT" or cursor.description:
            # 查询语句，返回结果集
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description] if cursor.description else []

            result = {
                "success": True,
                "error": None,
                "row_count": len(rows),
                "columns": columns,
                "data": rows
            }
        else:
            # 非查询语句（INSERT/UPDATE/CREATE等）
            conn.commit()
            result = {
                "success": True,
                "error": None,
                "rows_affected": cursor.rowcount,
                "data": None
            }

        cursor.close()
        conn.close()
        return result

    except pymssql.Error as e:
        return {
            "success": False,
            "error": str(e),
            "rows_affected": 0,
            "data": None
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"未知错误: {str(e)}",
            "rows_affected": 0,
            "data": None
        }


def format_output(result: dict, output_format: str) -> str:
    """格式化输出结果"""
    if not result["success"]:
        return f"错误: {result['error']}"

    if result.get("data") is None:
        return f"执行成功，影响行数: {result.get('rows_affected', 0)}"

    data = result["data"]
    columns = result.get("columns", [])

    if not data:
        return "查询成功，无数据返回"

    if output_format == "json":
        return json.dumps(data, ensure_ascii=False, indent=2, default=str)

    elif output_format == "csv":
        lines = [",".join(columns)]
        for row in data:
            line = ",".join(str(row.get(col, "")) for col in columns)
            lines.append(line)
        return "\n".join(lines)

    else:  # table 格式
        # 计算每列最大宽度
        col_widths = {col: len(col) for col in columns}
        for row in data:
            for col in columns:
                val_len = len(str(row.get(col, "")))
                col_widths[col] = max(col_widths[col], val_len)

        # 构建表格
        header = " | ".join(col.ljust(col_widths[col]) for col in columns)
        separator = "-+-".join("-" * col_widths[col] for col in columns)

        lines = [header, separator]
        for row in data:
            line = " | ".join(str(row.get(col, "")).ljust(col_widths[col]) for col in columns)
            lines.append(line)

        lines.append(f"\n共 {len(data)} 行")
        return "\n".join(lines)


def list_profiles(config: Dict[str, Any]) -> None:
    """列出所有可用的配置"""
    connections = config.get("connections", {})
    default_profile = config.get("default", "default")

    if not connections:
        print("未找到任何数据库配置")
        return

    print("可用的数据库配置:")
    print("-" * 50)
    for name, conn in connections.items():
        default_mark = " (默认)" if name == default_profile else ""
        server = conn.get("server", "未配置")
        database = conn.get("database", "未配置")
        print(f"  {name}{default_mark}")
        print(f"    服务器: {server}")
        print(f"    数据库: {database}")
        print()


def main():
    parser = argparse.ArgumentParser(
        description="SQL Server 执行器 - 支持除 DELETE 外的所有 SQL 操作",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
配置文件示例 (~/.sqlserver-executor.json):
{
    "default": "dev",
    "connections": {
        "dev": {
            "server": "localhost",
            "database": "DevDB",
            "user": "sa",
            "password": "password",
            "port": 1433
        },
        "prod": {
            "server": "prod-server",
            "database": "ProdDB",
            "user": "app_user",
            "password": "secret",
            "port": 1433
        }
    }
}
        """
    )

    # 配置相关参数
    parser.add_argument("-c", "--config", help="配置文件路径")
    parser.add_argument("--profile", help="使用指定的配置名称")
    parser.add_argument("--list-profiles", action="store_true", help="列出所有可用配置")

    # 连接参数（可覆盖配置文件）
    parser.add_argument("-s", "--server", help="服务器地址")
    parser.add_argument("-d", "--database", help="数据库名")
    parser.add_argument("-u", "--user", help="用户名")
    parser.add_argument("-p", "--password", help="密码")
    parser.add_argument("-P", "--port", type=int, help="端口号 (默认: 1433)")

    # SQL 相关参数
    parser.add_argument("-q", "--query", help="SQL 语句")
    parser.add_argument("-f", "--file", help="SQL 文件路径")
    parser.add_argument(
        "-o", "--output",
        choices=["table", "json", "csv"],
        default="table",
        help="输出格式 (默认: table)"
    )

    args = parser.parse_args()

    # 加载配置文件
    config = load_config(args.config)

    # 列出配置
    if args.list_profiles:
        list_profiles(config)
        sys.exit(0)

    # 获取连接配置
    conn_config = get_connection_config(config, args.profile)

    # 命令行参数优先级高于配置文件
    server = args.server or conn_config.get("server")
    database = args.database or conn_config.get("database")
    user = args.user or conn_config.get("user")
    password = args.password or conn_config.get("password")
    port = args.port or conn_config.get("port", 1433)

    # 验证必要参数
    missing = []
    if not server:
        missing.append("server (-s)")
    if not database:
        missing.append("database (-d)")
    if not user:
        missing.append("user (-u)")
    if not password:
        missing.append("password (-p)")

    if missing:
        print(f"错误: 缺少必要的连接参数: {', '.join(missing)}")
        print("请通过命令行参数或配置文件提供这些参数")
        print("使用 --help 查看帮助信息")
        sys.exit(1)

    # 获取 SQL 语句
    if args.query:
        sql = args.query
    elif args.file:
        if not os.path.exists(args.file):
            print(f"错误: 文件不存在 - {args.file}")
            sys.exit(1)
        with open(args.file, 'r', encoding='utf-8') as f:
            sql = f.read()
    else:
        # 从标准输入读取
        if sys.stdin.isatty():
            print("错误: 未提供 SQL 语句")
            print("使用 -q 参数提供 SQL 语句，或使用 -f 参数指定 SQL 文件")
            sys.exit(1)
        sql = sys.stdin.read()

    if not sql.strip():
        print("错误: 未提供 SQL 语句")
        sys.exit(1)

    # 执行 SQL
    result = execute_sql(
        server=server,
        database=database,
        user=user,
        password=password,
        port=port,
        sql=sql,
        output_format=args.output
    )

    # 输出结果
    output = format_output(result, args.output)
    print(output)

    # 返回状态码
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
