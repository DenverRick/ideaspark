// IdeaSpark Utility Functions

function showView(viewName) {
    document.querySelectorAll('[data-view]').forEach(el => el.classList.remove('active'));
    const view = document.querySelector(`[data-view="${viewName}"]`);
    if (view) view.classList.add('active');
}

// Toast notifications
let toastTimeout = null;
let toastFadeTimeout = null;
function showToast(message, type = 'error') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    // Clear any existing timeouts
    clearTimeout(toastTimeout);
    clearTimeout(toastFadeTimeout);

    toast.textContent = message;
    toast.className = `toast toast-${type} toast-show`;

    // Auto-dismiss: success/info 3s, error 5s
    const duration = (type === 'error') ? 5000 : 3000;
    toastTimeout = setTimeout(() => {
        toast.classList.remove('toast-show');
        // Fully hide after transition completes
        toastFadeTimeout = setTimeout(() => {
            toast.className = 'toast';
        }, 350);
    }, duration);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
}

function debounce(fn, ms) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

function extractVideoId(url) {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function formatDuration(iso8601) {
    if (!iso8601) return '';
    const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
}

// Simple loading overlay
function showLoading(container) {
    let overlay = container.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        container.appendChild(overlay);
    }
    overlay.classList.add('visible');
}

function hideLoading(container) {
    const overlay = container.querySelector('.loading-overlay');
    if (overlay) overlay.classList.remove('visible');
}

// Populate all category selects and pill buttons dynamically
function populateCategorySelects(categories) {
    // Dashboard filter — horizontal pill row with "All" first
    const filterPills = document.getElementById('filter-category-pills');
    if (filterPills) {
        const currentFilter = (typeof Dashboard !== 'undefined') ? Dashboard.currentFilter.category : '';
        filterPills.innerHTML = '';

        // "All" pill
        const allPill = document.createElement('button');
        allPill.type = 'button';
        allPill.className = 'category-pill filter-pill' + (currentFilter === '' ? ' selected' : '');
        allPill.dataset.value = '';
        allPill.textContent = 'All';
        if (currentFilter === '') {
            allPill.style.background = 'var(--primary)';
            allPill.style.color = 'white';
        }
        allPill.addEventListener('click', () => {
            _selectFilterPill(filterPills, '');
            if (typeof Dashboard !== 'undefined') Dashboard._setCategoryFilter('');
        });
        filterPills.appendChild(allPill);

        categories.forEach(cat => {
            const color = getCategoryColor(cat);
            const emoji = getCategoryEmoji(cat);
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'category-pill filter-pill' + (currentFilter === cat ? ' selected' : '');
            pill.dataset.value = cat;
            pill.style.borderColor = color;
            pill.innerHTML = `<span>${emoji}</span>${escapeHtml(cat)}`;
            if (currentFilter === cat) {
                pill.style.background = color;
                pill.style.color = 'white';
            }
            pill.addEventListener('click', () => {
                _selectFilterPill(filterPills, cat);
                if (typeof Dashboard !== 'undefined') Dashboard._setCategoryFilter(cat);
            });
            filterPills.appendChild(pill);
        });
    }

    // Idea form pill selector
    const pillsContainer = document.getElementById('idea-category-pills');
    const hiddenCatInput = document.getElementById('idea-category');
    if (pillsContainer) {
        pillsContainer.innerHTML = '';
        categories.forEach(cat => {
            const color = getCategoryColor(cat);
            const emoji = getCategoryEmoji(cat);
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'category-pill';
            pill.dataset.value = cat;
            pill.style.borderColor = color;
            pill.innerHTML = `<span>${emoji}</span>${escapeHtml(cat)}`;
            pill.addEventListener('click', () => {
                // Deselect all, select this one
                pillsContainer.querySelectorAll('.category-pill').forEach(p => {
                    p.classList.remove('selected');
                    p.style.background = '';
                    p.style.color = '';
                });
                pill.classList.add('selected');
                pill.style.background = color;
                pill.style.color = 'white';
                if (hiddenCatInput) hiddenCatInput.value = cat;
            });
            pillsContainer.appendChild(pill);
        });
    }

    // Detail view inline select — no placeholder, just categories
    const detailSel = document.getElementById('detail-category');
    if (detailSel) {
        // Preserve current value to re-select after repopulating
        const currentVal = detailSel.value;
        detailSel.innerHTML = '';
        categories.forEach(cat => detailSel.add(new Option(cat, cat)));
        if (currentVal) detailSel.value = currentVal;
    }
}

// Update visual state of filter pills in the dashboard bar
function _selectFilterPill(container, value) {
    container.querySelectorAll('.filter-pill').forEach(p => {
        const isMatch = p.dataset.value === value;
        p.classList.toggle('selected', isMatch);
        if (isMatch) {
            p.style.background = value === '' ? 'var(--primary)' : getCategoryColor(p.dataset.value);
            p.style.color = 'white';
        } else {
            p.style.background = '';
            p.style.color = '';
        }
    });
}

// Fetch fresh categories from Airtable and update all selects + cache
function refreshCategories() {
    AirtableAPI.fetchCategories()
        .then(cats => {
            saveCategories(cats);
            populateCategorySelects(cats);
        })
        .catch(err => {
            console.warn('Could not fetch categories from Airtable:', err.message);
            if (err.message.includes('403') || err.message.includes('401')) {
                showToast('Add "schema.bases:read" scope to your Airtable token for dynamic categories', 'info');
            }
        });
}

// Current idea state (shared across tabs)
let currentIdeaId = null;
let currentIdeaData = null;
