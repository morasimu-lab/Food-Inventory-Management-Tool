// main.js

import { renderFoodTab } from './food.js';
import { renderGoodsTab } from './goods.js';
import { renderShoppingTab } from './shopping.js';
import { Storage, showLoading, hideLoading } from './storage.js';

// アプリ全体のデータステート
export const appState = {
    foodList: [],
    foodCategories: [],
    foodHistory: [],
    goodsList: [],
    goodsHistory: [],
    goodsCategories: []
};

// 保存中フラグ
let isSaving = false;

// DB/Storage から全データを非同期一括取得（ローディング画面を適用）
export async function loadAllData() {
    showLoading('データを取得中...');
    try {
        const [foodList, foodCategories, foodHistory, goodsList, goodsHistory, goodsCategories] = await Promise.all([
            Promise.resolve(Storage.load('app_food_list')),
            Promise.resolve(Storage.load('app_food_categories')),
            Promise.resolve(Storage.load('app_food_history')),
            Promise.resolve(Storage.load('app_goods_list')),
            Promise.resolve(Storage.load('app_goods_history')),
            Promise.resolve(Storage.load('app_goods_categories'))
        ]);

        appState.foodList = Array.isArray(foodList) ? foodList : [];
        appState.foodCategories = Array.isArray(foodCategories) ? foodCategories : [];
        appState.foodHistory = Array.isArray(foodHistory) ? foodHistory : [];
        appState.goodsList = Array.isArray(goodsList) ? goodsList : [];
        appState.goodsHistory = Array.isArray(goodsHistory) ? goodsHistory : [];
        appState.goodsCategories = Array.isArray(goodsCategories) ? goodsCategories : [];
    } catch (err) {
        console.error('Failed to load app data:', err);
    } finally {
        hideLoading();
    }
}

// ステートの更新と Storage への保存を行う統合関数
export async function updateAppState(key, newData) {

    // 【連打防止】すでに保存処理中の場合は二重実行を防ぐ（必要に応じて）
    if (isSaving) {
        console.warn('保存処理中のため、実行できませんでした。');
        return
    }

    isSaving = true;
    try {
        appState[key] = newData;
        const storageKeyMap = {
            foodList: 'app_food_list',
            foodCategories: 'app_food_categories',
            foodHistory: 'app_food_history',
            goodsList: 'app_goods_list',
            goodsHistory: 'app_goods_history',
            goodsCategories: 'app_goods_categories'
        };
        if (storageKeyMap[key]) {
            await Promise.resolve(Storage.save(storageKeyMap[key], newData));
        }
    }catch (error) {
        console.error('データ保存エラー:', error);
    } finally {
        isSaving = false;
    }
}

let activeTab = 'food';

window.switchTab = function(tabName) {
    activeTab = tabName || activeTab;

    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.main-nav button').forEach(btn => btn.style.backgroundColor = 'transparent');

    if (activeTab !== 'food' && window.resetFoodSubView) window.resetFoodSubView();
    if (activeTab !== 'goods' && window.resetGoodsSubView) window.resetGoodsSubView();

    const targetContent = document.getElementById(`tab-${activeTab}`);
    if (targetContent) targetContent.classList.add('active');

    const targetNav = document.getElementById(`nav-${activeTab}`);
    if (targetNav) targetNav.style.backgroundColor = '#e5e7eb';

    // メモリ上の State を元に即座に描画
    renderCurrentTab();
};

export function renderCurrentTab() {
    const container = document.getElementById(`tab-${activeTab}`);
    if (!container) return;

    if (activeTab === 'food') {
        renderFoodTab(container, appState);
    } else if (activeTab === 'goods') {
        renderGoodsTab(container, appState);
    } else if (activeTab === 'shopping') {
        renderShoppingTab(container, appState);
    }
}

window.onload = async () => {
    await loadAllData(); // 初回起動時のみローディングを出して全取得
    window.switchTab('food');
};

// --------------------------------------------------
// ページ離脱・バックグラウンド移行時の予防措置
// --------------------------------------------------

// ① 保存処理中のページ閉じ・リロードに対して警告を出す
window.addEventListener('beforeunload', (e) => {
    if (isSaving) {
        e.preventDefault();
        e.returnValue = ''; // ブラウザ標準の「変更が保存されない可能性があります」ダイアログを表示
    }
});

// ② モバイルでアプリがバックグラウンドに回った瞬間を検知
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // バックグラウンドに回った際の安全策（メモリ上の未保存データがあれば同期するなど）
        // ※ 通常 updateAppState で即時 await 保存されていればログ確認程度で十分です
        console.log('App moved to background');
    }
});
