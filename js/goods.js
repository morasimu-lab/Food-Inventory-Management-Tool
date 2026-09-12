// goods.js

import { escapeHTML } from './storage.js';
import { updateAppState, renderCurrentTab } from './main.js';
import { moveCategory, openCategoryManageModal, openChangeCategoryModal } from './categoryModal.js';

let currentSubView = 'list';
let registerInitialName = ''; // 追加購入時の品名引き継ぎ用

window.resetGoodsSubView = () => { 
    currentSubView = 'list'; 
    registerInitialName = '';
};

let openedCategoriesCache = [];

function getNormalizedHistory(history) {
    if (!history) return {};
    if (Array.isArray(history)) {
        const map = {};
        history.forEach(item => {
            if (typeof item === 'string') {
                map[item] = [];
            } else if (item && item.name) {
                map[item.name] = item.subs || [];
            }
        });
        return map;
    }
    return history;
}

export function renderGoodsTab(container, appState) {
    if (currentSubView === 'list') {
        renderGoodsList(container, appState);
    } else {
        renderGoodsRegister(container, appState, registerInitialName);
    }
}

function renderGoodsList(container, appState) {
    const currentlyOpened = [];
    container.querySelectorAll('.category-content').forEach(content => {
        if (content.style.display === 'block') {
            currentlyOpened.push(content.id.replace('cat-content-', ''));
        }
    });
    if (currentlyOpened.length > 0) openedCategoriesCache = currentlyOpened;

    const historyMap = getNormalizedHistory(appState.goodsHistory);
    const items = appState.goodsList || [];
    const categories = appState.goodsCategories || [];

    const unclassifiedItems = items.filter(i => !i.category || !categories.includes(i.category));

    const renderListHeader = () => `
        <div class="list-header">
            <div class="col-add">追加</div>
            <div class="col-name">品名</div>
            <div class="col-sub">商品名（銘柄等）</div>
            <div class="col-qty">数量</div>
            <div class="col-cart">買</div>
            <div class="col-check">消</div>
        </div>
    `;

    container.innerHTML = `
        <div class="action-buttons">
            <button class="btn-blue" id="btn-goto-goods-reg">＋ 登録</button>
            <button class="btn-red" id="btn-delete-goods">🗑 選択削除</button>
            <button class="btn-outline" id="btn-manage-categories">📁 カテゴリ管理</button>
        </div>
        <div>
            ${items.length === 0 ? '<div class="empty-message">在庫に登録されている日用品はありません</div>' : ''}

            ${unclassifiedItems.length > 0 ? `
                <div class="category-section">
                    <div class="category-header" data-cat="unclassified">
                        <span class="category-title">未分類 (${unclassifiedItems.length})</span>
                        <span class="accordion-arrow">▶</span>
                    </div>
                    <div class="category-content" id="cat-content-unclassified" style="display:none;">
                        ${renderListHeader()}
                        ${unclassifiedItems.map(item => renderGoodsRow(item, historyMap)).join('')}
                    </div>
                </div>
            ` : ''}

            ${categories.map((cat, index) => {
                const catItems = items.filter(i => i.category === cat);
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
                            ${renderListHeader()}
                            ${catItems.length === 0 
                                ? '<div class="empty-message">このカテゴリの品はありません</div>' 
                                : catItems.map(item => renderGoodsRow(item, historyMap)).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // アコーディオン状態復元
    openedCategoriesCache.forEach(catId => {
        const content = container.querySelector(`#cat-content-${CSS.escape(catId)}`);
        if (content) {
            content.style.display = 'block';
            const header = content.previousElementSibling;
            if (header) {
                const arrow = header.querySelector('.accordion-arrow');
                if (arrow) arrow.textContent = '▼';
            }
        }
    });

    // イベントバインド
    container.querySelector('#btn-goto-goods-reg').onclick = () => { 
        registerInitialName = '';
        currentSubView = 'register'; 
        renderGoodsTab(container, appState); 
    };
    container.querySelector('#btn-delete-goods').onclick = () => deleteSelectedGoods(appState);
    container.querySelector('#btn-manage-categories').onclick = () => openCategoryManageModal('goods', container);

    // 追加購入ショートカットボタン
    container.querySelectorAll('.btn-quick-add').forEach(btn => {
        btn.onclick = () => {
            registerInitialName = btn.getAttribute('data-name');
            currentSubView = 'register';
            renderGoodsTab(container, appState);
        };
    });

    container.querySelectorAll('.btn-cat-move').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            moveCategory('goods', parseInt(btn.getAttribute('data-index')), btn.getAttribute('data-dir'), container);
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

    container.querySelectorAll('.goods-name-clickable').forEach(el => {
        el.onclick = () => openChangeCategoryModal(el.getAttribute('data-name'), el.getAttribute('data-category'), 'goods', container);
    });

    // カートボタン
    container.querySelectorAll('.btn-cart').forEach(btn => {
        btn.onclick = (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const name = e.currentTarget.getAttribute('data-name');
            toggleGoodsCart(id, name, appState, e.currentTarget);
        };
    });

    // 個数変更（＋ / －）ボタン
    container.querySelectorAll('.btn-qty-change').forEach(btn => {
        btn.onclick = (e) => {
            const id = btn.getAttribute('data-id');
            const name = btn.getAttribute('data-name');
            const delta = parseInt(btn.getAttribute('data-delta'), 10);
            changeGoodsQuantity(id, name, delta, appState);
        };
    });
}

function renderGoodsRow(item, historyMap) {
    const subNames = historyMap[item.name] || [];
    const categoryDisplay = item.category ? escapeHTML(item.category) : '未設定';
    const itemId = item.id != null ? String(item.id) : '';
    const quantity = item.quantity != null ? item.quantity : 0;

    return `
        <div class="list-item">
            <div class="col-add">
                <button class="btn-quick-add btn-qty" data-name="${escapeHTML(item.name)}" title="この品名で追加登録">＋</button>
            </div>
            <div class="col-name goods-name-clickable" data-name="${escapeHTML(item.name)}" data-category="${escapeHTML(item.category || '')}" title="クリックしてカテゴリ変更">
                <div class="item-title">${escapeHTML(item.name)}</div>
                <div class="item-category-tag">📁 ${categoryDisplay}</div>
            </div>
            <div class="col-sub">
                ${subNames.length > 0 
                    ? subNames.map(sub => `<span class="sub-tag">${escapeHTML(sub)}</span>`).join('') 
                    : '<span class="text-light">なし</span>'}
            </div>
            <div class="col-qty">
                <button class="btn-qty-change btn-qty" data-id="${escapeHTML(itemId)}" data-name="${escapeHTML(item.name)}" data-delta="-1">-</button>
                <span class="qty-num">${quantity}</span>
                <button class="btn-qty-change btn-qty" data-id="${escapeHTML(itemId)}" data-name="${escapeHTML(item.name)}" data-delta="1">+</button>
            </div>
            <div class="col-cart">
                <button class="btn-cart ${item.needBuy ? 'active' : ''}" data-id="${escapeHTML(itemId)}" data-name="${escapeHTML(item.name)}">🛒</button>
            </div>
            <div class="col-check">
                <input type="checkbox" class="goods-checkbox" value="${escapeHTML(item.name)}">
            </div>
        </div>
    `;
}

function renderGoodsRegister(container, appState, initialName = '') {
    const historyMap = getNormalizedHistory(appState.goodsHistory);
    const historyNames = Object.keys(historyMap);
    const categories = appState.goodsCategories || [];

    container.innerHTML = `
        <button class="btn-outline mb-24" id="btn-back-goods">＜ 戻る</button>
        <div class="form-group">
            <label>品名</label>
            <input type="text" id="input-goods-name" value="${escapeHTML(initialName)}" placeholder="例: シャンプー" list="goods-history" autocomplete="off">
            <datalist id="goods-history">${historyNames.map(n => `<option value="${escapeHTML(n)}">`).join('')}</datalist>
        </div>
        <div class="form-group">
            <label>個数（数量）</label>
            <input type="number" id="input-goods-quantity" value="1" min="0">
        </div>
        <div class="form-group">
            <label>商品名（銘柄など / 複数の場合はカンマ区切り）</label>
            <input type="text" id="input-goods-sub" placeholder="例: メリット, h&s">
        </div>
        <div class="form-group">
            <label>カテゴリ</label>
            <select id="input-goods-cat">
                <option value="">（未設定）</option>
                ${categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="input-goods-nohistory">
            <label for="input-goods-nohistory">履歴に残さないで登録（在庫から削除しても買い物リストに現れません）</label>
        </div>
        <button class="btn-blue btn-full" id="btn-submit-goods">登録する</button>
    `;

    container.querySelector('#btn-back-goods').onclick = () => { 
        currentSubView = 'list'; 
        registerInitialName = '';
        renderGoodsTab(container, appState); 
    };

    container.querySelector('#btn-submit-goods').onclick = async () => {
        const name = document.getElementById('input-goods-name').value.trim();
        const quantityVal = parseInt(document.getElementById('input-goods-quantity').value, 10);
        const addQuantity = isNaN(quantityVal) ? 0 : Math.max(0, quantityVal);
        const subRaw = document.getElementById('input-goods-sub').value.trim();
        const category = document.getElementById('input-goods-cat').value;
        const noHistory = document.getElementById('input-goods-nohistory').checked;
        if (!name) return alert('品名を入力してください。');

        const newSubs = subRaw ? subRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        if (!noHistory) {
            let historyObj = historyMap;
            if (!historyObj[name]) historyObj[name] = [];
            newSubs.forEach(sub => {
                if (!historyObj[name].includes(sub)) historyObj[name].push(sub);
            });
            const newHistoryArray = Object.keys(historyObj).map(n => ({ name: n, subs: historyObj[n] }));
            await updateAppState('goodsHistory', newHistoryArray);
        }

        let items = [...(appState.goodsList || [])];
        let targetItem = items.find(i => i.name === name);
        
        if (targetItem) {
            targetItem.needBuy = false;
            targetItem.quantity = (targetItem.quantity != null ? targetItem.quantity : 0) + addQuantity;
            if (category) targetItem.category = category;
        } else {
            items.push({
                id: Date.now().toString(),
                name,
                quantity: addQuantity,
                category: category || null,
                needBuy: false
            });
        }

        await updateAppState('goodsList', items);

        if (confirm('登録しました。続けて日用品を登録しますか？')) {
            registerInitialName = '';
            document.getElementById('input-goods-name').value = '';
            document.getElementById('input-goods-quantity').value = '1';
            document.getElementById('input-goods-sub').value = '';
            document.getElementById('input-goods-nohistory').checked = false;
            document.getElementById('input-goods-name').focus();
        } else {
            registerInitialName = '';
            currentSubView = 'list';
            renderGoodsTab(container, appState);
        }
    };
}

async function changeGoodsQuantity(id, name, delta, appState) {
    let items = [...(appState.goodsList || [])];
    let item = items.find(i => (id && String(i.id) === String(id)) || i.name === name);
    if (item) {
        const currentQty = item.quantity != null ? item.quantity : 0;
        item.quantity = Math.max(0, currentQty + delta);
        await updateAppState('goodsList', items);
        renderCurrentTab();
    }
}

async function toggleGoodsCart(id, name, appState, btnEl) {
    let items = [...(appState.goodsList || [])];
    let item = items.find(i => (id && String(i.id) === String(id)) || i.name === name);
    if (item) {
        item.needBuy = !item.needBuy;
        await updateAppState('goodsList', items);
        if (btnEl) btnEl.classList.toggle('active', item.needBuy);
    }
}

async function deleteSelectedGoods(appState) {
    const checked = Array.from(document.querySelectorAll('.goods-checkbox:checked')).map(cb => cb.value);
    if (!checked.length) return alert('選択されていません。');

    if (confirm('選択した日用品を削除しますか？')) {
        let items = (appState.goodsList || []).filter(item => !checked.includes(item.name));
        await updateAppState('goodsList', items);
        renderCurrentTab();
    }
}
