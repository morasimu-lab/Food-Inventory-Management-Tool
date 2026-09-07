// migrator.js

// ⚠️ ご自身のGASのウェブアプリのURLに書き換えてください
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwSSRV9DfS1m2-UyTSqaTlaHXZzlC71vMKTiaI8MyhQ2h38qWUQkSVOXU5cCWjNzoCUwg/exec';

// ローカルストレージから直接同期的にデータを読み出すヘルパー
function loadLocal(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

async function saveCloud(sheetName, items) {
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ sheet: sheetName, items: items })
        });
        const json = await res.json();
        return json.status === 'success';
    } catch (e) {
        console.error(`Network error saving ${sheetName}:`, e);
        return false;
    }
}

// 待機画面を表示するヘルパー関数
function showLoadingOverlay() {
    if (document.getElementById('migration-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'migration-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        font-family: sans-serif;
    `;

    overlay.innerHTML = `
        <div style="background: white; padding: 28px 36px; border-radius: 12px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.3); max-width: 320px; width: 80%;">
            <div class="migration-spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
            <div id="migration-status-text" style="font-weight: bold; font-size: 15px; color: #1f2937;">データを送信中...</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">画面を閉じずにそのままお待ちください</div>
        </div>
        <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    `;

    document.body.appendChild(overlay);
}

// 待機画面のメッセージを更新するヘルパー関数
function updateLoadingMessage(message) {
    const el = document.getElementById('migration-status-text');
    if (el) el.textContent = message;
}

// 待機画面を削除するヘルパー関数
function hideLoadingOverlay() {
    const overlay = document.getElementById('migration-overlay');
    if (overlay) overlay.remove();
}

export async function migrateLocalDataToCloud() {
    if (!confirm('現在ブラウザのローカルストレージに保存されている全データを、Googleスプレッドシートに一括アップロードしますか？')) {
        return;
    }

    let successCount = 0;

    // 移行対象の定義マップ (localStorageのキー : スプレッドシートのシート名)
    const targets = [
        { key: 'app_food_list', sheet: 'foods' },
        { key: 'app_food_categories', sheet: 'food_categories' },
        { key: 'app_food_history', sheet: 'food_history' },
        { key: 'app_goods_list', sheet: 'goods' },
        { key: 'app_goods_categories', sheet: 'goods_categories' },
        { key: 'app_goods_history', sheet: 'goods_history' }
    ];

    // 待機画面の表示
    showLoadingOverlay();

    try {
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            
            // 進捗メッセージの更新（例: 送信中 (1/6): foods）
            updateLoadingMessage(`送信中 (${i + 1}/${targets.length}): ${target.sheet}`);

            const data = loadLocal(target.key);
            // 配列またはオブジェクトなどのデータが存在する場合に送信
            if (data !== null && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
                const res = await saveCloud(target.sheet, data);
                if (res) {
                    successCount++;
                } else {
                    console.warn(`Failed to migrate: ${target.key} -> ${target.sheet}`);
                }
            }

            await new Promise(r => setTimeout(r, 500));
        }
    } finally {
        // 成功・失敗に関わらず必ず待機画面を削除
        hideLoadingOverlay();
    }

    if (successCount > 0) {
        alert(`ローカルデータのスプレッドシートへの移行が完了しました！（成功件数: ${successCount}）\n移行が確認できたら、この移行プログラムとボタンのコードは削除して大丈夫です。`);
    } else {
        alert('移行するデータが見つからなかったか、すべての通信に失敗しました。');
    }
}
