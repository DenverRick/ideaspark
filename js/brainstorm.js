// IdeaSpark - Brainstorm Chat Logic

const Brainstorm = {
    currentIdeaId: null,
    conversationHistory: [],
    turnNumber: 0,
    speechInput: null,
    initialized: false,
    loading: false,

    init() {
        // Send button
        document.getElementById('chat-send-btn').addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter to send (Shift+Enter for newline)
        document.getElementById('chat-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize chat textarea
        document.getElementById('chat-input').addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });

        // Generate action plan from chat
        document.getElementById('chat-generate-plan-btn').addEventListener('click', () => {
            // Switch to Action Steps tab and generate
            this.switchToActionsAndGenerate();
        });

        // Speech input
        const chatInput = document.getElementById('chat-input');
        const chatMic = document.getElementById('chat-mic-btn');
        this.speechInput = new SpeechInput(chatInput, chatMic);
    },

    async open(ideaRecordId) {
        this.currentIdeaId = ideaRecordId;
        this.conversationHistory = [];
        this.turnNumber = 0;
        this.initialized = false;

        const messagesEl = document.getElementById('chat-messages');
        messagesEl.innerHTML = '';
        document.getElementById('chat-input').value = '';

        await this.loadConversation();
    },

    async loadConversation() {
        const messagesEl = document.getElementById('chat-messages');

        try {
            const records = await AirtableAPI.getConversations(this.currentIdeaId);

            this.conversationHistory = records.map(r => ({
                role: r.fields.Role === 'User' ? 'user' : 'assistant',
                content: r.fields.Message,
                recordId: r.id
            }));

            this.turnNumber = records.length;

            // Render existing messages
            messagesEl.innerHTML = '';
            records.forEach(r => {
                this.appendBubble(
                    r.fields.Role === 'User' ? 'user' : 'assistant',
                    r.fields.Message
                );
            });

            // If no conversation, auto-start
            if (records.length === 0) {
                await this.autoStartConversation();
            }

            this.scrollToBottom();
            this.initialized = true;
        } catch (error) {
            messagesEl.innerHTML = `<div class="empty-state"><p>Failed to load conversation.</p><button class="btn btn-small btn-primary" onclick="Brainstorm.loadConversation()">Retry</button></div>`;
        }
    },

    async autoStartConversation() {
        if (!currentIdeaData) return;

        const f = currentIdeaData.fields;
        let prompt;

        if (f.VideoTitle) {
            prompt = `I see you're interested in "${f.VideoTitle}"${f.Category ? ` for ${f.Category}` : ''}. What caught your attention about this? How do you envision using this for your community?`;
        } else if (f.Title) {
            prompt = `Tell me about your idea "${f.Title}"${f.Category ? ` for ${f.Category}` : ''}. What inspired this? What problem would it solve?`;
        } else {
            prompt = `I'd love to hear about your new idea! What are you thinking?`;
        }

        // Show as Claude message
        this.appendBubble('assistant', prompt);

        // Save to Airtable
        this.turnNumber++;
        this.conversationHistory.push({ role: 'assistant', content: prompt });

        try {
            await AirtableAPI.addConversation(this.currentIdeaId, 'Assistant', prompt, this.turnNumber);
        } catch (error) {
            // Non-critical, conversation still works locally
        }
    },

    async sendMessage() {
        if (this.loading) return;

        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        // Stop speech if active
        if (this.speechInput) this.speechInput.stop();

        // Clear input
        input.value = '';
        input.style.height = 'auto';

        // Show user bubble
        this.appendBubble('user', text);
        this.scrollToBottom();

        // Save user message
        this.turnNumber++;
        this.conversationHistory.push({ role: 'user', content: text });

        try {
            await AirtableAPI.addConversation(this.currentIdeaId, 'User', text, this.turnNumber);
        } catch (error) {
            // Continue even if save fails
        }

        // Show typing indicator
        this.showTyping();
        this.loading = true;

        try {
            // Trim history if too long
            const historyForApi = this.conversationHistory.slice(-AppConfig.MAX_CONVERSATION_HISTORY);

            const response = await ClaudeAPI.sendMessage(historyForApi, AppConfig.CLAUDE_SYSTEM_PROMPT);

            this.hideTyping();

            // Show assistant bubble
            this.appendBubble('assistant', response);

            // Save assistant message
            this.turnNumber++;
            this.conversationHistory.push({ role: 'assistant', content: response });

            try {
                await AirtableAPI.addConversation(this.currentIdeaId, 'Assistant', response, this.turnNumber);
            } catch (error) {
                // Non-critical
            }
        } catch (error) {
            this.hideTyping();
            this.appendBubble('assistant', `Sorry, I encountered an error: ${error.message}. Please try again.`);
            showToast('Claude API error: ' + error.message, 'error');
        } finally {
            this.loading = false;
            this.scrollToBottom();
        }
    },

    appendBubble(role, content) {
        const messagesEl = document.getElementById('chat-messages');
        const bubble = document.createElement('div');
        const isUser = role === 'user';

        bubble.className = `chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`;
        bubble.innerHTML = `
            <div class="chat-bubble-text">${this.formatMessage(content)}</div>
            <div class="chat-bubble-time">${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
        `;

        messagesEl.appendChild(bubble);
    },

    formatMessage(text) {
        // Basic markdown-like formatting
        let html = escapeHtml(text);
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Line breaks
        html = html.replace(/\n/g, '<br>');
        // Numbered lists
        html = html.replace(/^(\d+)\.\s/gm, '<strong>$1.</strong> ');
        return html;
    },

    showTyping() {
        const messagesEl = document.getElementById('chat-messages');
        const typing = document.createElement('div');
        typing.className = 'chat-typing';
        typing.id = 'typing-indicator';
        typing.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        messagesEl.appendChild(typing);
        this.scrollToBottom();
    },

    hideTyping() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    },

    scrollToBottom() {
        const messagesEl = document.getElementById('chat-messages');
        requestAnimationFrame(() => {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        });
    },

    switchToActionsAndGenerate() {
        // Use IdeaDetail.switchTab to properly initialize ActionSteps with the idea ID
        IdeaDetail.switchTab('actions');

        // Generate action plan after tab is initialized
        ActionSteps.generatePlan();
    },

    getHistory() {
        return this.conversationHistory;
    }
};
