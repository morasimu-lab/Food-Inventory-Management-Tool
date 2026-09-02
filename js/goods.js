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
    const rawData = Storage.load('GOODS_LIST');
    const items = Array.isArray(rawData) ? rawData.sort((a, b) => a.name.localeCompare(b.name)) : [];

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
            ${items.length === 0 ? '<div class="empty-message">登録されている日用品はありません</div>' : ''}
            ${items.map(item => `
                <div class="list-item">
                    <div class="col-name" style="font-weight:bold;">${escapeHTML(item.name)}</div>
                    <div class="col-sub">${escapeHTML(Array.isArray(item.subNames) ? item.subNames.join(', ') : 'なし')}</div>
                    <div class="col-cart">
                        <button class="btn-cart ${item.needBuy ? 'active' : ''}" data-id="${item.id}">🛒</button>
                    </div>
                    <div class="col-check"><input type="checkbox" class="goods-checkbox" value="${item.id}"></div>
                </div>
            `).join('')}
        </div>
    `;

    container.querySelector('#btn-goto-goods-reg').onclick = () => { currentSubView = 'register'; renderGoodsTab(container); };
    container.querySelector('#btn-delete-goods').onclick = deleteSelectedGoods;

    container.querySelectorAll('.btn-cart').forEach(btn => {
        btn.onclick = (e) => toggleGoodsCart(e.target.getAttribute('data-id'), container);
    });
}

function renderGoodsRegister(container) {
    const rawHistory = Storage.load('GOODS_HISTORY');
    const history = Array.isArray(rawHistory) ? rawHistory.sort() : [];
    
    container.innerHTML = `
        <button class="btn-outline" style="margin-bottom: 24px; width: auto; padding: 8px 16px;" id="btn-back-goods">＜ 戻る</button>
        <div class="form-group">
            <label>品名</label>
            <input type="text" id="input-goods-name" placeholder="例: シャンプー" list="goods-history" autocomplete="off">
            <datalist id="goods-history">${history.map(n => `<option value="${escapeHTML(n)}">`).join('')}</datalist>
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

        const subNames = subRaw ? subRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        let rawItems = Storage.load('GOODS_LIST');
        let items = Array.isArray(rawItems) ? rawItems : [];
        items.forEach(i => { if (i.name === name) i.needBuy = false; });

        items.push({
            id: Date.now().toString(),
            name,
            subNames,
            needBuy: false
        });
        Storage.save('GOODS_LIST', items);

        let rawHistory = Storage.load('GOODS_HISTORY');
        let history = Array.isArray(rawHistory) ? rawHistory : [];
        if (!history.includes(name)) {
            history.push(name);
            Storage.save('GOODS_HISTORY', history);
        }
        alert('登録しました');
    };
}

function toggleGoodsCart(id, container) {
    let rawItems = Storage.load('GOODS_LIST');
    let items = Array.isArray(rawItems) ? rawItems : [];
    let item = items.find(i => i.id === id);
    if (item) {
        item.needBuy = !item.needBuy;
        Storage.save('GOODS_LIST', items);
        renderGoodsTab(container);
    }
}

function deleteSelectedGoods() {
    const checked = Array.from(document.querySelectorAll('.goods-checkbox:checked')).map(cb => cb.value);
    if (!checked.length) return alert('選択されていません。');
    if (confirm('選択した日用品を削除しますか？')) {
        let rawItems = Storage.load('GOODS_LIST');
        let items = Array.isArray(rawItems) ? rawItems : [];
        Storage.save('GOODS_LIST', items.filter(item => !checked.includes(item.id)));
        renderGoodsTab(document.getElementById('tab-goods'));
    }
}

// 商品名（銘柄等）を個別に編集するモーダル
function openSubNameEditModal(targetName, targetSubName, container, isCartItem = false, itemId = null) {
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

        let rawItems = Storage.load('GOODS_LIST');
        let items = Array.isArray(rawItems) ? rawItems : [];

        if (isCartItem && itemId) {
            let item = items.find(i => i.id === itemId);
            if (item && Array.isArray(item.subNames)) {
                item.subNames = item.subNames.map(s => s === targetSubName ? newSubName : s);
                Storage.save('GOODS_LIST', items);
            }
        }

        document.body.removeChild(modalBg);
        renderGoodsShoppingTab(container);
    };
}

export function renderGoodsShoppingTab(container) {
    const rawHistory = Storage.load('GOODS_HISTORY');
    const history = Array.isArray(rawHistory) ? rawHistory : [];

    const rawInventory = Storage.load('GOODS_LIST');
    const inventory = Array.isArray(rawInventory) ? rawInventory : [];
    
    const inventoryNames = inventory.map(i => i.name);
    const outOfStock = history.filter(name => !inventoryNames.includes(name));
    const cartItems = inventory.filter(i => i.needBuy);

    container.innerHTML = `
        <p style="margin-bottom: 16px; font-size: 13px; color: #6b7280;">※使い切った日用品、または在庫から「🛒」をつけたものが表示されます。商品名をクリックして編集が行えます。</p>
        <div class="list-header">
            <div class="col-name">品名</div>
            <div class="col-sub">商品名（銘柄等）</div>
            <div class="col-check" style="flex:0.5;">操作</div>
        </div>
        <div>
            ${outOfStock.length === 0 && cartItems.length === 0 ? '<div class="empty-message">買うべき日用品はありません</div>' : ''}
            
            ${outOfStock.map(name => `
                <div class="list-item">
                    <div class="col-name" style="font-weight:bold;">${escapeHTML(name)}</div>
                    <div class="col-sub" style="color:var(--text-light);">なし</div>
                    <div class="col-check" style="flex:0.5; display:flex; justify-content:center;">
                        <button class="btn-delete-small" data-name="${escapeHTML(name)}">🗑</button>
                    </div>
                </div>
            `).join('')}

            ${cartItems.map(item => {
                const subNames = Array.isArray(item.subNames) && item.subNames.length > 0 ? item.subNames : ['（商品名なし）'];
                return subNames.map(sub => `
                    <div class="list-item">
                        <div class="col-name" style="font-weight:bold;">${escapeHTML(item.name)}</div>
                        <div class="col-sub goods-sub-trigger" data-id="${item.id}" data-name="${escapeHTML(item.name)}" data-sub="${escapeHTML(sub)}" style="color:var(--blue); cursor:pointer;">${escapeHTML(sub)}</div>
                        <div class="col-check" style="flex:0.5; display:flex; justify-content:center;">
                            <button class="btn-delete-cart" data-id="${item.id}">🗑</button>
                        </div>
                    </div>
                `).join('');
            }).join('')}
        </div>
    `;

    // カート内商品の商品名をクリックして編集
    container.querySelectorAll('.goods-sub-trigger').forEach(el => {
        el.onclick = () => {
            const itemId = el.getAttribute('data-id');
            const targetName = el.getAttribute('data-name');
            const targetSub = el.getAttribute('data-sub');
            openSubNameEditModal(targetName, targetSub, container, true, itemId);
        };
    });

    // 履歴アイテムの削除（ゴミ箱）
    container.querySelectorAll('.btn-delete-small').forEach(btn => {
        btn.onclick = (e) => {
            const name = e.target.getAttribute('data-name');
            if (confirm(`「${name}」を履歴からも完全に削除しますか？`)) {
                let rawHistory = Storage.load('GOODS_HISTORY');
                let history = Array.isArray(rawHistory) ? rawHistory : [];
                Storage.save('GOODS_HISTORY', history.filter(n => n !== name));

                let rawItems = Storage.load('GOODS_LIST');
                let items = Array.isArray(rawItems) ? rawItems : [];
                items.forEach(item => { if (item.name === name) item.needBuy = false; });
                Storage.save('GOODS_LIST', items);
                
                renderGoodsShoppingTab(container);
            }
        };
    });

    // カート（🛒）の削除ボタン＝買い物リストから外す（needBuyをfalseにする）
    container.querySelectorAll('.btn-delete-cart').forEach(btn => {
        btn.onclick = (e) => {
            const id = e.target.getAttribute('data-id');
            let rawItems = Storage.load('GOODS_LIST');
            let items = Array.isArray(rawItems) ? rawItems : [];
            let item = items.find(i => i.id === id);
            if (item) {
                item.needBuy = false;
                Storage.save('GOODS_LIST', items);
                renderGoodsShoppingTab(container);
            }
        };
    });
}
