import { Storage, escapeHTML } from './storage.js';
import { renderFoodTab } from './food.js';
import { renderGoodsTab } from './goods.js';

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.main-nav button').forEach(btn => btn.style.backgroundColor = 'transparent');

    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`nav-${tabName}`).style.backgroundColor = '#e5e7eb';

    if (tabName === 'food') renderFoodTab(document.getElementById('tab-food'));
    if (tabName === 'goods') renderGoodsTab(document.getElementById('tab-goods'));
    if (tabName === 'shopping') renderShoppingTab(document.getElementById('tab-shopping'));
};

function renderShoppingTab(container) {
    const history = Storage.load('FOOD_HISTORY');
    const inventory = Storage.load('FOOD_LIST');
    const inventoryNames = inventory.map(i => i.name);
    
    const outOfStock = history.filter(name => !inventoryNames.includes(name));
    const wantToBuy = inventory.filter(i => i.needBuy).map(i => i.name);
    const shoppingItems = Array.from(new Set([...outOfStock, ...wantToBuy])).sort();

    container.innerHTML = `
        <p style="margin-bottom: 16px; font-size: 13px; color: #6b7280;">※使い切った食品、または在庫から「🛒」をつけたものが表示されます。</p>
        <div id="shopping-list-container">
            ${shoppingItems.length === 0 ? '<p style="text-align:center; padding: 20px;">買うべきものはありません</p>' : ''}
            ${shoppingItems.map(name => `
                <div class="shopping-item">
                    <div>${escapeHTML(name)}</div>
                    <button class="btn-delete-small" data-delete-name="${escapeHTML(name)}">🗑</button>
                </div>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('.btn-delete-small').forEach(btn => {
        btn.onclick = (e) => {
            const name = e.target.getAttribute('data-delete-name');
            if (confirm(`「${name}」を履歴からも完全に削除しますか？`)) {
                Storage.save('FOOD_HISTORY', Storage.load('FOOD_HISTORY').filter(n => n !== name));
                let items = Storage.load('FOOD_LIST');
                items.forEach(item => { if (item.name === name) item.needBuy = false; });
                Storage.save('FOOD_LIST', items);
                renderShoppingTab(container);
            }
        };
    });
}

// 初期化
window.onload = () => {
    switchTab('food');
};
