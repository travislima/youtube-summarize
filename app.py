"""
YouTube Video Summarizer
A simple Flask app that fetches YouTube transcripts and summarizes them using Groq AI
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from groq import Groq
import os
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='static')
CORS(app)

# Initialize Groq client
groq_api_key = os.getenv('GROQ_API_KEY')
if not groq_api_key:
    print("WARNING: GROQ_API_KEY not found in environment variables!")
    groq_client = None
else:
    groq_client = Groq(api_key=groq_api_key)


def extract_video_id(url):
    """
    Extract YouTube video ID from various URL formats
    Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, etc.
    """
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/)([0-9A-Za-z_-]{11})',
        r'^([0-9A-Za-z_-]{11})$'
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    return None


def get_transcript(video_id):
    """
    Fetch transcript for a YouTube video
    Returns the full transcript text or raises an error
    """
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        transcript_text = ' '.join([entry['text'] for entry in transcript_list])
        return transcript_text
    except TranscriptsDisabled:
        raise Exception("Transcripts are disabled for this video")
    except NoTranscriptFound:
        raise Exception("No transcript found for this video")
    except Exception as e:
        raise Exception(f"Error fetching transcript: {str(e)}")


def summarize_text(text):
    """
    Summarize text using Groq AI (Llama model)
    Returns a concise summary with main talking points
    """
    if not groq_client:
        raise Exception("Groq API key not configured")

    try:
        # Create the prompt for summarization
        prompt = f"""Please analyze this YouTube video transcript and provide a concise summary.

Include:
1. Main topic/theme (2-3 sentences)
2. Key talking points (3-5 bullet points)
3. Important takeaways or conclusions

Transcript:
{text[:4000]}  # Limit to avoid token limits

Please keep the summary clear and concise."""

        # Call Groq API
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.1-70b-versatile",  # Free tier model
            temperature=0.5,
            max_tokens=1000,
        )

        return chat_completion.choices[0].message.content

    except Exception as e:
        raise Exception(f"Error generating summary: {str(e)}")


@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('static', 'index.html')


@app.route('/api/summarize', methods=['POST'])
def summarize_video():
    """
    Main API endpoint to summarize a YouTube video
    Expects JSON: {"url": "youtube_url"}
    Returns JSON: {"summary": "...", "video_id": "..."}
    """
    try:
        data = request.get_json()

        if not data or 'url' not in data:
            return jsonify({'error': 'No URL provided'}), 400

        url = data['url']

        # Extract video ID
        video_id = extract_video_id(url)
        if not video_id:
            return jsonify({'error': 'Invalid YouTube URL'}), 400

        # Get transcript
        transcript = get_transcript(video_id)

        if not transcript:
            return jsonify({'error': 'Could not fetch transcript'}), 400

        # Generate summary
        summary = summarize_text(transcript)

        return jsonify({
            'success': True,
            'video_id': video_id,
            'summary': summary,
            'transcript_length': len(transcript)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'groq_configured': groq_client is not None
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
