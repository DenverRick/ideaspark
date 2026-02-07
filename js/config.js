// IdeaSpark Configuration & API Key Management

const AppConfig = {
    APP_NAME: 'IdeaSpark',

    CATEGORIES: {
        'Senior Geeks': '#7B68EE',
        'Pickleball': '#FFA500',
        'Tennis': '#32CD32',
        'Singles Club': '#FF69B4',
        'Home Projects': '#4169E1',
        'General': '#808080'
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

    CLAUDE_MODEL: 'claude-sonnet-4-5-20250929',
    CLAUDE_MAX_TOKENS: 2000,
    CLAUDE_SYSTEM_PROMPT: `You are a creative brainstorming assistant helping Rick develop ideas for his senior community clubs and projects. Be enthusiastic, practical, and suggest concrete implementation steps. Consider Rick's technical skills in Arduino C++ and web development (HTML/JavaScript). Keep responses conversational and focused.`,

    MAX_CONVERSATION_HISTORY: 20,

    STORAGE_KEYS: {
        AIRTABLE_TOKEN: 'ideaspark_airtable_token',
        AIRTABLE_BASE_ID: 'ideaspark_airtable_base_id',
        CLAUDE_API_KEY: 'ideaspark_claude_api_key',
        YOUTUBE_API_KEY: 'ideaspark_youtube_api_key'
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
        youtubeApiKey: localStorage.getItem(AppConfig.STORAGE_KEYS.YOUTUBE_API_KEY) || ''
    };
}

function saveApiKeys(keys) {
    localStorage.setItem(AppConfig.STORAGE_KEYS.AIRTABLE_TOKEN, keys.airtableToken);
    localStorage.setItem(AppConfig.STORAGE_KEYS.AIRTABLE_BASE_ID, keys.airtableBaseId);
    localStorage.setItem(AppConfig.STORAGE_KEYS.CLAUDE_API_KEY, keys.claudeApiKey);
    localStorage.setItem(AppConfig.STORAGE_KEYS.YOUTUBE_API_KEY, keys.youtubeApiKey);
}

function hasValidConfig() {
    const keys = getApiKeys();
    return keys.airtableToken && keys.airtableBaseId && keys.claudeApiKey && keys.youtubeApiKey;
}

function clearConfig() {
    Object.values(AppConfig.STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}
