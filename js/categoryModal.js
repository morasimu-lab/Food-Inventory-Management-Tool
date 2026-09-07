// categoryModal.js
import { escapeHTML } from './storage.js';
import { appState, updateAppState, renderCurrentTab } from './main.js';

export async function moveCategory(type, index, dir) {
    const catKey = type === 'food' ? 'foodCategories' : 'goodsCategories';
    let categories = [...appState[catKey]];
    
    const targetIndex = dir === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const temp = categories[index];
    categories[index] = categories[targetIndex];
    categories[targetIndex] = temp;

    await updateAppState(catKey, categories);
    renderCurrentTab();
}

export async function openCategoryManageModal(type) {
    const catKey = type === 'food' ? 'foodCategories' : 'goodsCategories';
    const listKey = type === 'food' ? 'foodList' : 'goodsList';

    const modalBg = document.createElement('div');
    modalBg.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;";
    
    const renderModalContent = () => {
        const categories = appState[catKey] || [];

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
            renderCurrentTab();
        };

        modalBg.querySelector('#btn-add-cat').onclick = async () => {
            const input = modalBg.querySelector('#new-cat-name');
            const name = input.value.trim();
            if (!name) return;
            if (categories.includes(name)) return alert('すでに存在するカテゴリ名です。');
            
            const updatedCategories = [...categories, name];
            await updateAppState(catKey, updatedCategories);
            renderModalContent();
        };

        modalBg.querySelectorAll('.btn-delete-cat-item').forEach(btn => {
            btn.onclick = async () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                const deletedCat = categories[idx];
                if (confirm(`カテゴリ「${deletedCat}」を削除しますか？`)) {
                    // カテゴリリストの更新
                    const updatedCategories = categories.filter((_, i) => i !== idx);
                    await updateAppState(catKey, updatedCategories);

                    // 該当するアイテムのカテゴリ判定解除
                    const updatedItems = appState[listKey].map(item => {
                        if (item.category === deletedCat) {
                            return { ...item, category: null };
                        }
                        return item;
                    });
                    await updateAppState(listKey, updatedItems);

                    renderModalContent();
                }
            };
        });
    };

    document.body.appendChild(modalBg);
    renderModalContent();
}

export async function openChangeCategoryModal(targetKey, currentCategory, type) {
    const catKey = type === 'food' ? 'foodCategories' : 'goodsCategories';
    const listKey = type === 'food' ? 'foodList' : 'goodsList';
    
    const categories = appState[catKey] || [];

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
        btn.onclick = async () => {
            const newCat = btn.getAttribute('data-cat') || null;
            
            const updatedItems = appState[listKey].map(item => {
                const isMatch = type === 'food' ? String(item.id) === String(targetKey) : item.name === targetKey;
                if (isMatch) {
                    return { ...item, category: newCat };
                }
                return item;
            });

            await updateAppState(listKey, updatedItems);

            document.body.removeChild(modalBg);
            renderCurrentTab();
        };
    });
}
