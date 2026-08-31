import { renderFoodTab, renderFoodShoppingTab } from './food.js';
import { renderGoodsTab, renderGoodsShoppingTab } from './goods.js';

window.switchTab = function(tabName) {
    // すべてのタブコンテンツの active クラスを外す
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    
    // すべてのナビゲーションボタンの背景色をリセット
    document.querySelectorAll('.main-nav button').forEach(btn => btn.style.backgroundColor = 'transparent');

    // 該当するタブコンテンツを表示
    const targetContent = document.getElementById(`tab-${tabName}`);
    if (targetContent) {
        targetContent.classList.add('active');
    }

    // 該当するナビゲーションボタンの背景色をアクティブ色（灰色）に変更
    const targetNav = document.getElementById(`nav-${tabName}`);
    if (targetNav) {
        targetNav.style.backgroundColor = '#e5e7eb';
    }

    // 各タブに応じた描画処理を実行
    if (tabName === 'food') {
        renderFoodTab(document.getElementById('tab-food'));
    } else if (tabName === 'food-shopping') {
        renderFoodShoppingTab(document.getElementById('tab-food-shopping'));
    } else if (tabName === 'goods') {
        renderGoodsTab(document.getElementById('tab-goods'));
    } else if (tabName === 'goods-shopping') {
        renderGoodsShoppingTab(document.getElementById('tab-goods-shopping'));
    }
};

window.onload = () => {
    switchTab('food');
};
