import { Storage, escapeHTML } from './storage.js';

export function renderShoppingTab(container) {
    // --- 1. 食品の買物リスト用データの取得と集約 ---
    const foodHistory = Storage.load('FOOD_HISTORY') || [];
    const foodInventory = Storage.load('FOOD_LIST') || [];
    
    // 食品の在庫マップ（品名ごとの配列としてまとめる）
    const foodMapByName = {};
    foodInventory.forEach(item => {
        if (!foodMapByName[item.name]) foodMapByName[item.name] = [];
        foodMapByName[item.name].push(item);
    });

    const foodInventoryNames = Object.keys(foodMapByName);
    // 在庫切れの品名（履歴にあって、在庫に1つもないもの）
    const foodOutOfStockNames = foodHistory.filter(name => !foodInventoryNames.includes(name));

    // 食品の買い物リストに表示する品名（在庫内のどれかが needBuy === true、または在庫切れ）
    const foodShoppingNames = Array.from(new Set([
        ...foodOutOfStockNames,
        ...foodInventoryNames.filter(name => foodMapByName[name].some(i => i.needBuy))
    ])).sort();


    // --- 2. 日用品の買物リスト用データの取得と集約 ---
    const rawGoodsHistory = Storage.load('GOODS_HISTORY') || [];
    const goodsHistoryObj = getNormalizedGoodsHistory(rawGoodsHistory);

    const rawGoodsInventory = Storage.load('GOODS_LIST') || [];
    const goodsInventoryMap = {};
    if (Array.isArray(rawGoodsInventory)) {
        rawGoodsInventory.forEach(i => { goodsInventoryMap[i.name] = i; });
    }

    const goodsAllNames = Object.keys(goodsHistoryObj);
    const goodsShoppingNames = goodsAllNames.filter(name => {
        const item = goodsInventoryMap[name];
        return !item || item.needBuy;
    });


    // --- 3. 画面の構築 ---
    container.innerHTML = `
        <p style="margin-bottom: 16px; font-size: 13px; color: #6b7280;">※在庫切れや「🛒」がONの品目がここに一覧表示されます。</p>
        
        <!-- 食品セクション -->
        <div style="margin-bottom: 24px;">
            <h3 style="font-size: 15px; font-weight: bold; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid var(--blue); color: var(--blue);">■ 食品</h3>
            <div class="list-header" style="margin-top:0;">
                <div class="col-name">品名</div>
                <div class="col-check" style="flex:0.5;">操作</div>
            </div>
            <div>
                ${foodShoppingNames.length === 0 ? '<div class="empty-message" style="padding:16px;">買うべき食品はありません</div>' : ''}
                
                ${foodShoppingNames.map(name => {
                    const items = foodMapByName[name] || [];
                    const isInInventory = items.length > 0;
                    // 同名アイテムのいずれかが needBuy ならカートON
                    const isNeedBuy = items.some(i => i.needBuy);

                    return `
                        <div class="shopping-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid #e5e7eb;">
                            <div>
                                <span style="font-weight:bold;">${escapeHTML(name)}</span>
                                ${!isInInventory ? '<span style="font-size:11px; color:#6b7280; margin-left:6px;">(在庫なし)</span>' : ''}
                            </div>
                            <div style="display:flex; gap:8px; align-items:center;">
                                ${isNeedBuy ? `<button class="btn-cart active btn-uncheck-food-cart" data-name="${escapeHTML(name)}" style="background:transparent; border:none; font-size:18px; cursor:pointer; color:var(--cart);" title="カートを解除">🛒</button>` : ''}
                                <button class="btn-delete-small btn-delete-food-shopping" data-name="${escapeHTML(name)}" style="background:transparent; border:none; color:var(--red); font-size:16px; cursor:pointer;" title="履歴から削除">🗑</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- 日用品セクション -->
        <div>
            <h3 style="font-size: 15px; font-weight: bold; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid var(--blue); color: var(--blue);">■ 日用品</h3>
            <div class="list-header" style="margin-top:0;">
                <div class="col-name">品名</div>
                <div class="col-sub">商品名（銘柄等）</div>
                <div class="col-check" style="flex:0.5;">操作</div>
            </div>
            <div>
                ${goodsShoppingNames.length === 0 ? '<div class="empty-message" style="padding:16px;">買うべき日用品はありません</div>' : ''}
                
                ${goodsShoppingNames.map(name => {
                    const subNames = goodsHistoryObj[name] || [];
                    const invItem = goodsInventoryMap[name];
                    const isInInventory = !!invItem;
                    const isNeedBuy = invItem && invItem.needBuy;

                    return `
                        <div class="list-item">
                            <div class="col-name" style="font-weight:bold;">
                                ${escapeHTML(name)}
                                ${!isInInventory ? '<span style="font-size:11px; color:#6b7280; margin-left:6px;">(在庫なし)</span>' : ''}
                            </div>
                            <div class="col-sub">
                                ${subNames.length > 0 
                                    ? subNames.map(sub => `<span style="color:#6b7280; margin-right:8px; display:inline-block;">${escapeHTML(sub)}</span>`).join('') 
                                    : '<span style="color:var(--text-light);">なし</span>'}
                            </div>
                            <div class="col-check" style="flex:0.5; display:flex; justify-content:center; gap:8px;">
                                ${isNeedBuy ? `<button class="btn-cart active btn-uncheck-goods-cart" data-name="${escapeHTML(name)}" style="background:transparent; border:none; font-size:18px; cursor:pointer; color:var(--cart);">🛒</button>` : ''}
                                <button class="btn-delete-cart" style="background: transparent; border: none; color: var(--red); font-size: 18px; cursor: pointer; padding: 4px;" data-name="${escapeHTML(name)}">🗑</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // --- 4. イベントリスナーの設定 ---
    
    // 食品側のカート解除（同名アイテムの needBuy をすべて false に同期）
    container.querySelectorAll('.btn-uncheck-food-cart').forEach(btn => {
        btn.onclick = (e) => {
            const buttonEl = e.target.closest('button');
            if (!buttonEl) return;
            const name = buttonEl.getAttribute('data-name');

            let items = Storage.load('FOOD_LIST') || [];
            let updated = false;
            items.forEach(i => {
                if (i.name === name && i.needBuy) {
                    i.needBuy = false;
                    updated = true;
                }
            });
            if (updated) {
                Storage.save('FOOD_LIST', items);
                renderShoppingTab(container);
            }
        };
    });

    // 食品側の履歴・買物リスト削除
    container.querySelectorAll('.btn-delete-food-shopping').forEach(btn => {
        btn.onclick = (e) => {
            const buttonEl = e.target.closest('button');
            if (!buttonEl) return;
            const name = buttonEl.getAttribute('data-name');

            if (confirm(`「${name}」を履歴（および買い物リスト）からも完全に削除しますか？`)) {
                Storage.save('FOOD_HISTORY', (Storage.load('FOOD_HISTORY') || []).filter(n => n !== name));
                let items = Storage.load('FOOD_LIST') || [];
                items.forEach(item => { if (item.name === name) item.needBuy = false; });
                Storage.save('FOOD_LIST', items);
                renderShoppingTab(container);
            }
        };
    });

    // 日用品側のカート解除
    container.querySelectorAll('.btn-uncheck-goods-cart').forEach(btn => {
        btn.onclick = (e) => {
            const buttonEl = e.target.closest('button');
            if (!buttonEl) return;
            const name = buttonEl.getAttribute('data-name');

            let rawItems = Storage.load('GOODS_LIST') || [];
            let item = rawItems.find(i => i.name === name);
            if (item) {
                item.needBuy = false;
                Storage.save('GOODS_LIST', rawItems);
                renderShoppingTab(container);
            }
        };
    });

    // 日用品側の履歴削除
    container.querySelectorAll('.btn-delete-cart').forEach(btn => {
        btn.onclick = (e) => {
            const buttonEl = e.target.closest('button');
            if (!buttonEl) return;
            const name = buttonEl.getAttribute('data-name');

            if (confirm(`「${name}」を履歴（および買い物リスト）から完全に削除しますか？`)) {
                let rawHistory = Storage.load('GOODS_HISTORY') || [];
                let historyObj = getNormalizedGoodsHistory(rawHistory);
                delete historyObj[name];
                const newHistoryArray = Object.keys(historyObj).map(n => ({ name: n, subs: historyObj[n] }));
                Storage.save('GOODS_HISTORY', newHistoryArray);

                let rawItems = Storage.load('GOODS_LIST') || [];
                let item = rawItems.find(i => i.name === name);
                if (item) {
                    item.needBuy = false;
                    Storage.save('GOODS_LIST', rawItems);
                }
                renderShoppingTab(container);
            }
        };
    });
}

function getNormalizedGoodsHistory(rawHistory) {
    const map = {};
    if (!Array.isArray(rawHistory)) return map;

    rawHistory.forEach(item => {
        if (typeof item === 'string') {
            if (!map[item]) map[item] = [];
        } else if (item && typeof item === 'object') {
            const name = item.name;
            if (name) {
                if (!map[name]) map[name] = [];
                if (Array.isArray(item.subs)) {
                    item.subs.forEach(s => {
                        if (!map[name].includes(s)) map[name].push(s);
                    });
                }
            }
        }
    });
    return map;
}