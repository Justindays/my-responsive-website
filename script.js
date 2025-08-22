document.addEventListener('DOMContentLoaded', () => {
    // 硬編碼的帳號密碼
    const USERNAME = "user"; 
    const PASSWORD = "1128";

    // 獲取 Firebase 和 Firestore 實例
    const db = window.db;
    const auth = window.auth;
    const collection = window.collection;
    const addDoc = window.addDoc;
    const getDocs = window.getDocs;
    const doc = window.doc;
    const deleteDoc = window.deleteDoc;
    const onSnapshot = window.onSnapshot;
    const query = window.query;
    const orderBy = window.orderBy;
    const writeBatch = window.writeBatch;
    const signInWithEmailAndPassword = window.signInWithEmailAndPassword;
    const signOut = window.signOut;

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
    loginBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (username === USERNAME && password === PASSWORD) {
            authMessage.textContent = '登入中...';
            // 使用一個假的電子郵件來模擬登入
            const dummyEmail = 'dummy-user@example.com';
            try {
                // 嘗試登入一個不存在的假帳號
                await signInWithEmailAndPassword(auth, dummyEmail, 'invalid-password');
            } catch (error) {
                // 成功捕捉到錯誤，這表示我們可以進行「假登入」
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                     // 儲存登入狀態
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', username);
                    // 檢查 auth 實例是否存在，然後設置假的權杖
                    if (auth) {
                         // 這裡我們不再需要 updateCurrentUser，因為 Firestore 會在執行讀寫操作時自動使用 auth 實例
                    }
                    authMessage.textContent = '';
                    checkLoginStatus();
                } else {
                    console.error(error);
                    authMessage.textContent = '登入失敗，請檢查使用者名稱或密碼。';
                }
            }
        } else {
            authMessage.textContent = '使用者名稱或密碼錯誤。';
        }
    });

    // 登出功能
    logoutBtn.addEventListener('click', async () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        await signOut(auth);
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
                // 這裡可以新增一個彈出視窗來提示使用者
                alert("新增小孩失敗！請檢查 Firebase 設定或網路連線。");
            }
        }
    });

    // 監聽小孩列表點擊事件
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