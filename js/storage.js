const STORAGE_KEYS = {
    FOOD_LIST: 'app_food_list',
    FOOD_HISTORY: 'app_food_history',
    GOODS_LIST: 'app_goods_list' // { itemName: ['商品名1', '商品名2'] } のような構造
};

export const Storage = {
    load(key) {
        const data = localStorage.getItem(STORAGE_KEYS[key]);
        return data ? JSON.parse(data) : (key === 'GOODS_LIST' ? {} : []);
    },
    save(key, data) {
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
    }
};

export function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}
