document.addEventListener('DOMContentLoaded', async () => {
    const childDetailName = document.getElementById('childDetailName');
    const currentScoreSpan = document.getElementById('currentScore');
    const pointsInput = document.getElementById('pointsInput');
    const reasonInput = document.getElementById('reasonInput');
    const adjusterSelect = document.getElementById('adjusterSelect'); // 新增
    const newAdjusterInput = document.getElementById('newAdjusterInput'); // 新增
    const addAdjusterBtn = document.getElementById('addAdjusterBtn'); // 新增
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
    const getDocs = window.getDocs;
    const doc = window.doc;
    const updateDoc = window.updateDoc;
    const deleteDoc = window.deleteDoc;
    const onSnapshot = window.onSnapshot;
    const query = window.query;
    const orderBy = window.orderBy;
    const serverTimestamp = window.serverTimestamp;

    let childDocRef; // 用於儲存小孩文件的引用
    const adjustersColRef = collection(db, 'adjusters'); // 調整人集合的引用

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

    // 監聽調整人列表的變更
    onSnapshot(adjustersColRef, (snapshot) => {
        adjusterSelect.innerHTML = '<option value="">選擇調整人</option>'; // 清空並添加預設選項
        snapshot.docs.forEach(d => {
            const option = document.createElement('option');
            option.value = d.data().name;
            option.textContent = d.data().name;
            adjusterSelect.appendChild(option);
        });
    }, (error) => {
        console.error("Error listening to adjusters: ", error);
    });

    // 渲染交易紀錄的函數
    function renderTransactions(transactionsData) {
        transactionHistoryList.innerHTML = '';

        transactionsData.forEach((transaction) => {
            const listItem = document.createElement('li');
            listItem.className = 'transaction-item';
            listItem.dataset.id = transaction.id; // 儲存交易紀錄 ID

            const date = transaction.timestamp ? transaction.timestamp.toDate() : new Date();
            const formattedDate = date.toLocaleString('zh-TW', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            });

            const typeClass = transaction.points > 0 ? 'positive' : 'negative';

            listItem.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-date">[${formattedDate}]</span>
                    <span class="transaction-reason">${transaction.reason || '無原因'}</span>
                    <span class="transaction-points ${typeClass}">${transaction.points > 0 ? '+' : ''}${transaction.points} 點</span>
                    <span class="transaction-adjuster"> (經手人: ${transaction.adjuster || '未知'})</span>
                </div>
                <button class="delete-transaction-btn">刪除</button>
            `;
            transactionHistoryList.appendChild(listItem);
        });
        addEventListenersToTransactionButtons(); // 為新生成的刪除按鈕添加事件
    }

    // 新增調整人功能
    addAdjusterBtn.addEventListener('click', async () => {
        const newAdjusterName = newAdjusterInput.value.trim();
        if (newAdjusterName) {
            try {
                // 檢查是否已存在
                const q = query(adjustersColRef, orderBy('name')); // 這裡簡單排序，實際可以加 where 條件
                const existingAdjusters = await getDocs(q);
                const exists = existingAdjusters.docs.some(d => d.data().name === newAdjusterName);

                if (!exists) {
                    await addDoc(adjustersColRef, { name: newAdjusterName });
                    newAdjusterInput.value = '';
                    alert(`調整人 "${newAdjusterName}" 已新增！`);
                } else {
                    alert(`調整人 "${newAdjusterName}" 已存在。`);
                }
            } catch (e) {
                console.error("Error adding adjuster: ", e);
                alert("新增調整人失敗！");
            }
        } else {
            alert('請輸入調整人的名字！');
        }
    });

    // 確認調整點數功能
    confirmAdjustmentBtn.addEventListener('click', async () => {
        const points = parseInt(pointsInput.value);
        const reason = reasonInput.value.trim();
        const adjuster = adjusterSelect.value; // 從下拉選單獲取調整人

        if (isNaN(points)) {
            alert('請輸入有效的點數！');
            return;
        }

        if (!reason) {
            alert('請輸入點數調整的原因！');
            return;
        }

        if (!adjuster) { // 檢查是否選擇了調整人
            alert('請選擇調整人！');
            return;
        }

        try {
            const currentScore = parseInt(currentScoreSpan.textContent);
            await updateDoc(childDocRef, {
                score: currentScore + points
            });

            await addDoc(transactionsColRef, {
                points: points,
                reason: reason,
                adjuster: adjuster, // 儲存調整人
                timestamp: serverTimestamp()
            });

            pointsInput.value = '';
            reasonInput.value = '';
            // adjusterSelect.value = ''; // 不清空，讓使用者可以連續使用同一個人
            alert('點數調整成功！');
        } catch (e) {
            console.error("Error adjusting points: ", e);
            alert("點數調整失敗！請檢查控制台或網路連線。");
        }
    });

    // 為點數紀錄的刪除按鈕添加事件 (使用事件委託)
    function addEventListenersToTransactionButtons() {
        transactionHistoryList.onclick = async (event) => {
            const target = event.target;
            if (target.classList.contains('delete-transaction-btn')) {
                const listItem = target.closest('.transaction-item');
                if (listItem) {
                    const transactionId = listItem.dataset.id;
                    const reasonText = listItem.querySelector('.transaction-reason').textContent;

                    if (confirm(`確定要刪除這筆點數紀錄嗎？原因: "${reasonText}"`)) {
                        try {
                            const transactionDocToDeleteRef = doc(transactionsColRef, transactionId);
                            await deleteDoc(transactionDocToDeleteRef);
                            alert('點數紀錄已刪除。請注意，刪除紀錄不會自動回溯總點數。');
                            // 可以考慮在這裡彈出一個提示，提醒使用者手動調整總點數。
                            // 或者，更複雜的實現會重新計算總點數，但這會增加複雜性。
                            // 目前保持簡單，只刪除記錄，不回溯總點數。
                        } catch (e) {
                            console.error("Error deleting transaction: ", e);
                            alert("刪除點數紀錄失敗！");
                        }
                    }
                }
            }
        };
    }

    // 返回首頁按鈕
    backToHomeBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});