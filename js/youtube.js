// IdeaSpark YouTube Data API Wrapper

const YouTubeAPI = {
    async fetchVideoMetadata(url) {
        const videoId = extractVideoId(url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        const keys = getApiKeys();
        const apiUrl = `${AppConfig.YOUTUBE_API_URL}?key=${encodeURIComponent(keys.youtubeApiKey)}&part=snippet,contentDetails&id=${encodeURIComponent(videoId)}`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
            const errMsg = data?.error?.message || `HTTP ${response.status}`;
            const errReason = data?.error?.errors?.[0]?.reason || '';
            if (response.status === 403) {
                throw new Error(`YouTube API key error: ${errMsg}. Check that your key is valid and YouTube Data API v3 is enabled in Google Cloud Console.`);
            }
            throw new Error(`YouTube API error (${response.status}): ${errMsg} ${errReason}`);
        }

        if (!data.items || data.items.length === 0) {
            throw new Error('Video not found');
        }

        const video = data.items[0];
        return {
            videoId,
            title: video.snippet.title,
            thumbnailUrl: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
            channel: video.snippet.channelTitle,
            duration: formatDuration(video.contentDetails.duration)
        };
    },

    // Debug log collector for transcript fetching
    _debugLog: [],

    _log(step, message, data = null) {
        const entry = { step, message, time: new Date().toISOString() };
        if (data !== null) entry.data = data;
        this._debugLog.push(entry);
        console.log(`[Transcript ${step}]`, message, data || '');
    },

    getDebugLog() {
        return this._debugLog.map(e => {
            let line = `[${e.step}] ${e.message}`;
            if (e.data) line += '\n  → ' + (typeof e.data === 'string' ? e.data : JSON.stringify(e.data, null, 2));
            return line;
        }).join('\n');
    },

    // Fetch video transcript — tries multiple strategies
    async fetchTranscript(videoId) {
        this._debugLog = [];
        this._log('START', `Fetching transcript for videoId: ${videoId}`);

        const PROXY = 'https://corsproxy.io/?';

        // Strategy 1: Innertube API with different client identities
        const CLIENT_CONFIGS = [
            {
                name: 'ANDROID',
                context: {
                    client: {
                        clientName: 'ANDROID',
                        clientVersion: '19.09.37',
                        androidSdkVersion: 30,
                        hl: 'en',
                        gl: 'US'
                    }
                }
            },
            {
                name: 'IOS',
                context: {
                    client: {
                        clientName: 'IOS',
                        clientVersion: '19.09.3',
                        deviceMake: 'Apple',
                        deviceModel: 'iPhone14,3',
                        hl: 'en',
                        gl: 'US'
                    }
                }
            },
            {
                name: 'WEB',
                context: {
                    client: {
                        clientName: 'WEB',
                        clientVersion: '2.20250101.00.00'
                    }
                }
            }
        ];

        let lastError = null;

        // Try each client identity via Innertube
        for (const config of CLIENT_CONFIGS) {
            try {
                this._log('CLIENT', `Trying Innertube with ${config.name} client...`);
                const result = await this._fetchViaInnertube(videoId, PROXY, config);
                this._log('SUCCESS', `Got transcript via ${config.name}`, { length: result.text.length, language: result.language });
                return result;
            } catch (error) {
                this._log('CLIENT_FAIL', `${config.name} failed: ${error.message}`);
                lastError = error;
            }
        }

        // Strategy 2: Scrape the watch page for embedded caption URLs
        try {
            this._log('SCRAPE', 'Trying watch page scrape method...');
            const result = await this._fetchViaWatchPage(videoId, PROXY);
            this._log('SUCCESS', `Got transcript via watch page scrape`, { length: result.text.length, language: result.language });
            return result;
        } catch (error) {
            this._log('SCRAPE_FAIL', `Watch page scrape failed: ${error.message}`);
            lastError = error;
        }

        // Strategy 3: Try alternative proxy with Android client
        try {
            const altProxy = 'https://api.allorigins.win/raw?url=';
            this._log('ALT_PROXY', 'Trying allorigins proxy with ANDROID client...');
            const result = await this._fetchViaInnertube(videoId, altProxy, CLIENT_CONFIGS[0]);
            this._log('SUCCESS', `Got transcript via allorigins + ANDROID`, { length: result.text.length, language: result.language });
            return result;
        } catch (error) {
            this._log('ALT_PROXY_FAIL', `allorigins failed: ${error.message}`);
        }

        this._log('FAILED', 'All transcript methods exhausted');
        throw lastError || new Error('All transcript methods failed');
    },

    // Method 1: Innertube player API
    async _fetchViaInnertube(videoId, proxyUrl, clientConfig) {
        const targetUrl = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
        const playerUrl = `${proxyUrl}${encodeURIComponent(targetUrl)}`;

        this._log('PLAYER', `POST ${clientConfig.name} via ${playerUrl.substring(0, 60)}...`);

        const playerResponse = await fetch(playerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                context: clientConfig.context,
                videoId: videoId
            })
        });

        this._log('PLAYER', `Response status: ${playerResponse.status}`);

        if (!playerResponse.ok) {
            const errorText = await playerResponse.text().catch(() => 'unable to read body');
            this._log('PLAYER', `Error body: ${errorText.substring(0, 300)}`);
            throw new Error(`Player API returned ${playerResponse.status}`);
        }

        let playerData;
        try {
            playerData = await playerResponse.json();
        } catch (e) {
            this._log('PLAYER', 'Response was not valid JSON');
            throw new Error('Player response was not valid JSON');
        }

        const topKeys = Object.keys(playerData);
        this._log('PLAYER', `Response keys: ${topKeys.join(', ')}`);

        const playability = playerData?.playabilityStatus;
        if (playability) {
            this._log('PLAYER', `Playability: ${playability.status}`, {
                status: playability.status,
                reason: playability.reason || 'none'
            });
            if (playability.status !== 'OK') {
                throw new Error(`Video ${playability.status}: ${playability.reason || 'unavailable'}`);
            }
        }

        const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (!captionTracks || captionTracks.length === 0) {
            const hasCaptions = !!playerData?.captions;
            const hasRenderer = !!playerData?.captions?.playerCaptionsTracklistRenderer;
            this._log('CAPTIONS', 'No caption tracks found', {
                hasCaptionsKey: hasCaptions,
                hasRenderer: hasRenderer,
                captionsKeys: hasCaptions ? Object.keys(playerData.captions) : 'N/A'
            });
            throw new Error('No captions available for this video');
        }

        this._log('CAPTIONS', `Found ${captionTracks.length} track(s)`,
            captionTracks.map(t => ({ lang: t.languageCode, kind: t.kind || 'manual', name: t.name?.simpleText || '' }))
        );

        return await this._downloadCaptions(captionTracks, proxyUrl);
    },

    // Method 2: Scrape watch page for caption data embedded in HTML
    async _fetchViaWatchPage(videoId, proxyUrl) {
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const pageUrl = `${proxyUrl}${encodeURIComponent(watchUrl)}`;

        this._log('SCRAPE', `Fetching watch page...`);

        const response = await fetch(pageUrl);
        this._log('SCRAPE', `Response status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`Watch page returned ${response.status}`);
        }

        const html = await response.text();
        this._log('SCRAPE', `Got ${html.length} chars of HTML`);

        // Look for caption tracks in the embedded ytInitialPlayerResponse
        const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
        if (!playerMatch) {
            // Try alternative pattern
            const altMatch = html.match(/"captions":\s*(\{.+?"captionTracks":.+?\})\s*,\s*"/s);
            if (!altMatch) {
                this._log('SCRAPE', 'Could not find player response or caption data in page HTML');
                throw new Error('No caption data found in watch page');
            }
            // Try to parse just the captions object
            try {
                const captionsObj = JSON.parse(altMatch[1]);
                const tracks = captionsObj?.playerCaptionsTracklistRenderer?.captionTracks;
                if (tracks && tracks.length > 0) {
                    this._log('SCRAPE', `Found ${tracks.length} tracks via alt pattern`);
                    return await this._downloadCaptions(tracks, proxyUrl);
                }
            } catch (e) {
                this._log('SCRAPE', `Alt pattern parse failed: ${e.message}`);
            }
            throw new Error('Could not parse caption data from watch page');
        }

        let playerData;
        try {
            // The JSON can be very large, try to parse it
            playerData = JSON.parse(playerMatch[1]);
        } catch (e) {
            this._log('SCRAPE', `Failed to parse ytInitialPlayerResponse JSON: ${e.message}`);
            throw new Error('Failed to parse player data from watch page');
        }

        const playability = playerData?.playabilityStatus;
        if (playability) {
            this._log('SCRAPE', `Playability from page: ${playability.status}`);
        }

        const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (!captionTracks || captionTracks.length === 0) {
            this._log('SCRAPE', 'No caption tracks in scraped player data');
            throw new Error('No captions in watch page data');
        }

        this._log('SCRAPE', `Found ${captionTracks.length} track(s) from watch page`,
            captionTracks.map(t => ({ lang: t.languageCode, kind: t.kind || 'manual' }))
        );

        return await this._downloadCaptions(captionTracks, proxyUrl);
    },

    // Shared: pick best track and download caption text
    async _downloadCaptions(captionTracks, proxyUrl) {
        // Find English captions (prefer manual over auto-generated)
        let track = captionTracks.find(t => t.languageCode === 'en' && t.kind !== 'asr');
        if (!track) {
            track = captionTracks.find(t => t.languageCode?.startsWith('en'));
        }
        if (!track) {
            track = captionTracks[0];
        }

        this._log('CAPTIONS', `Selected: ${track.languageCode} (${track.kind || 'manual'})`);

        const captionUrl = track.baseUrl + '&fmt=json3';
        this._log('FETCH', 'Downloading caption text...');

        const captionResponse = await fetch(`${proxyUrl}${encodeURIComponent(captionUrl)}`);
        this._log('FETCH', `Caption response: ${captionResponse.status}`);

        if (!captionResponse.ok) {
            throw new Error(`Caption fetch returned ${captionResponse.status}`);
        }

        let captionData;
        try {
            captionData = await captionResponse.json();
        } catch (e) {
            this._log('FETCH', 'Caption response was not valid JSON');
            throw new Error('Caption response was not valid JSON');
        }

        if (!captionData.events) {
            this._log('FETCH', `Caption data keys: ${Object.keys(captionData).join(', ')}`);
            throw new Error('No transcript events in caption data');
        }

        const lines = captionData.events
            .filter(event => event.segs)
            .map(event => {
                const text = event.segs.map(seg => seg.utf8 || '').join('');
                return text.trim();
            })
            .filter(line => line.length > 0);

        this._log('PARSE', `Parsed ${lines.length} lines from ${captionData.events.length} events`);

        if (lines.length === 0) {
            throw new Error('Transcript is empty after parsing');
        }

        return {
            text: lines.join(' '),
            language: track.languageCode,
            isAutoGenerated: track.kind === 'asr'
        };
    }
};
