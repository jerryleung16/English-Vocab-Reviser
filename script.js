// 等待網頁完全載入
document.addEventListener('DOMContentLoaded', function() {
    // 取得DOM元素
    const vocabCard = document.getElementById('vocabCard');
    const frontText = document.getElementById('frontText');
    const backKanji = document.getElementById('backKanji');
    const backReading = document.getElementById('backReading');
    const backDefinition = document.getElementById('backDefinition');
    const backExample = document.getElementById('backExample');
    const backTranslation = document.getElementById('backTranslation');
    const frontLabel = document.getElementById('frontLabel');
    const backLabel = document.getElementById('backLabel');
    
    const mode1Btn = document.getElementById('mode1');
    const mode2Btn = document.getElementById('mode2');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const resetReviewBtn = document.getElementById('resetReviewBtn');
    const knowBtn = document.getElementById('knowBtn');
    const dontKnowBtn = document.getElementById('dontKnowBtn');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const reviewStatus = document.getElementById('reviewStatus');
    const pendingCount = document.getElementById('pendingCount');
    const knownCount = document.getElementById('knownCount');
    const dontKnowCount = document.getElementById('dontKnowCount');
    const deckPendingBtn = document.getElementById('deckPendingBtn');
    const deckDontKnowBtn = document.getElementById('deckDontKnowBtn');
    const deckKnownBtn = document.getElementById('deckKnownBtn');
    
    // 當前狀態
    let currentMode = 1; // 1: word -> meaning, 2: meaning -> word
    let currentIndex = 0;
    let isFlipped = false;
    let currentDeckFilter = 'pending'; // pending | dontknow | known

    function getDeckFilterLabel(filter = currentDeckFilter) {
        if (filter === 'known') return 'Known';
        if (filter === 'dontknow') return 'Need Review';
        return 'Unmarked';
    }

    function filterVocabByDeck(vocabList, filter = currentDeckFilter) {
        if (!Array.isArray(vocabList)) return [];

        return vocabList.filter(item => {
            const status = window.getVocabStatus ? window.getVocabStatus(item.id) : 'pending';
            if (filter === 'known') return status === 'known';
            if (filter === 'dontknow') return status === 'dontknow';
            return status === 'pending';
        });
    }

    function updateDeckFilterButtons() {
        if (!deckPendingBtn || !deckDontKnowBtn || !deckKnownBtn) return;

        deckPendingBtn.classList.toggle('active', currentDeckFilter === 'pending');
        deckDontKnowBtn.classList.toggle('active', currentDeckFilter === 'dontknow');
        deckKnownBtn.classList.toggle('active', currentDeckFilter === 'known');
    }

    function switchDeckFilter(filter) {
        currentDeckFilter = filter;
        currentIndex = 0;
        updateDeckFilterButtons();
        updateVocabList();
        showNotification(`目前顯示：${getDeckFilterLabel(filter)}`);
    }
    
    // 更新詞彙列表函數
    function updateVocabList() {
        const allVocab = window.getAllVocabData ? window.getAllVocabData() : window.vocabStorage.getAllVocab();
        currentVocabList = filterVocabByDeck(allVocab, currentDeckFilter);
        currentVocabList = Array.isArray(currentVocabList) ? currentVocabList : [];
        currentIndex = Math.min(currentIndex, Math.max(currentVocabList.length - 1, 0));
        if (currentIndex < 0) currentIndex = 0;
        updateCard();
        updateReviewSummary();
    }
    
    // 公開更新函數供管理面板使用
    window.updateCard = updateCard;
    
    // 初始化
    function init() {
        updateVocabList();
        
        // 設定事件監聽器
        vocabCard.addEventListener('click', flipCard);
        mode1Btn.addEventListener('click', () => switchMode(1));
        mode2Btn.addEventListener('click', () => switchMode(2));
        prevBtn.addEventListener('click', showPrevious);
        nextBtn.addEventListener('click', showNext);
        shuffleBtn.addEventListener('click', shuffleVocab);
        resetReviewBtn.addEventListener('click', resetReviewStates);
        knowBtn.addEventListener('click', () => markCurrentVocab('known'));
        dontKnowBtn.addEventListener('click', () => markCurrentVocab('dontknow'));
        if (deckPendingBtn) deckPendingBtn.addEventListener('click', () => switchDeckFilter('pending'));
        if (deckDontKnowBtn) deckDontKnowBtn.addEventListener('click', () => switchDeckFilter('dontknow'));
        if (deckKnownBtn) deckKnownBtn.addEventListener('click', () => switchDeckFilter('known'));
        
        // 鍵盤快捷鍵
        document.addEventListener('keydown', handleKeyPress);

        updateDeckFilterButtons();
    }
    
    // 更新進度顯示
    function updateProgress() {
        if (currentVocabList.length === 0) {
            progressFill.style.width = '0%';
            progressText.textContent = '0/0';
            return;
        }
        
        const progress = ((currentIndex + 1) / currentVocabList.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${currentIndex + 1}/${currentVocabList.length}`;
    }
    
    // 更新卡片內容
    function updateCard() {
        if (currentVocabList.length === 0) {
            forceCardFront();
            frontText.textContent = "Done";
            backKanji.textContent = `No "${getDeckFilterLabel()}" words`;
            backReading.textContent = "";
            backDefinition.textContent = "Use the filter buttons above or change review tags to continue.";
            backExample.textContent = "";
            backTranslation.textContent = "";
            if (reviewStatus) reviewStatus.textContent = `Current deck: ${getDeckFilterLabel()}`;
            updateProgress();
            return;
        }
        
        const currentVocab = currentVocabList[currentIndex];
        
        if (!currentVocab) return;
        
        // 重置卡片為正面
        forceCardFront();
        
        const currentStatus = window.getVocabStatus ? window.getVocabStatus(currentVocab.id) : 'pending';
        if (reviewStatus) {
            if (currentStatus === 'known') {
                reviewStatus.textContent = 'Status: Known';
            } else if (currentStatus === 'dontknow') {
                reviewStatus.textContent = 'Status: Need Review';
            } else {
                reviewStatus.textContent = 'Status: Unmarked';
            }
        }

        if (currentMode === 1) {
            // Mode 1: front shows word, back shows meaning + details
            frontLabel.textContent = "Word";
            backLabel.textContent = "Meaning + Details";
            frontText.textContent = currentVocab.hiragana;
            backKanji.textContent = currentVocab.kanji;
            backReading.textContent = `Word: ${currentVocab.hiragana}`;
            backDefinition.innerHTML = currentVocab.definition;
            backExample.innerHTML = currentVocab.example;
            backTranslation.textContent = currentVocab.translation;
            
            // Mark custom vocabulary
            if (currentVocab.id >= 1000) {
                backReading.textContent += ' (Custom)';
            }
        } else {
            // Mode 2: front shows meaning, back shows word + details
            frontLabel.textContent = "Meaning";
            backLabel.textContent = "Word + Details";
            frontText.textContent = currentVocab.kanji;
            backKanji.textContent = currentVocab.hiragana;
            backReading.textContent = `Meaning: ${currentVocab.kanji}`;
            backDefinition.innerHTML = currentVocab.definition;
            backExample.innerHTML = currentVocab.example;
            backTranslation.textContent = currentVocab.translation;
            
            // Mark custom vocabulary
            if (currentVocab.id >= 1000) {
                backReading.textContent += ' (Custom)';
            }
        }
        
        updateProgress();
        updateReviewSummary();
    }

    function forceCardFront() {
        vocabCard.classList.remove('flipped');
        isFlipped = false;
    }

    function updateReviewSummary() {
        if (!pendingCount || !knownCount || !dontKnowCount) return;

        const counts = window.getReviewStatusCounts ? window.getReviewStatusCounts() : { pending: 0, known: 0, dontknow: 0 };
        pendingCount.textContent = String(counts.pending || 0);
        knownCount.textContent = String(counts.known || 0);
        dontKnowCount.textContent = String(counts.dontknow || 0);
        updateDeckFilterButtons();
    }
    
    // 翻轉卡片
    function flipCard() {
        if (currentVocabList.length === 0) return;
        isFlipped = !isFlipped;
        vocabCard.classList.toggle('flipped');
    }

    // 標記當前詞彙
    function markCurrentVocab(status) {
        if (currentVocabList.length === 0) return;

        forceCardFront();

        const currentVocab = currentVocabList[currentIndex];
        if (!currentVocab) return;

        const statusValue = status === 'dontknow' ? 'dontknow' : 'known';
        if (window.setVocabStatus) {
            window.setVocabStatus(currentVocab.id, statusValue);
        }

        if (status === 'dontknow') {
            showNotification('Marked as Need Review. It stays in active review.');
        } else {
            showNotification('Marked as Known. Removed from active review.');
        }

        const previousIndex = currentIndex;
        updateVocabList();

        if (currentVocabList.length === 0) {
            return;
        }

        const remainingIndex = currentVocabList.findIndex(item => item.id === currentVocab.id);
        if (remainingIndex === -1) {
            currentIndex = Math.min(previousIndex, currentVocabList.length - 1);
        } else {
            currentIndex = Math.min(remainingIndex + 1, currentVocabList.length - 1);
        }

        updateCard();
    }

    function resetReviewStates() {
        if (window.resetVocabStatuses) {
            window.resetVocabStatuses();
        }
        currentIndex = 0;
        updateVocabList();
        forceCardFront();
        showNotification('All review tags have been reset.');
    }
    
    // 切換模式
    function switchMode(mode) {
        if (currentMode === mode) return;
        
        currentMode = mode;
        
        // 更新按鈕狀態
        if (mode === 1) {
            mode1Btn.classList.add('active');
            mode2Btn.classList.remove('active');
        } else {
            mode1Btn.classList.remove('active');
            mode2Btn.classList.add('active');
        }
        
        // 更新卡片
        updateCard();
    }
    
    // 顯示上一個單字
    function showPrevious() {
        if (currentVocabList.length === 0) return;
        
        if (currentIndex > 0) {
            currentIndex--;
        } else {
            currentIndex = currentVocabList.length - 1; // 循環到最後一個
        }
        updateCard();
    }
    
    // 顯示下一個單字
    function showNext() {
        if (currentVocabList.length === 0) return;
        
        if (currentIndex < currentVocabList.length - 1) {
            currentIndex++;
        } else {
            currentIndex = 0; // 循環到第一個
        }
        updateCard();
    }
    
    // 隨機排序詞彙
    function shuffleVocab() {
        if (currentVocabList.length === 0) return;
        
        // 隨機排序陣列 (Fisher-Yates 洗牌算法)
        for (let i = currentVocabList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentVocabList[i], currentVocabList[j]] = [currentVocabList[j], currentVocabList[i]];
        }
        
        // 回到第一個
        currentIndex = 0;
        updateCard();
        
        // 顯示提示
        showNotification('Vocabulary order shuffled!');
    }
    
    // 處理鍵盤按鍵
    function handleKeyPress(event) {
        switch(event.key) {
            case 'ArrowLeft':
                showPrevious();
                break;
            case 'ArrowRight':
                showNext();
                break;
            case ' ':
            case 'Enter':
                flipCard();
                event.preventDefault(); // 防止空格鍵滾動頁面
                break;
            case '1':
                switchMode(1);
                break;
            case '2':
                switchMode(2);
                break;
            case 'r':
            case 'R':
                shuffleVocab();
                break;
            case 'Escape':
                // 關閉管理面板
                const managementPanel = document.getElementById('managementPanel');
                if (managementPanel) {
                    managementPanel.classList.remove('active');
                }
                break;
        }
    }
    
    // 顯示通知訊息（與管理面板共用）
    function showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notificationMessage');
        
        if (notification && notificationMessage) {
            notificationMessage.textContent = message;
            notification.className = 'notification';
            
            if (type === 'error') {
                notification.style.background = '#e74c3c';
            } else if (type === 'warning') {
                notification.style.background = '#f39c12';
            } else {
                notification.style.background = '#27ae60';
            }
            
            notification.classList.add('active');
            
            // 3秒後自動隱藏
            setTimeout(() => {
                notification.classList.remove('active');
            }, 3000);
        } else {
            // 如果通知元素不存在，使用alert
            alert(message);
        }
    }
    
    // 公開函數供管理面板使用
    window.showNotification = showNotification;
    
    // 開始應用
    init();
});