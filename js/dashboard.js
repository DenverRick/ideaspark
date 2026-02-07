// IdeaSpark - Dashboard Logic

const Dashboard = {
    currentFilter: { status: '', category: '' },
    currentSort: { field: 'Created', direction: 'desc' },

    init() {
        // Filter handlers
        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.currentFilter.status = e.target.value;
            this.loadIdeas();
        });

        document.getElementById('filter-category').addEventListener('change', (e) => {
            this.currentFilter.category = e.target.value;
            this.loadIdeas();
        });

        document.getElementById('sort-select').addEventListener('change', (e) => {
            const [field, direction] = e.target.value.split('-');
            this.currentSort = { field, direction };
            this.loadIdeas();
        });

        // FAB
        document.getElementById('fab-add').addEventListener('click', () => {
            IdeaForm.open();
        });

        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettings();
        });

        document.getElementById('settings-close').addEventListener('click', () => {
            document.getElementById('settings-modal').classList.remove('active');
        });

        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.currentTarget.classList.remove('active');
            }
        });

        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
    },

    async show() {
        showView('dashboard');
        await this.loadIdeas();
    },

    async loadIdeas() {
        const list = document.getElementById('ideas-list');

        // Show skeleton loading
        list.innerHTML = this._skeletonHTML(5);

        try {
            const filterParts = [];
            if (this.currentFilter.status) {
                filterParts.push(`{Status}="${this.currentFilter.status}"`);
            }
            if (this.currentFilter.category) {
                filterParts.push(`{Category}="${this.currentFilter.category}"`);
            }

            let filterFormula = '';
            if (filterParts.length === 1) {
                filterFormula = filterParts[0];
            } else if (filterParts.length > 1) {
                filterFormula = `AND(${filterParts.join(',')})`;
            }

            const records = await AirtableAPI.listIdeas({
                filterFormula,
                sortField: this.currentSort.field,
                sortDirection: this.currentSort.direction
            });

            this.renderIdeas(records);
        } catch (error) {
            list.innerHTML = `<div class="empty-state"><p>Failed to load ideas. Check your connection and API keys.</p><button class="btn btn-primary btn-small" onclick="Dashboard.loadIdeas()">Retry</button></div>`;
            showToast(error.message, 'error');
        }
    },

    renderIdeas(records) {
        const list = document.getElementById('ideas-list');

        if (records.length === 0) {
            list.innerHTML = `<div class="empty-state"><p>No ideas yet! Tap the + button to add your first idea.</p></div>`;
            return;
        }

        list.innerHTML = records.map(record => this._cardHTML(record)).join('');

        // Add click handlers
        list.querySelectorAll('.idea-card').forEach(card => {
            card.addEventListener('click', () => {
                const recordId = card.dataset.id;
                IdeaDetail.open(recordId);
            });
        });
    },

    _cardHTML(record) {
        const f = record.fields;
        const categoryColor = AppConfig.CATEGORIES[f.Category] || '#808080';
        const statusColor = AppConfig.STATUSES[f.Status] || '#6C757D';
        const priority = AppConfig.PRIORITIES[f.Priority] || AppConfig.PRIORITIES.Medium;

        const thumbHTML = f.VideoThumbnail
            ? `<img class="card-thumb" src="${escapeHtml(f.VideoThumbnail)}" alt="" loading="lazy">`
            : `<div class="card-thumb-placeholder">\uD83D\uDCA1</div>`;

        const snippet = truncateText(f.MyThoughts, 60);
        const dateStr = formatRelativeDate(record.createdTime);
        const targetStr = f.TargetDate ? `\uD83D\uDCC5 ${formatDate(f.TargetDate)}` : '';

        return `
            <div class="idea-card" data-id="${record.id}">
                ${thumbHTML}
                <div class="card-body">
                    <div class="card-title">${escapeHtml(f.Title)}</div>
                    <div class="card-badges">
                        <span class="badge" style="background:${categoryColor}">${escapeHtml(f.Category || 'General')}</span>
                        <span class="badge" style="background:${statusColor}">${escapeHtml(f.Status || 'Idea')}</span>
                    </div>
                    ${snippet ? `<div class="card-snippet">${escapeHtml(snippet)}</div>` : ''}
                    <div class="card-footer">
                        <span class="card-date">${dateStr} ${targetStr}</span>
                        <span class="card-priority">${priority.emoji}</span>
                    </div>
                </div>
            </div>
        `;
    },

    _skeletonHTML(count) {
        return Array(count).fill(`
            <div class="skeleton-card">
                <div class="skeleton-thumb"></div>
                <div class="skeleton-body">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                </div>
            </div>
        `).join('');
    },

    openSettings() {
        const keys = getApiKeys();
        document.getElementById('settings-airtable-token').value = keys.airtableToken;
        document.getElementById('settings-airtable-base').value = keys.airtableBaseId;
        document.getElementById('settings-claude-key').value = keys.claudeApiKey;
        document.getElementById('settings-youtube-key').value = keys.youtubeApiKey;
        document.getElementById('settings-gemini-key').value = keys.geminiApiKey;
        document.getElementById('settings-modal').classList.add('active');
    },

    async saveSettings() {
        const keys = {
            airtableToken: document.getElementById('settings-airtable-token').value.trim(),
            airtableBaseId: document.getElementById('settings-airtable-base').value.trim(),
            claudeApiKey: document.getElementById('settings-claude-key').value.trim(),
            youtubeApiKey: document.getElementById('settings-youtube-key').value.trim(),
            geminiApiKey: document.getElementById('settings-gemini-key').value.trim()
        };

        saveApiKeys(keys);
        document.getElementById('settings-modal').classList.remove('active');
        showToast('Settings updated!', 'success');
        this.loadIdeas();
    }
};
