// 確保 script.js 在 DOMContentLoaded 事件中執行，並等待 Firebase 初始化
document.addEventListener('DOMContentLoaded', async () => {
    const childNameInput = document.getElementById('childNameInput');
    const addChildBtn = document.getElementById('addChildBtn');
    const childrenList = document.getElementById('childrenList');

    // 確保 Firebase db 實例已準備好 (從 index.html 的 <script type="module"> 傳遞過來)
    const db = window.db;
    const collection = window.collection;
    const addDoc = window.addDoc;
    const onSnapshot = window.onSnapshot;
    const query = window.query;
    const orderBy = window.orderBy;

    // 獲取 Firestore 中小孩點數的集合引用
    const childrenColRef = collection(db, 'children'); // 'children' 是您在 Firestore 中的集合名稱

    // 渲染小孩列表 (使用即時監聽)
    const q = query(childrenColRef, orderBy('createdAt', 'asc')); // 根據創建時間排序
    onSnapshot(q, (snapshot) => {
        const children = [];
        if (snapshot.empty) {
            childrenList.innerHTML = `
                <p style="text-align: center; margin-top: 20px;">
                    目前沒有小孩，請新增一個！
                </p>`;
            return;
        }
        snapshot.docs.forEach(doc => {
            children.push({ id: doc.id, ...doc.data() });
        });
        renderChildren(children); // 傳遞獲取到的數據進行渲染
    }, (error) => {
        console.error("Error listening to Firestore: ", error);
        alert("載入小孩資料失敗！請檢查網路連線或Firebase設定。");
    });

    // 實際渲染列表的函數
    function renderChildren(childrenData) {
        childrenList.innerHTML = ''; // 清空現有列表

        childrenData.forEach((child) => {
            const listItem = document.createElement('li');
            listItem.className = 'child-item';
            listItem.dataset.id = child.id; // 使用 Firestore 的 document ID 作為 data-id 屬性，方便識別

            // 這裡不再有加減點按鈕，點擊整個項目會進入詳細頁面
            listItem.innerHTML = `
                <span class="child-name">${child.name}</span>
                <span class="child-score">點數: ${child.score}</span>
            `;
            childrenList.appendChild(listItem);
        });

        // 為新渲染的小孩項目添加點擊事件監聽器
        addEventListenersToChildItems();
    }

    // 增加小孩功能
    addChildBtn.addEventListener('click', async () => {
        const name = childNameInput.value.trim();
        if (name) {
            try {
                await addDoc(childrenColRef, {
                    name: name,
                    score: 0,
                    createdAt: new Date()
                });
                childNameInput.value = ''; // 清空輸入框
            } catch (e) {
                console.error("Error adding document: ", e);
                alert("新增小孩失敗！請檢查控制台或Firebase連線。");
            }
        } else {
            alert('請輸入小孩的名字！');
        }
    });

    // 為小孩列表項目添加點擊事件，導航到詳細頁面
    function addEventListenersToChildItems() {
        childrenList.onclick = (event) => {
            const target = event.target;
            const listItem = target.closest('.child-item');

            if (listItem) {
                const childId = listItem.dataset.id;
                // 導航到 child_detail.html，並將小孩 ID 作為 URL 參數傳遞
                window.location.href = `child_detail.html?id=${childId}`;
            }
        };
    }
});