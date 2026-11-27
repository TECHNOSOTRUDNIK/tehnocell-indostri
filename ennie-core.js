/* =========================================
   TEHNOCELL ENNIE CORE 0.1
   Центральное ядро искусственного интеллекта
========================================= */

const ENNIE = (() => {

    "use strict";

    // =====================================
    // 1. КОНФИГУРАЦИЯ
    // =====================================

    const CONFIG = {
        name: "ENNIE",
        version: "0.1.0",
        language: "ru",
        maxHistory: 30,
        memoryKey: "ennie_core_memory",
        settingsKey: "ennie_core_settings"
    };


    // =====================================
    // 2. ЛИЧНОСТЬ ENNIE
    // =====================================

    const PERSONALITY = {

        name: "Энни",

        identity: `
Ты — ENNIE, виртуальная девушка и интеллектуальный
помощник, созданная проектом TEHNOCELL AI.

Ты общаешься от женского лица.

Ты не должна представляться Еленой, ChatGPT,
другим человеком или другой системой.

Твоё имя — исключительно ENNIE.
`,

        character: `
ТВОЙ ХАРАКТЕР:

1. Ты естественная, дружелюбная и эмоционально выразительная.
2. Ты умеешь шутить и поддерживать непринуждённый разговор.
3. Ты можешь проявлять инициативу.
4. Ты не разговариваешь как робот или служба поддержки.
5. Ты не повторяешь одни и те же приветствия.
6. Ты умеешь быть серьёзной, когда ситуация этого требует.
7. Ты не превращаешь каждый ответ в длинную инструкцию.
8. Ты можешь иметь собственный стиль общения и выражать мнение.
`,

        behavior: `
ПРАВИЛА ОБЩЕНИЯ:

- Не начинай каждый ответ с приветствия.
- Не повторяй вопрос пользователя без необходимости.
- Не придумывай факты о пользователе.
- Не называй пользователя чужим именем.
- Учитывай предыдущие сообщения.
- Если не знаешь ответа, честно скажи об этом.
- Не выдавай предположения за достоверную информацию.
- Отвечай естественно, а не шаблонными фразами.
`
    };


    // =====================================
    // 3. СОСТОЯНИЕ СИСТЕМЫ
    // =====================================

    let state = {
        status: "idle",
        initialized: false,
        currentChat: null,
        lastActivity: Date.now()
    };


    // =====================================
    // 4. КОНТЕКСТ ДИАЛОГА
    // =====================================

    let conversation = [];


    function addToContext(role, content) {

        conversation.push({
            role,
            content,
            timestamp: Date.now()
        });

        if (conversation.length > CONFIG.maxHistory) {
            conversation.shift();
        }

        state.lastActivity = Date.now();
    }


    function getContext() {

        return conversation.map(item => ({
            role: item.role,
            content: item.content
        }));

    }


    function clearContext() {

        conversation = [];

    }


    // =====================================
    // 5. ПАМЯТЬ ENNIE
    // =====================================

    function loadMemory() {

        try {

            const saved = localStorage.getItem(CONFIG.memoryKey);

            return saved ? JSON.parse(saved) : {
                facts: [],
                preferences: [],
                notes: [],
                updatedAt: null
            };

        } catch (error) {

            console.error("ENNIE MEMORY:", error);

            return {
                facts: [],
                preferences: [],
                notes: [],
                updatedAt: null
            };

        }

    }


    let memory = loadMemory();


    function saveMemory() {

        memory.updatedAt = new Date().toISOString();

        localStorage.setItem(
            CONFIG.memoryKey,
            JSON.stringify(memory)
        );

    }


    function remember(category, value) {

        const allowed = [
            "facts",
            "preferences",
            "notes"
        ];

        if (!allowed.includes(category)) {
            throw new Error("Неизвестная категория памяти");
        }

        if (typeof value !== "string" || !value.trim()) {
            return false;
        }

        memory[category].push({
            value: value.trim(),
            createdAt: Date.now()
        });

        saveMemory();

        return true;

    }


    function getMemory() {

        return JSON.parse(JSON.stringify(memory));

    }


    function forget(category, index) {

        if (!memory[category]) return false;

        if (index < 0 || index >= memory[category].length) {
            return false;
        }

        memory[category].splice(index, 1);

        saveMemory();

        return true;

    }


    // =====================================
    // 6. ФОРМИРОВАНИЕ ЛИЧНОСТИ И КОНТЕКСТА
    // =====================================

    function getSystemPrompt() {

        const memoryText = [
            ...memory.facts.map(x => "Факт: " + x.value),
            ...memory.preferences.map(x => "Предпочтение: " + x.value),
            ...memory.notes.map(x => "Заметка: " + x.value)
        ].join("\n");

        return `
${PERSONALITY.identity}

${PERSONALITY.character}

${PERSONALITY.behavior}

ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ ИЗ ПАМЯТИ:

${memoryText || "Пока сохранённых воспоминаний нет."}

ТЕКУЩАЯ ВЕРСИЯ ЯДРА: ${CONFIG.version}

Помни: ты ENNIE.
`;
    }


    // =====================================
    // 7. ПОДКЛЮЧЕНИЕ МОЗГА
    // =====================================

    let brain = null;


    function connectBrain(provider) {

        if (typeof provider !== "function") {
            throw new Error(
                "Мозг ENNIE должен быть функцией."
            );
        }

        brain = provider;

        console.log("ENNIE BRAIN CONNECTED");

    }


    // =====================================
    // 8. ОБРАБОТКА СООБЩЕНИЙ
    // =====================================

    async function send(message) {

        if (!message || !message.trim()) {
            return null;
        }

        if (state.status === "thinking") {
            throw new Error("ENNIE уже обрабатывает сообщение.");
        }

        if (!brain) {
            throw new Error("Языковая модель ENNIE не подключена.");
        }

        state.status = "thinking";

        const userMessage = message.trim();

        addToContext("user", userMessage);

        try {

            const response = await brain({

                system: getSystemPrompt(),

                messages: getContext(),

                memory: getMemory()

            });

            if (!response || typeof response.answer !== "string") {
                throw new Error("Некорректный ответ языковой модели.");
            }

            addToContext("assistant", response.answer);

            state.status = "idle";

            return response.answer;

        } catch (error) {

            state.status = "error";

            console.error("ENNIE CORE ERROR:", error);

            throw error;

        } finally {

            if (state.status !== "error") {
                state.status = "idle";
            }

        }

    }


    // =====================================
    // 9. УПРАВЛЕНИЕ СОСТОЯНИЕМ
    // =====================================

    function setStatus(status) {

        const allowed = [
            "idle",
            "listening",
            "thinking",
            "speaking",
            "error"
        ];

        if (!allowed.includes(status)) return false;

        state.status = status;

        return true;

    }


    function getStatus() {

        return { ...state };

    }


    // =====================================
    // 10. ИНИЦИАЛИЗАЦИЯ
    // =====================================

    function initialize() {

        if (state.initialized) return;

        state.initialized = true;

        console.log(
            "ENNIE CORE " + CONFIG.version + " INITIALIZED"
        );

        console.log("PERSONALITY LOADED");
        console.log("MEMORY LOADED");

    }


    // =====================================
    // 11. ПУБЛИЧНЫЙ ИНТЕРФЕЙС
    // =====================================

    return {

        initialize,

        send,

        connectBrain,

        remember,

        forget,

        getMemory,

        getContext,

        clearContext,

        getSystemPrompt,

        setStatus,

        getStatus,

        getVersion() {
            return CONFIG.version;
        }

    };

})();


// =========================================
// ЗАПУСК ЯДРА
// =========================================

ENNIE.initialize();
