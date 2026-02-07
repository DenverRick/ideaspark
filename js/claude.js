// IdeaSpark Claude API Wrapper

const ClaudeAPI = {
    async sendMessage(conversationHistory, systemPrompt) {
        const keys = getApiKeys();

        const messages = conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const response = await fetch(AppConfig.CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'x-api-key': keys.claudeApiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: AppConfig.CLAUDE_MODEL,
                max_tokens: AppConfig.CLAUDE_MAX_TOKENS,
                system: systemPrompt || AppConfig.CLAUDE_SYSTEM_PROMPT,
                messages
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.error?.message || `Claude API error: ${response.status}`;
            throw new Error(message);
        }

        const data = await response.json();
        return data.content[0].text;
    },

    async generateActionPlan(conversationHistory, ideaTitle) {
        const systemPrompt = `You are a practical project planning assistant. Based on the brainstorming conversation, generate a concrete action plan with 3-7 implementation steps.

IMPORTANT: You must respond with ONLY valid JSON in this exact format, no other text:
{"steps": [{"description": "Step description here", "effort": "15min"}]}

Valid effort values are ONLY: "15min", "1hr", "3hrs", "1day"

Make steps specific, actionable, and ordered logically.`;

        const messages = [
            ...conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            {
                role: 'user',
                content: `Based on our discussion about "${ideaTitle}", generate an action plan as JSON. Remember: respond with ONLY the JSON object, no markdown or explanation.`
            }
        ];

        const keys = getApiKeys();

        const response = await fetch(AppConfig.CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'x-api-key': keys.claudeApiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: AppConfig.CLAUDE_MODEL,
                max_tokens: AppConfig.CLAUDE_MAX_TOKENS,
                system: systemPrompt,
                messages
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Claude API error: ${response.status}`);
        }

        const data = await response.json();
        let text = data.content[0].text;

        // Strip markdown code fences if present
        text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

        try {
            const parsed = JSON.parse(text);
            if (!parsed.steps || !Array.isArray(parsed.steps)) {
                throw new Error('Invalid action plan format');
            }
            // Validate effort values
            const validEfforts = ['15min', '1hr', '3hrs', '1day'];
            parsed.steps = parsed.steps.map(step => ({
                description: step.description || 'Untitled step',
                effort: validEfforts.includes(step.effort) ? step.effort : '1hr'
            }));
            return parsed;
        } catch (parseError) {
            throw new Error('Failed to parse action plan. Please try regenerating.');
        }
    }
};
