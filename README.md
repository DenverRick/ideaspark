# IdeaSpark

A mobile-first web app for capturing ideas, brainstorming with AI, and tracking progress — powered by Airtable, Claude AI, and YouTube integration.

**Live App:** [https://denverrick.github.io/ideaspark/](https://denverrick.github.io/ideaspark/)

---

## Features

- **Capture Ideas** — Quickly log ideas with a title, category, notes, and optional YouTube video link
- **AI Brainstorming** — Chat with Claude AI in a dedicated brainstorm session for any idea
- **Format Thoughts** — Use Claude to clean up and format your notes into structured markdown (auto-saved to Airtable)
- **YouTube Integration** — Paste a YouTube URL to auto-fetch the video title, thumbnail, duration, and an AI-generated summary (via Gemini)
- **Action Steps** — Add and manage action steps linked to each idea with due dates and status tracking
- **Print Thoughts** — Print a clean, formatted version of your idea notes
- **Dynamic Categories** — Categories are fetched directly from your Airtable base, so they always match your own field options
- **Filters & Sorting** — Filter ideas by status or category; sort by date, title, or status
- **Voice Input** — Dictate thoughts and brainstorm messages using speech recognition
- **Multi-user** — Each user connects their own Airtable base and API keys; the same hosted app URL works for everyone

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript (no frameworks) |
| Storage | [Airtable](https://airtable.com) REST API |
| AI Brainstorm | [Anthropic Claude API](https://www.anthropic.com) |
| Video Summary | [Google Gemini API](https://ai.google.dev) |
| Video Metadata | [YouTube Data API v3](https://developers.google.com/youtube/v3) |
| Hosting | GitHub Pages |

---

## Getting Started

### 1. Set Up Airtable

Create a free Airtable account and build three tables in a new base:

#### IDEAS Table
| Field Name | Field Type | Notes |
|------------|-----------|-------|
| Title | Single line text | Primary field |
| Category | Single select | Add your own categories |
| Status | Single select | Idea, In Progress, Done, On Hold |
| Priority | Single select | Low, Medium, High |
| MyThoughts | Long text | Main notes field |
| FormattedThoughts | Long text | Auto-populated by AI format feature |
| YouTubeURL | URL | Optional video link |
| VideoTitle | Single line text | Auto-fetched from YouTube |
| VideoThumbnail | URL | Auto-fetched from YouTube |
| VideoDuration | Single line text | Auto-fetched from YouTube |
| VideoSummary | Long text | AI-generated via Gemini |
| TargetDate | Date | Optional target/due date |

#### CONVERSATIONS Table
| Field Name | Field Type | Notes |
|------------|-----------|-------|
| IdeaID | Single line text | Links to IDEAS record ID |
| Role | Single select | user, assistant |
| Content | Long text | Message text |
| Timestamp | Date/time | When message was sent |

#### ACTION_STEPS Table
| Field Name | Field Type | Notes |
|------------|-----------|-------|
| IdeaID | Single line text | Links to IDEAS record ID |
| Description | Long text | What needs to be done |
| Status | Single select | Todo, In Progress, Done |
| DueDate | Date | Optional due date |
| CreatedAt | Date/time | Auto-created timestamp |

---

### 2. Get Your API Keys

#### Airtable Personal Access Token
1. Go to [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click **Create token**
3. Name it (e.g., "IdeaSpark")
4. Add scopes: `data.records:read`, `data.records:write`, `schema.bases:read`
5. Under Access, select your IdeaSpark base
6. Click **Create token** — copy and save it immediately (shown only once)

#### Airtable Base ID
1. Open your base in Airtable
2. Click **Help** → **API Documentation**
3. Your Base ID starts with `app` (e.g., `appXXXXXXXXXXXXXX`)

#### Anthropic Claude API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to **API Keys** and create a new key
3. Add credits to your account (pay-as-you-go)

#### Google Gemini API Key (for YouTube summaries)
1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API key**
3. Free tier available

#### YouTube Data API v3 Key
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → Enable **YouTube Data API v3**
3. Go to **Credentials** → **Create Credentials** → **API Key**
4. Free quota is generous for personal use

---

### 3. Configure the App

1. Open [https://denverrick.github.io/ideaspark/](https://denverrick.github.io/ideaspark/)
2. Enter your API keys in the setup screen
3. Click **Connect** — the app will verify your Airtable connection
4. Your categories from Airtable will be loaded automatically

> **Note:** API keys are stored locally in your browser's localStorage and never sent anywhere except the respective APIs.

---

## Project Structure

```
ideaspark/
├── index.html              # Single-page app shell
├── css/
│   ├── main.css            # Global styles, variables, layout
│   ├── components.css      # Cards, modals, forms, pills
│   └── mobile.css          # Mobile-specific overrides
└── js/
    ├── config.js           # App config, category colors/emojis, helpers
    ├── utils.js            # Shared utilities (toast, dates, category selects)
    ├── airtable.js         # Airtable REST API + Metadata API calls
    ├── claude.js           # Claude API (brainstorm chat)
    ├── gemini.js           # Gemini API (YouTube summaries)
    ├── youtube.js          # YouTube Data API (video metadata)
    ├── speech.js           # Web Speech API (voice input)
    ├── app.js              # Main app controller, idea detail view
    ├── dashboard.js        # Dashboard, filters, sorting, settings
    ├── idea-form.js        # New/edit idea form
    ├── brainstorm.js       # Brainstorm chat view
    └── action-steps.js     # Action steps management
```

---

## Sharing With Others

Anyone can use this app with their own data — no GitHub account needed:

1. Share the link: [https://denverrick.github.io/ideaspark/](https://denverrick.github.io/ideaspark/)
2. They set up their own Airtable base with the table structure above
3. They enter their own API keys in the app settings
4. Their categories, ideas, and conversations are completely separate

---

## Local Development

No build tools required — just open `index.html` in a browser.

```bash
git clone https://github.com/DenverRick/ideaspark.git
cd ideaspark
open index.html
```

---

## License

Personal project — feel free to fork and adapt for your own use.
