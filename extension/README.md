# YouTube Summarizer Chrome Extension

This Chrome extension adds a "Summarize" button directly to YouTube video pages, allowing you to get AI-powered summaries instantly.

## How It Works

1. **Runs in your browser** - Can't be blocked by YouTube (unlike the web scraping approach)
2. **Fetches transcripts** - Uses YouTube's own timedtext API
3. **Sends to your backend** - Connects to your local Flask server at http://localhost:8000
4. **Shows summary** - Displays AI-generated summary in a beautiful modal

## Installation

### Step 1: Make Sure Backend is Running

```bash
cd ~/Documents/youtube-summarize
python3 app.py
```

Your backend should be running on http://localhost:8000

### Step 2: Create Icon Files (One-Time Setup)

Run this command to create simple icon placeholders:

```bash
cd extension
python3 ../create_icons.py
```

Or create your own icons (16x16, 48x48, 128x128 PNG files) and place them in the `extension/` folder as:
- `icon16.png`
- `icon48.png`
- `icon128.png`

### Step 3: Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `youtube-summarize/extension` folder
5. The extension is now installed!

## Usage

1. Go to any YouTube video (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)
2. Look for the purple **"Summarize"** button below the video (next to Like/Share)
3. Click it
4. Wait 10-20 seconds while it:
   - Fetches the transcript
   - Sends to your backend
   - Generates AI summary
5. Read the summary in the popup modal!

## Troubleshooting

### "Summarize" button doesn't appear
- Make sure you're on a YouTube video page (not homepage)
- Refresh the page
- Check browser console for errors (F12 → Console tab)

### "Failed to fetch transcript"
- Video might not have captions enabled
- Try a different video
- Check that the video has English captions

### "Error connecting to backend"
- Make sure `python3 app.py` is running
- Check it's on http://localhost:8000
- Make sure your `.env` file has GROQ_API_KEY set

### Extension icon not showing
- You need to create icon files (see Step 2 above)
- Or the extension will work fine, just without an icon

## Features

- ✅ Works on any YouTube video with captions
- ✅ Beautiful modal UI
- ✅ Loading states
- ✅ Error handling
- ✅ Dark mode support
- ✅ Automatically detects URL changes (YouTube is a single-page app)

## Technical Details

- **Manifest Version:** 3 (latest)
- **Permissions:** activeTab, storage
- **Content Script:** Runs on youtube.com/watch* pages
- **Backend:** Flask server on localhost:8000
- **AI:** Groq API (Llama 3.1)

## Next Steps

Once you verify it works locally:
1. Deploy your Flask backend to a real server (Render, Railway, etc.)
2. Update `content.js` to point to your production URL
3. Publish the extension to Chrome Web Store
4. Share with the world!

---

Built with ❤️ using Claude Code
