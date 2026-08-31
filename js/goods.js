import { Storage, escapeHTML } from './storage.js';

let currentSubView = 'list';

export function renderGoodsTab(container) {
    if (currentSubView === 'list') {
        renderGoodsList(container);
    } else {
        renderGoodsRegister(container);
    }
}

function renderGoodsList(container) {
    const items = Storage.load('GOODS_LIST').sort((a, b) => a.name.localeCompare(b.name));

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
                    <div class="col-name goods-detail-trigger" data-id="${item.id}" style="cursor:pointer; font-weight:bold; color:var(--blue);">${escapeHTML(item.name)}</div>
                    <div class="col-sub goods-detail-trigger" data-id="${item.id}" style="cursor:pointer;">${escapeHTML(item.subNames.join(', ') || 'なし')}</div>
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

    container.querySelectorAll('.goods-detail-trigger').forEach(el => {
        el.onclick = () => openGoodsDetailModal(el.getAttribute('data-id'));
    });
}

function renderGoodsRegister(container) {
    const history = Storage.load('GOODS_HISTORY').sort();
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

        let items = Storage.load('GOODS_LIST');
        items.forEach(i => { if (i.name === name) i.needBuy = false; });

        items.push({
            id: Date.now().toString(),
            name,
            subNames,
            needBuy: false
        });
        Storage.save('GOODS_LIST', items);

        let history = Storage.load('GOODS_HISTORY');
        if (!history.includes(name)) {
            history.push(name);
            Storage.save('GOODS_HISTORY', history);
        }
        alert('登録しました');
    };
}

function toggleGoodsCart(id, container) {
    let items = Storage.load('GOODS_LIST');
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
        Storage.save('GOODS_LIST', Storage.load('GOODS_LIST').filter(item => !checked.includes(item.id)));
        renderGoodsTab(document.getElementById('tab-goods'));
    }
}

function openGoodsDetailModal(id) {
    const items = Storage.load('GOODS_LIST');
    const item = items.find(i => i.id === id);
    if (!item) return;

    const modalBg = document.createElement('div');
    modalBg.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;";
    
    modalBg.innerHTML = `
        <div style="background:white; padding:20px; border-radius:12px; width:90%; max-width:400px;">
            <h3 style="margin-bottom:16px;">日用品の詳細確認</h3>
            <div class="form-group">
                <label>品名</label>
                <input type="text" id="modal-goods-name" value="${escapeHTML(item.name)}">
            </div>
            <div class="form-group">
                <label>登録されている商品名（カンマ区切り）</label>
                <input type="text" id="modal-goods-sub" value="${escapeHTML(item.subNames.join(', '))}">
            </div>
            <div style="display:flex; gap:8px; margin-top:20px;">
                <button class="btn-blue" style="flex:1;" id="modal-save">更新</button>
                <button class="btn-red" style="flex:1;" id="modal-delete">削除</button>
                <button class="btn-outline" style="flex:1;" id="modal-cancel">閉じる</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalBg);

    modalBg.querySelector('#modal-cancel').onclick = () => document.body.removeChild(modalBg);
    modalBg.querySelector('#modal-save').onclick = () => {
        const newName = document.getElementById('modal-goods-name').value.trim();
        const newSubRaw = document.getElementById('modal-goods-sub').value.trim();
        if (!newName) return alert('品名を入力してください。');

        item.name = newName;
        item.subNames = newSubRaw ? newSubRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
        Storage.save('GOODS_LIST', items);

        document.body.removeChild(modalBg);
        renderGoodsTab(document.getElementById('tab-goods'));
    };

    modalBg.querySelector('#modal-delete').onclick = () => {
        if (confirm(`「${item.name}」を削除しますか？`)) {
            Storage.save('GOODS_LIST', items.filter(i => i.id !== id));
            document.body.removeChild(modalBg);
            renderGoodsTab(document.getElementById('tab-goods'));
        }
    };
}

export function renderGoodsShoppingTab(container) {
    const history = Storage.load('GOODS_HISTORY');
    const inventory = Storage.load('GOODS_LIST');
    const inventoryNames = inventory.map(i => i.name);
    
    const outOfStock = history.filter(name => !inventoryNames.includes(name));
    const wantToBuy = inventory.filter(i => i.needBuy).map(i => i.name);
    const shoppingItems = Array.from(new Set([...outOfStock, ...wantToBuy])).sort();

    container.innerHTML = `
        <p style="margin-bottom: 16px; font-size: 13px; color: #6b7280;">※使い切った日用品、または在庫から「🛒」をつけたものが表示されます。</p>
        <div>
            ${shoppingItems.length === 0 ? '<div class="empty-message">買うべき日用品はありません</div>' : ''}
            ${shoppingItems.map(name => `
                <div class="shopping-item">
                    <div>${escapeHTML(name)}</div>
                    <button class="btn-delete-small" data-name="${escapeHTML(name)}">🗑</button>
                </div>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('.btn-delete-small').forEach(btn => {
        btn.onclick = (e) => {
            const name = e.target.getAttribute('data-name');
            if (confirm(`「${name}」を履歴からも完全に削除しますか？`)) {
                Storage.save('GOODS_HISTORY', Storage.load('GOODS_HISTORY').filter(n => n !== name));
                let items = Storage.load('GOODS_LIST');
                items.forEach(item => { if (item.name === name) item.needBuy = false; });
                Storage.save('GOODS_LIST', items);
                renderGoodsShoppingTab(container);
            }
        };
    });
}
