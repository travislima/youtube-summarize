# QuickSum ⚡

A Chrome extension that instantly summarizes YouTube videos AND articles using AI. Get the key points and main takeaways in seconds!

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)
![Status](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Features

- **Multi-Purpose Summarization** - Summarize both YouTube videos and web articles
- **One-Click YouTube** - Click "Summarize" button on any YouTube video
- **Article Mode** - Click extension icon on any blog/article page
- **Smart AI Analysis** - Powered by Groq's Llama 3.3 70B model
- **Timestamps Included** - Jump to important moments in videos
- **Copy to Clipboard** - Easy copy buttons for summaries and transcripts
- **Privacy-Focused** - Minimal permissions, no data collection
- **Fast & Free** - Hosted backend ready to use, no setup required

---

## 📦 Installation

### Quick Install (2 minutes)

1. **Download the extension**
   - [Click here to download](https://github.com/travislima/youtube-summarize/archive/refs/heads/claude/article-summarization-011CUPtbJtTXPSUcipiicHbo.zip)
   - Extract the ZIP file

2. **Install in Chrome**
   - Open Chrome and go to `chrome://extensions`
   - Toggle ON "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `extension` folder from the extracted files

3. **Start using it!**
   - **For YouTube:** Look for the "Summarize" button below any video
   - **For Articles:** Click the extension icon (⚡) in your toolbar

---

## 🎯 How to Use

### YouTube Videos

1. Navigate to any YouTube video that has captions/subtitles
2. Click the **"Summarize"** button (below the video player)
3. Wait while AI analyzes the transcript (~5-15 seconds)
4. Read your summary with timestamps and key points!

### Articles & Blog Posts

1. Navigate to any article, blog post, or news page
2. Click the **QuickSum icon** (⚡) in your browser toolbar
3. Click **"Summarize Article"** in the popup
4. Get your AI-generated summary in 10-30 seconds!

### Works Best With:

**YouTube:**
- ✅ Videos with English captions
- ✅ Educational content & tutorials
- ✅ Podcasts and interviews
- ✅ News and commentary

**Articles:**
- ✅ Blog posts (Medium, WordPress, etc.)
- ✅ News articles
- ✅ Long-form content
- ✅ Technical documentation

---

## 🛠️ Architecture

This extension has two parts:

### Chrome Extension (Frontend)
- Adds "Summarize" button to YouTube pages
- Popup interface for article summarization
- Extracts article content using Mozilla's Readability.js
- Beautiful summary display with copy functionality
- **Location:** `extension/` folder

### Flask Backend (API)
- Hosted on Railway (free tier)
- Uses Groq AI (Llama 3.3 70B) for summarization
- Two endpoints: video transcripts and article content
- Rate limiting: 20 requests/min per IP
- **URL:** https://web-production-f6684.up.railway.app

---

## 🔒 Security & Privacy

- **Minimal Permissions:** Only `activeTab`, `storage`, `scripting`
- **No Broad Access:** Removed `<all_urls>` permission
- **XSS Protection:** DOMPurify sanitizes all HTML
- **Timeout Protection:** 30-second fetch timeout
- **Error Handling:** Comprehensive validation and user feedback
- **No Data Collection:** Your data never leaves your browser except for API calls

---

## 🔧 For Developers

### Running Locally

Want to modify or test the extension locally?

#### 1. Clone the Repository
```bash
git clone https://github.com/travislima/youtube-summarize.git
cd youtube-summarize
```

#### 2. Set Up Backend (Optional - if you want to run your own)
```bash
# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Add your GROQ_API_KEY to .env

# Run backend
python app.py
```

#### 3. Update Extension (if running local backend)
Edit `extension/content.js` line 310 and `extension/popup.js` line 2:
```javascript
const API_URL = 'http://localhost:5000';
```

#### 4. Generate Icons
```bash
python3 create_icons.py
```

#### 5. Load Extension
- Go to `chrome://extensions`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `extension/` folder

### Tech Stack

**Extension:**
- Vanilla JavaScript
- Chrome Extension Manifest V3
- DOMPurify for XSS protection
- Mozilla Readability.js for article extraction
- CSS3 for styling

**Backend:**
- Python 3.11
- Flask web framework
- Flask-Limiter for rate limiting
- Groq AI API (Llama 3.3 70B model)
- youtube-transcript-api

### Project Structure
```
youtube-summarize/
├── extension/              # Chrome extension
│   ├── manifest.json      # Extension config
│   ├── content.js         # YouTube integration
│   ├── content.css        # Styling
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Article summarization logic
│   ├── Readability.js     # Article content extraction
│   ├── purify.min.js      # XSS protection
│   └── icon*.png          # Lightning bolt icons
├── app.py                 # Flask backend API
├── requirements.txt       # Python dependencies
├── create_icons.py        # Icon generator script
└── README.md             # This file
```

---

## 📝 API Documentation

### Endpoint 1: `/api/summarize-transcript`

Summarizes YouTube video transcripts.

**Method:** `POST`

**Request Body:**
```json
{
  "video_id": "dQw4w9WgXcQ",
  "title": "Video Title Here",
  "transcript": [
    {"time": "0:00", "text": "Transcript segment..."},
    {"time": "0:05", "text": "Another segment..."}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "video_id": "dQw4w9WgXcQ",
  "summary": "## Video Title\n\n[AI-generated summary with timestamps]"
}
```

### Endpoint 2: `/api/summarize-article`

Summarizes article text content.

**Method:** `POST`

**Request Body:**
```json
{
  "title": "Article Title",
  "content": "Full article text content...",
  "excerpt": "Optional article excerpt"
}
```

**Response:**
```json
{
  "success": true,
  "title": "Article Title",
  "summary": "## Overview\n\n[AI-generated summary]"
}
```

**Rate Limits:**
- 20 requests per minute per IP (both endpoints)
- 100 requests per hour per IP (global)

---

## 🚢 Deploying Your Own Backend

Want to host your own backend? Deploy to Railway:

1. **Fork this repository**
2. **Sign up at** [railway.app](https://railway.app)
3. **Create new project** → Deploy from GitHub repo
4. **Add environment variable:** `GROQ_API_KEY` = your_api_key
5. **Get your Railway URL** (e.g., `https://your-app.railway.app`)
6. **Update extension:** Change URL in `extension/content.js` and `extension/popup.js`
7. **Reload extension** in Chrome

### Get a Free Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card)
3. Create API key
4. Add to Railway environment variables

---

## 🐛 Troubleshooting

### YouTube Issues

**Button doesn't appear?**
- Refresh the YouTube page
- Make sure video has captions (click CC button)
- Check that extension is enabled in `chrome://extensions`

**"No transcript found" error?**
- Video doesn't have captions/subtitles
- Try a different video (most popular videos have captions)

### Article Issues

**"Could not extract article content"?**
- Page might not be an article (try blog posts, news sites)
- Some sites block content extraction
- Try clicking "Reader Mode" first if your browser has it

**Timeout errors?**
- Article might be very long (8000 char limit)
- Server might be slow - try again
- Check your internet connection

### General Issues

**Extension icon not appearing?**
- Check `chrome://extensions` - make sure enabled
- Try reloading the extension
- Check for browser console errors (F12)

**Still having issues?**
- Open Chrome DevTools (F12) → Console tab
- Look for errors in console
- Report the issue with console logs on GitHub

---

## 📜 License

MIT License - Feel free to use, modify, and share!

---

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Share with friends

---

## 💰 Costs

**$0/month** for normal use!

- Groq AI: Free tier (generous limits)
- Railway: $5/month free credit (renews monthly)
- YouTube API: Free (transcript extraction)
- Mozilla Readability: Open source, free

**Usage estimates:**
- 10-100 users: Well within free tiers
- 1000+ users: May need paid Railway plan (~$5/month)

---

## 🎉 Credits

Built with:
- [Groq AI](https://groq.com) - Lightning-fast AI inference
- [youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api) - Transcript extraction
- [Mozilla Readability](https://github.com/mozilla/readability) - Article content extraction
- [DOMPurify](https://github.com/cure53/DOMPurify) - XSS sanitization
- Flask - Backend framework
- Chrome Extensions API

---

## 📬 Support

Having issues or questions?
- Check the Troubleshooting section above
- Open an issue on GitHub
- Review the console logs in Chrome DevTools

---

**Happy Summarizing! ⚡**

Made with ❤️ for faster content consumption
