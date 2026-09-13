// shopping.js

import { escapeHTML } from './storage.js';
import { updateAppState, renderCurrentTab } from './main.js';

export function renderShoppingTab(container, appState) {
    // 1. 食品リストの集約
    const foodHistory = appState.foodHistory || [];
    const foodList = appState.foodList || [];

    const foodMapByName = {};
    foodList.forEach(item => {
        if (!foodMapByName[item.name]) foodMapByName[item.name] = [];
        foodMapByName[item.name].push(item);
    });

    const foodInventoryNames = Object.keys(foodMapByName);
    const foodOutOfStockNames = foodHistory.filter(name => !foodInventoryNames.includes(name));

    const foodShoppingNames = Array.from(new Set([
        ...foodOutOfStockNames,
        ...foodInventoryNames.filter(name => foodMapByName[name].some(i => i.needBuy))
    ])).sort();

    // 2. 日用品リストの集約
    const goodsHistoryObj = getNormalizedGoodsHistory(appState.goodsHistory);
    const goodsHistoryNames = Object.keys(goodsHistoryObj);

    const goodsMapByName = {};
    (appState.goodsList || []).forEach(item => {
        if (!goodsMapByName[item.name]) goodsMapByName[item.name] = [];
        goodsMapByName[item.name].push(item);
    });

    const goodsInventoryNames = Object.keys(goodsMapByName);

    // 条件1: 履歴にあって在庫にない品目
    const goodsOutOfStockNames = goodsHistoryNames.filter(name => !goodsInventoryNames.includes(name));

    // 条件2: 在庫にあってカートボタン(needBuy)が押されている品目
    const goodsInStockNeedBuyNames = goodsInventoryNames.filter(name => goodsMapByName[name].some(i => i.needBuy));

    // 条件1または条件2を満たす品目を重複なく結合
    const goodsShoppingNames = Array.from(new Set([
        ...goodsOutOfStockNames,
        ...goodsInStockNeedBuyNames
    ])).sort();

    // 3. UI構築
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
                    const items = goodsMapByName[name] || [];
                    const isInInventory = items.length > 0;
                    const isNeedBuy = items.some(i => i.needBuy);

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
                                ${isNeedBuy ? `<button class="btn-cart active btn-uncheck-goods-cart" data-name="${escapeHTML(name)}" style="background:transparent; border:none; font-size:18px; cursor:pointer; color:var(--cart);" title="カートを解除">🛒</button>` : ''}
                                <button class="btn-delete-cart" style="background: transparent; border: none; color: var(--red); font-size: 18px; cursor: pointer; padding: 4px;" data-name="${escapeHTML(name)}" title="履歴から削除">🗑</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // 4. イベントリスナー（データ更新 & 再描画）
    container.querySelectorAll('.btn-uncheck-food-cart').forEach(btn => {
        btn.onclick = async (e) => {
            const name = e.currentTarget.getAttribute('data-name');
            let items = [...appState.foodList];
            let updated = false;

            items.forEach(i => {
                if (i.name === name && i.needBuy) {
                    i.needBuy = false;
                    updated = true;
                }
            });

            if (updated) {
                await updateAppState('foodList', items);
                renderCurrentTab();
            }
        };
    });

    container.querySelectorAll('.btn-delete-food-shopping').forEach(btn => {
        btn.onclick = async (e) => {
            const name = e.currentTarget.getAttribute('data-name');

            if (confirm(`「${name}」を履歴（および買い物リスト）からも完全に削除しますか？`)) {
                const newHistory = appState.foodHistory.filter(n => n !== name);
                let items = [...appState.foodList];
                items.forEach(i => { if (i.name === name) i.needBuy = false; });

                await updateAppState('foodHistory', newHistory);
                await updateAppState('foodList', items);
                renderCurrentTab();
            }
        };
    });

    container.querySelectorAll('.btn-uncheck-goods-cart').forEach(btn => {
        btn.onclick = async (e) => {
            const name = e.currentTarget.getAttribute('data-name');
            let items = [...appState.goodsList];
            let updated = false;

            items.forEach(i => {
                if (i.name === name && i.needBuy) {
                    i.needBuy = false;
                    updated = true;
                }
            });

            if (updated) {
                await updateAppState('goodsList', items);
                renderCurrentTab();
            }
        };
    });

    container.querySelectorAll('.btn-delete-cart').forEach(btn => {
        btn.onclick = async (e) => {
            const name = e.currentTarget.getAttribute('data-name');

            if (confirm(`「${name}」を履歴（および買い物リスト）から完全に削除しますか？`)) {
                let historyObj = getNormalizedGoodsHistory(appState.goodsHistory);
                delete historyObj[name];
                const newHistoryArray = Object.keys(historyObj).map(n => ({ name: n, subs: historyObj[n] }));
                
                let items = [...appState.goodsList];
                items.forEach(i => {
                    if (i.name === name) i.needBuy = false;
                });

                await updateAppState('goodsHistory', newHistoryArray);
                await updateAppState('goodsList', items);
                renderCurrentTab();
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
        } else if (item && typeof item === 'object' && item.name) {
            if (!map[item.name]) map[item.name] = [];
            if (Array.isArray(item.subs)) {
                item.subs.forEach(s => { if (!map[item.name].includes(s)) map[item.name].push(s); });
            }
        }
    });
    return map;
}
