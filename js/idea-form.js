// IdeaSpark - Idea Form Logic (Add/Edit)

const IdeaForm = {
    editingRecordId: null,
    speechInput: null,
    youtubeDebounce: null,

    init() {
        // Back button
        document.getElementById('form-back-btn').addEventListener('click', () => {
            this.cancel();
        });

        // Cancel button
        document.getElementById('idea-cancel-btn').addEventListener('click', () => {
            this.cancel();
        });

        // Form submit
        document.getElementById('idea-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.save();
        });

        // Delete button
        document.getElementById('idea-delete-btn').addEventListener('click', () => {
            this.confirmDelete();
        });

        // YouTube URL handler — wrap in catch to prevent unhandled promise rejections
        const ytInput = document.getElementById('idea-youtube-url');
        const safeFetch = () => this.fetchYouTubeMetadata().catch(() => {});
        this.youtubeDebounce = debounce(safeFetch, 500);
        ytInput.addEventListener('blur', safeFetch);
        ytInput.addEventListener('input', () => this.youtubeDebounce());

        // Summarize Video button
        document.getElementById('summarize-video-btn').addEventListener('click', () => {
            this.summarizeVideo();
        });

        // Summary modal close
        document.getElementById('summary-close').addEventListener('click', () => {
            document.getElementById('summary-modal').classList.remove('active');
        });
        document.getElementById('summary-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
        });

        // Summary copy button
        document.getElementById('summary-copy-btn').addEventListener('click', () => {
            const content = document.getElementById('summary-content');
            const text = content.innerText || content.textContent;
            navigator.clipboard.writeText(text).then(() => {
                showToast('Summary copied!', 'success');
            }).catch(() => {
                // Fallback: select text for manual copy
                const range = document.createRange();
                range.selectNodeContents(content);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                showToast('Text selected — use Cmd+C to copy', 'info');
            });
        });

        // Paste summary to My Thoughts (works from both form and detail views)
        document.getElementById('summary-to-thoughts-btn').addEventListener('click', () => {
            const content = document.getElementById('summary-content');
            const text = content.innerText || content.textContent;

            // Detect which view is active
            const detailView = document.querySelector('[data-view="idea-detail"]');
            if (detailView && detailView.classList.contains('active')) {
                // In detail view — append via the "add thoughts" flow
                const thoughtsInput = document.getElementById('detail-thoughts-input');
                thoughtsInput.value = text;
                document.getElementById('add-thoughts-section').classList.remove('hidden');
                document.getElementById('summary-modal').classList.remove('active');
                showToast('Summary added — tap Save to keep it', 'info');
            } else {
                // In idea form — append to textarea
                const thoughts = document.getElementById('idea-thoughts');
                const existing = thoughts.value;
                const separator = existing && !existing.endsWith('\n') ? '\n\n' : '';
                thoughts.value = existing + separator + text;
                document.getElementById('summary-modal').classList.remove('active');
                showToast('Summary pasted to My Thoughts', 'success');
            }
        });

        // Speech input
        const textarea = document.getElementById('idea-thoughts');
        const micBtn = document.getElementById('form-mic-btn');
        this.speechInput = new SpeechInput(textarea, micBtn);
    },

    open(recordId = null) {
        this.editingRecordId = recordId;
        this.resetForm();

        const deleteBtn = document.getElementById('idea-delete-btn');
        if (recordId) {
            document.getElementById('form-title').textContent = 'Edit Idea';
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.remove('hidden');
            this.loadIdea(recordId);
        } else {
            document.getElementById('form-title').textContent = 'New Idea';
            deleteBtn.textContent = 'Discard';
            deleteBtn.classList.remove('hidden');
        }

        showView('idea-form');
    },

    resetForm() {
        document.getElementById('idea-form').reset();
        document.getElementById('idea-record-id').value = '';
        document.getElementById('idea-video-title').value = '';
        document.getElementById('idea-video-thumbnail').value = '';
        document.getElementById('idea-video-channel').value = '';
        document.getElementById('idea-video-duration').value = '';
        document.getElementById('video-preview').classList.add('hidden');
        document.getElementById('summarize-video-btn').classList.add('hidden');
        document.getElementById('idea-reference-urls').value = '';

        // Reset priority to Medium
        const mediumRadio = document.querySelector('input[name="idea-priority"][value="Medium"]');
        if (mediumRadio) mediumRadio.checked = true;
    },

    async loadIdea(recordId) {
        try {
            const record = await AirtableAPI.getIdea(recordId);
            const f = record.fields;

            document.getElementById('idea-title').value = f.Title || '';
            document.getElementById('idea-youtube-url').value = f.YouTubeURL || '';
            document.getElementById('idea-category').value = f.Category || '';
            document.getElementById('idea-status').value = f.Status || 'Idea';
            document.getElementById('idea-target-date').value = f.TargetDate || '';
            document.getElementById('idea-thoughts').value = f.MyThoughts || '';
            document.getElementById('idea-reference-urls').value = f.ReferenceURLs || '';
            document.getElementById('idea-record-id').value = recordId;

            // Priority radio
            const priorityRadio = document.querySelector(`input[name="idea-priority"][value="${f.Priority || 'Medium'}"]`);
            if (priorityRadio) priorityRadio.checked = true;

            // Video metadata
            if (f.VideoTitle) {
                document.getElementById('idea-video-title').value = f.VideoTitle;
                document.getElementById('idea-video-thumbnail').value = f.VideoThumbnail || '';
                document.getElementById('idea-video-channel').value = f.VideoChannel || '';
                document.getElementById('idea-video-duration').value = f.VideoDuration || '';
                this.showVideoPreview({
                    title: f.VideoTitle,
                    thumbnailUrl: f.VideoThumbnail,
                    channel: f.VideoChannel,
                    duration: f.VideoDuration
                });
            }
        } catch (error) {
            showToast('Failed to load idea: ' + error.message, 'error');
            Dashboard.show();
        }
    },

    async fetchYouTubeMetadata() {
        const url = document.getElementById('idea-youtube-url').value.trim();
        const preview = document.getElementById('video-preview');

        if (!url) {
            preview.classList.add('hidden');
            return;
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            // Show hint if it looks like a YouTube URL but isn't a video link
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                preview.classList.remove('hidden');
                preview.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-light); font-size: 13px;">This looks like a YouTube link but not a video URL. Paste a video URL like youtube.com/watch?v=... to fetch metadata.</div>';
            } else {
                preview.classList.add('hidden');
            }
            return;
        }

        try {
            preview.classList.remove('hidden');
            preview.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-light);">Loading video info...</div>';

            const metadata = await YouTubeAPI.fetchVideoMetadata(url);

            document.getElementById('idea-video-title').value = metadata.title;
            document.getElementById('idea-video-thumbnail').value = metadata.thumbnailUrl;
            document.getElementById('idea-video-channel').value = metadata.channel;
            document.getElementById('idea-video-duration').value = metadata.duration;

            this.showVideoPreview(metadata);

            // Auto-fill title if empty
            if (!document.getElementById('idea-title').value) {
                document.getElementById('idea-title').value = metadata.title;
            }
        } catch (error) {
            console.error('YouTube fetch error:', error);
            preview.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--danger); font-size: 13px;">${escapeHtml(error.message)}</div>`;
        }
    },

    showVideoPreview(metadata) {
        const preview = document.getElementById('video-preview');
        preview.classList.remove('hidden');
        preview.innerHTML = `
            <img class="video-thumb" src="${escapeHtml(metadata.thumbnailUrl)}" alt="">
            <div class="video-info">
                <div class="video-title">${escapeHtml(metadata.title)}</div>
                <div class="video-meta">
                    <span>${escapeHtml(metadata.channel)}</span>
                    <span>${escapeHtml(metadata.duration)}</span>
                </div>
            </div>
        `;
        // Show Summarize button
        document.getElementById('summarize-video-btn').classList.remove('hidden');
    },

    async summarizeVideo() {
        const url = document.getElementById('idea-youtube-url').value.trim();
        const videoId = extractVideoId(url);
        if (!videoId) {
            showToast('No valid YouTube video URL', 'error');
            return;
        }

        const videoTitle = document.getElementById('idea-video-title').value || 'this video';
        const modal = document.getElementById('summary-modal');
        const content = document.getElementById('summary-content');

        // Show modal with loading state
        modal.classList.add('active');

        const keys = getApiKeys();

        // Prefer Gemini (direct YouTube URL support, no CORS issues)
        if (keys.geminiApiKey) {
            try {
                content.innerHTML = `
                    <div class="summary-loading">
                        <div class="spinner" style="margin: 0 auto 12px"></div>
                        <p>Summarizing with Gemini AI...</p>
                    </div>
                `;

                // Build a proper YouTube watch URL for Gemini
                const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
                const summary = await GeminiAPI.summarizeYouTubeVideo(watchUrl, videoTitle);
                content.innerHTML = this._formatSummary(summary);
                return;

            } catch (error) {
                console.error('Gemini summary error:', error);

                // Handle rate limit with countdown timer
                if (error.message.startsWith('RATE_LIMIT:')) {
                    const parts = error.message.split(':');
                    const waitSec = parseInt(parts[1]) || 60;
                    const userMsg = parts.slice(2).join(':');
                    const countdownId = 'gemini-countdown-' + Date.now();
                    content.innerHTML = `
                        <div class="summary-loading">
                            <p style="color: var(--warning); margin-bottom: 12px; font-size: 15px;">⏳ ${escapeHtml(userMsg)}</p>
                            <p id="${countdownId}" style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">${waitSec}s</p>
                            <button class="btn btn-small btn-primary" id="${countdownId}-btn" disabled style="margin-bottom: 8px;" onclick="IdeaForm.summarizeVideo()">Wait...</button>
                        </div>
                    `;
                    // Countdown timer
                    let remaining = waitSec;
                    const timer = setInterval(() => {
                        remaining--;
                        const el = document.getElementById(countdownId);
                        const btn = document.getElementById(countdownId + '-btn');
                        if (!el) { clearInterval(timer); return; }
                        if (remaining <= 0) {
                            clearInterval(timer);
                            el.textContent = 'Ready!';
                            el.style.color = 'var(--success)';
                            if (btn) { btn.disabled = false; btn.textContent = 'Try Again'; }
                        } else {
                            el.textContent = remaining + 's';
                        }
                    }, 1000);
                    return;
                }

                // Other Gemini errors — show with retry button
                content.innerHTML = `
                    <div class="summary-loading">
                        <p style="color: var(--danger); margin-bottom: 12px;">${escapeHtml(error.message)}</p>
                        <button class="btn btn-small btn-primary" style="margin-bottom: 8px;" onclick="IdeaForm.summarizeVideo()">Try Again</button>
                    </div>
                `;
                return;
            }
        }

        // Fallback: transcript fetch + Claude (if no Gemini key)
        content.innerHTML = `
            <div class="summary-loading">
                <div class="spinner" style="margin: 0 auto 12px"></div>
                <p>Fetching transcript...</p>
            </div>
        `;

        try {
            const transcript = await YouTubeAPI.fetchTranscript(videoId);

            content.innerHTML = `
                <div class="summary-loading">
                    <div class="spinner" style="margin: 0 auto 12px"></div>
                    <p>Generating summary with Claude...</p>
                </div>
            `;

            let transcriptText = transcript.text;
            const MAX_CHARS = 12000;
            if (transcriptText.length > MAX_CHARS) {
                transcriptText = transcriptText.substring(0, MAX_CHARS) + '... [transcript truncated]';
            }

            const summaryPrompt = `Summarize this YouTube video transcript concisely. Include:
1. A brief overview (2-3 sentences)
2. Key points or takeaways (bullet points)
3. Any actionable ideas or tips mentioned

Video title: "${videoTitle}"
${transcript.isAutoGenerated ? '(Note: This is an auto-generated transcript, so there may be minor errors)' : ''}

Transcript:
${transcriptText}`;

            const summary = await ClaudeAPI.sendMessage(
                [{ role: 'user', content: summaryPrompt }],
                'You are a helpful assistant that creates clear, concise video summaries. Format your response with markdown headers (### ) and bullet points for easy reading. Keep it focused and practical.'
            );

            content.innerHTML = this._formatSummary(summary);

        } catch (error) {
            console.error('Summary error:', error);
            const debugLog = YouTubeAPI.getDebugLog();
            console.log('--- Transcript Debug Log ---\n' + debugLog);
            content.innerHTML = `
                <div class="summary-loading">
                    <p style="color: var(--danger); margin-bottom: 12px;">${escapeHtml(error.message)}</p>
                    <p style="font-size: 13px; color: var(--text-light); margin-bottom: 12px;">Tip: Add a Gemini API key in Settings for reliable video summaries.</p>
                    <button class="btn btn-small btn-primary" style="margin-bottom: 16px;" onclick="IdeaForm.summarizeVideo()">Try Again</button>
                    <details style="text-align: left; width: 100%;">
                        <summary style="cursor: pointer; font-size: 12px; color: var(--text-light); margin-bottom: 8px;">Debug Details</summary>
                        <pre style="font-size: 11px; background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; max-height: 300px; overflow-y: auto; line-height: 1.5; color: #333;">${escapeHtml(debugLog)}</pre>
                    </details>
                </div>
            `;
        }
    },

    _formatSummary(text) {
        let html = escapeHtml(text);
        // Headers (### )
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Bullet lists
        html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
        html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
        // Numbered lists
        html = html.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>');
        // Paragraphs (double newline)
        html = html.replace(/\n\n/g, '</p><p>');
        // Single newlines (that aren't inside lists)
        html = html.replace(/\n/g, '<br>');
        // Wrap in paragraph
        html = '<p>' + html + '</p>';
        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<h3>)/g, '$1');
        html = html.replace(/(<\/h3>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)<\/p>/g, '$1');
        return html;
    },

    async save() {
        const title = document.getElementById('idea-title').value.trim();
        const category = document.getElementById('idea-category').value;

        if (!title) {
            showToast('Title is required', 'error');
            return;
        }
        if (!category) {
            showToast('Category is required', 'error');
            return;
        }

        const priority = document.querySelector('input[name="idea-priority"]:checked')?.value || 'Medium';

        const fields = {
            Title: title,
            YouTubeURL: document.getElementById('idea-youtube-url').value.trim() || null,
            VideoTitle: document.getElementById('idea-video-title').value || null,
            VideoThumbnail: document.getElementById('idea-video-thumbnail').value || null,
            VideoChannel: document.getElementById('idea-video-channel').value || null,
            VideoDuration: document.getElementById('idea-video-duration').value || null,
            Category: category,
            Status: document.getElementById('idea-status').value,
            Priority: priority,
            TargetDate: document.getElementById('idea-target-date').value || null,
            MyThoughts: document.getElementById('idea-thoughts').value || null,
            ReferenceURLs: document.getElementById('idea-reference-urls').value.trim() || null
        };

        // Set CompletedDate when status changes to Done
        if (fields.Status === 'Done') {
            fields.CompletedDate = new Date().toISOString().split('T')[0];
        }

        // Remove null fields to avoid Airtable errors
        Object.keys(fields).forEach(key => {
            if (fields[key] === null) delete fields[key];
        });

        const saveBtn = document.getElementById('idea-save-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            if (this.editingRecordId) {
                await AirtableAPI.updateIdea(this.editingRecordId, fields);
                showToast('Idea updated!', 'success');
            } else {
                await AirtableAPI.createIdea(fields);
                showToast('Idea saved!', 'success');
            }
            Dashboard.show();
        } catch (error) {
            showToast('Failed to save: ' + error.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Idea';
        }
    },

    async confirmDelete() {
        // Discard unsaved draft
        if (!this.editingRecordId) {
            if (!confirm('Discard this idea? Your changes will be lost.')) return;
            if (this.speechInput) this.speechInput.stop();
            showToast('Idea discarded', 'info');
            Dashboard.show();
            return;
        }

        // Delete saved idea from Airtable
        if (!confirm('Delete this idea? This cannot be undone.')) return;

        try {
            await AirtableAPI.deleteIdea(this.editingRecordId);
            showToast('Idea deleted', 'success');
            Dashboard.show();
        } catch (error) {
            showToast('Failed to delete: ' + error.message, 'error');
        }
    },

    cancel() {
        if (this.speechInput) this.speechInput.stop();
        Dashboard.show();
    }
};
