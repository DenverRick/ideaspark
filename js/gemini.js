// IdeaSpark Gemini API Wrapper (for YouTube video summaries)

const GeminiAPI = {
    async summarizeYouTubeVideo(youtubeUrl, videoTitle) {
        const keys = getApiKeys();

        if (!keys.geminiApiKey) {
            throw new Error('Gemini API key not configured. Add it in Settings to enable video summaries.');
        }

        const apiUrl = `${AppConfig.GEMINI_API_URL}/${AppConfig.GEMINI_MODEL}:generateContent?key=${encodeURIComponent(keys.geminiApiKey)}`;

        const prompt = `Summarize this YouTube video concisely. Include:
1. A brief overview (2-3 sentences)
2. Key points or takeaways (bullet points)
3. Any actionable ideas or tips mentioned

Format your response with markdown headers (### ) and bullet points for easy reading. Keep it focused and practical.`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            file_data: {
                                file_uri: youtubeUrl
                            }
                        }
                    ]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.error?.message || `Gemini API error: ${response.status}`;

            if (response.status === 400 && message.includes('INVALID_ARGUMENT')) {
                throw new Error('Gemini could not process this video. It may be private, age-restricted, or too long.');
            }
            if (response.status === 403) {
                throw new Error('Gemini API key error. Check that your key is valid at aistudio.google.com/apikey');
            }

            // Rate limit / quota exceeded (HTTP 429 or quota message)
            if (response.status === 429 || message.toLowerCase().includes('quota')) {
                // Try to extract retry delay from message
                const retryMatch = message.match(/retry in ([\d.]+)s/i);
                const retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
                throw new Error(`RATE_LIMIT:${retrySec}:Free-tier quota reached. Wait ~${retrySec}s and tap "Try Again". Video summarization uses many tokens — if this happens often, upgrade at ai.google.dev/pricing.`);
            }

            throw new Error(message);
        }

        const data = await response.json();

        // Extract text from Gemini response
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            const finishReason = data?.candidates?.[0]?.finishReason;
            if (finishReason === 'SAFETY') {
                throw new Error('Gemini blocked this content due to safety filters.');
            }
            throw new Error('Gemini returned an empty response. The video may not be accessible.');
        }

        return text;
    }
};
