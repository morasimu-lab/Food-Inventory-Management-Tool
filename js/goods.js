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
    const map = {};

    if (Array.isArray(history)) {
        history.forEach(item => {
            if (typeof item === 'string') {
                map[item] = [];
            } else if (item && item.name) {
                map[item.name] = Array.isArray(item.subs) ? item.subs : [];
            }
        });
    } else if (typeof history === 'object') {
        // オブジェクト形式で保存されている過去データの互換性対応
        Object.keys(history).forEach(key => {
            const val = history[key];
            if (Array.isArray(val)) {
                map[key] = val;
            } else if (typeof val === 'string' && val) {
                map[key] = [val]; // 文字列なら配列化
            } else {
                map[key] = [];
            }
        });
    }

    return map;
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
    // 配列でなければ空配列または配列化して取得する（エラー防止ガード）
    const rawSub = historyMap[item.name];
    const subNames = Array.isArray(rawSub) 
        ? rawSub 
        : (typeof rawSub === 'string' && rawSub ? [rawSub] : []);
    const categoryDisplay = item.category ? escapeHTML(item.category) : '未設定';
    const itemId = item.id != null ? String(item.id) : '';
    const quantity = item.quantity != null ? item.quantity : 0;

    return `
        <div class="list-item-card">
            <!-- 上段：品名・カテゴリ ＆ カート・追加 -->
            <div class="card-row-top">
                <div class="card-main-info">
                    <input type="checkbox" class="goods-checkbox" value="${escapeHTML(item.name)}">
                    <div class="goods-name-clickable" data-name="${escapeHTML(item.name)}" data-category="${escapeHTML(item.category || '')}">
                        <span class="item-title">${escapeHTML(item.name)}</span>
                        <span class="item-category-tag">📁 ${categoryDisplay}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-cart ${item.needBuy ? 'active' : ''}" data-id="${escapeHTML(itemId)}" data-name="${escapeHTML(item.name)}">🛒</button>
                    <button class="btn-quick-add btn-qty" data-name="${escapeHTML(item.name)}" title="この品名で追加登録">＋</button>
                </div>
            </div>

            <!-- 下段：銘柄タグ ＆ 数量操作 -->
            <div class="card-row-bottom">
                <div class="card-sub-info">
                    ${subNames.length > 0 
                        ? subNames.map(sub => `<span class="sub-tag">${escapeHTML(sub)}</span>`).join('') 
                        : '<span class="text-light">銘柄なし</span>'}
                </div>
                <div class="card-qty-control">
                    <button class="btn-qty-change btn-qty" data-id="${escapeHTML(itemId)}" data-name="${escapeHTML(item.name)}" data-delta="-1">-</button>
                    <span class="qty-num">${quantity}</span>
                    <button class="btn-qty-change btn-qty" data-id="${escapeHTML(itemId)}" data-name="${escapeHTML(item.name)}" data-delta="1">+</button>
                </div>
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
        <div class="form-group autocomplete-wrapper">
            <label for="input-goods-name">品名</label>
            <input type="text" id="input-goods-name" placeholder="例: シャンプー" autocomplete="off">
            <!-- カスタムサジェスト表示用の枠 -->
            <div id="goods-autocomplete-list" class="autocomplete-list" style="display: none;"></div>
        </div>
        <div class="form-group">
            <label>数量</label>
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

    // === 初期化時の呼び出し例 ===
    // 画面描画後に実行します
    const goodsInput = container.querySelector('#input-goods-name');
    const goodsList = container.querySelector('#goods-autocomplete-list');
    setupAutocomplete(goodsInput, goodsList, historyNames);

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

// サジェスト制御のセットアップ関数
function setupAutocomplete(inputEl, listEl, historyArray) {
    if (!inputEl || !listEl) return;

    // リストの描画
    function renderList(filterText = '') {
        const query = filterText.trim().toLowerCase();
        // 入力文字にヒットする履歴を抽出（空文字の場合は全履歴表示）
        const matches = historyArray.filter(item => 
            !query || item.toLowerCase().includes(query)
        );

        if (matches.length === 0) {
            listEl.style.display = 'none';
            return;
        }

        listEl.innerHTML = matches.map(item => `
            <div class="autocomplete-item" data-value="${escapeHTML(item)}">
                ${escapeHTML(item)}
            </div>
        `).join('');
        listEl.style.display = 'block';
    }

    // フォーカス時および入力時にリストを表示
    inputEl.addEventListener('focus', () => renderList(inputEl.value));
    inputEl.addEventListener('input', () => renderList(inputEl.value));

    // リスト項目タップ時の処理（iPhone対策として mousedown を使用）
    listEl.addEventListener('mousedown', (e) => {
        const itemEl = e.target.closest('.autocomplete-item');
        if (itemEl) {
            inputEl.value = itemEl.dataset.value;
            listEl.style.display = 'none';
        }
    });

    // 枠外をタップしたらリストを閉じる
    document.addEventListener('click', (e) => {
        if (!inputEl.contains(e.target) && !listEl.contains(e.target)) {
            listEl.style.display = 'none';
        }
    });
}
