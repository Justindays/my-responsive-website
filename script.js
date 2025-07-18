// 確保 script.js 在 DOMContentLoaded 事件中執行，並等待 Firebase 初始化
document.addEventListener('DOMContentLoaded', async () => {
    const childNameInput = document.getElementById('childNameInput');
    const addChildBtn = document.getElementById('addChildBtn');
    const childrenList = document.getElementById('childrenList');

    // 確保 Firebase db 實例已準備好 (從 index.html 的 <script type="module"> 傳遞過來)
    const db = window.db;
    const collection = window.collection;
    const addDoc = window.addDoc;
    const getDocs = window.getDocs; // 雖然這裡主要用 onSnapshot，但保留以備不時之需
    const doc = window.doc;
    const updateDoc = window.updateDoc;
    const onSnapshot = window.onSnapshot;
    const query = window.query;
    const orderBy = window.orderBy;

    // 獲取 Firestore 中小孩點數的集合引用
    const childrenColRef = collection(db, 'children'); // 'children' 是您在 Firestore 中的集合名稱

    // 渲染小孩列表 (使用即時監聽)
    // onSnapshot 會在資料庫有任何變更時自動觸發
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
            // 使用 Firestore 的 document ID 作為 data-id 屬性，方便識別
            listItem.dataset.id = child.id; 

            listItem.innerHTML = `
                <span class="child-name">${child.name}</span>
                <span class="child-score">${child.score}</span>
                <div class="score-buttons">
                    <button class="increase-btn">加點</button>
                    <button class="decrease-btn">減點</button>
                </div>
            `;
            childrenList.appendChild(listItem);
        });

        // 為新渲染的按鈕添加事件監聽器
        addEventListenersToButtons();
    }

    // 增加小孩功能
    addChildBtn.addEventListener('click', async () => {
        const name = childNameInput.value.trim();
        if (name) {
            try {
                // 將小孩資料儲存到 Firestore，同時記錄創建時間用於排序
                await addDoc(childrenColRef, {
                    name: name,
                    score: 0,
                    createdAt: new Date() 
                });
                childNameInput.value = ''; // 清空輸入框
                // onSnapshot 會自動觸發 renderChildren，所以這裡不需要手動調用
            } catch (e) {
                console.error("Error adding document: ", e);
                alert("新增小孩失敗！請檢查控制台或Firebase連線。");
            }
        } else {
            alert('請輸入小孩的名字！');
        }
    });

    // 增減點數功能
    function addEventListenersToButtons() {
        // 使用事件委託來處理按鈕點擊，這樣即使動態新增元素也能監聽到
        // 這種方式比為每個按鈕單獨添加監聽器更高效
        childrenList.onclick = async (event) => {
            const target = event.target;
            const listItem = target.closest('.child-item');

            if (!listItem) return; // 如果點擊的不是小孩項目內的元素，則不做處理

            const childId = listItem.dataset.id; // 獲取小孩的 Firestore document ID
            const scoreSpan = listItem.querySelector('.child-score');
            let currentScore = parseInt(scoreSpan.textContent);

            const childDocRef = doc(db, 'children', childId);

            if (target.classList.contains('increase-btn')) {
                // 加點
                try {
                    await updateDoc(childDocRef, {
                        score: currentScore + 1
                    });
                    // onSnapshot 會自動更新UI
                } catch (e) {
                    console.error("Error increasing score: ", e);
                    alert("增加點數失敗！請檢查控制台。");
                }
            } else if (target.classList.contains('decrease-btn')) {
                // 減點
                if (currentScore > 0) { // 點數不能為負
                    try {
                        await updateDoc(childDocRef, {
                            score: currentScore - 1
                        });
                        // onSnapshot 會自動更新UI
                    } catch (e) {
                        console.error("Error decreasing score: ", e);
                        alert("減少點數失敗！請檢查控制台。");
                    }
                } else {
                    alert('點數不能再減少了！');
                }
            }
        };
    }

    // 初始化渲染，onSnapshot 會在頁面載入時自動處理
});