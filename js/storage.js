const STORAGE_KEYS = {
    FOOD_LIST: 'app_food_list',
    FOOD_HISTORY: 'app_food_history',
    GOODS_LIST: 'app_goods_list',     // 登録されている日用品在庫 [{ id, name, subNames, needBuy }]
    GOODS_HISTORY: 'app_goods_history' // 日用品の品名履歴 [ 'シャンプー', ... ]
};

export const Storage = {
    load(key) {
        const data = localStorage.getItem(STORAGE_KEYS[key]);
        return data ? JSON.parse(data) : [];
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
