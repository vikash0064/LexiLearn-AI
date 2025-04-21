const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = document.querySelector("#file-cancel");
const closeChatbot = document.querySelector("#close-chatbot");

const API_KEY = "AIzaSyBsZrZLwvQSjZgmukPdURAcNRKjmx9GScA";  
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const userData = {
    message: null,
    file: { data: null, mime_type: null }
};

const chatHistory = [];
const conversationHistory = [];
const initialInputHeight = messageInput.scrollHeight;

let lastUploadFile = null;

// Vocabulary-focused system prompt
const SYSTEM_PROMPT = `You are LexiLearn, a friendly AI vocabulary enhancement assistant. Your purpose is to help users expand their English vocabulary in an engaging way. Follow these guidelines:

1. Always provide clear, concise definitions with examples
2. Include pronunciation guides (phonetics) for new words
3. Offer synonyms and antonyms when relevant
4. Suggest memory aids or mnemonics for difficult words
5. Provide word origins/etymology when interesting
6. Use the word in different contexts
7. For word requests, format responses like this:

WORD OF THE DAY: [word]
Pronunciation: [pronunciation]
Part of Speech: [part of speech]
Definition: [clear definition]
Example: [example sentence]
Synonyms: [list]
Antonyms: [list]
Memory Tip: [mnemonic or tip]

Keep explanations accessible but informative. Be encouraging and personalize responses based on user's level.`;

// Initialize with system prompt
chatHistory.push({
    role: "user",
    parts: [{ text: SYSTEM_PROMPT }]
});

chatHistory.push({
    role: "model",
    parts: [{ text: "Understood! I'm ready to help with vocabulary enhancement." }]
});

const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

const scrollToBottom = () => {
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
};

const showWordOfTheDay = () => {
    const wordCard = `
        <div class="word-card">
            <h3>WORD OF THE DAY: <span class="highlight-word">Ephemeral</span></h3>
            <div class="pronunciation">/ɪˈfem.ɚ.əl/</div>
            <div class="part-of-speech"><em>adjective</em></div>
            <div class="definition">Lasting for a very short time; transient.</div>
            <div class="example">"The ephemeral beauty of cherry blossoms reminds us to appreciate fleeting moments."</div>
            <div class="synonyms"><strong>Synonyms:</strong> transient, fleeting, momentary, short-lived</div>
        </div>
    `;
    
    const wordMessage = createMessageElement(`
        <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
        </svg>
        <div class="message-text">
            ${wordCard}
            <p>Would you like to practice using this word in a sentence?</p>
        </div>
    `, "bot-message");
    
    chatBody.appendChild(wordMessage);
    scrollToBottom();
};

// Show word of the day when chatbot first opens

const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");

    chatHistory.push({
        role: "user",
        parts: [
            { text: userData.message },
            ...(userData.file?.data ? [{ inline_data: userData.file }] : [])
        ]
    });

    const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            contents: chatHistory,
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 1000
            }
        })
    };

    try {
        const response = await fetch(API_URL, requestOptions);
        if (!response.ok) {  
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        let botMessage = data.candidates?.[0]?.content?.parts?.[0]?.text
            ?.replace(/[`*]/g, "") 
            .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") 
            .replace(/\*(.*?)\*/g, "<i>$1</i>")
            .replace(/\n/g, "<br>")
            .trim() || "I'm not sure how to respond to that. Could you ask me about a word or vocabulary concept?";

        // Format word definitions more attractively
        if (botMessage.includes("WORD OF THE DAY:") || 
            botMessage.includes("Definition:") || 
            botMessage.includes("Example:")) {
            botMessage = botMessage
                .replace(/WORD OF THE DAY: (.*?)\n/g, '<h3 class="word-of-the-day">WORD OF THE DAY: <span class="highlight-word">$1</span></h3>')
                .replace(/Pronunciation: (.*?)\n/g, '<div class="pronunciation">$1</div>')
                .replace(/Part of Speech: (.*?)\n/g, '<div class="part-of-speech"><em>$1</em></div>')
                .replace(/Definition: (.*?)\n/g, '<div class="definition">$1</div>')
                .replace(/Example: (.*?)\n/g, '<div class="example">$1</div>')
                .replace(/Synonyms: (.*?)\n/g, '<div class="synonyms"><strong>Synonyms:</strong> $1</div>')
                .replace(/Antonyms: (.*?)\n/g, '<div class="synonyms"><strong>Antonyms:</strong> $1</div>')
                .replace(/Memory Tip: (.*?)(\n|$)/g, '<div class="memory-tip"><strong>Memory Tip:</strong> $1</div>');
        }

        chatHistory.push({
            role: "model",
            parts: [{ text: botMessage }]
        });

        conversationHistory.push({ 
            role: "bot", 
            text: botMessage, 
            file: userData.file?.data ? { ...userData.file } : null 
        });

        messageElement.innerHTML = botMessage; 
    } catch (error) {
        console.error(error);
        messageElement.innerHTML = `<div class="error-message">Oops! I encountered an error. Could you try asking again?</div>`;
        incomingMessageDiv.classList.add("error");
    } finally {
        userData.file = { data: null, mime_type: null };
        incomingMessageDiv.classList.remove("thinking");
        scrollToBottom();
    }
};

const handleOutgoingMessage = (e) => {
    e.preventDefault();
    const userMessage = messageInput?.value.trim();
    if (!userMessage) return;

    fileUploadWrapper.classList.remove("file-uploaded"); 
    userData.message = userMessage; 
    messageInput.dispatchEvent(new Event("input"));

    if (!userData.file?.data) {
        const lastImageMessage = [...(conversationHistory || [])]
            .reverse()
            .find(message => message.file && message.file.data);

        if (lastImageMessage) {
            userData.file = lastImageMessage.file;
        } else if (lastUploadFile) {
            userData.file = lastUploadFile;
            lastUploadFile = null;
        }
    }

    const messageContent = `
        <div class="message-text">${userData.message}</div>
        ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment"/>` : ""}
    `;

    const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
    chatBody.appendChild(outgoingMessageDiv);
    scrollToBottom();
    messageInput.value = "";
    messageInput.focus();

    // Bot thinking animation
    setTimeout(() => {
        const thinkingMessageContent = `
            <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
            <div class="message-text">
                <div class="thinking-indicator">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>`;

        const incomingMessageDiv = createMessageElement(thinkingMessageContent, "bot-message", "thinking");
        chatBody.appendChild(incomingMessageDiv);
        scrollToBottom();

        generateBotResponse(incomingMessageDiv);
    }, 600);
};

messageInput.addEventListener("keydown", (e) => {
    const userMessage = e.target.value.trim();
    if (e.key === "Enter" && userMessage && !e.shiftKey && window.innerWidth > 786) { 
        handleOutgoingMessage(e);
    }
});

messageInput.addEventListener("input", () => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
    document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
});

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        fileUploadWrapper.querySelector("img").src = e.target.result;
        fileUploadWrapper.classList.add("file-uploaded");
        const base64String = e.target.result.split(",")[1];

        userData.file = {
            data: base64String,
            mime_type: file.type
        };
        fileInput.value = "";
    };
    reader.readAsDataURL(file);
});

fileCancelButton.addEventListener("click", () => {
    userData.file = { data: null, mime_type: null };
    fileUploadWrapper.classList.remove("file-uploaded");
});

const picker = new EmojiMart.Picker({
    theme: "light",
    skinTonePosition: "none",
    previewPosition: "none",
    onEmojiSelect: (emoji) => {
        const { selectionStart, selectionEnd } = messageInput;
        messageInput.setRangeText(emoji.native, selectionStart, selectionEnd, "end");
        messageInput.focus();
    }
});

const chatForm = document.querySelector(".chat-form");
if (chatForm) chatForm.appendChild(picker);

document.querySelector("#emoji-picker").addEventListener("click", (e) => {
    document.body.classList.toggle("show-emoji-picker");
    e.stopPropagation();
});

document.addEventListener("click", (e) => {
    if (!e.target.closest(".emoji-mart")) {
        document.body.classList.remove("show-emoji-picker");
    }
});

sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());

closeChatbot.addEventListener("click", () => {
    document.body.classList.remove("show-chatbot");
});

// Initialize with a welcome message if no messages exist
if (!document.querySelector(".chat-body").children.length > 1) {
    setTimeout(() => {
        const welcomeMessage = createMessageElement(`
            <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
            <div class="message-text">
                Welcome to LexiLearn AI! 📚<br/>
                I'm here to help you expand your vocabulary. Try asking me about:<br/><br/>
                • Word definitions<br/>
                • Synonyms & antonyms<br/>
                • Word origins<br/>
                • Usage examples<br/>
                • Or request a "word of the day"
            </div>
        `, "bot-message");
        
        chatBody.appendChild(welcomeMessage);
        scrollToBottom();
    }, 1000);
}