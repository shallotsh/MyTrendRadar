/**
 * TrendRadar PWA Service Worker
 * 功能：离线缓存、资源拦截、缓存更新
 * 版本：1.0.0
 * 更新日期：2025-01-31
 */

// ==================== 配置区域（需根据实际情况修改）====================
const CACHE_VERSION = 'v1.0.0'; // 【需替换】缓存版本号，更新资源时修改此值
const CACHE_NAME = `trendradar-cache-${CACHE_VERSION}`;

// 【需替换】核心资源列表 - 这些资源会在安装时立即缓存
const CORE_ASSETS = [
    './',
    './pwa/manifest.json',
    // HTML 模板（如果页面是动态生成的，可以不包含具体 HTML 文件）
    // 外部 CDN 资源
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// 缓存策略配置
const CACHE_STRATEGIES = {
    // 静态资源：缓存优先（Core Assets）
    static: {
        pattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/,
        strategy: 'cacheFirst'
    },
    // API 请求：网络优先
    api: {
        pattern: /\/api\//,
        strategy: 'networkFirst'
    },
    // 其他请求：网络优先
    default: {
        strategy: 'networkFirst'
    }
};
// =======================================================================

/**
 * 安装事件 - 预缓存核心资源
 */
self.addEventListener('install', (event) => {
    console.log('[SW] 安装中...', CACHE_VERSION);

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] 开始预缓存核心资源');
            return cache.addAll(CORE_ASSETS.map(url => new Request(url, { cache: 'reload' })))
                .then(() => {
                    console.log('[SW] 核心资源缓存成功:', CORE_ASSETS);
                })
                .catch((error) => {
                    console.warn('[SW] 部分资源缓存失败:', error);
                    // 即使部分资源失败，也继续安装
                    return Promise.resolve();
                });
        })
    );

    // 立即激活新的 Service Worker
    self.skipWaiting();
});

/**
 * 激活事件 - 清理旧版本缓存
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] 激活中...', CACHE_VERSION);

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        // 删除旧版本缓存
                        return name.startsWith('trendradar-cache-') && name !== CACHE_NAME;
                    })
                    .map((name) => {
                        console.log('[SW] 删除旧缓存:', name);
                        return caches.delete(name);
                    })
            );
        })
    );

    // 立即控制所有客户端页面
    return self.clients.claim();
});

/**
 * 拦截网络请求 - 根据策略返回缓存或网络资源
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 跳过非 HTTP(S) 请求（如 chrome-extension:// 等）
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // 确定使用的缓存策略
    let strategy = CACHE_STRATEGIES.default.strategy;

    for (const [key, config] of Object.entries(CACHE_STRATEGIES)) {
        if (key !== 'default' && config.pattern.test(url.href)) {
            strategy = config.strategy;
            break;
        }
    }

    // 根据策略处理请求
    if (strategy === 'cacheFirst') {
        event.respondWith(cacheFirstStrategy(request));
    } else if (strategy === 'networkFirst') {
        event.respondWith(networkFirstStrategy(request));
    } else {
        event.respondWith(networkFirstStrategy(request));
    }
});

/**
 * 缓存优先策略
 * 优先从缓存获取，缓存不存在则请求网络并缓存
 */
async function cacheFirstStrategy(request) {
    const cache = await caches.open(CACHE_NAME);

    // 1. 尝试从缓存获取
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        console.log('[SW] 缓存命中:', request.url);
        return cachedResponse;
    }

    // 2. 缓存未命中，请求网络
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            // 缓存成功的响应
            cache.put(request, networkResponse.clone());
            console.log('[SW] 网络请求成功并缓存:', request.url);
        }
        return networkResponse;
    } catch (error) {
        console.warn('[SW] 网络请求失败:', request.url, error);
        // 返回一个基本的错误响应
        return new Response('网络请求失败', { status: 408, statusText: 'Request Timeout' });
    }
}

/**
 * 网络优先策略
 * 优先请求网络，网络失败则使用缓存
 */
async function networkFirstStrategy(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        // 1. 尝试网络请求
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            // 缓存成功的响应
            cache.put(request, networkResponse.clone());
            console.log('[SW] 网络请求成功:', request.url);
        }
        return networkResponse;
    } catch (error) {
        console.warn('[SW] 网络请求失败，尝试缓存:', request.url);
        // 2. 网络失败，尝试缓存
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            console.log('[SW] 使用缓存资源:', request.url);
            return cachedResponse;
        }

        // 3. 缓存也未命中，返回离线页面
        console.warn('[SW] 无缓存可用:', request.url);
        return new Response('离线状态，暂无缓存内容', { status: 503, statusText: 'Service Unavailable' });
    }
}

/**
 * 消息事件 - 处理来自页面的消息（如手动更新缓存）
 */
self.addEventListener('message', (event) => {
    const { action } = event.data || {};

    switch (action) {
        case 'SKIP_WAITING':
            // 跳过等待，立即激活新的 Service Worker
            self.skipWaiting();
            break;

        case 'CACHE_CLEAR':
            // 清除所有缓存
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((name) => caches.delete(name))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;

        default:
            console.warn('[SW] 未知消息类型:', action);
    }
});
