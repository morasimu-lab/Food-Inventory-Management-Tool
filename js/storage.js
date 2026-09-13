// storage.js

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxtveMxxQIPrYoN-h3JYYRGsfthGu94TpjOvKT1eAmENj0ZlketWeSv65P0L4SqefKj/exec';

const SHEET_MAP = {
    'app_food_list': 'foods',
    'app_food_categories': 'food_categories',
    'app_food_history': 'food_history',
    'app_goods_list': 'goods',
    'app_goods_categories': 'goods_categories',
    'app_goods_history': 'goods_history'
};

// モジュール内でのインメモリキャッシュ
const cache = {};

function cleanDateValue(val) {
    if (!val) return '';
    
    // ISO形式 (例: 2026-09-12T15:00:00.000Z) の場合はローカル時刻で年・月・日を抽出
    if (typeof val === 'string' && val.includes('T')) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}/${mm}/${dd}`;
        }
    }
    
    // YYYY-MM-DD 形式ならハイフンをスラッシュに変換
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return val.replace(/-/g, '/');
    }
    return val;
}

function normalizeItem(item) {
    if (!item || typeof item !== 'object') return item;
    const newItem = { ...item };
    if (newItem.expDate) newItem.expDate = cleanDateValue(newItem.expDate);
    if (newItem.regDate) newItem.regDate = cleanDateValue(newItem.regDate);
    return newItem;
}

export const Storage = {
    /**
     * 初回用：1回の通信で全データを一括取得してキャッシュに展開
     */
    async loadAll() {
        try {
            const res = await fetch(`${GAS_URL}?action=all`);
            const text = await res.text();

            if (!res.ok || text.trim().startsWith('<')) {
                throw new Error(`GAS Invalid Response: ${text.substring(0, 100)}`);
            }

            const json = JSON.parse(text);
            if (json.status === 'success' && json.data) {
                const data = json.data;
                cache['app_food_list'] = (data.app_food_list || []).map(normalizeItem);
                cache['app_food_categories'] = data.app_food_categories || [];
                cache['app_food_history'] = data.app_food_history || [];
                cache['app_goods_list'] = (data.app_goods_list || []).map(normalizeItem);
                cache['app_goods_history'] = (data.app_goods_history || []).map(normalizeItem);
                cache['app_goods_categories'] = data.app_goods_categories || [];
            }
        } catch (e) {
            console.error('Error loadAll:', e);
        }
        return cache;
    },

    /**
     * 個別取得用 (キャッシュがあれば即返し、無ければ個別取得)
     */
    async load(key, force = false) {
        if (!force && cache[key] !== undefined) {
            return cache[key];
        }

        const sheetName = SHEET_MAP[key];
        if (!sheetName) return [];

        try {
            const res = await fetch(`${GAS_URL}?sheet=${sheetName}`);
            const text = await res.text();

            if (!res.ok || text.trim().startsWith('<')) {
                throw new Error(`GAS Invalid Response for ${sheetName}`);
            }

            const json = JSON.parse(text);
            if (json.status === 'success' && Array.isArray(json.data)) {
                cache[key] = (key.includes('list') || key.includes('goods_history'))
                    ? json.data.map(item => normalizeItem(item))
                    : json.data;
            } else {
                cache[key] = cache[key] || [];
            }
        } catch (e) {
            console.error(`Error loading ${sheetName}:`, e);
            cache[key] = cache[key] || [];
        }
        return cache[key];
    },

    /**
     * メモリキャッシュを即時更新し、GAS保存は非同期で裏で実行
     */
    async save(key, data) {
        cache[key] = data; // メモリを即時更新

        const sheetName = SHEET_MAP[key];
        if (!sheetName) return false;

        try {
            // ★ await を追加して通信完了まで待機させる
            const res = await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify({ sheet: sheetName, items: data })
            });
            return res.ok;
        } catch (e) {
            console.error(`Error saving ${sheetName}:`, e);
            return false;
        }
    },

    /**
     * 同期的に現在のキャッシュを取得
     */
    get(key) {
        return cache[key] || [];
    }
};

// --- ローディング表示のユーティリティ ---
let loadingEl = null;

export function showLoading(message = 'オンラインDB読み込み中...') {
    if (!loadingEl) {
        loadingEl = document.createElement('div');
        loadingEl.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.8); display: flex; flex-direction: column;
            align-items: center; justify-content: center; z-index: 9999;
            font-family: sans-serif; font-size: 14px; color: #374151;
        `;
        loadingEl.innerHTML = `
            <div style="width: 36px; height: 36px; border: 4px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 12px;"></div>
            <div id="loading-msg">${message}</div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;
        document.body.appendChild(loadingEl);
    } else {
        const msgEl = loadingEl.querySelector('#loading-msg');
        if (msgEl) msgEl.textContent = message;
        loadingEl.style.display = 'flex';
    }
}

export function hideLoading() {
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

export function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
