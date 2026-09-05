import { Storage, escapeHTML } from './storage.js';
import { moveCategory, openCategoryManageModal, openChangeCategoryModal } from './categoryModal.js';

let currentSubView = 'list';

// パターンB用：現在開いているカテゴリ名を一時的に保持する変数
let openedCategoriesCache = [];

export function renderFoodTab(container) {
    if (currentSubView === 'list') {
        renderFoodList(container);
    } else {
        renderFoodRegister(container);
    }
}

function renderFoodList(container) {
    // --- 1. 再描画の直前：現在開いているアコーディオンを調べる ---
    const currentlyOpened = [];
    container.querySelectorAll('.category-content').forEach(content => {
        if (content.style.display === 'block') {
            const catId = content.id.replace('cat-content-', '');
            currentlyOpened.push(catId);
        }
    });
    // 初回（キャッシュが空）のときは、ユーザーが意図的に操作する前なのでキャッシュ保持の対象外にする等はお好みですが、
    // 基本は「直前の状態」を引き継ぐために保持します
    if (currentlyOpened.length > 0) {
        openedCategoriesCache = currentlyOpened;
    }

    const items = Storage.load('FOOD_LIST').sort((a, b) => {
        const expA = a.expDate || '9999/99/99', expB = b.expDate || '9999/99/99';
        if (expA !== expB) return expA.localeCompare(expB);
        if (a.regDate !== b.regDate) return a.regDate.localeCompare(b.regDate);
        return a.name.localeCompare(b.name);
    });

    const rawCategories = Storage.load('FOOD_CATEGORIES');
    const categories = Array.isArray(rawCategories) ? rawCategories : [];

    const unclassifiedItems = items.filter(i => !i.category || !categories.includes(i.category));

    container.innerHTML = `
        <div class="action-buttons">
            <button class="btn-blue" id="btn-goto-food-reg">＋ 登録</button>
            <button class="btn-red" id="btn-delete-food">🗑 選択削除</button>
            <button class="btn-outline" id="btn-manage-categories" style="width:auto; padding:8px 12px;">📁 カテゴリ管理</button>
        </div>
        <div>
            ${items.length === 0 ? '<div class="empty-message">登録されている食品はありません</div>' : ''}

            <!-- 未分類セクション -->
            ${unclassifiedItems.length > 0 ? `
                <div class="category-section" style="margin-bottom:16px; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
                    <div class="category-header" data-cat="unclassified" style="background:#f9fafb; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold;">
                        <span>未分類 (${unclassifiedItems.length})</span>
                        <span class="accordion-arrow">▶</span>
                    </div>
                    <div class="category-content" id="cat-content-unclassified" style="display:none;">
                        <div class="list-header">
                            <div class="col-name" style="flex:2.2;">品名</div>
                            <div class="col-sub" style="flex:1.6; text-align:center;">賞味期限</div>
                            <div class="col-sub" style="flex:1.1; text-align:center;">登録日</div>
                            <div class="col-cart">買</div>
                            <div class="col-check">消</div>
                        </div>
                        ${unclassifiedItems.map(item => renderFoodRow(item)).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- ユーザー作成カテゴリセクション -->
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
                                <div class="col-name" style="flex:2.2;">品名</div>
                                <div class="col-sub" style="flex:1.6; text-align:center;">賞味期限</div>
                                <div class="col-sub" style="flex:1.1; text-align:center;">登録日</div>
                                <div class="col-cart">買</div>
                                <div class="col-check">消</div>
                            </div>
                            ${catItems.length === 0 ? '<div class="empty-message" style="padding:12px; font-size:13px; color:#6b7280;">カテゴリに登録された商品がありません。</div>' : catItems.map(item => renderFoodRow(item)).join('')}
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

    container.querySelector('#btn-goto-food-reg').onclick = () => { currentSubView = 'register'; renderFoodTab(container); };
    container.querySelector('#btn-delete-food').onclick = deleteSelectedFood;
    container.querySelector('#btn-manage-categories').onclick = () => openCategoryManageModal('food', container);

    container.querySelectorAll('.btn-cat-move').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            const dir = btn.getAttribute('data-dir');
            moveCategory('food', index, dir, container);
        };
    });

    // アコーディオン開閉の切り替え
    container.querySelectorAll('.category-header').forEach(header => {
        header.onclick = (e) => {
            if (e.target.closest('button') || e.target.closest('input')) return; 
            const catName = header.getAttribute('data-cat');
            const content = container.querySelector(`#cat-content-${CSS.escape(catName)}`);
            const arrow = header.querySelector('.accordion-arrow');
            if (content) {
                const isClosed = content.style.display === 'none';
                content.style.display = isClosed ? 'block' : 'none';
                if (arrow) {
                    arrow.textContent = isClosed ? '▼' : '▶';
                }

                // 手動で開閉した状態をキャッシュ（openedCategoriesCache）にも反映・同期させる
                if (isClosed) {
                    if (!openedCategoriesCache.includes(catName)) openedCategoriesCache.push(catName);
                } else {
                    openedCategoriesCache = openedCategoriesCache.filter(id => id !== catName);
                }
            }
        };
    });

    container.querySelectorAll('.food-name-clickable').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            const id = el.getAttribute('data-id');
            const currentCat = el.getAttribute('data-category');
            openChangeCategoryModal(id, currentCat, 'food', container);
        };
    });

    container.querySelectorAll('.btn-cart').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const buttonEl = e.target.closest('button');
            if (!buttonEl) return;
            toggleFoodFoodCartHelper(buttonEl.getAttribute('data-id'), container);
        };
    });

    container.querySelectorAll('.food-checkbox').forEach(cb => {
        cb.onclick = (e) => {
            e.stopPropagation();
        };
    });
}

function renderFoodRow(item) {
    const categoryDisplay = item.category ? escapeHTML(item.category) : '未設定';
    
    let alertClass = '';
    if (item.expDate) {
        const expTime = new Date(item.expDate.replace(/\//g, '-')).setHours(0, 0, 0, 0);
        const today = new Date().setHours(0, 0, 0, 0);
        const oneDay = 24 * 60 * 60 * 1000;
        const diffDays = (expTime - today) / oneDay;

        if (diffDays < 0) {
            alertClass = 'expired';
        } else if (diffDays < 2) {
            alertClass = 'warning';
        }
    }

    return `
        <div class="list-item ${alertClass}">
            <div class="col-name food-name-clickable" data-id="${item.id}" data-category="${escapeHTML(item.category || '')}" style="flex:2.2; cursor:pointer;" title="クリックしてカテゴリ変更">
                <div style="font-weight:bold; color:var(--blue);">${escapeHTML(item.name)}</div>
                <div style="font-size:10px; color:#6b7280;">📁 ${categoryDisplay}</div>
            </div>
            <div class="col-sub" style="flex:1.6; text-align:center;">${item.expDate || 'なし'}</div>
            <div class="col-sub" style="flex:1.1; text-align:center;">${item.regDate ? item.regDate.substring(5) : ''}</div>
            <div class="col-cart">
                <button class="btn-cart ${item.needBuy ? 'active' : ''}" data-id="${item.id}">🛒</button>
            </div>
            <div class="col-check"><input type="checkbox" class="food-checkbox" value="${item.id}"></div>
        </div>
    `;
}

function renderFoodRegister(container) {
    const history = Storage.load('FOOD_HISTORY').sort();
    const rawCategories = Storage.load('FOOD_CATEGORIES');
    const categories = Array.isArray(rawCategories) ? rawCategories : [];

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
        <div class="form-group">
            <label>カテゴリ</label>
            <select id="input-food-cat" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:6px; background:white;">
                <option value="">（未設定）</option>
                ${categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="input-food-nohistory" style="width:18px; height:18px;">
            <label for="input-food-nohistory" style="margin-bottom:0; font-weight:normal; cursor:pointer;">履歴（サジェスト）に残さない</label>
        </div>
        <button class="btn-blue" style="width: 100%; padding: 16px;" id="btn-submit-food">登録する</button>
    `;

    const nameInput = container.querySelector('#input-food-name');
    nameInput.addEventListener('input', (e) => {
        if (/[\r\n]/.test(e.target.value)) {
            e.target.value = e.target.value.replace(/[\r\n]+/g, '');
        }
    });

    container.querySelector('#btn-back-food').onclick = () => { currentSubView = 'list'; renderFoodTab(container); };
    container.querySelector('#btn-submit-food').onclick = () => {
        const name = document.getElementById('input-food-name').value.trim();
        const expRaw = document.getElementById('input-food-exp').value;
        const category = document.getElementById('input-food-cat').value;
        const noHistory = document.getElementById('input-food-nohistory').checked;
        if (!name) return alert('品名を入力してください。');

        let items = Storage.load('FOOD_LIST');
        items.forEach(i => {
            if (i.name === name) {
                i.needBuy = false;
                if (category) i.category = category;
            }
        });
        items.push({
            id: Date.now().toString(), name,
            expDate: expRaw ? expRaw.replace(/-/g, '/') : '',
            regDate: new Date().toLocaleDateString('ja-JP', {year:'numeric', month:'2-digit', day:'2-digit'}).replace(/-/g, '/'),
            category: category || null,
            needBuy: false
        });
        Storage.save('FOOD_LIST', items);

        if (!noHistory) {
            let history = Storage.load('FOOD_HISTORY');
            if (!history.includes(name)) {
                history.push(name);
                Storage.save('FOOD_HISTORY', history);
            }
        }

        if (confirm('登録しました。続けて商品を登録しますか？')) {
            document.getElementById('input-food-name').value = '';
            document.getElementById('input-food-exp').value = '';
            document.getElementById('input-food-nohistory').checked = false;
            document.getElementById('input-food-name').focus();
        } else {
            currentSubView = 'list';
            renderFoodTab(container);
        }
    };
}

function toggleFoodFoodCartHelper(id, container) {
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