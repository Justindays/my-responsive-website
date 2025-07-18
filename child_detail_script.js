document.addEventListener('DOMContentLoaded', async () => {
    const childDetailName = document.getElementById('childDetailName');
    const currentScoreSpan = document.getElementById('currentScore');
    const pointsInput = document.getElementById('pointsInput');
    const reasonInput = document.getElementById('reasonInput');
    const confirmAdjustmentBtn = document.getElementById('confirmAdjustmentBtn');
    const transactionHistoryList = document.getElementById('transactionHistoryList');
    const noTransactionsMessage = document.getElementById('noTransactionsMessage');
    const backToHomeBtn = document.getElementById('backToHomeBtn');

    // 從 URL 獲取小孩 ID
    const urlParams = new URLSearchParams(window.location.search);
    const childId = urlParams.get('id');

    // 確保 Firebase db 實例已準備好
    const db = window.db;
    const collection = window.collection;
    const addDoc = window.addDoc;
    const doc = window.doc;
    const updateDoc = window.updateDoc;
    const onSnapshot = window.onSnapshot;
    const query = window.query;
    const orderBy = window.orderBy;
    const serverTimestamp = window.serverTimestamp;

    let childDocRef; // 用於儲存小孩文件的引用

    if (!childId) {
        alert('未找到小孩 ID，將返回首頁。');
        window.location.href = 'index.html';
        return;
    }

    childDocRef = doc(db, 'children', childId);
    const transactionsColRef = collection(childDocRef, 'transactions'); // 小孩點數紀錄的子集合

    // 監聽小孩資料的變更 (顯示名字和當前點數)
    onSnapshot(childDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const childData = docSnap.data();
            childDetailName.textContent = childData.name;
            currentScoreSpan.textContent = childData.score;
        } else {
            alert('小孩資料不存在，將返回首頁。');
            window.location.href = 'index.html';
        }
    }, (error) => {
        console.error("Error fetching child data: ", error);
        alert("載入小孩資料失敗！請檢查網路連線。");
        window.location.href = 'index.html'; // 失敗也返回首頁
    });

    // 監聽點數增減紀錄的變更
    const qTransactions = query(transactionsColRef, orderBy('timestamp', 'desc')); // 按時間倒序排列
    onSnapshot(qTransactions, (snapshot) => {
        const transactions = [];
        if (snapshot.empty) {
            noTransactionsMessage.style.display = 'block'; // 顯示沒有紀錄的訊息
            transactionHistoryList.innerHTML = ''; // 清空列表
            return;
        } else {
            noTransactionsMessage.style.display = 'none'; // 隱藏沒有紀錄的訊息
        }

        snapshot.docs.forEach(doc => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        renderTransactions(transactions);
    }, (error) => {
        console.error("Error listening to transactions: ", error);
        // 這裡可以選擇是否彈出錯誤訊息，或者只在控制台顯示
    });

    // 渲染交易紀錄的函數
    function renderTransactions(transactionsData) {
        transactionHistoryList.innerHTML = ''; // 清空現有列表

        transactionsData.forEach((transaction) => {
            const listItem = document.createElement('li');
            listItem.className = 'transaction-item';

            // 格式化時間戳
            const date = transaction.timestamp ? transaction.timestamp.toDate() : new Date(); // 如果沒有時間戳，使用當前時間
            const formattedDate = date.toLocaleString('zh-TW', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false // 使用24小時制
            });

            // 判斷是增加還是減少
            const typeClass = transaction.points > 0 ? 'positive' : 'negative';

            listItem.innerHTML = `
                <span class="transaction-date">[${formattedDate}]</span>
                <span class="transaction-reason">${transaction.reason || '無原因'}</span>
                <span class="transaction-points ${typeClass}">${transaction.points > 0 ? '+' : ''}${transaction.points} 點</span>
            `;
            transactionHistoryList.appendChild(listItem);
        });
    }

    // 確認調整點數功能
    confirmAdjustmentBtn.addEventListener('click', async () => {
        const points = parseInt(pointsInput.value);
        const reason = reasonInput.value.trim();

        if (isNaN(points)) {
            alert('請輸入有效的點數！');
            return;
        }

        if (!reason) {
            alert('請輸入點數調整的原因！');
            return;
        }

        try {
            // 1. 更新小孩的總點數
            // 獲取當前點數 (從 UI 讀取，因為 onSnapshot 會即時更新)
            const currentScore = parseInt(currentScoreSpan.textContent);
            await updateDoc(childDocRef, {
                score: currentScore + points
            });

            // 2. 新增一筆交易紀錄到子集合
            await addDoc(transactionsColRef, {
                points: points,
                reason: reason,
                timestamp: serverTimestamp() // 使用 Firebase 伺服器時間戳，確保時間一致性
            });

            pointsInput.value = ''; // 清空點數輸入框
            reasonInput.value = ''; // 清空原因輸入框
            alert('點數調整成功！');
        } catch (e) {
            console.error("Error adjusting points: ", e);
            alert("點數調整失敗！請檢查控制台或網路連線。");
        }
    });

    // 返回首頁按鈕
    backToHomeBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});