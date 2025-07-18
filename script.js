document.addEventListener('DOMContentLoaded', () => {
    const childNameInput = document.getElementById('childNameInput');
    const addChildBtn = document.getElementById('addChildBtn');
    const childrenList = document.getElementById('childrenList');

    // 從 localStorage 載入小孩資料，如果沒有則初始化為空陣列
    let children = JSON.parse(localStorage.getItem('goodBabyPoints')) || [];

    // 渲染小孩列表
    function renderChildren() {
        childrenList.innerHTML = ''; // 清空現有列表
        if (children.length === 0) {
            const noChildrenMsg = document.createElement('p');
            noChildrenMsg.textContent = '目前沒有小孩，請新增一個！';
            noChildrenMsg.style.textAlign = 'center';
            noChildrenMsg.style.marginTop = '20px';
            childrenList.appendChild(noChildrenMsg);
            return;
        }

        children.forEach((child, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'child-item';
            listItem.dataset.index = index; // 儲存索引，方便查找

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

    // 將小孩資料儲存到 localStorage
    function saveChildren() {
        localStorage.setItem('goodBabyPoints', JSON.stringify(children));
    }

    // 增加小孩功能
    addChildBtn.addEventListener('click', () => {
        const name = childNameInput.value.trim(); // 移除首尾空白
        if (name) {
            children.push({ name: name, score: 0 }); // 新增小孩，初始點數為0
            childNameInput.value = ''; // 清空輸入框
            saveChildren(); // 儲存到 localStorage
            renderChildren(); // 重新渲染列表
        } else {
            alert('請輸入小孩的名字！');
        }
    });

    // 增減點數功能
    function addEventListenersToButtons() {
        document.querySelectorAll('.increase-btn').forEach(button => {
            button.onclick = (event) => { // 使用 onclick 而非 addEventListener 簡化，因為是動態生成
                const listItem = event.target.closest('.child-item');
                const index = listItem.dataset.index;
                children[index].score++;
                saveChildren();
                renderChildren(); // 重新渲染以更新點數
            };
        });

        document.querySelectorAll('.decrease-btn').forEach(button => {
            button.onclick = (event) => {
                const listItem = event.target.closest('.child-item');
                const index = listItem.dataset.index;
                if (children[index].score > 0) { // 點數不能為負
                    children[index].score--;
                    saveChildren();
                    renderChildren();
                } else {
                    alert('點數不能再減少了！');
                }
            };
        });
    }

    // 初始化渲染，在頁面載入時顯示現有的小孩
    renderChildren();
});