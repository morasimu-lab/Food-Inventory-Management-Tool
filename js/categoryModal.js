import { Storage, escapeHTML } from './storage.js';
import { renderFoodTab } from './food.js';
import { renderGoodsTab } from './goods.js';

// カテゴリの順序変更処理
export function moveCategory(type, index, dir, container) {
    const key = type === 'food' ? 'FOOD_CATEGORIES' : 'GOODS_CATEGORIES';
    let categories = Storage.load(key) || [];
    
    const targetIndex = dir === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    // 配列の要素を入れ替え
    const temp = categories[index];
    categories[index] = categories[targetIndex];
    categories[targetIndex] = temp;

    Storage.save(key, categories);
    
    if (type === 'food') {
        renderFoodTab(container);
    } else {
        renderGoodsTab(container);
    }
}

// カテゴリ追加・削除の管理モーダル
export function openCategoryManageModal(type, container) {
    const key = type === 'food' ? 'FOOD_CATEGORIES' : 'GOODS_CATEGORIES';
    let categories = Storage.load(key) || [];

    const modalBg = document.createElement('div');
    modalBg.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;";
    
    const renderModalContent = () => {
        modalBg.innerHTML = `
            <div style="background:white; padding:20px; border-radius:12px; width:90%; max-width:400px; max-height:80vh; overflow-y:auto;">
                <h3 style="margin-bottom:16px;">カテゴリの管理</h3>
                <div style="display:flex; gap:8px; margin-bottom:16px;">
                    <input type="text" id="new-cat-name" placeholder="新しいカテゴリ名" style="flex:1; padding:8px; border:1px solid #d1d5db; border-radius:6px;">
                    <button class="btn-blue" id="btn-add-cat" style="padding:8px 16px;">追加</button>
                </div>
                <div style="margin-bottom:20px;">
                    ${categories.length === 0 ? '<p style="font-size:13px; color:#6b7280;">登録されたカテゴリはありません</p>' : ''}
                    ${categories.map((cat, idx) => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f3f4f6;">
                            <span>${escapeHTML(cat)}</span>
                            <button class="btn-delete-cat-item" data-index="${idx}" style="background:transparent; border:none; color:var(--red); cursor:pointer; font-size:16px;">🗑</button>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-outline" style="width:100%;" id="modal-close">閉じる</button>
            </div>
        `;

        modalBg.querySelector('#modal-close').onclick = () => {
            document.body.removeChild(modalBg);
            if (type === 'food') renderFoodTab(container);
            else renderGoodsTab(container);
        };

        modalBg.querySelector('#btn-add-cat').onclick = () => {
            const input = modalBg.querySelector('#new-cat-name');
            const name = input.value.trim();
            if (!name) return;
            if (categories.includes(name)) {
                alert('すでに存在するカテゴリ名です。');
                return;
            }
            categories.push(name);
            Storage.save(key, categories);
            input.value = '';
            renderModalContent();
        };

        modalBg.querySelectorAll('.btn-delete-cat-item').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                const deletedCat = categories[idx];
                if (confirm(`カテゴリ「${deletedCat}」を削除しますか？（所属していた品目は自動で未分類になります）`)) {
                    categories.splice(idx, 1);
                    Storage.save(key, categories);

                    // 該当カテゴリに属していたアイテムのカテゴリをnullにクリア
                    const itemKey = type === 'food' ? 'FOOD_LIST' : 'GOODS_LIST';
                    let items = Storage.load(itemKey) || [];
                    items.forEach(i => {
                        if (i.category === deletedCat) i.category = null;
                    });
                    Storage.save(itemKey, items);

                    renderModalContent();
                }
            };
        });
    };

    document.body.appendChild(modalBg);
    renderModalContent();
}

// アイテムのカテゴリ変更
export function openChangeCategoryModal(targetKey, currentCategory, type, container) {
    const key = type === 'food' ? 'FOOD_CATEGORIES' : 'GOODS_CATEGORIES';
    const listKey = type === 'food' ? 'FOOD_LIST' : 'GOODS_LIST';
    const categories = Storage.load(key) || [];

    const modalBg = document.createElement('div');
    modalBg.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;";
    
    modalBg.innerHTML = `
        <div style="background:white; padding:20px; border-radius:12px; width:90%; max-width:320px;">
            <h3 style="margin-bottom:16px; font-size:16px;">カテゴリを変更</h3>
            <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px; max-height:50vh; overflow-y:auto;">
                <button class="btn-outline cat-select-option" data-cat="" style="justify-content:flex-start; ${!currentCategory ? 'border-color:var(--blue); color:var(--blue);' : ''}">（未設定）</button>
                ${categories.map(c => `
                    <button class="btn-outline cat-select-option" data-cat="${escapeHTML(c)}" style="justify-content:flex-start; ${currentCategory === c ? 'border-color:var(--blue); color:var(--blue); font-weight:bold;' : ''}">${escapeHTML(c)}</button>
                `).join('')}
            </div>
            <button class="btn-outline" style="width:100%;" id="modal-cancel">キャンセル</button>
        </div>
    `;

    document.body.appendChild(modalBg);

    modalBg.querySelector('#modal-cancel').onclick = () => document.body.removeChild(modalBg);

    modalBg.querySelectorAll('.cat-select-option').forEach(btn => {
        btn.onclick = () => {
            const newCat = btn.getAttribute('data-cat') || null;
            
            let items = Storage.load(listKey) || [];
            // 食品は id、日用品は name で判定
            let item = items.find(i => (type === 'food' ? i.id === targetKey : i.name === targetKey));
            if (item) {
                item.category = newCat;
                Storage.save(listKey, items);
            }

            document.body.removeChild(modalBg);
            
            if (type === 'food') renderFoodTab(container);
            else renderGoodsTab(container);
        };
    });
}