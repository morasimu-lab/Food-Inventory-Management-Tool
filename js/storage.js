const STORAGE_KEYS = {
    FOOD_LIST: 'app_food_list',
    FOOD_HISTORY: 'app_food_history',
    FOOD_CATEGORIES: 'app_food_categories',     // 追加
    GOODS_LIST: 'app_goods_list',
    GOODS_HISTORY: 'app_goods_history',
    GOODS_CATEGORIES: 'app_goods_categories'    // 追加
};

export const Storage = {
    load(key) {
        const storageKey = STORAGE_KEYS[key];
        const data = localStorage.getItem(storageKey);
        if (!data) {
            // カテゴリ系は空配列、リストや履歴も初期値は空配列
            return [];
        }
        
        try {
            const parsed = JSON.parse(data);

            // FOOD_LIST または GOODS_LIST の場合、既存データに category がなければ null を補完
            if (key === 'FOOD_LIST' || key === 'GOODS_LIST') {
                if (Array.isArray(parsed)) {
                    parsed.forEach(item => {
                        if (item.category === undefined) {
                            item.category = null;
                        }
                    });
                }
            }

            return parsed;
        } catch (e) {
            console.error(`Failed to parse storage for key: ${key}`, e);
            return [];
        }
    },
    save(key, data) {
        const storageKey = STORAGE_KEYS[key];
        localStorage.setItem(storageKey, JSON.stringify(data));
    }
};

export function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}