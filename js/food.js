// food.js

import { escapeHTML } from './storage.js';
import { updateAppState, renderCurrentTab } from './main.js';
import { moveCategory, openCategoryManageModal, openChangeCategoryModal } from './categoryModal.js';

let currentSubView = 'list';
let shortcutFoodName = ''; // 追加購入ショートカット用の品名保持

window.resetFoodSubView = () => { 
    currentSubView = 'list'; 
    shortcutFoodName = '';
};

let openedCategoriesCache = [];

export function renderFoodTab(container, appState) {
    if (currentSubView === 'list') {
        renderFoodList(container, appState);
    } else {
        renderFoodRegister(container, appState);
    }
}

function renderFoodList(container, appState) {
    const items = appState.foodList || [];
    const categories = appState.foodCategories || [];

    // アコーディオンの開閉状態を保持
    const currentlyOpened = [];
    container.querySelectorAll('.category-content').forEach(content => {
        if (content.style.display === 'block') {
            currentlyOpened.push(content.id.replace('cat-content-', ''));
        }
    });
    if (currentlyOpened.length > 0) openedCategoriesCache = currentlyOpened;

    const sortedItems = [...items].sort((a, b) => {
        const expA = a.expDate || '9999/99/99';
        const expB = b.expDate || '9999/99/99';
        if (expA !== expB) return expA.localeCompare(expB);
        return (a.name || '').localeCompare(b.name || '');
    });

    const unclassifiedItems = sortedItems.filter(i => !i.category || !categories.includes(i.category));

    container.innerHTML = `
        <div class="action-buttons">
            <button class="btn-blue" id="btn-goto-food-reg">＋ 登録</button>
            <button class="btn-red" id="btn-delete-food">🗑 選択削除</button>
            <button class="btn-outline" id="btn-manage-categories">📁 カテゴリ管理</button>
        </div>
        <div>
            ${sortedItems.length === 0 ? '<div class="empty-message">登録されている食品はありません</div>' : ''}

            ${unclassifiedItems.length > 0 ? `
                <div class="category-section">
                    <div class="category-header" data-cat="unclassified">
                        <span class="category-title">未分類 (${unclassifiedItems.length})</span>
                        <span class="accordion-arrow">▶</span>
                    </div>
                    <div class="category-content" id="cat-content-unclassified" style="display:none;">
                        <div class="list-header">
                            <div class="col-add">追加</div>
                            <div class="col-name">品名</div>
                            <div class="col-sub">賞味期限</div>
                            <div class="col-sub">登録日</div>
                            <div class="col-qty">数量</div>
                            <div class="col-cart">買</div>
                            <div class="col-check">消</div>
                        </div>
                        ${unclassifiedItems.map(item => renderFoodRow(item)).join('')}
                    </div>
                </div>
            ` : ''}

            ${categories.map((cat, index) => {
                const catItems = sortedItems.filter(i => i.category === cat);
                return `
                    <div class="category-section">
                        <div class="category-header" data-cat="${escapeHTML(cat)}">
                            <span class="category-title">${escapeHTML(cat)} (${catItems.length})</span>
                            <div class="category-actions">
                                <button class="btn-cat-move" data-index="${index}" data-dir="up" ${index === 0 ? 'disabled' : ''}>▲</button>
                                <button class="btn-cat-move" data-index="${index}" data-dir="down" ${index === categories.length - 1 ? 'disabled' : ''}>▼</button>
                                <span class="accordion-arrow">▶</span>
                            </div>
                        </div>
                        <div class="category-content" id="cat-content-${escapeHTML(cat)}" style="display:none;">
                            <div class="list-header">
                                <div class="col-add">追加</div>
                                <div class="col-name">品名</div>
                                <div class="col-sub">賞味期限</div>
                                <div class="col-sub">登録日</div>
                                <div class="col-qty">数量</div>
                                <div class="col-cart">買</div>
                                <div class="col-check">消</div>
                            </div>
                            ${catItems.length === 0 
                                ? '<div class="empty-message">カテゴリに登録された商品がありません。</div>' 
                                : catItems.map(item => renderFoodRow(item)).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // 開いていたカテゴリのアコーディオンを復元
    openedCategoriesCache.forEach(catId => {
        const content = container.querySelector(`#cat-content-${CSS.escape(catId)}`);
        if (content) {
            content.style.display = 'block';
            const arrow = content.previousElementSibling?.querySelector('.accordion-arrow');
            if (arrow) arrow.textContent = '▼';
        }
    });

    // イベントバインド
    container.querySelector('#btn-goto-food-reg').onclick = () => {
        shortcutFoodName = '';
        currentSubView = 'register';
        renderFoodTab(container, appState);
    };

    container.querySelector('#btn-delete-food').onclick = () => deleteSelectedFood(appState);

    container.querySelector('#btn-manage-categories').onclick = () => {
        openCategoryManageModal('food', container);
    };

    container.querySelectorAll('.btn-cat-move').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            moveCategory('food', parseInt(btn.getAttribute('data-index')), btn.getAttribute('data-dir'), container);
        };
    });

    container.querySelectorAll('.category-header').forEach(header => {
        header.onclick = (e) => {
            if (e.target.closest('button')) return;
            const catName = header.getAttribute('data-cat');
            const content = container.querySelector(`#cat-content-${CSS.escape(catName)}`);
            const arrow = header.querySelector('.accordion-arrow');
            if (content) {
                const isClosed = content.style.display === 'none';
                content.style.display = isClosed ? 'block' : 'none';
                if (arrow) arrow.textContent = isClosed ? '▼' : '▶';
                if (isClosed) {
                    if (!openedCategoriesCache.includes(catName)) openedCategoriesCache.push(catName);
                } else {
                    openedCategoriesCache = openedCategoriesCache.filter(id => id !== catName);
                }
            }
        };
    });

    // 追加購入ショートカットボタン (+)
    container.querySelectorAll('.btn-quick-add').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            shortcutFoodName = btn.getAttribute('data-name');
            currentSubView = 'register';
            renderFoodTab(container, appState);
        };
    });

    // 個数変更（＋ / －）ボタン
    container.querySelectorAll('.btn-qty-change').forEach(btn => {
        btn.onclick = (e) => {
            const delta = parseInt(btn.getAttribute('data-delta'), 10);
            changeFoodQuantity(btn.getAttribute('data-id'), delta, appState);
        };
    });

    container.querySelectorAll('.food-name-clickable').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            openChangeCategoryModal(el.getAttribute('data-id'), el.getAttribute('data-category'), 'food', container);
        };
    });

    container.querySelectorAll('.btn-cart').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            toggleFoodCartHelper(btn.getAttribute('data-id'), appState, btn);
        };
    });
}

function renderFoodRow(item) {
    const categoryDisplay = item.category ? escapeHTML(item.category) : '未設定';
    const expDate = item.expDate || '';
    const regDate = item.regDate || '';
    const qty = item.quantity !== undefined ? item.quantity : 0;

    let alertClass = '';
    if (expDate) {
        const expTime = new Date(expDate.replace(/\//g, '-')).setHours(0, 0, 0, 0);
        const today = new Date().setHours(0, 0, 0, 0);
        const diffDays = (expTime - today) / (24 * 60 * 60 * 1000);
        if (diffDays < 0) alertClass = 'expired';
        else if (diffDays < 2) alertClass = 'warning';
    }

    return `
        <div class="list-item ${alertClass}">
            <div class="col-add">
                <button class="btn-quick-add btn-qty" data-name="${escapeHTML(item.name)}" title="追加購入">＋</button>
            </div>
            <div class="col-name food-name-clickable" data-id="${item.id}" data-category="${escapeHTML(item.category || '')}">
                <div class="item-title">${escapeHTML(item.name)}</div>
                <div class="item-category-tag">📁 ${categoryDisplay}</div>
            </div>
            <div class="col-sub text-center">${expDate || 'なし'}</div>
            <div class="col-sub text-center">${regDate ? regDate.substring(5) : ''}</div>
            <div class="col-qty">
                <button class="btn-qty-change btn-qty" data-id="${item.id}" data-delta="-1">-</button>
                <span class="qty-num">${qty}</span>
                <button class="btn-qty-change btn-qty" data-id="${item.id}" data-delta="1">+</button>
            </div>
            <div class="col-cart">
                <button class="btn-cart ${item.needBuy ? 'active' : ''}" data-id="${item.id}">🛒</button>
            </div>
            <div class="col-check">
                <input type="checkbox" class="food-checkbox" value="${item.id}">
            </div>
        </div>
    `;
}

function renderFoodRegister(container, appState) {
    const history = appState.foodHistory || [];
    const categories = appState.foodCategories || [];
    const initialName = shortcutFoodName || '';

    container.innerHTML = `
        <button class="btn-outline mb-24" id="btn-back-food">＜ 戻る</button>
        <div class="form-group">
            <label>品名</label>
            <input type="text" id="input-food-name" value="${escapeHTML(initialName)}" placeholder="例: 牛乳" list="food-history" autocomplete="off">
            <datalist id="food-history">${history.map(n => `<option value="${escapeHTML(n)}">`).join('')}</datalist>
        </div>
        <div class="form-group">
            <label>個数</label>
            <input type="number" id="input-food-qty" value="1" min="0">
        </div>
        <div class="form-group">
            <label>賞味期限（任意）</label>
            <input type="date" id="input-food-exp">
        </div>
        <div class="form-group">
            <label>カテゴリ</label>
            <select id="input-food-cat">
                <option value="">（未設定）</option>
                ${categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="input-food-nohistory">
            <label for="input-food-nohistory">履歴に残さないで登録（在庫から削除しても買い物リストに現れません）</label>
        </div>
        <button class="btn-blue btn-full" id="btn-submit-food">登録する</button>
    `;

    container.querySelector('#btn-back-food').onclick = () => {
        shortcutFoodName = '';
        currentSubView = 'list';
        renderFoodTab(container, appState);
    };

    container.querySelector('#btn-submit-food').onclick = async () => {
        const name = document.getElementById('input-food-name').value.trim();
        const qtyInput = parseInt(document.getElementById('input-food-qty').value, 10);
        const qty = isNaN(qtyInput) || qtyInput < 0 ? 1 : qtyInput;
        const expRaw = document.getElementById('input-food-exp').value;
        const category = document.getElementById('input-food-cat').value;
        const noHistory = document.getElementById('input-food-nohistory').checked;
        if (!name) return alert('品名を入力してください。');

        if (!noHistory) {
            let historyList = [...(appState.foodHistory || [])];
            if (!historyList.includes(name)) {
                historyList.push(name);
                await updateAppState('foodHistory', historyList);
            }
        }
        
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const regDateFormatted = `${yyyy}/${mm}/${dd}`;

        let items = [...(appState.foodList || [])];

        items.push({
            id: Date.now().toString(),
            name,
            quantity: qty,
            expDate: expRaw ? expRaw.replace(/-/g, '/') : '',
            regDate: regDateFormatted,
            category: category || null,
            needBuy: false
        });

        await updateAppState('foodList', items);

        if (confirm('登録しました。続けて商品を登録しますか？')) {
            shortcutFoodName = '';
            document.getElementById('input-food-name').value = '';
            document.getElementById('input-food-qty').value = '1';
            document.getElementById('input-food-exp').value = '';
            document.getElementById('input-food-nohistory').checked = false;
            document.getElementById('input-food-name').focus();
        } else {
            shortcutFoodName = '';
            currentSubView = 'list';
            renderFoodTab(container, appState);
        }
    };
}

async function changeFoodQuantity(id, delta, appState) {
    let items = [...(appState.foodList || [])];
    let item = items.find(i => String(i.id) === String(id));
    if (item) {
        const currentQty = item.quantity !== undefined ? item.quantity : 0;
        item.quantity = Math.max(0, currentQty + delta);
        await updateAppState('foodList', items);
        renderCurrentTab();
    }
}

async function toggleFoodCartHelper(id, appState, btnEl) {
    let items = [...(appState.foodList || [])];
    let item = items.find(i => String(i.id) === String(id));
    if (item) {
        item.needBuy = !item.needBuy;
        await updateAppState('foodList', items);
        if (btnEl) btnEl.classList.toggle('active', item.needBuy);
    }
}

async function deleteSelectedFood(appState) {
    const checked = Array.from(document.querySelectorAll('.food-checkbox:checked')).map(cb => String(cb.value));
    if (!checked.length) return alert('選択されていません。');

    if (confirm('選択した食品を削除しますか？')) {
        let items = (appState.foodList || []).filter(item => !checked.includes(String(item.id)));
        await updateAppState('foodList', items);
        renderCurrentTab();
    }
}
