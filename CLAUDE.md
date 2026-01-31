# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 提供在此代码库中工作的指导。

## 项目概述

**TrendRadar** 是一个热点新闻聚合与分析工具。它从多个中文平台抓取热门话题，提供 AI 驱动的分析，并支持多种通知渠道。

- **版本**: 5.5.0
- **语言**: Python 3.10+
- **许可证**: GPL-3.0
- **入口**: `trendradar`（命令行工具），`trendradar-mcp`（MCP 服务器）

## 架构

### 双组件架构

1. **核心 TrendRadar 应用** (`/trendradar`)
   - 主入口: `trendradar.__main__:main`
   - 从平台和 RSS 订阅源抓取热点新闻
   - 将数据存储在按日期组织的 SQLite 数据库中
   - 生成 HTML 报告
   - 通过多种渠道发送通知

2. **MCP 服务器** (`/mcp_server`)
   - 入口: `mcp_server.server:run_server`
   - 基于 FastMCP 2.0 的服务器，提供 21 个工具
   - 支持 stdio 和 HTTP 传输模式
   - 提供 AI 驱动的新闻分析和查询功能

### 核心模块

- **`/trendradar/core/`**: 配置加载、数据分析、词频统计
- **`/trendradar/ai/`**: AI 分析、翻译、客户端集成（litellm）
- **`/trendradar/crawler/`**: 从平台和 RSS 订阅源抓取数据
- **`/trendradar/storage/`**: 多后端存储（本地 SQLite + S3 兼容的远程存储）
- **`/trendradar/notification/`**: 10+ 种通知渠道（飞书、微信、Telegram、邮件等）
- **`/trendradar/report/`**: HTML 报告生成
- **`/mcp_server/tools/`**: 6 大类工具（分析、搜索、数据查询、存储同步、配置管理、系统）

### AppContext 模式

代码库使用 `AppContext` 类进行依赖注入，集中配置访问，并提供工厂方法用于创建存储管理器、通知分发器和报告生成器。

### 三种报告模式

- **`daily`**（当日汇总）: 当天所有匹配的新闻 + 新增内容
- **`current`**（当前榜单）: 当前正在热门的内容
- **`incremental`**（增量监控）: 仅新增内容，无重复

## 运行项目

```bash
# 以开发模式安装
pip install -e .

# 运行爬虫/分析器
trendradar

# 运行 MCP 服务器（stdio 模式）
trendradar-mcp

# 运行 MCP 服务器（HTTP 模式）
trendradar-mcp --transport http --host 0.0.0.0 --port 3333
```

## 配置说明

所有配置集中在 `config/config.yaml` 中：

1. **平台与 RSS**: 数据源配置
2. **报告模式**: `daily`、`current` 或 `incremental`
3. **显示控制**: 显示哪些区域及其顺序
4. **通知渠道**: 飞书、微信、Telegram、邮件等
5. **存储**: 本地 SQLite 或远程 S3 兼容存储
6. **AI 设置**: 通过 LiteLLM 配置模型（支持 100+ 提供商）
7. **推送窗口**: 基于时间的推送控制
8. **关键词**: `config/frequency_words.txt` 用于内容过滤

## 关键文件

- `pyproject.toml`: 依赖和入口点
- `config/config.yaml`: 主配置文件（版本: 1.1.0）
- `config/frequency_words.txt`: 关键词过滤分组
- `config/ai_analysis_prompt.txt`: AI 分析提示词模板
- `config/ai_translation_prompt.txt`: AI 翻译提示词模板

## 数据存储

- **SQLite**: `output/{type}/{date}.db` - 新闻和 RSS 数据的主存储
- **HTML 报告**: `output/html/{date}/{time}.html` - 带时间戳的报告
- **最新报告**: `output/html/latest/{mode}.html` - 每种模式的最新报告

## AI 集成

使用 **LiteLLM** 实现统一的 AI 提供商支持：
- 默认模型: `deepseek/deepseek-chat`
- 格式: `provider/model_name`（如 `openai/gpt-4o`、`gemini/gemini-2.5-flash`）
- 支持通过自定义 `api_base` 连接 OpenAI 兼容的 API

## MCP 工具概览

MCP 服务器提供 21 个工具，分为 6 大类：

1. **日期解析**: `resolve_date_range` - 解析自然语言日期
2. **数据查询**: `get_latest_news`、`get_news_by_date`、`get_trending_topics`
3. **RSS 查询**: `get_latest_rss`、`search_rss`、`get_rss_feeds_status`
4. **搜索**: `search_news`、`find_related_news`
5. **分析**: `analyze_topic_trend`、`analyze_sentiment`、`analyze_data_insights`、`aggregate_news`、`compare_periods`、`generate_summary_report`
6. **系统**: `get_current_config`、`get_system_status`、`check_version`、`trigger_crawl`
7. **存储同步**: `sync_from_remote`、`get_storage_status`、`list_available_dates`

## 重要说明

- **时区**: 所有时间使用 `app.timezone`（默认: Asia/Shanghai）
- **Webhook 安全**: 永远不要将 webhook 提交到 git；使用 GitHub Secrets 或环境变量
- **多账号支持**: 使用分号 `;` 分隔同一渠道的多个账号
- **代理设置**: GitHub Actions 环境通过 `advanced.crawler.use_proxy` 配置
- **调试模式**: 在 config 中设置 `advanced.debug: true` 以获取详细错误追踪
