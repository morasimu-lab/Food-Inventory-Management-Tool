import { renderFoodTab } from './food.js';
import { renderGoodsTab } from './goods.js';
import { renderShoppingTab } from './shopping.js'; // 追加

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.main-nav button').forEach(btn => btn.style.backgroundColor = 'transparent');

    if (tabName !== 'food' && window.resetFoodSubView) {
        window.resetFoodSubView();
    }
    if (tabName !== 'goods' && window.resetGoodsSubView) {
        window.resetGoodsSubView();
    }

    const targetContent = document.getElementById(`tab-${tabName}`);
    if (targetContent) {
        targetContent.classList.add('active');
    }

    const targetNav = document.getElementById(`nav-${tabName}`);
    if (targetNav) {
        targetNav.style.backgroundColor = '#e5e7eb';
    }

    // 描画処理の振り分け
    if (tabName === 'food') {
        renderFoodTab(document.getElementById('tab-food'));
    } else if (tabName === 'goods') {
        renderGoodsTab(document.getElementById('tab-goods'));
    } else if (tabName === 'shopping') {
        renderShoppingTab(document.getElementById('tab-shopping')); // 追加
    }
};

window.onload = () => {
    switchTab('food');
};