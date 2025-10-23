# YouTube Video Summarizer

A simple web application that extracts and summarizes YouTube video transcripts using AI. Perfect for quickly understanding the main talking points of any video!

## Features

- 🎯 Extract transcripts from any YouTube video (that has captions)
- 🤖 AI-powered summarization using Groq (free tier)
- 💨 Fast and simple to use
- 💰 Completely FREE to run (no costs!)
- 🎨 Clean, modern user interface

## How It Works

1. Paste a YouTube URL
2. App fetches the video's transcript (from captions)
3. Groq AI analyzes and summarizes the content
4. Get main talking points instantly!

---

## Quick Start Guide (For Non-Developers)

### Prerequisites

You'll need:
- Python 3.8 or higher
- A Groq API key (free!)

### Step 1: Get Your Free Groq API Key

1. Go to https://console.groq.com
2. Sign up for a free account (no credit card required)
3. Go to "API Keys" section
4. Click "Create API Key"
5. Copy the key (you'll need it in Step 3)

### Step 2: Install Python

**On Windows:**
1. Download from https://www.python.org/downloads/
2. Run installer
3. ✅ CHECK "Add Python to PATH" during installation!

**On Mac:**
```bash
brew install python3
```

**On Linux:**
```bash
sudo apt update
sudo apt install python3 python3-pip
```

### Step 3: Set Up the Project

Open your terminal/command prompt and run these commands:

```bash
# Navigate to the project folder
cd youtube-summarize

# Install required packages
pip install -r requirements.txt

# Create your environment file
cp .env.example .env
```

Now, open the `.env` file with a text editor and replace `your_groq_api_key_here` with your actual Groq API key from Step 1.

### Step 4: Run the Application

In your terminal, run:

```bash
python app.py
```

You should see:
```
* Running on http://0.0.0.0:5000
```

### Step 5: Use the App

1. Open your web browser
2. Go to: `http://localhost:5000`
3. Paste any YouTube URL
4. Click "Summarize Video"
5. Wait 10-20 seconds
6. See your summary!

### Step 6: Stop the Application

Press `Ctrl+C` in the terminal to stop the server.

---

## Testing the App

Here are some YouTube videos you can test with:

1. TED Talks (usually have good transcripts)
2. Educational videos
3. News videos
4. Any video with captions enabled

**Note:** The video must have captions/subtitles enabled. If you get an error about "no transcript found", try a different video.

---

## Troubleshooting

### "ModuleNotFoundError"
- Run: `pip install -r requirements.txt`

### "GROQ_API_KEY not found"
- Make sure you created the `.env` file
- Make sure the API key is correct (no extra spaces)

### "No transcript found"
- The video doesn't have captions enabled
- Try a different video

### "Port already in use"
- Another app is using port 5000
- Change the port in `.env`: add `PORT=8000`
- Run again and visit `http://localhost:8000`

---

## Deploying to the Internet (Free Options)

### Option 1: Render (Recommended - Easiest)

1. Create account at https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Fill in:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
5. Add environment variable:
   - Key: `GROQ_API_KEY`
   - Value: Your Groq API key
6. Click "Create Web Service"
7. Wait 2-3 minutes
8. Your app will be live at `https://your-app.onrender.com`

**Note:** Free tier sleeps after inactivity, takes 30s to wake up.

### Option 2: Railway

1. Create account at https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select this repository
4. Add environment variable `GROQ_API_KEY`
5. Railway auto-detects Python and deploys
6. Get your public URL

### Option 3: PythonAnywhere

1. Sign up at https://www.pythonanywhere.com (free tier)
2. Upload your files
3. Configure WSGI file
4. Add your API key to environment
5. Reload app

---

## Project Structure

```
youtube-summarize/
├── app.py                 # Flask backend (main application)
├── requirements.txt       # Python dependencies
├── .env                   # Your API keys (create this!)
├── .env.example          # Template for .env
├── .gitignore            # Git ignore file
├── static/               # Frontend files
│   ├── index.html       # Main page
│   ├── style.css        # Styling
│   └── script.js        # Frontend logic
└── README.md            # This file
```

---

## Tech Stack

- **Backend:** Python 3 + Flask
- **Transcript:** youtube-transcript-api (free)
- **AI:** Groq API with Llama 3.1 model (free tier)
- **Frontend:** HTML, CSS, JavaScript (vanilla)

---

## Costs

**Current setup: $0/month**

- Groq: Free tier (plenty for testing)
- YouTube Transcript API: Free (no API key needed)
- Render/Railway: Free tier available

**If you want to scale:**
- Groq paid plans start at $0.10 per million tokens
- Render paid plans: $7/month
- You'll know when you need to upgrade

---

## Future Enhancements

Ideas for making this better:

- ✅ Save summaries to a database
- ✅ User accounts and history
- ✅ Adjustable summary length
- ✅ Extract timestamps for key points
- ✅ Support for playlists
- ✅ Download summaries as PDF
- ✅ Chrome extension version
- ✅ Multiple language support

---

## Need Help?

1. Check the Troubleshooting section above
2. Make sure Python is installed: `python --version`
3. Make sure packages are installed: `pip list`
4. Check your API key is correct in `.env`

---

## License

This is a personal project - feel free to use, modify, and share!

---

Happy summarizing! 🎉
