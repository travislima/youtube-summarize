# YouTube Video Summarizer 🎬✨

A Chrome extension that instantly summarizes any YouTube video using AI. Get the key points, timestamps, and main takeaways in seconds!

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)
![Status](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Features

- **One-Click Summaries** - Click "Summarize" button on any YouTube video
- **Smart AI Analysis** - Answers the question in the video title directly
- **Timestamps Included** - Jump to important moments with time markers
- **Key Points Extraction** - Get bulleted highlights of main topics
- **Fast & Free** - Hosted backend ready to use, no setup required

---

## 📦 Installation

### Quick Install (2 minutes)

1. **Download the extension**
   - [Click here to download](https://github.com/travislima/youtube-summarize/archive/refs/heads/claude/init-project-011CUPtbJtTXPSUcipiicHbo.zip)
   - Extract the ZIP file

2. **Install in Chrome**
   - Open Chrome and go to `chrome://extensions`
   - Toggle ON "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `extension` folder from the extracted files

3. **Start using it!**
   - Go to any YouTube video with captions
   - Look for the "Summarize" button below the video
   - Click and wait ~10 seconds for your AI summary

---

## 🎯 How to Use

1. Navigate to any YouTube video that has captions/subtitles
2. Click the **"Summarize"** button (next to Like/Share buttons)
3. Wait while AI analyzes the transcript (~5-15 seconds)
4. Read your summary with timestamps and key points!

### Works Best With:
- ✅ Videos with English captions
- ✅ Educational content
- ✅ Podcasts and interviews
- ✅ News and commentary
- ✅ Tutorials and how-tos

---

## 🛠️ Architecture

This extension has two parts:

### Chrome Extension (Frontend)
- Adds "Summarize" button to YouTube
- Extracts transcript from YouTube's API
- Displays beautiful summary modal
- **Location:** `extension/` folder

### Flask Backend (API)
- Hosted on Railway (free tier)
- Uses Groq AI for summarization
- Processes transcript and generates summaries
- **URL:** https://web-production-f6684.up.railway.app

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
Edit `extension/content.js` line 310:
```javascript
const response = await fetch('http://localhost:5000/api/summarize-transcript', {
```

#### 4. Load Extension
- Go to `chrome://extensions`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `extension/` folder

### Tech Stack

**Extension:**
- Vanilla JavaScript
- Chrome Extension Manifest V3
- CSS3 for styling

**Backend:**
- Python 3.11
- Flask web framework
- Groq AI API (Llama 3.3 70B model)
- youtube-transcript-api

### Project Structure
```
youtube-summarize/
├── extension/              # Chrome extension
│   ├── manifest.json      # Extension config
│   ├── content.js         # Main logic
│   ├── content.css        # Styling
│   ├── popup.html         # Extension popup
│   └── icon*.png          # Icons
├── app.py                 # Flask backend API
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

---

## 📝 API Documentation

### Endpoint: `/api/summarize-transcript`

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

---

## 🚢 Deploying Your Own Backend

Want to host your own backend? Deploy to Railway:

1. **Fork this repository**
2. **Sign up at** [railway.app](https://railway.app)
3. **Create new project** → Deploy from GitHub repo
4. **Add environment variable:** `GROQ_API_KEY` = your_api_key
5. **Get your Railway URL** (e.g., `https://your-app.railway.app`)
6. **Update extension:** Change URL in `extension/content.js` line 310
7. **Reload extension** in Chrome

### Get a Free Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card)
3. Create API key
4. Add to Railway environment variables

---

## 🐛 Troubleshooting

### Button doesn't appear?
- Refresh the YouTube page
- Make sure video has captions (click CC button)
- Check that extension is enabled in `chrome://extensions`

### "No transcript found" error?
- Video doesn't have captions/subtitles
- Try a different video (most popular videos have captions)

### Extension slowing down YouTube?
- This was fixed in recent updates
- Make sure you have the latest version
- Re-download and reinstall if needed

### Still having issues?
- Open Chrome DevTools (F12) → Console tab
- Look for errors starting with `content.js:`
- Report the issue with console logs

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
- Railway: Free tier (sufficient for personal use)
- YouTube API: Free (transcript extraction)

---

## 🎉 Credits

Built with:
- [Groq AI](https://groq.com) - Lightning-fast AI inference
- [youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api) - Transcript extraction
- Flask - Backend framework
- Chrome Extensions API

---

## 📬 Support

Having issues or questions?
- Check the Troubleshooting section above
- Open an issue on GitHub
- Review the console logs in Chrome DevTools

---

**Happy Summarizing! 🚀**

Made with ❤️ for faster video consumption
