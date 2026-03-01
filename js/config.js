// IdeaSpark Configuration & API Key Management

const AppConfig = {
    APP_NAME: 'IdeaSpark',

    // Known category colors (used for exact name matches)
    CATEGORIES: {
        'Senior Geeks': '#7B68EE',
        'Pickleball': '#FFA500',
        'Tennis': '#32CD32',
        'Singles Club': '#FF69B4',
        'Home Projects': '#4169E1',
        'Web App Development': '#20B2AA',
        'General': '#808080'
    },

    // Fallback color palette for dynamic/unknown categories (assigned by index)
    CATEGORY_PALETTE: [
        '#7B68EE', '#FFA500', '#32CD32', '#FF69B4', '#4169E1',
        '#20B2AA', '#FF6B6B', '#4ECDC4', '#9B59B6', '#E67E22'
    ],

    // Known category emojis
    CATEGORY_EMOJIS: {
        'Senior Geeks': '💻',
        'Senior Geeks Presentation': '📊',
        'Pickleball': '🏓',
        'Tennis': '🎾',
        'Singles Club': '🥂',
        'Home Projects': '🔨',
        'Web App Development': '🌐',
        'General': '💡',
        'TV Shows': '📺',
        'Food': '🍽️',
        'Tools': '🔧'
    },

    STATUSES: {
        'Idea': '#6C757D',
        'Task': '#4A90E2',
        'In Progress': '#F0AD4E',
        'Done': '#5CB85C'
    },

    PRIORITIES: {
        'High': { color: '#D9534F', emoji: '\uD83D\uDD34' },
        'Medium': { color: '#F0AD4E', emoji: '\uD83D\uDFE1' },
        'Low': { color: '#5CB85C', emoji: '\uD83D\uDFE2' }
    },

    AIRTABLE_API_URL: 'https://api.airtable.com/v0',
    CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
    YOUTUBE_API_URL: 'https://www.googleapis.com/youtube/v3/videos',
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
    GEMINI_MODEL: 'gemini-2.5-flash',

    CLAUDE_MODEL: 'claude-sonnet-4-5-20250929',
    CLAUDE_MAX_TOKENS: 2000,
    CLAUDE_SYSTEM_PROMPT: `You are a creative brainstorming assistant helping Rick develop ideas for his senior community clubs and projects. Be enthusiastic, practical, and suggest concrete implementation steps. Consider Rick's technical skills in Arduino C++ and web development (HTML/JavaScript). Keep responses conversational and focused.`,

    MAX_CONVERSATION_HISTORY: 20,

    STORAGE_KEYS: {
        AIRTABLE_TOKEN: 'ideaspark_airtable_token',
        AIRTABLE_BASE_ID: 'ideaspark_airtable_base_id',
        CLAUDE_API_KEY: 'ideaspark_claude_api_key',
        YOUTUBE_API_KEY: 'ideaspark_youtube_api_key',
        GEMINI_API_KEY: 'ideaspark_gemini_api_key',
        CATEGORIES: 'ideaspark_categories'
    },

    TABLE_NAMES: {
        IDEAS: 'IDEAS',
        CONVERSATIONS: 'CONVERSATIONS',
        ACTION_STEPS: 'ACTION_STEPS'
    }
};

function getApiKeys() {
    return {
        airtableToken: localStorage.getItem(AppConfig.STORAGE_KEYS.AIRTABLE_TOKEN) || '',
        airtableBaseId: localStorage.getItem(AppConfig.STORAGE_KEYS.AIRTABLE_BASE_ID) || '',
        claudeApiKey: localStorage.getItem(AppConfig.STORAGE_KEYS.CLAUDE_API_KEY) || '',
        youtubeApiKey: localStorage.getItem(AppConfig.STORAGE_KEYS.YOUTUBE_API_KEY) || '',
        geminiApiKey: localStorage.getItem(AppConfig.STORAGE_KEYS.GEMINI_API_KEY) || ''
    };
}

function saveApiKeys(keys) {
    localStorage.setItem(AppConfig.STORAGE_KEYS.AIRTABLE_TOKEN, keys.airtableToken);
    localStorage.setItem(AppConfig.STORAGE_KEYS.AIRTABLE_BASE_ID, keys.airtableBaseId);
    localStorage.setItem(AppConfig.STORAGE_KEYS.CLAUDE_API_KEY, keys.claudeApiKey);
    localStorage.setItem(AppConfig.STORAGE_KEYS.YOUTUBE_API_KEY, keys.youtubeApiKey);
    if (keys.geminiApiKey !== undefined) {
        localStorage.setItem(AppConfig.STORAGE_KEYS.GEMINI_API_KEY, keys.geminiApiKey);
    }
}

function hasValidConfig() {
    const keys = getApiKeys();
    return keys.airtableToken && keys.airtableBaseId && keys.claudeApiKey && keys.youtubeApiKey;
}

function clearConfig() {
    Object.values(AppConfig.STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}

// ---- Dynamic Category Helpers ----

function getCategories() {
    const cached = localStorage.getItem(AppConfig.STORAGE_KEYS.CATEGORIES);
    if (cached) {
        try { return JSON.parse(cached); } catch (e) {}
    }
    // Fall back to built-in defaults
    return Object.keys(AppConfig.CATEGORIES);
}

function saveCategories(categories) {
    localStorage.setItem(AppConfig.STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
}

function getCategoryColor(name) {
    // Use known color if available
    if (AppConfig.CATEGORIES[name]) return AppConfig.CATEGORIES[name];
    // Assign from palette by index in the current category list
    const cats = getCategories();
    const idx = cats.indexOf(name);
    const paletteIdx = idx >= 0 ? idx : 0;
    return AppConfig.CATEGORY_PALETTE[paletteIdx % AppConfig.CATEGORY_PALETTE.length];
}

function getCategoryEmoji(name) {
    return AppConfig.CATEGORY_EMOJIS[name] || '💡';
}
