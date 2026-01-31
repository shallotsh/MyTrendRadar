# coding=utf-8
"""
PWA 模块 - 渐进式 Web 应用支持

提供 PWA 相关的 HTML、CSS、JavaScript 代码生成和注册功能
"""

import os
from pathlib import Path
from typing import Literal, Optional


class PWASupport:
    """PWA 支持类"""

    def __init__(
        self,
        app_name: str = "TrendRadar",
        theme_color: str = "#4f46e5",
        pwa_base_path: str = "./pwa",
        use_advanced_sw: bool = False
    ):
        """
        初始化 PWA 支持

        Args:
            app_name: 应用名称
            theme_color: 主题颜色
            pwa_base_path: PWA 资源的基础路径（相对于 HTML 文件）
            use_advanced_sw: 是否使用进阶版 Service Worker
        """
        self.app_name = app_name
        self.theme_color = theme_color
        self.pwa_base_path = pwa_base_path
        self.use_advanced_sw = use_advanced_sw

        # 获取当前文件所在目录
        self._module_dir = Path(__file__).parent

    def get_manifest_link(self) -> str:
        """获取 manifest.json 的 link 标签"""
        return f'<link rel="manifest" href="{self.pwa_base_path}/manifest.json">'

    def get_meta_tags(self) -> str:
        """
        获取 PWA 相关的 meta 标签（适配 iOS/Android）

        Returns:
            HTML meta 标签字符串
        """
        meta_tags = [
            # 基础 PWA 设置
            f'<meta name="theme-color" content="{self.theme_color}">',

            # iOS Safari 设置
            '<meta name="apple-mobile-web-app-capable" content="yes">',
            '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
            f'<meta name="apple-mobile-web-app-title" content="{self.app_name}">',

            # Android Chrome 设置
            '<meta name="mobile-web-app-capable" content="yes">',

            # 视口设置（确保全屏显示）
            '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">',
        ]

        return "\n    ".join(meta_tags)

    def get_sw_registration_script(self) -> str:
        """
        获取 Service Worker 注册脚本

        Returns:
            JavaScript 代码字符串
        """
        sw_file = "sw-advanced.js" if self.use_advanced_sw else "sw.js"

        return f"""
    // Service Worker 注册
    if ('serviceWorker' in navigator) {{
        window.addEventListener('load', function() {{
            navigator.serviceWorker.register('{self.pwa_base_path}/{sw_file}', {{
                scope: './'
            }}).then(function(registration) {{
                console.log('[PWA] Service Worker 注册成功:', registration.scope);

                // 检查更新
                registration.addEventListener('updatefound', function() {{
                    const newWorker = registration.installing;
                    if (newWorker) {{
                        newWorker.addEventListener('statechange', function() {{
                            if (this.state === 'installed' && navigator.serviceWorker.controller) {{
                                console.log('[PWA] 发现新版本，请刷新页面更新');
                                // 可以在这里显示更新提示
                                if (window.PWAUpdatePrompt) {{
                                    window.PWAUpdatePrompt.show();
                                }}
                            }}
                        }});
                    }}
                }});

            }}).catch(function(error) {{
                console.error('[PWA] Service Worker 注册失败:', error);
            }});
        }});

        // 监听 Service Worker 控制变化
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', function() {{
            if (!refreshing) {{
                refreshing = true;
                window.location.reload();
            }}
        }});
    }} else {{
        console.warn('[PWA] 当前浏览器不支持 Service Worker');
    }}
"""

    def get_install_prompt_script(self) -> str:
        """
        获取添加到桌面引导脚本

        Returns:
            HTML script 标签字符串
        """
        script_path = self._module_dir / "pwa-install.js"

        if not script_path.exists():
            return "<!-- PWA 安装引导脚本未找到 -->"

        try:
            with open(script_path, "r", encoding="utf-8") as f:
                script_content = f.read()
        except Exception as e:
            return "<!-- PWA 安装引导脚本加载失败: " + str(e) + " -->"

        # 使用字符串连接而不是 f-string，避免 script_content 中的 { } 被解析
        return """
    <!-- PWA 添加到桌面引导 -->
    <script>""" + script_content + """</script>
"""

    def get_update_prompt_html(self) -> str:
        """
        获取更新提示组件 HTML

        Returns:
            HTML 字符串
        """
        return """
    <!-- PWA 更新提示组件 -->
    <div id="pwa-update-prompt" class="pwa-update-prompt" style="display: none;">
        <div class="pwa-update-content">
            <div class="pwa-update-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v6m0 0l-3-3m3 3l3-3M2 12h6m0 0l-3 3m3-3l3 3M12 22v-6m0 0l3 3m-3-3l-3 3M22 12h-6m0 0l3-3m-3 3l-3 3"/>
                </svg>
            </div>
            <div class="pwa-update-text">
                <div class="pwa-update-title">发现新版本</div>
                <div class="pwa-update-desc">点击刷新以获取最新内容</div>
            </div>
            <button class="pwa-update-btn-refresh" onclick="PWAUpdate.refresh()">刷新</button>
            <button class="pwa-update-btn-close" onclick="PWAUpdate.hide()" aria-label="关闭">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
            </button>
        </div>
    </div>
    <style>
        .pwa-update-prompt {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
        }
        .pwa-update-content {
            display: flex;
            align-items: center;
            gap: 12px;
            background: white;
            padding: 12px 16px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .pwa-update-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .pwa-update-text {
            flex: 1;
        }
        .pwa-update-title {
            font-size: 14px;
            font-weight: 600;
            color: #1a1a1a;
        }
        .pwa-update-desc {
            font-size: 12px;
            color: #666;
            margin-top: 2px;
        }
        .pwa-update-btn-refresh {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
        }
        .pwa-update-btn-close {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            color: #666;
        }
        @media (max-width: 480px) {
            .pwa-update-prompt {
                top: 16px;
                left: 16px;
                right: 16px;
                transform: none;
            }
        }
    </style>
    <script>
        window.PWAUpdate = {
            show: function() {
                const prompt = document.getElementById('pwa-update-prompt');
                if (prompt) {
                    prompt.style.display = 'block';
                }
            },
            hide: function() {
                const prompt = document.getElementById('pwa-update-prompt');
                if (prompt) {
                    prompt.style.display = 'none';
                }
            },
            refresh: function() {
                window.location.reload();
            }
        };
        // 监听 Service Worker 的更新消息
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
                    window.PWAUpdate.show();
                }
            });
        }
    </script>
"""


def get_pwa_head_html(
    app_name: str = "TrendRadar",
    theme_color: str = "#4f46e5",
    pwa_base_path: str = "./pwa",
    include_install_prompt: bool = True
) -> str:
    """
    获取 PWA 头部 HTML（meta 标签、manifest 链接、Service Worker 注册）

    Args:
        app_name: 应用名称
        theme_color: 主题颜色
        pwa_base_path: PWA 资源路径
        include_install_prompt: 是否包含安装引导脚本

    Returns:
        HTML 字符串
    """
    pwa = PWASupport(app_name, theme_color, pwa_base_path)

    html_parts = [
        "    <!-- PWA Meta Tags -->",
        pwa.get_meta_tags(),
        "",
        "    <!-- PWA Manifest -->",
        pwa.get_manifest_link(),
        "",
        "    <!-- PWA Service Worker Registration -->",
        "<script>" + pwa.get_sw_registration_script() + "</script>",
    ]

    if include_install_prompt:
        html_parts.extend([
            "",
            pwa.get_install_prompt_script(),
        ])

    return "\n".join(html_parts)


def get_pwa_body_html(
    include_update_prompt: bool = False
) -> str:
    """
    获取 PWA body 部分 HTML（更新提示等组件）

    Args:
        include_update_prompt: 是否包含更新提示组件

    Returns:
        HTML 字符串
    """
    pwa = PWASupport()

    if include_update_prompt:
        return pwa.get_update_prompt_html()

    return ""


# 图标准备指南
ICON_PREPARATION_GUIDE = """
PWA 图标准备指南
================

一、图标尺寸要求
--------------
PWA 需要多种尺寸的图标，以下是必需的尺寸：

| 尺寸 | 用途 | 文件名 |
|------|------|--------|
| 72x72 | Android 低密度屏幕 | icon-72x72.png |
| 96x96 | Android 中密度屏幕 | icon-96x96.png |
| 128x128 | Android 高密度屏幕 | icon-128x128.png |
| 144x144 | Android 超高密度屏幕 | icon-144x144.png |
| 152x152 | iPad | icon-152x152.png |
| 192x192 | Android XXXHDPI | icon-192x192.png |
| 384x384 | Android 启动画面 | icon-384x384.png |
| 512x512 | Android 启动画面、Android Adaptive | icon-512x512.png |

二、图标设计规范
--------------
1. 文件格式：PNG（支持透明背景）
2. 背景处理：
   - 简单图标：建议使用圆角矩形背景
   - 复杂图标：使用遮罩安全区
3. 安全区：
   - 内容应保持在图标中心 40% 区域内
   - 避免内容被裁切
4. 视觉效果：
   - 确保在小尺寸下清晰可辨
   - 使用简洁的设计
   - 避免过多细节

三、图标生成工具
--------------
1. 在线工具：
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator
   - https://favicon.io/

2. 命令行工具：
   ```bash
   # 使用 ImageMagick 从源图标生成多尺寸图标
   convert icon-512x512.png -resize 72x72 icon-72x72.png
   convert icon-512x512.png -resize 96x96 icon-96x96.png
   convert icon-512x512.png -resize 128x128 icon-128x128.png
   convert icon-512x512.png -resize 144x144 icon-144x144.png
   convert icon-512x512.png -resize 152x152 icon-152x152.png
   convert icon-512x512.png -resize 192x192 icon-192x192.png
   convert icon-512x512.png -resize 384x384 icon-384x384.png
   ```

3. Python 工具：
   ```bash
   pip install Pillow
   ```

   ```python
   from PIL import Image

   sizes = [72, 96, 128, 144, 152, 192, 384, 512]
   source = Image.open('icon-source.png')

   for size in sizes:
       resized = source.resize((size, size), Image.LANCZOS)
       resized.save(f'icon-{size}x{size}.png')
   ```

四、图标放置位置
--------------
将生成的图标文件放置在：
```
trendradar/report/pwa/icons/
├── icon-72x72.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-192x192.png
├── icon-384x384.png
└── icon-512x512.png
```

五、manifest.json 配置
--------------------
确保 manifest.json 中的 icons 路径正确：
```json
{
  "icons": [
    {
      "src": "./pwa/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    ...
  ]
}
```
"""
