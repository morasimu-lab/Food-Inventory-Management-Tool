import { Storage, escapeHTML } from './storage.js';

export function renderGoodsTab(container) {
    const goodsData = Storage.load('GOODS_LIST'); // { 品目名: [商品名1, 商品名2] }
    const itemNames = Object.keys(goodsData).sort();

    container.innerHTML = `
        <div class="action-buttons">
            <button class="btn-blue" id="btn-add-goods-item">＋ 品目・商品追加</button>
        </div>
        <div style="font-weight: bold; padding: 8px; border-bottom: 2px solid var(--border); font-size: 12px; color: #4b5563;">品目一覧（タップで商品名を確認）</div>
        <div id="goods-list-container">
            ${itemNames.length === 0 ? '<p style="text-align:center; padding:20px;">品目が登録されていません</p>' : ''}
            ${itemNames.map(itemName => {
                const subNames = goodsData[itemName] || [];
                const displaySub = subNames.length > 0 ? subNames.join(', ') : 'なし';
                return `
                    <div class="goods-item" data-item-name="${escapeHTML(itemName)}">
                        <div>
                            <div style="font-weight: bold; font-size: 15px;">${escapeHTML(itemName)}</div>
                            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">商品: ${escapeHTML(displaySub)}</div>
                        </div>
                        <button class="btn-outline" style="padding: 6px 12px; font-size: 12px;">編集・削除</button>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // 新規追加ボタン
    container.querySelector('#btn-add-goods-item').onclick = () => openGoodsModal();

    // 各品目をタップしたときのポップアップ / 編集モーダル
    container.querySelectorAll('.goods-item').forEach(el => {
        el.onclick = () => {
            const itemName = el.getAttribute('data-item-name');
            openGoodsModal(itemName);
        };
    });
}

// ポップアップ（簡易モーダル）で品目と商品名の追加・編集を行う
function openGoodsModal(targetItemName = '') {
    const goodsData = Storage.load('GOODS_LIST');
    const currentSubNames = targetItemName ? (goodsData[targetItemName] || []).join(', ') : '';

    const modalBg = document.createElement('div');
    modalBg.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;";
    
    modalBg.innerHTML = `
        <div style="background:white; padding:20px; border-radius:12px; width:90%; max-width:400px;">
            <h3 style="margin-bottom:16px;">${targetItemName ? '品目の編集・削除' : '日用品・品目の新規登録'}</h3>
            <div class="form-group">
                <label>品目名</label>
                <input type="text" id="modal-item-name" value="${escapeHTML(targetItemName)}" placeholder="例: シャンプー">
            </div>
            <div class="form-group">
                <label>商品名（複数ある場合はカンマ区切り）</label>
                <input type="text" id="modal-sub-names" value="${escapeHTML(currentSubNames)}" placeholder="例: メリット, h&s">
            </div>
            <div style="display:flex; gap:8px; margin-top:20px;">
                <button class="btn-blue" style="flex:1;" id="modal-save">保存</button>
                ${targetItemName ? '<button class="btn-red" style="flex:1;" id="modal-delete">品目ごと削除</button>' : ''}
                <button class="btn-outline" style="flex:1;" id="modal-cancel">キャンセル</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalBg);

    modalBg.querySelector('#modal-cancel').onclick = () => document.body.removeChild(modalBg);
    
    modalBg.querySelector('#modal-save').onclick = () => {
        const newName = document.getElementById('modal-item-name').value.trim();
        const rawSubs = document.getElementById('modal-sub-names').value.trim();
        if (!newName) return alert('品名を入力してください。');

        const subs = rawSubs ? rawSubs.split(',').map(s => s.trim()).filter(Boolean) : [];

        if (targetItemName && targetItemName !== newName) {
            delete goodsData[targetItemName]; // 名前が変わった場合は旧キーを削除
        }
        goodsData[newName] = subs;
        Storage.save('GOODS_LIST', goodsData);

        document.body.removeChild(modalBg);
        renderGoodsTab(document.getElementById('tab-goods'));
    };

    if (targetItemName) {
        modalBg.querySelector('#modal-delete').onclick = () => {
            if (confirm(`「${targetItemName}」を削除しますか？`)) {
                delete goodsData[targetItemName];
                Storage.save('GOODS_LIST', goodsData);
                document.body.removeChild(modalBg);
                renderGoodsTab(document.getElementById('tab-goods'));
            }
        };
    }
}
