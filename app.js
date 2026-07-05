// --- タイトルの自動動的セット設定 ---
        const pageTitle = document.title || "英単語ハックマスター";
        document.getElementById('home-title').textContent = pageTitle.replace(/⚡/g, "").trim();

        // --- ストレージ & ステート管理 ---
        const storageKey = "HACK_MASTER_" + encodeURIComponent(pageTitle) + "_CLEARED_IDS";
        let clearedList = JSON.parse(localStorage.getItem(storageKey)) || [];

        let currentDeck = [];      
        let initialUniqueCount = 0;
        let currentIndex = 0;      
        let comboCount = 0;

        // DOMの取得
        const domScreenHome = document.getElementById('screen-home');
        const domScreenQuiz = document.getElementById('screen-quiz');
        const domSectionList = document.getElementById('section-list');
        const domTotalProgressPercent = document.getElementById('total-progress-percent');
        const domTotalProgressBar = document.getElementById('total-progress-bar');
        const domTotalProgressCount = document.getElementById('total-progress-count');
        const domQuizCount = document.getElementById('quiz-count');
        const domQuizProgressBar = document.getElementById('quiz-progress-bar');
        const domQuizComboBadge = document.getElementById('quiz-combo-badge');
        const domQuizComboCount = document.getElementById('quiz-combo-count');
        const domHeaderCombo = document.getElementById('header-combo');
        const domHeaderComboCount = document.getElementById('header-combo-count');
        const domQuizSectionTitle = document.getElementById('quiz-section-title');
        const domQuizHintMeaning = document.getElementById('quiz-hint-meaning');
        const domQuizBoostEtymology = document.getElementById('quiz-boost-etymology');
        const domQuizBoostPreposition = document.getElementById('quiz-boost-preposition');
        const domQuizPhrase = document.getElementById('quiz-phrase');
        const domQuizAnswerZone = document.getElementById('quiz-answer-zone');
        const domQuizCorrectWord = document.getElementById('quiz-correct-word');
        const domBtnReveal = document.getElementById('btn-reveal');
        const domQuizChoicePad = document.getElementById('quiz-choice-pad');
        const domBtnCorrect = document.getElementById('btn-correct');
        const domBtnWrong = document.getElementById('btn-wrong');
        const domBtnBack = document.getElementById('btn-back');
        const domBtnResetAll = document.getElementById('btn-reset-all');
        const domBtnSpeakWord = document.getElementById('btn-speak-word');
        const domBtnSpeakPhrase = document.getElementById('btn-speak-phrase');

        // --- ホーム画面の描画 ---
        function renderHome() {
            domScreenQuiz.classList.add('hidden');
            domScreenHome.classList.remove('hidden');

            const totalWords = MASTER_DATA.length;
            const clearedWords = clearedList.filter(id => MASTER_DATA.some(m => m.id === id)).length;
            const totalPercent = totalWords > 0 ? Math.round((clearedWords / totalWords) * 100) : 0;
            
            domTotalProgressPercent.textContent = `${totalPercent}%`;
            domTotalProgressBar.style.width = `${totalPercent}%`;
            domTotalProgressCount.textContent = `完遂済み: ${clearedWords} / ${totalWords} 語`;

            const sections = [...new Set(MASTER_DATA.map(item => item.section))];
            domSectionList.innerHTML = '';

            sections.forEach(secName => {
                const secItems = MASTER_DATA.filter(item => item.section === secName);
                const secCleared = secItems.filter(item => clearedList.includes(item.id)).length;
                const secPercent = Math.round((secCleared / secItems.length) * 100);
                const isCompleted = secCleared === secItems.length;

                const div = document.createElement('div');
                div.className = `glass-card p-3.5 rounded-xl border flex flex-col justify-between items-stretch space-y-2 transition-all ${isCompleted ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-800 hover:border-slate-700'}`;
                
                div.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div>
                            <h3 class="text-sm font-bold text-slate-200">${secName}</h3>
                            <p class="text-[11px] text-slate-400 font-mono mt-0.5">進捗: ${secCleared} / ${secItems.length} 語</p>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-black ${isCompleted ? 'text-emerald-400' : 'text-blue-400'} font-mono">${secPercent}%</span>
                        </div>
                    </div>
                    <div class="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div class="progress-bar ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'} h-full" style="width: ${secPercent}%"></div>
                    </div>
                    <div class="flex space-x-2 pt-1">
                        <button onclick="startSession('${secName}')" class="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold py-2 rounded-lg transition-colors border border-slate-700/50">
                            ${isCompleted ? '🔄 復習スタート' : '⚡ 攻略開始'}
                        </button>
                        ${secCleared > 0 ? `
                            <button onclick="resetSectionProgress('${secName}')" class="text-[10px] text-slate-500 hover:text-rose-400 px-2 transition-colors">
                                ↺ リセット
                            </button>
                        ` : ''}
                    </div>
                `;
                domSectionList.appendChild(div);
            });
        }

        // --- クイズセッションの開始 ---
        function startSession(sectionName) {
            let targetItems = MASTER_DATA.filter(item => item.section === sectionName);
            currentDeck = targetItems.filter(item => !clearedList.includes(item.id));

            if (currentDeck.length === 0) {
                currentDeck = [...targetItems];
            }

            // ランダムシャッフル
            currentDeck.sort(() => Math.random() - 0.5);

            initialUniqueCount = currentDeck.length; 
            currentIndex = 0;
            comboCount = 0;

            updateComboUI();
            
            domScreenHome.classList.add('hidden');
            domScreenQuiz.classList.remove('hidden');
            
            showQuestion();
        }

        // --- 問題の提示 ---

        // --- 穴あき表示ヘルパー（熟語・be動詞・過去形・doing/～などの可変部分にも対応） ---
        function escapeRegExp(str) {
            return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function escapeHtml(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function normalizeTargetExpression(targetWord) {
            return String(targetWord || "")
                .replace(/[（）]/g, " ")
                .replace(/\([^)]*\)/g, " ")
                .replace(/\[[^\]]*\]/g, " ")
                .replace(/[･・]/g, " ")
                .replace(/[〜]/g, "~")
                .replace(/…/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        }

        function getVerbForms(base) {
            const irregulars = {
                "be": ["be", "am", "are", "is", "was", "were", "been", "being"],
                "take": ["take", "takes", "took", "taken", "taking"],
                "make": ["make", "makes", "made", "making"],
                "come": ["come", "comes", "came", "coming"],
                "go": ["go", "goes", "went", "gone", "going"],
                "get": ["get", "gets", "got", "gotten", "getting"],
                "give": ["give", "gives", "gave", "given", "giving"],
                "do": ["do", "does", "did", "done", "doing"],
                "have": ["have", "has", "had", "having"],
                "run": ["run", "runs", "ran", "running"],
                "write": ["write", "writes", "wrote", "written", "writing"],
                "speak": ["speak", "speaks", "spoke", "spoken", "speaking"],
                "break": ["break", "breaks", "broke", "broken", "breaking"],
                "bring": ["bring", "brings", "brought", "bringing"],
                "buy": ["buy", "buys", "bought", "buying"],
                "catch": ["catch", "catches", "caught", "catching"],
                "choose": ["choose", "chooses", "chose", "chosen", "choosing"],
                "feel": ["feel", "feels", "felt", "feeling"],
                "find": ["find", "finds", "found", "finding"],
                "keep": ["keep", "keeps", "kept", "keeping"],
                "know": ["know", "knows", "knew", "known", "knowing"],
                "leave": ["leave", "leaves", "left", "leaving"],
                "lose": ["lose", "loses", "lost", "losing"],
                "pay": ["pay", "pays", "paid", "paying"],
                "put": ["put", "puts", "putting"],
                "read": ["read", "reads", "reading"],
                "see": ["see", "sees", "saw", "seen", "seeing"],
                "send": ["send", "sends", "sent", "sending"],
                "set": ["set", "sets", "setting"],
                "sit": ["sit", "sits", "sat", "sitting"],
                "stand": ["stand", "stands", "stood", "standing"],
                "teach": ["teach", "teaches", "taught", "teaching"],
                "tell": ["tell", "tells", "told", "telling"],
                "think": ["think", "thinks", "thought", "thinking"],
                "understand": ["understand", "understands", "understood", "understanding"]
            };

            const b = String(base || "").toLowerCase();
            if (irregulars[b]) return irregulars[b];

            const forms = new Set([b]);
            if (b.endsWith("e")) {
                forms.add(b + "s");
                forms.add(b.slice(0, -1) + "ed");
                forms.add(b.slice(0, -1) + "ing");
            } else if (b.endsWith("y") && !/[aeiou]y$/.test(b)) {
                forms.add(b.slice(0, -1) + "ies");
                forms.add(b.slice(0, -1) + "ied");
                forms.add(b + "ing");
            } else {
                forms.add(b + "s");
                forms.add(b + "ed");
                forms.add(b + "ing");
            }
            return Array.from(forms);
        }

        function variableNounPhrasePattern(maxWords = 4) {
            // 前置詞や接続詞の手前で止める。例: wash away the problem during... → wash away the problem
            const stop = "in|inside|on|at|by|for|with|during|before|after|to|from|of|as|if|when|while|because|since|until|unless|under|over|through|into|onto|about|within|without|than|that|which|who|where";
            return `(?:[A-Za-z][A-Za-z'’.-]*(?:\\s+(?!${stop}\\b)[A-Za-z][A-Za-z'’.-]*){0,${maxWords - 1}})`;
        }

        function gerundPhrasePattern() {
            // doing の部分を taking photos / solving the issue などに対応させる
            const stop = "in|inside|on|at|by|for|with|during|before|after|to|from|of|as|if|when|while|because|since|until|unless|under|over|through|into|onto|about|within|without|than|that|which|who|where";
            return `(?:[A-Za-z][A-Za-z'’.-]*ing(?:\\s+(?!${stop}\\b)[A-Za-z][A-Za-z'’.-]*){0,3})`;
        }

        function bareVerbPhrasePattern() {
            return `(?:[A-Za-z][A-Za-z'’.-]*(?:\\s+[A-Za-z][A-Za-z'’.-]*){0,3})`;
        }

        function tokenToPattern(token, index, tokens) {
            const t = String(token || "").toLowerCase();
            const prev = index > 0 ? String(tokens[index - 1]).toLowerCase() : "";

            if (["~", "...", "someone", "somebody", "something", "one", "one's", "ones", "oneself", "it"].includes(t)) {
                return variableNounPhrasePattern(4);
            }
            if (["a", "b", "o", "c"].includes(t)) {
                return variableNounPhrasePattern(3);
            }
            if (t === "doing") {
                return gerundPhrasePattern();
            }
            if (t === "do" && prev === "to") {
                return bareVerbPhrasePattern();
            }
            if (t === "be") {
                return `(?:${getVerbForms("be").map(escapeRegExp).join("|")})`;
            }

            const forms = getVerbForms(t).map(escapeRegExp).join("|");
            return `(?:${forms})`;
        }

        function buildPatternFromTokens(tokens) {
            const filtered = [];
            for (let i = 0; i < tokens.length; i++) {
                // doing ~ は doing 側で目的語まで吸収するので、直後の ~ は飛ばす
                if (tokens[i] === "~" && i > 0 && String(tokens[i - 1]).toLowerCase() === "doing") continue;
                filtered.push(tokens[i]);
            }
            if (filtered.length === 0) return null;

            const parts = filtered.map((tok, idx) => tokenToPattern(tok, idx, filtered));
            return `\\b${parts.join("\\s+")}\\b`;
        }

        function buildTargetRegex(targetWord) {
            const normalized = normalizeTargetExpression(targetWord);
            if (!normalized) return null;

            const candidates = new Set([normalized]);

            // be interested in ~ → interested in ~ でも拾えるようにする
            if (/^be\s+/i.test(normalized)) {
                candidates.add(normalized.replace(/^be\s+/i, ""));
            }

            // 「A to B」「A into B」等の記号を緩めるための掃除版
            const cleaned = normalized
                .replace(/[（）()[\]]/g, " ")
                .replace(/[･・]/g, " ")
                .replace(/\s+/g, " ")
                .trim();
            if (cleaned) candidates.add(cleaned);

            const patterns = [];

            candidates.forEach(candidate => {
                const tokens = candidate.split(/\s+/).filter(Boolean);
                const pattern = buildPatternFromTokens(tokens);
                if (pattern) patterns.push(pattern);

                // trailing ~ を持つ熟語は、~なし版でも拾う
                if (tokens[tokens.length - 1] === "~") {
                    const withoutTilde = tokens.slice(0, -1);
                    const p2 = buildPatternFromTokens(withoutTilde);
                    if (p2) patterns.push(p2);
                }
            });

            const uniquePatterns = Array.from(new Set(patterns)).sort((a, b) => b.length - a.length);
            if (uniquePatterns.length === 0) return null;
            return new RegExp(uniquePatterns.join("|"), "gi");
        }

        function renderMaskedPhrase(rawPhrase, targetWord, reveal = false) {
            const phrase = String(rawPhrase || "");
            const regex = buildTargetRegex(targetWord);
            if (!regex) return escapeHtml(phrase);

            let matched = false;
            let lastIndex = 0;
            let html = "";

            phrase.replace(regex, (match, ...args) => {
                const offset = args[args.length - 2];
                matched = true;
                html += escapeHtml(phrase.slice(lastIndex, offset));
                html += reveal
                    ? `<span class="text-rose-500 underline font-black font-mono">${escapeHtml(match)}</span>`
                    : "_____";
                lastIndex = offset + match.length;
                return match;
            });

            if (matched) {
                html += escapeHtml(phrase.slice(lastIndex));
                return html;
            }

            // 最終フォールバック：完全一致だけでも拾う
            const simpleTarget = normalizeTargetExpression(targetWord).replace(/\s*~\s*$/g, "");
            if (simpleTarget) {
                const simpleRegex = new RegExp(escapeRegExp(simpleTarget), "gi");
                lastIndex = 0;
                html = "";
                phrase.replace(simpleRegex, (match, ...args) => {
                    const offset = args[args.length - 2];
                    matched = true;
                    html += escapeHtml(phrase.slice(lastIndex, offset));
                    html += reveal
                        ? `<span class="text-rose-500 underline font-black font-mono">${escapeHtml(match)}</span>`
                        : "_____";
                    lastIndex = offset + match.length;
                    return match;
                });
                if (matched) {
                    html += escapeHtml(phrase.slice(lastIndex));
                    return html;
                }
            }

            return escapeHtml(phrase);
        }


        function showQuestion() {
            if (currentDeck.length === 0 || currentIndex >= currentDeck.length) {
                alert("🎉 セクション内のすべての問題をクリアしました！完璧なコンプリートです！");
                exitQuiz();
                return;
            }

            domQuizAnswerZone.classList.add('invisible');
            domQuizChoicePad.classList.add('hidden');
            domBtnReveal.classList.remove('hidden');

            const currentQuestion = currentDeck[currentIndex];

            // 画面上の残り問題数カウンターをリアルタイム動的表示
            domQuizCount.textContent = currentDeck.length - currentIndex;
            
            const progressPercent = initialUniqueCount > 0 ? (currentIndex / currentDeck.length) * 100 : 0;
            domQuizProgressBar.style.width = `${progressPercent}%`;
            domQuizSectionTitle.textContent = currentQuestion.section;

            domQuizHintMeaning.textContent = currentQuestion.meaning;
            domQuizBoostEtymology.textContent = currentQuestion.etymology || "語源データ最適化済";
            domQuizBoostPreposition.textContent = currentQuestion.note || "（補足なし）";
            domQuizCorrectWord.textContent = currentQuestion.word;

            // ターゲット単語・熟語を隠して「_____」に変える
            // take up ~ → take/takes/took/taken/taking up、be tired of → is/was/are tired of などにも対応
            domQuizPhrase.innerHTML = renderMaskedPhrase(currentQuestion.phrase, currentQuestion.word, false);
        }

        // --- 答えを見る ---
        function revealAnswer() {
            domBtnReveal.classList.add('hidden');
            domQuizChoicePad.classList.remove('hidden');
            domQuizAnswerZone.classList.remove('invisible');

            const currentQuestion = currentDeck[currentIndex];
            domQuizPhrase.innerHTML = renderMaskedPhrase(currentQuestion.phrase, currentQuestion.word, true);

            // ネイティブ発音を即座に自動再生
            speak(currentQuestion.word, 1.0);
        }

        // --- 仕分けシステム（ゲーム作成プロのオートローテーション） ---
        function handleUserJudgment(isCorrect) {
            const currentQuestion = currentDeck[currentIndex];

            if (isCorrect) {
                // 覚えた（クリア）なら保存してリストから除外していく
                if (!clearedList.includes(currentQuestion.id)) {
                    clearedList.push(currentQuestion.id);
                    localStorage.setItem(storageKey, JSON.stringify(clearedList));
                }
                comboCount++;
                updateComboUI();
                currentIndex++;
            } else {
                // もう一度（復習）なら、現在のデッキの最後尾にガサッと回す（無限ローテーション）
                comboCount = 0; 
                updateComboUI();

                currentDeck.push(currentQuestion);
                currentIndex++;
            }

            showQuestion();
        }

        function updateComboUI() {
            if (comboCount >= 3) {
                domQuizComboBadge.classList.remove('opacity-0');
                domQuizComboCount.textContent = comboCount;
                domHeaderCombo.classList.remove('hidden');
                domHeaderComboCount.textContent = comboCount;
            } else {
                domQuizComboBadge.classList.add('opacity-0');
                domHeaderCombo.classList.add('hidden');
            }
        }

        function exitQuiz() {
            renderHome();
        }

        function resetSectionProgress(sectionName) {
            if (confirm(`${sectionName} のクリア記録をリセットして未着手に戻しますか？`)) {
                const targetIds = MASTER_DATA.filter(item => item.section === sectionName).map(item => item.id);
                clearedList = clearedList.filter(id => !targetIds.includes(id));
                localStorage.setItem(storageKey, JSON.stringify(clearedList));
                renderHome();
            }
        }

        domBtnResetAll.addEventListener('click', () => {
            if (confirm("すべての進捗データを完全に消去し、初期状態に戻しますか？")) {
                clearedList = [];
                localStorage.removeItem(storageKey);
                renderHome();
            }
        });

        function speak(text, speed = 1.0) {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                let cleanText = text.replace(/_____/g, "blank");
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'en-US';
                utterance.rate = speed;
                window.speechSynthesis.speak(utterance);
            }
        }

        // イベントリスナー
        domBtnReveal.addEventListener('click', revealAnswer);
        domBtnCorrect.addEventListener('click', () => handleUserJudgment(true));
        domBtnWrong.addEventListener('click', () => handleUserJudgment(false));
        domBtnBack.addEventListener('click', () => {
            if (confirm("ホームに戻りますか？現在のセッション状態は一度リセットされます。")) { exitQuiz(); }
        });
        domBtnSpeakWord.addEventListener('click', () => { speak(currentDeck[currentIndex - 1]?.word || currentDeck[currentIndex].word, 1.0); });
        domBtnSpeakPhrase.addEventListener('click', () => { speak(currentDeck[currentIndex - 1]?.phrase || currentDeck[currentIndex].phrase, 0.95); });

        // 初期実行
        renderHome();
