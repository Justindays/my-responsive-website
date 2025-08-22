document.addEventListener('DOMContentLoaded', () => {
    // 硬編碼的帳號密碼
    const USERNAME = "user"; 
    const PASSWORD = "1128";

    // 獲取 DOM 元素
    const loginSection = document.getElementById('loginSection');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const authMessage = document.getElementById('authMessage');
    const appSection = document.getElementById('appSection');
    const loggedInUsernameSpan = document.getElementById('loggedInUsername');
    const logoutBtn = document.getElementById('logoutBtn');
    const childNameInput = document.getElementById('childNameInput');
    const addChildBtn = document.getElementById('addChildBtn');
    const childrenList = document.getElementById('childrenList');
    const noChildrenMessage = document.getElementById('noChildrenMessage');

    const db = window.db;
    const collection = window.collection;
    const addDoc = window.addDoc;
    const getDocs = window.getDocs;
    const doc = window.doc;
    const deleteDoc = window.deleteDoc;
    const onSnapshot = window.onSnapshot;
    const query = window.query;
    const orderBy = window.orderBy;
    const writeBatch = window.writeBatch;

    const childrenColRef = collection(db, 'children');

    // 檢查登入狀態
    function checkLoginStatus() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            loginSection.style.display = 'none';
            appSection.style.display = 'block';
            loggedInUsernameSpan.textContent = localStorage.getItem('username');
            listenToChildren();
        } else {
            loginSection.style.display = 'block';
            appSection.style.display = 'none';
        }
    }

    // 登入功能
    loginBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (username === USERNAME && password === PASSWORD) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', username);
            authMessage.textContent = '';
            checkLoginStatus();
        } else {
            authMessage.textContent = '使用者名稱或密碼錯誤。';
        }
    });

    // 登出功能
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        checkLoginStatus();
        childrenList.innerHTML = '';
    });

    // 監聽小孩列表的即時更新
    function listenToChildren() {
        const qChildren = query(childrenColRef, orderBy('createdAt', 'asc'));
        onSnapshot(qChildren, (snapshot) => {
            const children = [];
            if (snapshot.empty) {
                noChildrenMessage.style.display = 'block';
                childrenList.innerHTML = '';
            } else {
                noChildrenMessage.style.display = 'none';
            }
            snapshot.docs.forEach(doc => {
                children.push({ id: doc.id, ...doc.data() });
            });
            renderChildren(children);
        });
    }

    // 渲染小孩列表
    function renderChildren(childrenData) {
        childrenList.innerHTML = '';
        childrenData.forEach(child => {
            const listItem = document.createElement('li');
            listItem.className = 'child-item';
            listItem.dataset.id = child.id;
            listItem.innerHTML = `
                <span class="child-name">${child.name}</span>
                <span class="child-score">點數: ${child.score}</span>
                <button class="delete-child-btn">刪除</button>
            `;
            childrenList.appendChild(listItem);
        });
        addEventListenersToChildItems();
    }

    // 新增小孩功能
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
            }
        }
    });

    // 監聽小孩列表點擊事件 (使用事件委託)
    function addEventListenersToChildItems() {
        childrenList.onclick = async (event) => {
            const target = event.target;
            const listItem = target.closest('.child-item');
            if (listItem) {
                const childId = listItem.dataset.id;
                
                if (target.classList.contains('delete-child-btn')) {
                    if (confirm(`確定要刪除 ${listItem.querySelector('.child-name').textContent} 嗎？`)) {
                        try {
                            const childDocToDeleteRef = doc(childrenColRef, childId);
                            const transactionsColRef = collection(childDocToDeleteRef, 'transactions');
                            const transactionsSnapshot = await getDocs(transactionsColRef);

                            const batch = writeBatch(db);
                            transactionsSnapshot.docs.forEach(transactionDoc => {
                                batch.delete(doc(transactionsColRef, transactionDoc.id));
                            });

                            await batch.commit();
                            await deleteDoc(childDocToDeleteRef);
                        } catch (e) {
                            console.error("Error removing child and transactions: ", e);
                        }
                    }
                } else {
                    window.location.href = `child_detail.html?id=${childId}`;
                }
            }
        };
    }
    
    checkLoginStatus();
});