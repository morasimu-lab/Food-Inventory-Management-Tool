import { Storage, escapeHTML } from './storage.js';

let currentSubView = 'list';

export function renderFoodTab(container) {
    if (currentSubView === 'list') {
        renderFoodList(container);
    } else {
        renderFoodRegister(container);
    }
}

function renderFoodList(container) {
    const items = Storage.load('FOOD_LIST').sort((a, b) => {
        const expA = a.expDate || '9999/99/99', expB = b.expDate || '9999/99/99';
        if (expA !== expB) return expA.localeCompare(expB);
        if (a.regDate !== b.regDate) return a.regDate.localeCompare(b.regDate);
        return a.name.localeCompare(b.name);
    });

    container.innerHTML = `
        <div class="action-buttons">
            <button class="btn-blue" id="btn-goto-food-reg">＋ 登録</button>
            <button class="btn-red" id="btn-delete-food">🗑 選択削除</button>
        </div>
        <div class="list-header">
            <div class="col-name" style="flex:2.2;">品名</div>
            <div class="col-sub" style="flex:1.6; text-align:center;">賞味期限</div>
            <div class="col-sub" style="flex:1.1; text-align:center;">登録日</div>
            <div class="col-cart">買</div>
            <div class="col-check">消</div>
        </div>
        <div>
            ${items.length === 0 ? '<div class="empty-message">登録されている食品はありません</div>' : ''}
            ${items.map(item => `
                <div class="list-item">
                    <div class="col-name" style="flex:2.2;">${escapeHTML(item.name)}</div>
                    <div class="col-sub" style="flex:1.6; text-align:center;">${item.expDate || 'なし'}</div>
                    <div class="col-sub" style="flex:1.1; text-align:center;">${item.regDate ? item.regDate.substring(5) : ''}</div>
                    <div class="col-cart">
                        <button class="btn-cart ${item.needBuy ? 'active' : ''}" data-id="${item.id}">🛒</button>
                    </div>
                    <div class="col-check"><input type="checkbox" class="food-checkbox" value="${item.id}"></div>
                </div>
            `).join('')}
        </div>
    `;

    container.querySelector('#btn-goto-food-reg').onclick = () => { currentSubView = 'register'; renderFoodTab(container); };
    container.querySelector('#btn-delete-food').onclick = deleteSelectedFood;
    container.querySelectorAll('.btn-cart').forEach(btn => {
        btn.onclick = (e) => toggleFoodCart(e.target.getAttribute('data-id'), container);
    });
}

function renderFoodRegister(container) {
    const history = Storage.load('FOOD_HISTORY').sort();
    container.innerHTML = `
        <button class="btn-outline" style="margin-bottom: 24px; width: auto; padding: 8px 16px;" id="btn-back-food">＜ 戻る</button>
        <div class="form-group">
            <label>品名</label>
            <input type="text" id="input-food-name" placeholder="例: 牛乳" list="food-history" autocomplete="off">
            <datalist id="food-history">${history.map(n => `<option value="${escapeHTML(n)}">`).join('')}</datalist>
        </div>
        <div class="form-group">
            <label>賞味期限（任意）</label>
            <input type="date" id="input-food-exp">
        </div>
        <button class="btn-blue" style="width: 100%; padding: 16px;" id="btn-submit-food">登録する</button>
    `;

    container.querySelector('#btn-back-food').onclick = () => { currentSubView = 'list'; renderFoodTab(container); };
    container.querySelector('#btn-submit-food').onclick = () => {
        const name = document.getElementById('input-food-name').value.trim();
        const expRaw = document.getElementById('input-food-exp').value;
        if (!name) return alert('品名を入力してください。');

        let items = Storage.load('FOOD_LIST');
        items.forEach(i => { if (i.name === name) i.needBuy = false; });
        items.push({
            id: Date.now().toString(), name,
            expDate: expRaw ? expRaw.replace(/-/g, '/') : '',
            regDate: new Date().toLocaleDateString('ja-JP', {year:'numeric', month:'2-digit', day:'2-digit'}).replace(/-/g, '/'),
            needBuy: false
        });
        Storage.save('FOOD_LIST', items);

        let history = Storage.load('FOOD_HISTORY');
        if (!history.includes(name)) {
            history.push(name);
            Storage.save('FOOD_HISTORY', history);
        }
        // 登録完了後の確認ダイアログ
        if (confirm('登録しました。続けて商品を登録しますか？')) {
            // はい：入力欄をクリアして登録画面に留まる
            document.getElementById('input-food-name').value = '';
            // 必要に応じ他の入力欄もクリア
            document.getElementById('input-food-name').focus();
        } else {
            // いいえ：在庫画面に戻る
            currentSubView = 'list';
            renderFoodTab(container);
        }
    };
}

function toggleFoodCart(id, container) {
    let items = Storage.load('FOOD_LIST');
    let item = items.find(i => i.id === id);
    if (item) {
        item.needBuy = !item.needBuy;
        Storage.save('FOOD_LIST', items);
        renderFoodTab(container);
    }
}

function deleteSelectedFood() {
    const checked = Array.from(document.querySelectorAll('.food-checkbox:checked')).map(cb => cb.value);
    if (!checked.length) return alert('選択されていません。');
    if (confirm('選択した食品を削除しますか？')) {
        Storage.save('FOOD_LIST', Storage.load('FOOD_LIST').filter(item => !checked.includes(item.id)));
        renderFoodTab(document.getElementById('tab-food'));
    }
}

export function renderFoodShoppingTab(container) {
    const history = Storage.load('FOOD_HISTORY');
    const inventory = Storage.load('FOOD_LIST');
    const inventoryNames = inventory.map(i => i.name);
    
    const outOfStock = history.filter(name => !inventoryNames.includes(name));
    const wantToBuy = inventory.filter(i => i.needBuy).map(i => i.name);
    const shoppingItems = Array.from(new Set([...outOfStock, ...wantToBuy])).sort();

    container.innerHTML = `
        <p style="margin-bottom: 16px; font-size: 13px; color: #6b7280;">※使い切った食品、または在庫から「🛒」をつけたものが表示されます。</p>
        <div>
            ${shoppingItems.length === 0 ? '<div class="empty-message">買うべき食品はありません</div>' : ''}
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
            if (confirm(`「${name}」を履歴（および買い物リスト）からも完全に削除しますか？`)) {
                Storage.save('FOOD_HISTORY', Storage.load('FOOD_HISTORY').filter(n => n !== name));
                let items = Storage.load('FOOD_LIST');
                items.forEach(item => { if (item.name === name) item.needBuy = false; });
                Storage.save('FOOD_LIST', items);
                renderFoodShoppingTab(container);
            }
        };
    });
}
