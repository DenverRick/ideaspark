// IdeaSpark Web Speech API Wrapper

class SpeechInput {
    constructor(textarea, micButton) {
        this.textarea = textarea;
        this.micButton = micButton;
        this.recognition = null;
        this.isListening = false;
        this.supported = false;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.micButton.style.display = 'none';
            return;
        }

        this.supported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this._interimTranscript = '';
        this._finalTranscript = '';

        this.recognition.onresult = (event) => {
            this._interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    this._finalTranscript += transcript + ' ';
                } else {
                    this._interimTranscript = transcript;
                }
            }
            // Show final + interim in textarea
            const base = this._baseText;
            const separator = base && !base.endsWith('\n') && !base.endsWith(' ') ? ' ' : '';
            this.textarea.value = base + separator + this._finalTranscript + this._interimTranscript;
        };

        this.recognition.onerror = (event) => {
            if (event.error === 'not-allowed') {
                showToast('Microphone access denied. Please allow microphone permissions.', 'error');
            } else if (event.error !== 'aborted') {
                showToast(`Speech error: ${event.error}`, 'error');
            }
            this.stop();
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                // Auto-restart if still supposed to be listening
                try {
                    this.recognition.start();
                } catch (e) {
                    this.stop();
                }
            }
        };

        this.micButton.addEventListener('click', () => this.toggle());
    }

    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        if (!this.supported || this.isListening) return;

        this._baseText = this.textarea.value;
        this._finalTranscript = '';
        this._interimTranscript = '';
        this.isListening = true;
        this.micButton.classList.add('mic-active');

        try {
            this.recognition.start();
        } catch (e) {
            this.stop();
        }
    }

    stop() {
        this.isListening = false;
        this.micButton.classList.remove('mic-active');

        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Ignore
            }
        }

        // Commit final text
        if (this._finalTranscript) {
            const base = this._baseText || '';
            const separator = base && !base.endsWith('\n') && !base.endsWith(' ') ? ' ' : '';
            this.textarea.value = base + separator + this._finalTranscript.trim();
        }
    }

    destroy() {
        this.stop();
        if (this.recognition) {
            this.recognition.onresult = null;
            this.recognition.onerror = null;
            this.recognition.onend = null;
        }
    }
}
