import { Storage, escapeHTML } from './storage.js';

let currentSubView = 'list';
window.resetGoodsSubView = () => { currentSubView = 'list'; };

export function renderGoodsTab(container) {
    if (currentSubView === 'list') {
        renderGoodsList(container);
    } else {
        renderGoodsRegister(container);
    }
}

function renderGoodsList(container) {
    const rawHistory = Storage.load('GOODS_HISTORY');
    const historyMap = getNormalizedHistory(rawHistory);
    
    const rawItems = Storage.load('GOODS_LIST');
    const itemsMap = {};
    if (Array.isArray(rawItems)) {
        rawItems.forEach(i => { itemsMap[i.name] = i; });
    }

    // 在庫リストに登録されている品目（itemsMapのキー）の一覧
    const stockNames = Object.keys(itemsMap).sort((a, b) => a.localeCompare(b));

    container.innerHTML = `
        <div class="action-buttons">
            <button class="btn-blue" id="btn-goto-goods-reg">＋ 登録</button>
            <button class="btn-red" id="btn-delete-goods">🗑 選択削除</button>
        </div>
        <div class="list-header">
            <div class="col-name">品名</div>
            <div class="col-sub">商品名（銘柄等）</div>
            <div class="col-cart">買</div>
            <div class="col-check">消</div>
        </div>
        <div>
            ${stockNames.length === 0 ? '<div class="empty-message">在庫に登録されている日用品はありません</div>' : ''}
            ${stockNames.map(name => {
                const item = itemsMap[name];
                const subNames = historyMap[name] || [];
                const isNeedBuy = item ? item.needBuy : false;

                return `
                    <div class="list-item">
                        <div class="col-name" style="font-weight:bold;">${escapeHTML(name)}</div>
                        <div class="col-sub">
                            ${subNames.length > 0 
                                ? subNames.map(sub => `<span style="margin-right:8px; display:inline-block;">${escapeHTML(sub)}</span>`).join('') 
                                : '<span style="color:var(--text-light);">なし</span>'}
                        </div>
                        <div class="col-cart">
                            <button class="btn-cart ${isNeedBuy ? 'active' : ''}" data-name="${escapeHTML(name)}">🛒</button>
                        </div>
                        <div class="col-check"><input type="checkbox" class="goods-checkbox" value="${escapeHTML(name)}"></div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.querySelector('#btn-goto-goods-reg').onclick = () => { currentSubView = 'register'; renderGoodsTab(container); };
    container.querySelector('#btn-delete-goods').onclick = deleteSelectedGoods;

    // カート（🛒）ボタンの切り替え
    container.querySelectorAll('.btn-cart').forEach(btn => {
        btn.onclick = (e) => toggleGoodsCart(e.target.getAttribute('data-name'), container);
    });
}

function renderGoodsRegister(container) {
    const rawHistory = Storage.load('GOODS_HISTORY');
    const historyMap = getNormalizedHistory(rawHistory);
    const historyNames = Object.keys(historyMap);
    
    container.innerHTML = `
        <button class="btn-outline" style="margin-bottom: 24px; width: auto; padding: 8px 16px;" id="btn-back-goods">＜ 戻る</button>
        <div class="form-group">
            <label>品名</label>
            <input type="text" id="input-goods-name" placeholder="例: シャンプー" list="goods-history" autocomplete="off">
            <datalist id="goods-history">${historyNames.map(n => `<option value="${escapeHTML(n)}">`).join('')}</datalist>
        </div>
        <div class="form-group">
            <label>商品名（銘柄など / 複数の場合はカンマ区切り）</label>
            <input type="text" id="input-goods-sub" placeholder="例: メリット, h&s">
        </div>
        <button class="btn-blue" style="width: 100%; padding: 16px;" id="btn-submit-goods">登録する</button>
    `;

    container.querySelector('#btn-back-goods').onclick = () => { currentSubView = 'list'; renderGoodsTab(container); };
    container.querySelector('#btn-submit-goods').onclick = () => {
        const name = document.getElementById('input-goods-name').value.trim();
        const subRaw = document.getElementById('input-goods-sub').value.trim();
        if (!name) return alert('品名を入力してください。');

        const newSubs = subRaw ? subRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        // 1. 履歴に品目と商品名/銘柄を追加
        let historyObj = historyMap;
        if (!historyObj[name]) historyObj[name] = [];
        
        newSubs.forEach(sub => {
            if (!historyObj[name].includes(sub)) {
                historyObj[name].push(sub);
            }
        });

        const newHistoryArray = Object.keys(historyObj).map(n => ({ name: n, subs: historyObj[n] }));
        Storage.save('GOODS_HISTORY', newHistoryArray);

        // 2. 在庫に品目を追加
        let rawItems = Storage.load('GOODS_LIST');
        let items = Array.isArray(rawItems) ? rawItems : [];
        let targetItem = items.find(i => i.name === name);
        if (!targetItem) {
            items.push({
                id: Date.now().toString(),
                name,
                needBuy: false
            });
            Storage.save('GOODS_LIST', items);
        }

        alert('登録しました');
        document.getElementById('input-goods-sub').value = '';
    };
}

// 履歴データを安全に「品名: [サブ名配列]」のオブジェクト形式へ正規化する
function getNormalizedHistory(rawHistory) {
    const map = {};
    if (!Array.isArray(rawHistory)) return map;

    rawHistory.forEach(item => {
        if (typeof item === 'string') {
            if (!map[item]) map[item] = [];
        } else if (item && typeof item === 'object' && item.name) {
            if (!map[item.name]) map[item.name] = [];
            if (Array.isArray(item.subs)) {
                item.subs.forEach(s => {
                    if (!map[item.name].includes(s)) map[item.name].push(s);
                });
            }
        }
    });
    return map;
}

function toggleGoodsCart(name, container) {
    let rawItems = Storage.load('GOODS_LIST');
    let items = Array.isArray(rawItems) ? rawItems : [];
    let item = items.find(i => i.name === name);
    if (item) {
        item.needBuy = !item.needBuy;
        Storage.save('GOODS_LIST', items);
        renderGoodsTab(container);
    }
}

// 在庫リストからの削除（在庫リストのみから削除し、履歴は残す）
function deleteSelectedGoods() {
    const checked = Array.from(document.querySelectorAll('.goods-checkbox:checked')).map(cb => cb.value);
    if (!checked.length) return alert('選択されていません。');
    
    if (confirm('選択した日用品を在庫リストから削除しますか？')) {
        let rawItems = Storage.load('GOODS_LIST');
        let items = Array.isArray(rawItems) ? rawItems : [];
        Storage.save('GOODS_LIST', items.filter(item => !checked.includes(item.name)));
        
        renderGoodsTab(document.getElementById('tab-goods'));
    }
}

// 商品名（銘柄等）を個別に編集するモーダル
function openSubNameEditModal(targetName, targetSubName, container) {
    const modalBg = document.createElement('div');
    modalBg.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;";
    
    modalBg.innerHTML = `
        <div style="background:white; padding:20px; border-radius:12px; width:90%; max-width:400px;">
            <h3 style="margin-bottom:16px;">商品名の編集</h3>
            <div class="form-group">
                <label>品名: ${escapeHTML(targetName)}</label>
            </div>
            <div class="form-group">
                <label>商品名（銘柄など）</label>
                <input type="text" id="modal-sub-name" value="${escapeHTML(targetSubName)}">
            </div>
            <div style="display:flex; gap:8px; margin-top:20px;">
                <button class="btn-blue" style="flex:1;" id="modal-save">更新</button>
                <button class="btn-outline" style="flex:1;" id="modal-cancel">キャンセル</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalBg);

    modalBg.querySelector('#modal-cancel').onclick = () => document.body.removeChild(modalBg);
    
    modalBg.querySelector('#modal-save').onclick = () => {
        const newSubName = document.getElementById('modal-sub-name').value.trim();
        if (!newSubName) return alert('商品名を入力してください。');

        // 履歴の該当商品名を更新
        let rawHistory = Storage.load('GOODS_HISTORY');
        let historyObj = getNormalizedHistory(rawHistory);
        if (historyObj[targetName]) {
            historyObj[targetName] = historyObj[targetName].map(s => s === targetSubName ? newSubName : s);
            const newHistoryArray = Object.keys(historyObj).map(n => ({ name: n, subs: historyObj[n] }));
            Storage.save('GOODS_HISTORY', newHistoryArray);
        }

        document.body.removeChild(modalBg);
        renderGoodsShoppingTab(container);
    };
}

export function renderGoodsShoppingTab(container) {
    const rawHistory = Storage.load('GOODS_HISTORY');
    const historyObj = getNormalizedHistory(rawHistory);

    const rawInventory = Storage.load('GOODS_LIST');
    const inventoryMap = {};
    if (Array.isArray(rawInventory)) {
        rawInventory.forEach(i => { inventoryMap[i.name] = i; });
    }

    const allNames = Object.keys(historyObj);
    // 買い物リストの表示条件：在庫リストにない履歴、または在庫リストでカートアイコンがONの品目
    const shoppingNames = allNames.filter(name => {
        const item = inventoryMap[name];
        return !item || item.needBuy;
    });

    container.innerHTML = `
        <p style="margin-bottom: 16px; font-size: 13px; color: #6b7280;">※在庫にない履歴、または「🛒」がONの品目が表示されます。商品名をクリックして編集、ゴミ箱で履歴から削除できます。</p>
        <div class="list-header">
            <div class="col-name">品名</div>
            <div class="col-sub">商品名（銘柄等）</div>
            <div class="col-check" style="flex:0.5;">操作</div>
        </div>
        <div>
            ${shoppingNames.length === 0 ? '<div class="empty-message">買うべき日用品はありません</div>' : ''}
            
            ${shoppingNames.map(name => {
                const subNames = historyObj[name] || [];
                return `
                    <div class="list-item">
                        <div class="col-name" style="font-weight:bold;">${escapeHTML(name)}</div>
                        <div class="col-sub">
                            ${subNames.length > 0 
                                ? subNames.map(sub => `<span class="goods-sub-trigger" data-name="${escapeHTML(name)}" data-sub="${escapeHTML(sub)}" style="color:var(--blue); cursor:pointer; margin-right:8px; display:inline-block;">${escapeHTML(sub)}</span>`).join('') 
                                : '<span style="color:var(--text-light);">なし</span>'}
                        </div>
                        <div class="col-check" style="flex:0.5; display:flex; justify-content:center;">
                            <button class="btn-delete-cart" data-name="${escapeHTML(name)}">🗑</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // 買い物タブでの商品名クリック編集
    container.querySelectorAll('.goods-sub-trigger').forEach(el => {
        el.onclick = () => {
            const name = el.getAttribute('data-name');
            const sub = el.getAttribute('data-sub');
            openSubNameEditModal(name, sub, container);
        };
    });

    // ゴミ箱アイコン（確認ダイアログを挟んで履歴から削除）
    container.querySelectorAll('.btn-delete-cart').forEach(btn => {
        btn.onclick = (e) => {
            const name = e.target.getAttribute('data-name');
            
            if (confirm(`「${name}」を履歴（および買い物リスト）から完全に削除しますか？`)) {
                let rawHistory = Storage.load('GOODS_HISTORY');
                let historyObj = getNormalizedHistory(rawHistory);
                delete historyObj[name];
                const newHistoryArray = Object.keys(historyObj).map(n => ({ name: n, subs: historyObj[n] }));
                Storage.save('GOODS_HISTORY', newHistoryArray);

                // 在庫リストにある場合はneedBuyをfalseにする、もしくはそのまま
                let rawItems = Storage.load('GOODS_LIST');
                let items = Array.isArray(rawItems) ? rawItems : [];
                let item = items.find(i => i.name === name);
                if (item) {
                    item.needBuy = false;
                    Storage.save('GOODS_LIST', items);
                }

                renderGoodsShoppingTab(container);
            }
        };
    });
}
