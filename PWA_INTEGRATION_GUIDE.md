# TrendRadar PWA 集成指南

本文档介绍如何将 TrendRadar 改造为 PWA（渐进式 Web 应用），实现"添加到桌面"和离线访问功能。

---

## 一、文件结构

创建后的 PWA 文件结构如下：

```
trendradar/report/pwa/
├── __init__.py              # PWA Python 模块（辅助函数）
├── manifest.json            # Web App Manifest 配置
├── sw.js                    # Service Worker（最小化版本）
├── sw-advanced.js           # Service Worker（进阶版本）
├── pwa-install.js           # 添加到桌面引导脚本
├── generate_icons.py        # 图标生成工具
└── icons/                   # 图标目录
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

---

## 二、快速开始

### 1. 准备图标

运行图标生成工具：

```bash
# 使用默认图标（TrendRadar Logo）
cd trendradar/report/pwa
python generate_icons.py --default

# 或使用自定义图标
python generate_icons.py /path/to/your-icon.png
```

### 2. 部署 PWA 文件

确保 `pwa/` 目录与生成的 HTML 文件在同一目录下：

```
output/
├── html/
│   └── 2025-01-31/
│       ├── 08-30.html
│       └── ...
└── pwa/                     # PWA 资源（复制到 output 目录）
    ├── manifest.json
    ├── sw.js
    ├── pwa-install.js
    └── icons/
        └── ...
```

### 3. 生成带 PWA 的 HTML 报告

```python
from trendradar.report.html import render_html_content

# 启用 PWA（默认）
html = render_html_content(
    report_data=data,
    total_titles=100,
    mode="current",
    enable_pwa=True  # 启用 PWA
)

# 禁用 PWA
html = render_html_content(
    report_data=data,
    total_titles=100,
    mode="current",
    enable_pwa=False  # 禁用 PWA
)
```

---

## 三、配置说明

### manifest.json 配置

**需替换的配置项：**

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| `name` | 完整应用名称 | "TrendRadar 热点新闻分析" |
| `short_name` | 短名称（桌面图标下） | "TrendRadar" |
| `description` | 应用描述 | "聚合分析全网热点新闻" |
| `theme_color` | 主题颜色 | "#4f46e5" |
| `background_color` | 启动画面背景 | "#ffffff" |
| `start_url` | 启动 URL | "./" |
| `icons` | 图标路径数组 | 见下方 |

**图标路径配置：**

```json
"icons": [
    {
        "src": "./pwa/icons/icon-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any maskable"
    }
]
```

> 注意：`src` 路径是相对于 HTML 文件的路径

### Service Worker 配置

**sw.js 最小化版本：**

```javascript
// 【需替换】缓存版本号 - 更新资源时修改此值
const CACHE_VERSION = 'v1.0.0';

// 【需替换】核心资源列表
const CORE_ASSETS = [
    './',
    './pwa/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];
```

**更新缓存策略：**

1. 修改 `CACHE_VERSION` 为新版本号（如 `v1.1.0`）
2. 修改 `CORE_ASSETS` 列表（如果资源有变化）
3. 重新部署

---

## 四、部署注意事项

### 1. HTTPS 要求

**PWA 必须通过 HTTPS 访问**（localhost 除外）

部署时确保：
- 使用 HTTPS 证书（Let's Encrypt 免费证书）
- 配置正确的 SSL/TLS 设置

**本地开发例外：**
- `http://localhost` - 支持
- `http://127.0.0.1` - 支持
- 其他 HTTP 地址 - 不支持

### 2. Service Worker 作用域

Service Worker 的作用域由其文件路径决定：

| SW 路径 | 作用域 | 控制范围 |
|---------|--------|----------|
| `/sw.js` | `/` | 整个网站 |
| `/pwa/sw.js` | `/pwa/` | 仅 pwa 目录 |

**建议：** 将 `sw.js` 放在网站根目录，或通过绝对路径注册

### 3. MIME 类型配置

确保服务器返回正确的 MIME 类型：

```nginx
# Nginx 配置
types {
    application/manifest+json  webmanifest;
    application/javascript      js;
    image/png                   png;
}
```

```apache
# Apache 配置（.htaccess）
AddType application/manifest+json .webmanifest
AddType application/javascript .js
```

### 4. 缓存清理

更新 PWA 后，用户需要：
1. 清除浏览器缓存
2. 或等待 Service Worker 自动更新（最多 24 小时）
3. 或强制刷新（Ctrl+Shift+R / Cmd+Shift+R）

---

## 五、调试与验证

### Chrome DevTools 调试

1. **打开 DevTools**：F12 或右键 > 检查

2. **Application 面板**：
   - **Manifest**：检查 manifest.json 是否正确加载
   - **Service Workers**：查看 SW 状态、缓存内容
   - **Cache Storage**：查看已缓存的资源

3. **验证 PWA 安装条件**：
   ```
   DevTools > Application > Manifest
   - "Installable" 应显示为 "Yes"
   - "Errors" 应为空
   ```

### Android 验证步骤

1. **打开 Chrome（≥80）**：访问你的网站

2. **触发安装提示**：
   - 浏览器应自动显示"安装应用"或"添加到主屏幕"提示
   - 或等待 5 秒后显示自定义引导

3. **安装测试**：
   - 点击"安装"按钮
   - 确认安装成功
   - 从桌面启动应用

4. **验证全屏模式**：
   - 从桌面图标启动
   - 应显示全屏，无地址栏/工具栏
   - 检查状态栏颜色是否与 theme_color 匹配

### iOS Safari 验证步骤

1. **打开 Safari（≥15）**：访问你的网站

2. **手动添加到主屏幕**：
   - 点击分享按钮
   - 滚动找到"添加到主屏幕"
   - 点击"添加"

3. **从桌面启动**：
   - 点击桌面图标
   - 验证全屏显示
   - 检查应用名称和图标

4. **引导提示**：
   - 首次访问应显示自定义引导
   - 3 秒后自动弹出

### 离线测试

1. **打开 DevTools > Network**
2. **勾选 "Offline" 模拟离线**
3. **刷新页面**
4. **验证**：
   - 核心页面应正常显示
   - 已缓存的资源应正常加载
   - 未缓存的资源显示占位内容

---

## 六、常见问题解决方案

### 1. 桌面图标显示异常

**问题**：安装后图标模糊或显示默认图标

**解决方案**：
- 检查图标路径是否正确
- 确保图标尺寸符合要求（至少 192x192）
- 检查 manifest.json 中的 icons 配置
- 清除应用数据后重新安装

### 2. 全屏模式失效

**问题**：从桌面启动仍有地址栏

**解决方案**：
- 检查 `display: standalone` 配置
- 确认 meta 标签正确：
  ```html
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  ```
- iOS：检查 `apple-mobile-web-app-status-bar-style`

### 3. 离线缓存不生效

**问题**：断网后页面无法访问

**解决方案**：
- 检查 Service Worker 是否成功注册（DevTools > Console）
- 检查缓存内容（DevTools > Application > Cache Storage）
- 确认 HTTPS 已正确配置
- 检查 CORE_ASSETS 列表是否包含所有必要资源

### 4. 安装提示不显示

**问题**：访问网站后没有安装提示

**解决方案**：
- **Android**：检查是否满足 PWA 安装条件
  - 有 manifest.json
  - 有 Service Worker
  - 支持 HTTPS
  - 至少访问 2 次
  - 间隔至少 5 分钟

- **iOS**：Safari 不会自动提示，需手动添加
  - 确认引导提示是否正确显示
  - 检查 pwa-install.js 是否正确加载

### 5. 更新不生效

**问题**：更新代码后用户看不到新版本

**解决方案**：
- 修改 `CACHE_VERSION` 版本号
- Service Worker 激活时会自动清理旧缓存
- 用户需刷新页面或等待自动更新

**手动更新**：
```javascript
// 在浏览器控制台执行
navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.update());
});
```

### 6. iOS 显示"无法添加到主屏幕"

**问题**：Safari 提示无法添加

**解决方案**：
- 检查是否在私密模式（Safari 私密模式不支持）
- 确认网站使用 HTTPS
- 检查设备存储空间
- 重启 Safari 浏览器

---

## 七、高级配置

### 使用进阶版 Service Worker

修改 `trendradar/report/pwa/__init__.py`：

```python
pwa = PWASupport(
    app_name="TrendRadar",
    theme_color="#4f46e5",
    pwa_base_path="./pwa",
    use_advanced_sw=True  # 使用进阶版 Service Worker
)
```

**进阶版特性**：
- 动态缓存管理（自动清理过期缓存）
- 缓存容量限制（默认 50MB）
- 缓存更新通知
- 更精细的缓存策略

### 自定义缓存策略

修改 `sw.js` 或 `sw-advanced.js`：

```javascript
const CACHE_STRATEGIES = {
    // 静态资源：缓存优先（30 天）
    static: {
        pattern: /^https:\/\/cdn\.example\.com\/.*/,
        strategy: 'cacheFirst',
        maxAge: 30 * 24 * 60 * 60 * 1000
    },
    // API 请求：网络优先（5 分钟）
    api: {
        pattern: /\/api\//,
        strategy: 'networkFirst',
        maxAge: 5 * 60 * 1000
    }
};
```

### 自定义安装引导

修改 `pwa-install.js` 中的配置：

```javascript
const CONFIG = {
    appName: 'TrendRadar',
    iosPromptDelay: 3000,    // iOS 提示延迟（毫秒）
    hideDays: 7,             // 提示显示后多少天不再显示
    mobileOnly: true         // 仅在移动端显示
};
```

---

## 八、性能优化建议

### 1. 图标优化

- 使用 PNG 格式，适当压缩
- 提供最少尺寸的图标（必需：192x192, 512x512）
- 使用渐进式 PNG 加载

### 2. 缓存策略

- 静态资源使用 `cacheFirst`
- API 请求使用 `networkFirst`
- 设置合理的缓存过期时间

### 3. Service Worker 更新

- 版本号使用语义化版本（如 v1.0.0, v1.1.0）
- 更新时修改 CACHE_VERSION
- 避免频繁更新导致用户体验问题

---

## 九、浏览器兼容性

| 功能 | Chrome | Edge | Firefox | Safari (iOS) | Safari (macOS) |
|------|--------|------|---------|--------------|----------------|
| Manifest | ✅ 80+ | ✅ 80+ | ✅ | ✅ 15+ | ✅ |
| Service Worker | ✅ 40+ | ✅ 40+ | ✅ | ✅ 15+ | ✅ 11.1+ |
| 添加到桌面 | ✅ 自动 | ✅ 自动 | ❌ | ⚠️ 手动 | ❌ |
| 全屏模式 | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 十、相关资源

### 在线工具

- **PWA Builder**：https://www.pwabuilder.com/
- **Manifest 生成器**：https://tomitm.github.io/appmanifest/
- **图标生成器**：https://realfavicongenerator.net/

### 文档

- **MDN PWA 文档**：https://developer.mozilla.org/zh-CN/docs/Web/Progressive_web_apps
- **Web.dev PWA**：https://web.dev/progressive-web-apps/
- **PWA 规范**：https://www.w3.org/TR/appmanifest/

---

## 十一、故障排查清单

部署 PWA 后，按以下清单检查：

- [ ] HTTPS 已正确配置
- [ ] manifest.json 可访问（MIME 类型正确）
- [ ] 图标文件存在且路径正确
- [ ] Service Worker 成功注册
- [ ] 核心资源已缓存
- [ ] 离线状态下页面可访问
- [ ] Android Chrome 显示安装提示
- [ ] iOS Safari 显示引导提示
- [ ] 从桌面启动显示全屏
- [ ] 更新后缓存正确刷新

---

## 更新日志

### v1.0.0 (2025-01-31)
- 初始版本
- 支持基础 PWA 功能
- Android 自动安装提示
- iOS 手动安装引导
- 离线缓存支持
- 最小化和进阶版 Service Worker
