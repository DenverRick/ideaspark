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

        // Inline status/priority changes
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
        } else {
            videoSection.classList.add('hidden');
        }

        // Reference URLs
        const refUrlsContainer = document.getElementById('detail-reference-urls');
        const refUrlsList = document.getElementById('detail-reference-list');
        if (f.ReferenceURLs && f.ReferenceURLs.trim()) {
            const urls = f.ReferenceURLs.trim().split('\n').filter(u => u.trim());
            if (urls.length > 0) {
                refUrlsContainer.classList.remove('hidden');
                refUrlsList.innerHTML = urls.map(url => {
                    const trimmed = url.trim();
                    let displayText = trimmed;
                    try {
                        const parsed = new URL(trimmed);
                        displayText = parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
                        if (displayText.length > 50) displayText = displayText.substring(0, 47) + '...';
                    } catch (e) { /* not a valid URL, show raw text */ }
                    return `<li><a href="${escapeHtml(trimmed)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayText)}</a></li>`;
                }).join('');
            } else {
                refUrlsContainer.classList.add('hidden');
            }
        } else {
            refUrlsContainer.classList.add('hidden');
        }

        // Category badge
        const catEl = document.getElementById('detail-category');
        catEl.textContent = f.Category || 'General';
        catEl.style.background = AppConfig.CATEGORIES[f.Category] || '#808080';

        // Status & priority selects
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
