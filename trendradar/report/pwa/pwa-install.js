/**
 * PWA 添加到桌面引导组件
 * 功能：检测安装条件、显示引导提示、处理安装事件
 * 兼容：Android Chrome >= 80, iOS Safari >= 15
 */

(function() {
    'use strict';

    // ==================== 配置区域（需根据实际情况修改）====================
    const CONFIG = {
        // 应用名称
        appName: 'TrendRadar',

        // iOS 引导提示延迟显示时间（毫秒）
        iosPromptDelay: 3000,

        // 是否已显示过的标记（localStorage key）
        storageKey: 'pwa-install-prompt-shown',

        // 是否已安装的标记（localStorage key）
        installedKey: 'pwa-installed',

        // 提示显示后多少天不再显示
        hideDays: 7,

        // 是否在移动端才显示
        mobileOnly: true
    };
    // =======================================================================

    /**
     * 检测是否为移动设备
     */
    function isMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    /**
     * 检测是否为 iOS 设备
     */
    function isIOS() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    /**
     * 检测是否为 Android 设备
     */
    function isAndroid() {
        return /Android/i.test(navigator.userAgent);
    }

    /**
     * 检测是否在独立模式下运行（已安装）
     */
    function isStandalone() {
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true ||
            document.referrer.includes('android-app://')
        );
    }

    /**
     * 检查是否应该显示提示
     */
    function shouldShowPrompt() {
        // 如果已安装，不显示
        if (localStorage.getItem(CONFIG.installedKey)) {
            return false;
        }

        // 如果已显示过且未过期，不显示
        const lastShown = localStorage.getItem(CONFIG.storageKey);
        if (lastShown) {
            const daysSinceShown = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
            if (daysSinceShown < CONFIG.hideDays) {
                return false;
            }
        }

        // 仅移动端显示
        if (CONFIG.mobileOnly && !isMobile()) {
            return false;
        }

        return true;
    }

    /**
     * 标记提示已显示
     */
    function markPromptShown() {
        localStorage.setItem(CONFIG.storageKey, Date.now().toString());
    }

    /**
     * 标记已安装
     */
    function markInstalled() {
        localStorage.setItem(CONFIG.installedKey, 'true');
        hideInstallPrompt();
    }

    /**
     * 创建 Android 安装引导
     */
    function createAndroidPrompt() {
        const prompt = document.createElement('div');
        prompt.className = 'pwa-install-prompt android';
        prompt.innerHTML = `
            <div class="pwa-prompt-content">
                <div class="pwa-prompt-icon">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="48" height="48" rx="12" fill="url(#gradient)"/>
                        <path d="M24 16V32M24 32L18 26M24 32L30 26" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <defs>
                            <linearGradient id="gradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                                <stop stop-color="#4f46e5"/>
                                <stop offset="1" stop-color="#7c3aed"/>
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <div class="pwa-prompt-text">
                    <div class="pwa-prompt-title">安装 ${CONFIG.appName}</div>
                    <div class="pwa-prompt-desc">添加到主屏幕，获得原生应用体验</div>
                </div>
                <button class="pwa-prompt-btn-install" id="pwa-install-btn">安装</button>
                <button class="pwa-prompt-btn-close" id="pwa-close-btn" aria-label="关闭">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                </button>
            </div>
        `;

        // 绑定事件
        setTimeout(() => {
            const installBtn = prompt.querySelector('#pwa-install-btn');
            const closeBtn = prompt.querySelector('#pwa-close-btn');

            installBtn.addEventListener('click', handleAndroidInstall);
            closeBtn.addEventListener('click', hideInstallPrompt);
        }, 100);

        return prompt;
    }

    /**
     * 创建 iOS 安装引导
     */
    function createIOSPrompt() {
        const prompt = document.createElement('div');
        prompt.className = 'pwa-install-prompt ios';
        prompt.innerHTML = `
            <div class="pwa-prompt-content">
                <div class="pwa-prompt-icon">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="48" height="48" rx="12" fill="url(#gradient)"/>
                        <path d="M24 16V32M24 32L18 26M24 32L30 26" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <defs>
                            <linearGradient id="gradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                                <stop stop-color="#4f46e5"/>
                                <stop offset="1" stop-color="#7c3aed"/>
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <div class="pwa-prompt-text">
                    <div class="pwa-prompt-title">安装 ${CONFIG.appName}</div>
                    <div class="pwa-prompt-desc">
                        在 Safari 中点击
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="pwa-share-icon">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
                        </svg>
                        然后选择"添加到主屏幕"
                    </div>
                </div>
                <button class="pwa-prompt-btn-close" id="pwa-close-btn" aria-label="关闭">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                </button>
            </div>
        `;

        // 绑定事件
        setTimeout(() => {
            const closeBtn = prompt.querySelector('#pwa-close-btn');
            closeBtn.addEventListener('click', hideInstallPrompt);
        }, 100);

        return prompt;
    }

    /**
     * 显示安装引导
     */
    function showInstallPrompt() {
        if (!shouldShowPrompt()) {
            return;
        }

        const prompt = isIOS() ? createIOSPrompt() : createAndroidPrompt();
        document.body.appendChild(prompt);

        // 触发动画
        requestAnimationFrame(() => {
            prompt.classList.add('pwa-prompt-show');
        });

        markPromptShown();
    }

    /**
     * 隐藏安装引导
     */
    function hideInstallPrompt() {
        const prompt = document.querySelector('.pwa-install-prompt');
        if (prompt) {
            prompt.classList.remove('pwa-prompt-show');
            setTimeout(() => {
                prompt.remove();
            }, 300);
        }
    }

    /**
     * 处理 Android 安装
     */
    let deferredPrompt = null;

    async function handleAndroidInstall() {
        if (!deferredPrompt) {
            alert('请在浏览器菜单中选择"添加到主屏幕"或"安装应用"');
            return;
        }

        // 显示安装提示
        deferredPrompt.prompt();

        // 等待用户响应
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            markInstalled();
            console.log('[PWA] 用户接受了安装提示');
        } else {
            console.log('[PWA] 用户拒绝了安装提示');
        }

        deferredPrompt = null;
        hideInstallPrompt();
    }

    /**
     * 监听 beforeinstallprompt 事件（Android Chrome）
     */
    window.addEventListener('beforeinstallprompt', (e) => {
        // 阻止默认的安装提示
        e.preventDefault();
        deferredPrompt = e;

        console.log('[PWA] 检测到 beforeinstallprompt 事件');

        // 如果是 Android，延迟显示自定义提示
        if (isAndroid() && shouldShowPrompt()) {
            setTimeout(showInstallPrompt, CONFIG.iosPromptDelay);
        }
    });

    /**
     * 监听安装成功事件
     */
    window.addEventListener('appinstalled', () => {
        markInstalled();
        console.log('[PWA] 应用安装成功');
    });

    /**
     * 初始化 iOS 引导
     */
    function initIOSGuide() {
        if (isIOS() && !isStandalone() && shouldShowPrompt()) {
            setTimeout(showInstallPrompt, CONFIG.iosPromptDelay);
        }
    }

    /**
     * 初始化 PWA 安装引导
     */
    function init() {
        // 如果已经安装，不执行
        if (isStandalone()) {
            markInstalled();
            return;
        }

        // iOS 设备需要手动引导
        if (isIOS()) {
            initIOSGuide();
        }

        // Android 设备通过 beforeinstallprompt 事件触发
        // 但如果事件不触发（某些情况下），也需要手动引导
        if (isAndroid()) {
            // 设置超时，如果 5 秒内没有收到 beforeinstallprompt 事件，手动显示提示
            setTimeout(() => {
                if (!deferredPrompt && shouldShowPrompt()) {
                    showInstallPrompt();
                }
            }, 5000);
        }
    }

    // 注入样式
    const style = document.createElement('style');
    style.textContent = `
        /* PWA 安装引导样式 */
        .pwa-install-prompt {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            z-index: 9999;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
        }

        .pwa-install-prompt.pwa-prompt-show {
            transform: translateX(-50%) translateY(0);
        }

        .pwa-prompt-content {
            display: flex;
            align-items: center;
            gap: 12px;
            background: white;
            padding: 16px 20px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1);
            pointer-events: auto;
            max-width: 90vw;
            min-width: 300px;
        }

        .pwa-prompt-icon {
            flex-shrink: 0;
            width: 48px;
            height: 48px;
        }

        .pwa-prompt-text {
            flex: 1;
            min-width: 0;
        }

        .pwa-prompt-title {
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 2px;
        }

        .pwa-prompt-desc {
            font-size: 14px;
            color: #666;
            line-height: 1.4;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .pwa-share-icon {
            width: 20px;
            height: 20px;
            color: #4f46e5;
            flex-shrink: 0;
        }

        .pwa-prompt-btn-install {
            flex-shrink: 0;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .pwa-prompt-btn-install:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .pwa-prompt-btn-install:active {
            transform: translateY(0);
        }

        .pwa-prompt-btn-close {
            flex-shrink: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            color: #666;
            transition: background 0.2s, color 0.2s;
        }

        .pwa-prompt-btn-close:hover {
            background: #e5e5e5;
            color: #333;
        }

        /* iOS 特有样式 */
        .pwa-install-prompt.ios .pwa-prompt-content {
            border-radius: 12px;
            padding: 14px 18px;
        }

        /* Android 特有样式 */
        .pwa-install-prompt.android .pwa-prompt-btn-install {
            min-width: 70px;
        }

        /* 响应式 */
        @media (max-width: 480px) {
            .pwa-install-prompt {
                bottom: 16px;
                left: 16px;
                right: 16px;
                transform: translateY(100px);
            }

            .pwa-install-prompt.pwa-prompt-show {
                transform: translateY(0);
            }

            .pwa-prompt-content {
                min-width: 0;
                padding: 14px 16px;
            }

            .pwa-prompt-icon {
                width: 40px;
                height: 40px;
            }

            .pwa-prompt-title {
                font-size: 15px;
            }

            .pwa-prompt-desc {
                font-size: 13px;
            }
        }
    `;

    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            document.head.appendChild(style);
            init();
        });
    } else {
        document.head.appendChild(style);
        init();
    }

    // 导出方法供外部调用
    window.PWAInstall = {
        show: showInstallPrompt,
        hide: hideInstallPrompt,
        isInstalled: () => !!localStorage.getItem(CONFIG.installedKey),
        checkUpdate: () => {
            // 触发 Service Worker 更新检查
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => {
                        registration.update();
                    });
                });
            }
        }
    };
})();
