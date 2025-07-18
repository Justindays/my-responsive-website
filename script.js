document.addEventListener('DOMContentLoaded', async () => {
    const childNameInput = document.getElementById('childNameInput');
    const addChildBtn = document.getElementById('addChildBtn');
    const childrenList = document.getElementById('childrenList');

    const db = window.db;
    const collection = window.collection;
    const addDoc = window.addDoc;
    const doc = window.doc; // 用於刪除
    const deleteDoc = window.deleteDoc; // 用於刪除
    const onSnapshot = window.onSnapshot;
    const query = window.query;
    const orderBy = window.orderBy;
    const writeBatch = window.writeBatch; // 用於批量刪除子集合

    const childrenColRef = collection(db, 'children');

    // 渲染小孩列表 (使用即時監聽)
    const q = query(childrenColRef, orderBy('createdAt', 'asc'));
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
        renderChildren(children);
    }, (error) => {
        console.error("Error listening to Firestore: ", error);
        alert("載入小孩資料失敗！請檢查網路連線或Firebase設定。");
    });

    // 實際渲染列表的函數
    function renderChildren(childrenData) {
        childrenList.innerHTML = '';

        childrenData.forEach((child) => {
            const listItem = document.createElement('li');
            listItem.className = 'child-item';
            listItem.dataset.id = child.id;

            listItem.innerHTML = `
                <span class="child-name">${child.name}</span>
                <span class="child-score">點數: ${child.score}</span>
                <button class="delete-child-btn" data-id="${child.id}">刪除</button>
            `;
            childrenList.appendChild(listItem);
        });

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
                childNameInput.value = '';
            } catch (e) {
                console.error("Error adding document: ", e);
                alert("新增小孩失敗！請檢查控制台或Firebase連線。");
            }
        } else {
            alert('請輸入小孩的名字！');
        }
    });

    // 為小孩列表項目添加點擊事件，處理導航和刪除
    function addEventListenersToChildItems() {
        childrenList.onclick = async (event) => {
            const target = event.target;
            const listItem = target.closest('.child-item');

            if (!listItem) return;

            const childId = listItem.dataset.id;
            const childName = listItem.querySelector('.child-name').textContent;

            if (target.classList.contains('delete-child-btn')) {
                // 刪除小孩功能
                if (confirm(`確定要刪除小孩 ${childName} 及其所有點數紀錄嗎？這是一個不可逆的操作！`)) {
                    try {
                        const childDocToDeleteRef = doc(db, 'children', childId);
                        const transactionsColToDeleteRef = collection(childDocToDeleteRef, 'transactions');

                        // 由於 Firestore 不會自動刪除子集合，我們需要手動批量刪除其下的所有文檔
                        const batch = writeBatch(db);
                        const transactionDocs = await getDocs(transactionsColToDeleteRef);
                        transactionDocs.forEach(tDoc => {
                            batch.delete(tDoc.ref);
                        });
                        await batch.commit(); // 提交批量刪除

                        // 最後刪除小孩文件本身
                        await deleteDoc(childDocToDeleteRef);
                        alert(`${childName} 已成功刪除。`);
                    } catch (e) {
                        console.error("Error deleting child: ", e);
                        alert(`刪除 ${childName} 失敗！請檢查控制台。`);
                    }
                }
            } else {
                // 導航到 child_detail.html
                window.location.href = `child_detail.html?id=${childId}`;
            }
        };
    }
});