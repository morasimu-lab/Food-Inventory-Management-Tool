import { renderFoodTab, renderFoodShoppingTab } from './food.js';
import { renderGoodsTab, renderGoodsShoppingTab } from './goods.js';

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.main-nav button').forEach(btn => btn.style.backgroundColor = 'transparent');

    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`nav-${tabName}`).style.backgroundColor = '#e5e7eb';

    if (tabName === 'food') renderFoodTab(document.getElementById('tab-food'));
    if (tabName === 'food-shopping') renderFoodShoppingTab(document.getElementById('tab-food-shopping'));
    if (tabName === 'goods') renderGoodsTab(document.getElementById('tab-goods'));
    if (tabName === 'goods-shopping') renderGoodsShoppingTab(document.getElementById('tab-goods-shopping'));
};

window.onload = () => {
    switchTab('food');
};
