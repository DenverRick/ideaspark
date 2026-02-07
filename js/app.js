// IdeaSpark - App Entry Point & Idea Detail Coordinator

const IdeaDetail = {
    speechInput: null,
    tabsLoaded: { details: false, brainstorm: false, actions: false },

    init() {
        // Home button
        document.getElementById('detail-home-btn').addEventListener('click', () => {
            Dashboard.show();
        });

        // Edit button
        document.getElementById('detail-edit-btn').addEventListener('click', () => {
            if (currentIdeaId) {
                IdeaForm.open(currentIdeaId);
            }
        });

        // Delete button
        document.getElementById('detail-delete-btn').addEventListener('click', () => {
            this.confirmDelete();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tabTarget;
                this.switchTab(target);
            });
        });

        // Inline category/status/priority changes
        document.getElementById('detail-category').addEventListener('change', (e) => {
            this.updateField('Category', e.target.value);
        });

        document.getElementById('detail-status').addEventListener('change', (e) => {
            this.updateField('Status', e.target.value);
        });

        document.getElementById('detail-priority').addEventListener('change', (e) => {
            this.updateField('Priority', e.target.value);
        });

        // Add more thoughts
        document.getElementById('add-thoughts-btn').addEventListener('click', () => {
            document.getElementById('add-thoughts-section').classList.toggle('hidden');
        });

        document.getElementById('save-thoughts-btn').addEventListener('click', () => {
            this.saveThoughts();
        });

        // Cancel adding thoughts
        document.getElementById('cancel-thoughts-btn').addEventListener('click', () => {
            document.getElementById('detail-thoughts-input').value = '';
            document.getElementById('add-thoughts-section').classList.add('hidden');
            if (this.speechInput) this.speechInput.stop();
        });

        // Format thoughts with AI
        document.getElementById('format-thoughts-btn').addEventListener('click', () => {
            this.formatThoughts();
        });

        // Print idea
        document.getElementById('print-idea-btn').addEventListener('click', () => {
            this.printIdea();
        });

        // Reference links management
        document.getElementById('add-reference-btn').addEventListener('click', () => {
            document.getElementById('add-reference-section').classList.remove('hidden');
            document.getElementById('new-reference-url').value = '';
            document.getElementById('new-reference-url').focus();
        });

        document.getElementById('cancel-reference-btn').addEventListener('click', () => {
            document.getElementById('add-reference-section').classList.add('hidden');
            document.getElementById('new-reference-url').value = '';
        });

        document.getElementById('save-reference-btn').addEventListener('click', () => {
            this.addReferenceLink();
        });

        document.getElementById('new-reference-url').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addReferenceLink();
            }
        });

        // Summarize video in detail view
        document.getElementById('detail-summarize-btn').addEventListener('click', () => {
            this.summarizeVideo();
        });

        // Speech for detail thoughts
        const thoughtsInput = document.getElementById('detail-thoughts-input');
        const detailMic = document.getElementById('detail-mic-btn');
        this.speechInput = new SpeechInput(thoughtsInput, detailMic);
    },

    async open(recordId) {
        currentIdeaId = recordId;
        this.tabsLoaded = { details: false, brainstorm: false, actions: false };

        showView('idea-detail');

        // Reset to details tab
        this.switchTab('details');

        // Load idea data
        try {
            currentIdeaData = await AirtableAPI.getIdea(recordId);
            this.renderDetails();
            this.tabsLoaded.details = true;
        } catch (error) {
            showToast('Failed to load idea', 'error');
            Dashboard.show();
        }
    },

    renderDetails() {
        if (!currentIdeaData) return;
        const f = currentIdeaData.fields;

        // Title
        document.getElementById('detail-title').textContent = f.Title || 'Untitled';

        // Video section
        const videoSection = document.getElementById('detail-video-section');
        if (f.VideoThumbnail) {
            videoSection.classList.remove('hidden');
            document.getElementById('detail-video-thumb').src = f.VideoThumbnail;
            document.getElementById('detail-video-title').textContent = f.VideoTitle || '';
            document.getElementById('detail-video-channel').textContent = f.VideoChannel || '';
            document.getElementById('detail-video-duration').textContent = f.VideoDuration || '';
            // Set YouTube URL on thumbnail and watch button
            const ytUrl = f.YouTubeURL || '#';
            document.getElementById('detail-video-link').href = ytUrl;
            document.getElementById('detail-watch-btn').href = ytUrl;
        } else {
            videoSection.classList.add('hidden');
        }

        // Reference URLs - always show section, render links with delete buttons
        document.getElementById('add-reference-section').classList.add('hidden');
        this.renderReferenceLinks();

        // Category, Status & Priority selects
        document.getElementById('detail-category').value = f.Category || 'General';
        document.getElementById('detail-status').value = f.Status || 'Idea';
        document.getElementById('detail-priority').value = f.Priority || 'Medium';

        // Target date
        const targetRow = document.getElementById('detail-target-row');
        if (f.TargetDate) {
            targetRow.classList.remove('hidden');
            document.getElementById('detail-target-date').textContent = formatDate(f.TargetDate);
        } else {
            targetRow.classList.add('hidden');
        }

        // Created date
        document.getElementById('detail-created-date').textContent = formatDate(currentIdeaData.createdTime);

        // Thoughts
        document.getElementById('detail-thoughts-text').textContent = f.MyThoughts || '';

        // Reset add thoughts section
        document.getElementById('add-thoughts-section').classList.add('hidden');
        document.getElementById('detail-thoughts-input').value = '';
    },

    summarizeVideo() {
        if (!currentIdeaData) return;
        const url = currentIdeaData.fields.YouTubeURL;
        if (!url) {
            showToast('No YouTube URL for this idea', 'error');
            return;
        }
        // Temporarily set the form's YouTube URL so IdeaForm.summarizeVideo() can use it
        document.getElementById('idea-youtube-url').value = url;
        document.getElementById('idea-video-title').value = currentIdeaData.fields.VideoTitle || '';
        IdeaForm.summarizeVideo();
    },

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tabTarget === tabName);
        });

        // Update panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.tab === tabName);
        });

        // Lazy-load tab content
        if (tabName === 'brainstorm' && !this.tabsLoaded.brainstorm) {
            Brainstorm.open(currentIdeaId);
            this.tabsLoaded.brainstorm = true;
        }

        if (tabName === 'actions' && !this.tabsLoaded.actions) {
            ActionSteps.open(currentIdeaId);
            this.tabsLoaded.actions = true;
        }
    },

    async updateField(field, value) {
        if (!currentIdeaId) return;

        const updateFields = { [field]: value };

        // Auto-set CompletedDate when status changes to Done
        if (field === 'Status' && value === 'Done') {
            updateFields.CompletedDate = new Date().toISOString().split('T')[0];
        }

        try {
            await AirtableAPI.updateIdea(currentIdeaId, updateFields);
            // Update local data
            if (currentIdeaData) {
                currentIdeaData.fields[field] = value;
            }
            showToast(`${field} updated`, 'success');
        } catch (error) {
            showToast('Failed to update: ' + error.message, 'error');
        }
    },

    async saveThoughts() {
        if (!currentIdeaId) return;

        const newThoughts = document.getElementById('detail-thoughts-input').value.trim();
        if (!newThoughts) return;

        const existing = currentIdeaData?.fields?.MyThoughts || '';
        const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        const combined = existing
            ? `${existing}\n\n[${timestamp}]\n${newThoughts}`
            : newThoughts;

        try {
            await AirtableAPI.updateIdea(currentIdeaId, { MyThoughts: combined });

            // Update local data and UI
            if (currentIdeaData) {
                currentIdeaData.fields.MyThoughts = combined;
            }
            document.getElementById('detail-thoughts-text').textContent = combined;
            document.getElementById('detail-thoughts-input').value = '';
            document.getElementById('add-thoughts-section').classList.add('hidden');

            if (this.speechInput) this.speechInput.stop();
            showToast('Thoughts saved!', 'success');
        } catch (error) {
            showToast('Failed to save thoughts', 'error');
        }
    },

    async formatThoughts() {
        const rawText = currentIdeaData?.fields?.MyThoughts;
        if (!rawText || !rawText.trim()) {
            showToast('No thoughts to format', 'error');
            return;
        }

        const formatBtn = document.getElementById('format-thoughts-btn');
        const thoughtsEl = document.getElementById('detail-thoughts-text');

        // If already showing formatted, toggle back to raw
        if (thoughtsEl.classList.contains('formatted')) {
            thoughtsEl.classList.remove('formatted');
            thoughtsEl.textContent = rawText;
            formatBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:middle"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>Format`;
            return;
        }

        formatBtn.disabled = true;
        formatBtn.textContent = 'Formatting...';

        try {
            const ideaTitle = currentIdeaData?.fields?.Title || 'Untitled';
            const formatted = await ClaudeAPI.sendMessage(
                [{ role: 'user', content: rawText }],
                `You are a text formatter. The user has pasted raw notes/thoughts about "${ideaTitle}". Clean up and format the text into well-structured, readable content using simple markdown. Use:
- ## for section headings
- **bold** for emphasis on key terms
- Bullet lists (- item) for ingredients, supplies, or listed items
- Numbered lists (1. item) for ordered steps
- Horizontal rules (---) to separate distinct sections or dated entries

Keep ALL the original information — do not add new content or commentary. Just reorganize and format what's there. If there are timestamped entries (like [Feb 7, 10:58 AM]), keep them as section dividers. Output ONLY the formatted markdown, nothing else.`
            );

            // Convert markdown to HTML
            const html = this.markdownToHtml(formatted);
            thoughtsEl.innerHTML = html;
            thoughtsEl.classList.add('formatted');
            formatBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:middle"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Raw`;
            showToast('Thoughts formatted!', 'success');
        } catch (error) {
            showToast('Failed to format: ' + error.message, 'error');
        } finally {
            formatBtn.disabled = false;
        }
    },

    markdownToHtml(md) {
        let html = escapeHtml(md);

        // Headings: ### h3, ## h2, # h1
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Horizontal rules
        html = html.replace(/^---+$/gm, '<hr>');

        // Bold and italic
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Unordered lists (- item)
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

        // Ordered lists (1. item)
        html = html.replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>');
        html = html.replace(/((?:<oli>.*<\/oli>\n?)+)/g, (match) => {
            return '<ol>' + match.replace(/<\/?oli>/g, (tag) => tag.replace('oli', 'li')) + '</ol>';
        });

        // Paragraphs: double newlines become paragraph breaks
        html = html.replace(/\n\n+/g, '</p><p>');

        // Single newlines within paragraphs become <br>
        html = html.replace(/\n/g, '<br>');

        // Clean up: wrap in paragraphs, remove empty ones
        html = '<p>' + html + '</p>';
        html = html.replace(/<p>\s*<\/p>/g, '');
        html = html.replace(/<p>\s*(<h[123]>)/g, '$1');
        html = html.replace(/(<\/h[123]>)\s*<\/p>/g, '$1');
        html = html.replace(/<p>\s*(<hr>)\s*<\/p>/g, '$1');
        html = html.replace(/<p>\s*(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');
        html = html.replace(/<p>\s*(<ol>)/g, '$1');
        html = html.replace(/(<\/ol>)\s*<\/p>/g, '$1');
        html = html.replace(/<br>\s*(<h[123]>)/g, '$1');
        html = html.replace(/(<\/h[123]>)\s*<br>/g, '$1');
        html = html.replace(/<br>\s*(<hr>)/g, '$1');
        html = html.replace(/(<hr>)\s*<br>/g, '$1');
        html = html.replace(/<br>\s*(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)\s*<br>/g, '$1');
        html = html.replace(/<br>\s*(<ol>)/g, '$1');
        html = html.replace(/(<\/ol>)\s*<br>/g, '$1');

        return html;
    },

    printIdea() {
        if (!currentIdeaData) return;

        // Set the title for print CSS ::before pseudo-element
        const detailsPanel = document.querySelector('.tab-panel[data-tab="details"]');
        detailsPanel.dataset.printTitle = currentIdeaData.fields.Title || 'Untitled Idea';

        window.print();
    },

    async addReferenceLink() {
        const input = document.getElementById('new-reference-url');
        const url = input.value.trim();
        if (!url) {
            showToast('Please enter a URL', 'error');
            return;
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch (e) {
            showToast('Please enter a valid URL (include https://)', 'error');
            return;
        }

        const existing = currentIdeaData?.fields?.ReferenceURLs || '';
        const updated = existing ? `${existing}\n${url}` : url;

        try {
            await AirtableAPI.updateIdea(currentIdeaId, { ReferenceURLs: updated });
            if (currentIdeaData) {
                currentIdeaData.fields.ReferenceURLs = updated;
            }
            input.value = '';
            document.getElementById('add-reference-section').classList.add('hidden');
            this.renderReferenceLinks();
            showToast('Link added', 'success');
        } catch (error) {
            showToast('Failed to add link: ' + error.message, 'error');
        }
    },

    async removeReferenceLink(index) {
        const existing = currentIdeaData?.fields?.ReferenceURLs || '';
        const urls = existing.trim().split('\n').filter(u => u.trim());
        urls.splice(index, 1);
        const updated = urls.join('\n') || null;

        try {
            await AirtableAPI.updateIdea(currentIdeaId, { ReferenceURLs: updated || '' });
            if (currentIdeaData) {
                currentIdeaData.fields.ReferenceURLs = updated || '';
            }
            this.renderReferenceLinks();
            showToast('Link removed', 'success');
        } catch (error) {
            showToast('Failed to remove link: ' + error.message, 'error');
        }
    },

    renderReferenceLinks() {
        const refUrlsList = document.getElementById('detail-reference-list');
        const noRefsText = document.getElementById('no-references-text');
        const refs = currentIdeaData?.fields?.ReferenceURLs;

        if (refs && refs.trim()) {
            const urls = refs.trim().split('\n').filter(u => u.trim());
            if (urls.length > 0) {
                noRefsText.classList.add('hidden');
                refUrlsList.innerHTML = urls.map((url, idx) => {
                    const trimmed = url.trim();
                    let displayText = trimmed;
                    try {
                        const parsed = new URL(trimmed);
                        displayText = parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
                        if (displayText.length > 50) displayText = displayText.substring(0, 47) + '...';
                    } catch (e) { /* not a valid URL, show raw text */ }
                    return `<li>
                        <a href="${escapeHtml(trimmed)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayText)}</a>
                        <button class="ref-delete-btn" data-ref-index="${idx}" aria-label="Remove link">&times;</button>
                    </li>`;
                }).join('');

                // Attach delete handlers
                refUrlsList.querySelectorAll('.ref-delete-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(btn.dataset.refIndex);
                        if (confirm('Remove this reference link?')) {
                            this.removeReferenceLink(idx);
                        }
                    });
                });
                return;
            }
        }

        refUrlsList.innerHTML = '';
        noRefsText.classList.remove('hidden');
    },

    async confirmDelete() {
        if (!currentIdeaId) return;
        if (!confirm('Delete this idea? This cannot be undone.')) return;

        try {
            await AirtableAPI.deleteIdea(currentIdeaId);
            showToast('Idea deleted', 'success');
            Dashboard.show();
        } catch (error) {
            showToast('Failed to delete: ' + error.message, 'error');
        }
    }
};


// ============================================
// SETUP SCREEN LOGIC
// ============================================

const Setup = {
    init() {
        document.getElementById('setup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.save();
        });

        // Import settings on setup screen
        document.getElementById('setup-import-btn').addEventListener('click', () => {
            document.getElementById('setup-import-section').classList.remove('hidden');
            document.getElementById('setup-import-textarea').value = '';
            document.getElementById('setup-import-textarea').focus();
        });

        document.getElementById('setup-import-cancel-btn').addEventListener('click', () => {
            document.getElementById('setup-import-section').classList.add('hidden');
            document.getElementById('setup-import-textarea').value = '';
        });

        document.getElementById('setup-import-confirm-btn').addEventListener('click', async () => {
            await this.importSettings();
        });
    },

    async importSettings() {
        const json = document.getElementById('setup-import-textarea').value.trim();
        if (!json) {
            showToast('Please paste your settings JSON first', 'error');
            return;
        }

        let data;
        try {
            data = JSON.parse(json);
        } catch (e) {
            showToast('Invalid JSON format', 'error');
            return;
        }

        if (!data.airtableToken || !data.airtableBaseId || !data.claudeApiKey || !data.youtubeApiKey) {
            showToast('Missing required API keys in imported data', 'error');
            return;
        }

        // Fill in all the form fields with imported data
        document.getElementById('setup-airtable-token').value = data.airtableToken;
        document.getElementById('setup-airtable-base').value = data.airtableBaseId;
        document.getElementById('setup-claude-key').value = data.claudeApiKey;
        document.getElementById('setup-youtube-key').value = data.youtubeApiKey;
        document.getElementById('setup-gemini-key').value = data.geminiApiKey || '';

        // Hide import section
        document.getElementById('setup-import-section').classList.add('hidden');

        // Trigger the normal save flow (validates Airtable connection)
        showToast('Settings imported! Validating...', 'info');
        await this.save();
    },

    show() {
        // Pre-fill existing values if any
        const keys = getApiKeys();
        document.getElementById('setup-airtable-token').value = keys.airtableToken;
        document.getElementById('setup-airtable-base').value = keys.airtableBaseId;
        document.getElementById('setup-claude-key').value = keys.claudeApiKey;
        document.getElementById('setup-youtube-key').value = keys.youtubeApiKey;
        document.getElementById('setup-gemini-key').value = keys.geminiApiKey;

        showView('setup');
    },

    async save() {
        const statusEl = document.getElementById('setup-status');
        const saveBtn = document.getElementById('setup-save-btn');

        const keys = {
            airtableToken: document.getElementById('setup-airtable-token').value.trim(),
            airtableBaseId: document.getElementById('setup-airtable-base').value.trim(),
            claudeApiKey: document.getElementById('setup-claude-key').value.trim(),
            youtubeApiKey: document.getElementById('setup-youtube-key').value.trim(),
            geminiApiKey: document.getElementById('setup-gemini-key').value.trim()
        };

        // Validate required fields (Gemini key is optional)
        if (!keys.airtableToken || !keys.airtableBaseId || !keys.claudeApiKey || !keys.youtubeApiKey) {
            statusEl.textContent = 'Please fill in all required fields (Gemini key is optional).';
            statusEl.className = 'setup-status error';
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Validating...';
        statusEl.textContent = 'Testing Airtable connection...';
        statusEl.className = 'setup-status';

        // Save keys first (so validation can use them)
        saveApiKeys(keys);

        // Validate Airtable connection
        const result = await AirtableAPI.validateConnection();

        if (result.valid) {
            statusEl.textContent = 'Connected! Loading your ideas...';
            statusEl.className = 'setup-status success';
            setTimeout(() => Dashboard.show(), 500);
        } else {
            statusEl.textContent = `Connection failed: ${result.error}. Please check your Airtable token and Base ID.`;
            statusEl.className = 'setup-status error';
        }

        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Configuration';
    }
};


// ============================================
// APP INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    Setup.init();
    Dashboard.init();
    IdeaForm.init();
    IdeaDetail.init();
    Brainstorm.init();
    ActionSteps.init();

    // Route to setup or dashboard
    if (hasValidConfig()) {
        Dashboard.show();
    } else {
        Setup.show();
    }
});
