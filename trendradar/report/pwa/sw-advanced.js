/**
 * TrendRadar PWA Service Worker (进阶版)
 * 功能：离线缓存、资源拦截、缓存更新、更新提示
 * 版本：1.0.0
 * 更新日期：2025-01-31
 */

// ==================== 配置区域（需根据实际情况修改）====================
const CACHE_VERSION = 'v1.0.0'; // 【需替换】缓存版本号，更新资源时修改此值
const CACHE_NAME = `trendradar-cache-${CACHE_VERSION}`;
const DYNAMIC_CACHE_PREFIX = 'trendradar-dynamic-';

// 【需替换】核心资源列表 - 这些资源会在安装时立即缓存
const CORE_ASSETS = [
    './',
    './pwa/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// 动态缓存容量限制（MB）
const DYNAMIC_CACHE_SIZE_LIMIT = 50;

// 缓存策略配置
const CACHE_STRATEGIES = {
    static: {
        pattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/,
        strategy: 'cacheFirst',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30天
    },
    api: {
        pattern: /\/api\//,
        strategy: 'networkFirst',
        maxAge: 5 * 60 * 1000 // 5分钟
    },
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
                    return Promise.resolve();
                });
        })
    );

    // 不立即跳过等待，等待页面手动触发更新
    // self.skipWaiting();
});

/**
 * 激活事件 - 清理旧版本缓存，通知页面有更新可用
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] 激活中...', CACHE_VERSION);

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all([
                // 删除旧版本缓存
                Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name.startsWith('trendradar-cache-') && name !== CACHE_NAME;
                        })
                        .map((name) => {
                            console.log('[SW] 删除旧缓存:', name);
                            return caches.delete(name);
                        })
                ),
                // 清理过期的动态缓存
                cleanupDynamicCache()
            ]);
        })
    );

    // 通知所有客户端页面有更新可用
    self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
            client.postMessage({
                type: 'SW_UPDATE_AVAILABLE',
                version: CACHE_VERSION
            });
        });
    });

    return self.clients.claim();
});

/**
 * 拦截网络请求
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (!url.protocol.startsWith('http')) {
        return;
    }

    // 确定使用的缓存策略
    let strategy = CACHE_STRATEGIES.default.strategy;
    let maxAge = null;

    for (const [key, config] of Object.entries(CACHE_STRATEGIES)) {
        if (key !== 'default' && config.pattern.test(url.href)) {
            strategy = config.strategy;
            maxAge = config.maxAge || null;
            break;
        }
    }

    if (strategy === 'cacheFirst') {
        event.respondWith(cacheFirstStrategy(request, maxAge));
    } else if (strategy === 'networkFirst') {
        event.respondWith(networkFirstStrategy(request, maxAge));
    } else {
        event.respondWith(networkFirstStrategy(request, maxAge));
    }
});

/**
 * 缓存优先策略（带过期检查）
 */
async function cacheFirstStrategy(request, maxAge) {
    const cache = await caches.open(CACHE_NAME);

    // 1. 尝试从缓存获取
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        // 检查是否过期
        if (!maxAge || !isExpired(cachedResponse, maxAge)) {
            console.log('[SW] 缓存命中:', request.url);
            return cachedResponse;
        }
        // 过期则删除缓存
        cache.delete(request);
        console.log('[SW] 缓存已过期，删除:', request.url);
    }

    // 2. 缓存未命中或已过期，请求网络
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            // 添加缓存时间戳
            const responseToCache = networkResponse.clone();
            const headers = new Headers(networkResponse.headers);
            headers.append('sw-cached-at', Date.now().toString());

            const modifiedResponse = new Response(networkResponse.body, {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers: headers
            });

            cache.put(request, responseToCache);
            console.log('[SW] 网络请求成功并缓存:', request.url);
            return modifiedResponse;
        }
        return networkResponse;
    } catch (error) {
        console.warn('[SW] 网络请求失败:', request.url, error);
        return new Response('网络请求失败', { status: 408, statusText: 'Request Timeout' });
    }
}

/**
 * 网络优先策略（带动态缓存）
 */
async function networkFirstStrategy(request, maxAge) {
    const cache = await caches.open(CACHE_NAME);

    try {
        // 1. 尝试网络请求
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            // 检查缓存容量
            await checkCacheLimit();

            // 添加缓存时间戳
            const responseToCache = networkResponse.clone();
            const headers = new Headers(networkResponse.headers);
            headers.append('sw-cached-at', Date.now().toString());

            const modifiedResponse = new Response(networkResponse.body, {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers: headers
            });

            cache.put(request, responseToCache);
            console.log('[SW] 网络请求成功:', request.url);
            return modifiedResponse;
        }
        return networkResponse;
    } catch (error) {
        console.warn('[SW] 网络请求失败，尝试缓存:', request.url);
        // 2. 网络失败，尝试缓存
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            // 检查是否过期
            if (!maxAge || !isExpired(cachedResponse, maxAge)) {
                console.log('[SW] 使用缓存资源:', request.url);
                return cachedResponse;
            }
            cache.delete(request);
        }

        console.warn('[SW] 无缓存可用:', request.url);
        return new Response('离线状态，暂无缓存内容', { status: 503, statusText: 'Service Unavailable' });
    }
}

/**
 * 检查响应是否过期
 */
function isExpired(response, maxAge) {
    const cachedAt = response.headers.get('sw-cached-at');
    if (!cachedAt) return false;

    const cacheTime = parseInt(cachedAt, 10);
    const now = Date.now();
    return (now - cacheTime) > maxAge;
}

/**
 * 检查缓存容量限制
 */
async function checkCacheLimit() {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();

    let totalSize = 0;
    for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
        }
    }

    const sizeInMB = totalSize / (1024 * 1024);
    if (sizeInMB > DYNAMIC_CACHE_SIZE_LIMIT) {
        console.warn('[SW] 缓存容量超限，清理最旧资源');
        await cleanupOldestCache(cache, keys);
    }
}

/**
 * 清理最旧的缓存条目
 */
async function cleanupOldestCache(cache, keys) {
    const entries = [];

    for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
            const cachedAt = response.headers.get('sw-cached-at');
            entries.push({
                request,
                time: cachedAt ? parseInt(cachedAt, 10) : 0
            });
        }
    }

    // 按时间排序，删除最旧的 20%
    entries.sort((a, b) => a.time - b.time);
    const toDelete = entries.slice(0, Math.ceil(entries.length * 0.2));

    for (const entry of toDelete) {
        await cache.delete(entry.request);
        console.log('[SW] 清理旧缓存:', entry.request.url);
    }
}

/**
 * 清理动态缓存
 */
async function cleanupDynamicCache() {
    const cacheNames = await caches.keys();
    const dynamicCaches = cacheNames.filter(name => name.startsWith(DYNAMIC_CACHE_PREFIX));

    for (const name of dynamicCaches) {
        const cache = await caches.open(name);
        const keys = await cache.keys();

        // 删除超过 7 天未访问的缓存
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000;

        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const cachedAt = response.headers.get('sw-cached-at');
                if (cachedAt && (now - parseInt(cachedAt, 10)) > maxAge) {
                    await cache.delete(request);
                    console.log('[SW] 清理过期动态缓存:', request.url);
                }
            }
        }
    }
}

/**
 * 消息事件
 */
self.addEventListener('message', (event) => {
    const { action } = event.data || {};

    switch (action) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CACHE_CLEAR':
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((name) => caches.delete(name))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;

        case 'GET_CACHE_SIZE':
            caches.open(CACHE_NAME).then(async (cache) => {
                const keys = await cache.keys();
                let totalSize = 0;
                for (const request of keys) {
                    const response = await cache.match(request);
                    if (response) {
                        const blob = await response.blob();
                        totalSize += blob.size;
                    }
                }
                event.ports[0].postMessage({
                    size: totalSize,
                    sizeInMB: (totalSize / (1024 * 1024)).toFixed(2)
                });
            });
            break;

        default:
            console.warn('[SW] 未知消息类型:', action);
    }
});
