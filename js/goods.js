import { Storage, escapeHTML } from './storage.js';
import { moveCategory, openCategoryManageModal, openChangeCategoryModal } from './categoryModal.js';

let currentSubView = 'list';
window.resetGoodsSubView = () => { currentSubView = 'list'; };

// パターンB用：現在開いているカテゴリ名を一時的に保持する変数
let openedCategoriesCache = [];

export function renderGoodsTab(container) {
    if (currentSubView === 'list') {
        renderGoodsList(container);
    } else {
        renderGoodsRegister(container);
    }
}

function renderGoodsList(container) {
    // --- 1. 再描画の直前：現在開いているアコーディオンを調べる ---
    const currentlyOpened = [];
    container.querySelectorAll('.category-content').forEach(content => {
        if (content.style.display === 'block') {
            const catId = content.id.replace('cat-content-', '');
            currentlyOpened.push(catId);
        }
    });
    if (currentlyOpened.length > 0) {
        openedCategoriesCache = currentlyOpened;
    }

    const rawHistory = Storage.load('GOODS_HISTORY');
    const historyMap = getNormalizedHistory(rawHistory);
    
    const rawItems = Storage.load('GOODS_LIST');
    const items = Array.isArray(rawItems) ? rawItems : [];

    const rawCategories = Storage.load('GOODS_CATEGORIES');
    const categories = Array.isArray(rawCategories) ? rawCategories : [];

    // 未分類アイテムの抽出
    const unclassifiedItems = items.filter(i => !i.category || !categories.includes(i.category));

    container.innerHTML = `
        <div class="action-buttons">
            <button class="btn-blue" id="btn-goto-goods-reg">＋ 登録</button>
            <button class="btn-red" id="btn-delete-goods">🗑 選択削除</button>
            <button class="btn-outline" id="btn-manage-categories" style="width:auto; padding:8px 12px;">📁 カテゴリ管理</button>
        </div>
        <div>
            ${items.length === 0 ? '<div class="empty-message">在庫に登録されている日用品はありません</div>' : ''}

            <!-- 未分類セクション -->
            ${unclassifiedItems.length > 0 ? `
                <div class="category-section" style="margin-bottom:16px; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
                    <div class="category-header" data-cat="unclassified" style="background:#f9fafb; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold;">
                        <span>未分類 (${unclassifiedItems.length})</span>
                        <span class="accordion-arrow">▶</span>
                    </div>
                    <div class="category-content" id="cat-content-unclassified" style="display:none;">
                        <div class="list-header">
                            <div class="col-name">品名</div>
                            <div class="col-sub">商品名（銘柄等）</div>
                            <div class="col-cart">買</div>
                            <div class="col-check">消</div>
                        </div>
                        ${unclassifiedItems.map(item => renderGoodsRow(item, historyMap)).join('')}
                    </div>
                </div>
            ` : ''}

            ${categories.map((cat, index) => {
                const catItems = items.filter(i => i.category === cat);
                return `
                    <div class="category-section" style="margin-bottom:16px; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
                        <div class="category-header" data-cat="${escapeHTML(cat)}" style="background:#f3f4f6; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                            <span style="font-weight:bold;">${escapeHTML(cat)} (${catItems.length})</span>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <button class="btn-cat-move" data-index="${index}" data-dir="up" ${index === 0 ? 'disabled style="opacity:0.3;"' : ''} style="padding:2px 6px; font-size:12px;">▲</button>
                                <button class="btn-cat-move" data-index="${index}" data-dir="down" ${index === categories.length - 1 ? 'disabled style="opacity:0.3;"' : ''} style="padding:2px 6px; font-size:12px;">▼</button>
                                <span class="accordion-arrow">▶</span>
                            </div>
                        </div>
                        <div class="category-content" id="cat-content-${escapeHTML(cat)}" style="display:none;">
                            <div class="list-header">
                                <div class="col-name">品名</div>
                                <div class="col-sub">商品名（銘柄等）</div>
                                <div class="col-cart">買</div>
                                <div class="col-check">消</div>
                            </div>
                            ${catItems.length === 0 ? '<div class="empty-message" style="padding:12px; font-size:13px; color:#6b7280;">このカテゴリの品はありません</div>' : catItems.map(item => renderGoodsRow(item, historyMap)).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // --- 2. 再描画の直後：キャッシュに基づいて開いていたカテゴリを復元する ---
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

    container.querySelector('#btn-goto-goods-reg').onclick = () => { currentSubView = 'register'; renderGoodsTab(container); };
    container.querySelector('#btn-delete-goods').onclick = deleteSelectedGoods;
    container.querySelector('#btn-manage-categories').onclick = () => openCategoryManageModal('goods', container);

    // カテゴリの並び替えボタン
    container.querySelectorAll('.btn-cat-move').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            const dir = btn.getAttribute('data-dir');
            moveCategory('goods', index, dir, container);
        };
    });

    // アコーディオン開閉の切り替え
    container.querySelectorAll('.category-header').forEach(header => {
        header.onclick = (e) => {
            if (e.target.closest('button')) return; // ボタン押下時は開閉させない
            const catName = header.getAttribute('data-cat');
            const content = container.querySelector(`#cat-content-${CSS.escape(catName)}`);
            const arrow = header.querySelector('.accordion-arrow');
            if (content) {
                const isClosed = content.style.display === 'none';
                content.style.display = isClosed ? 'block' : 'none';
                if (arrow) {
                    arrow.textContent = isClosed ? '▼' : '▶';
                }

                // 手動での開閉状態をキャッシュに反映・同期させる
                if (isClosed) {
                    if (!openedCategoriesCache.includes(catName)) openedCategoriesCache.push(catName);
                } else {
                    openedCategoriesCache = openedCategoriesCache.filter(id => id !== catName);
                }
            }
        };
    });

    container.querySelectorAll('.goods-name-clickable').forEach(el => {
        el.onclick = () => {
            const name = el.getAttribute('data-name');
            const currentCat = el.getAttribute('data-category');
            openChangeCategoryModal(name, currentCat, 'goods', container);
        };
    });

    container.querySelectorAll('.btn-cart').forEach(btn => {
        btn.onclick = (e) => toggleGoodsCart(e.target.getAttribute('data-id'), container);
    });
}

function renderGoodsRow(item, historyMap) {
    const subNames = historyMap[item.name] || [];
    const categoryDisplay = item.category ? escapeHTML(item.category) : '未設定';
    return `
        <div class="list-item">
            <div class="col-name goods-name-clickable" data-name="${escapeHTML(item.name)}" data-category="${escapeHTML(item.category || '')}" style="cursor:pointer;" title="クリックしてカテゴリ変更">
                <div style="font-weight:bold; color:var(--blue);">${escapeHTML(item.name)}</div>
                <div style="font-size:10px; color:#6b7280;">📁 ${categoryDisplay}</div>
            </div>
            <div class="col-sub">
                ${subNames.length > 0 
                    ? subNames.map(sub => `<span style="margin-right:8px; display:inline-block;">${escapeHTML(sub)}</span>`).join('') 
                    : '<span style="color:var(--text-light);">なし</span>'}
            </div>
            <div class="col-cart">
                <button class="btn-cart ${item.needBuy ? 'active' : ''}" data-id="${item.id}">🛒</button>
            </div>
            <div class="col-check"><input type="checkbox" class="goods-checkbox" value="${escapeHTML(item.name)}"></div>
        </div>
    `;
}

function renderGoodsRegister(container) {
    const rawHistory = Storage.load('GOODS_HISTORY');
    const historyMap = getNormalizedHistory(rawHistory);
    const historyNames = Object.keys(historyMap);
    
    const rawCategories = Storage.load('GOODS_CATEGORIES');
    const categories = Array.isArray(rawCategories) ? rawCategories : [];

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
        <div class="form-group">
            <label>カテゴリ</label>
            <select id="input-goods-cat" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px; background:white;">
                <option value="">（未設定）</option>
                ${categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="input-goods-nohistory" style="width:18px; height:18px;">
            <label for="input-goods-nohistory" style="margin-bottom:0; font-weight:normal; cursor:pointer;">履歴（サジェスト）に残さない</label>
        </div>
        <button class="btn-blue" style="width: 100%; padding: 16px;" id="btn-submit-goods">登録する</button>
    `;

    const nameInput = container.querySelector('#input-goods-name');
    const subInput = container.querySelector('#input-goods-sub');

    [nameInput, subInput].forEach(input => {
        if (input) {
            input.addEventListener('input', (e) => {
                if (/[\r\n]/.test(e.target.value)) {
                    e.target.value = e.target.value.replace(/[\r\n]+/g, '');
                }
            });
        }
    });

    container.querySelector('#btn-back-goods').onclick = () => { currentSubView = 'list'; renderGoodsTab(container); };
    container.querySelector('#btn-submit-goods').onclick = () => {
        const name = document.getElementById('input-goods-name').value.trim();
        const subRaw = document.getElementById('input-goods-sub').value.trim();
        const category = document.getElementById('input-goods-cat').value;
        const noHistory = document.getElementById('input-goods-nohistory').checked;
        if (!name) return alert('品名を入力してください。');

        const newSubs = subRaw ? subRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        if (!noHistory) {
            let historyObj = historyMap;
            if (!historyObj[name]) historyObj[name] = [];
            
            newSubs.forEach(sub => {
                if (!historyObj[name].includes(sub)) {
                    historyObj[name].push(sub);
                }
            });

            const newHistoryArray = Object.keys(historyObj).map(n => ({ name: n, subs: historyObj[n] }));
            Storage.save('GOODS_HISTORY', newHistoryArray);
        }

        let rawItems = Storage.load('GOODS_LIST');
        let items = Array.isArray(rawItems) ? rawItems : [];
        let targetItem = items.find(i => i.name === name);
        
        if (targetItem) {
            targetItem.needBuy = false;
            if (category) targetItem.category = category;
        } else {
            items.push({
                id: Date.now().toString(),
                name,
                category: category || null,
                needBuy: false
            });
        }
        Storage.save('GOODS_LIST', items);

        if (confirm('登録しました。続けて商品を登録しますか？')) {
            document.getElementById('input-goods-name').value = '';
            document.getElementById('input-goods-sub').value = '';
            document.getElementById('input-goods-nohistory').checked = false;
            document.getElementById('input-goods-name').focus();
        } else {
            currentSubView = 'list';
            renderGoodsTab(container);
        }
    };
}

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
    
    if (confirm('選択した日用品を在庫リストから削除しますか？')) {
        let rawItems = Storage.load('GOODS_LIST');
        let items = Array.isArray(rawItems) ? rawItems : [];
        Storage.save('GOODS_LIST', items.filter(item => !checked.includes(item.name)));
        
        renderGoodsTab(document.getElementById('tab-goods'));
    }
}