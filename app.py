"""
YouTube Video Summarizer
A simple Flask app that fetches YouTube transcripts and summarizes them using Groq AI
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
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

# Initialize YouTube API client
youtube_api_key = os.getenv('YOUTUBE_API_KEY')
if not youtube_api_key:
    print("WARNING: YOUTUBE_API_KEY not found in environment variables!")
    youtube_client = None
else:
    youtube_client = build('youtube', 'v3', developerKey=youtube_api_key)


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


def verify_video_and_check_captions(video_id):
    """
    Use YouTube Data API to verify video exists and check if captions are available
    Returns: (video_title, has_captions)
    """
    if not youtube_client:
        # If YouTube API not configured, skip verification
        return None, True

    try:
        # Get video details
        request = youtube_client.videos().list(
            part='snippet,contentDetails',
            id=video_id
        )
        response = request.execute()

        if not response.get('items'):
            raise Exception("Video not found. Please check the URL.")

        video_info = response['items'][0]
        video_title = video_info['snippet']['title']

        # Check if captions are available
        caption_info = video_info['contentDetails'].get('caption', 'false')
        has_captions = caption_info == 'true'

        return video_title, has_captions

    except HttpError as e:
        if e.resp.status == 403:
            raise Exception("YouTube API quota exceeded. Please try again later.")
        elif e.resp.status == 404:
            raise Exception("Video not found. Please check the URL.")
        else:
            # Don't fail the whole request if API check fails
            print(f"YouTube API error: {e}")
            return None, True
    except Exception as e:
        # Don't fail the whole request if API check fails
        print(f"Error verifying video: {e}")
        return None, True


def get_transcript(video_id):
    """
    Fetch transcript for a YouTube video using youtube-transcript-api
    Returns the full transcript text or raises an error
    """
    try:
        # Get the transcript - try English first, then any available language
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        except:
            # If English not available, get any available transcript
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)

        # Combine all transcript entries into a single text
        transcript_text = ' '.join([entry['text'] for entry in transcript_list])

        if not transcript_text or len(transcript_text) < 10:
            raise Exception("Transcript is too short or empty")

        return transcript_text

    except TranscriptsDisabled:
        raise Exception("Transcripts are disabled for this video")
    except NoTranscriptFound:
        raise Exception("No transcript found for this video. Please try a video with captions enabled.")
    except Exception as e:
        error_msg = str(e)
        if "Transcript" in error_msg or "transcript" in error_msg:
            # Re-raise transcript-specific errors
            raise
        else:
            raise Exception(f"Error fetching transcript: {error_msg}")


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


@app.route('/style.css')
def serve_css():
    """Serve the CSS file"""
    return send_from_directory('static', 'style.css')


@app.route('/script.js')
def serve_js():
    """Serve the JavaScript file"""
    return send_from_directory('static', 'script.js')


@app.route('/api/summarize', methods=['POST'])
def summarize_video():
    """
    Main API endpoint to summarize a YouTube video
    Expects JSON: {"url": "youtube_url"}
    Returns JSON: {"summary": "...", "video_id": "...", "video_title": "..."}
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

        # Verify video exists and check for captions using YouTube API
        video_title, has_captions = verify_video_and_check_captions(video_id)

        if not has_captions and video_title:
            return jsonify({
                'error': f'No captions available for "{video_title}". Please try a video with captions enabled.'
            }), 400

        # Get transcript
        transcript = get_transcript(video_id)

        if not transcript:
            return jsonify({'error': 'Could not fetch transcript'}), 400

        # Generate summary
        summary = summarize_text(transcript)

        return jsonify({
            'success': True,
            'video_id': video_id,
            'video_title': video_title or 'Unknown',
            'summary': summary,
            'transcript_length': len(transcript)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health')
def health():
    """Health check endpoint"""
    # Check if YouTubeTranscriptApi has the get_transcript method
    has_transcript_method = hasattr(YouTubeTranscriptApi, 'get_transcript')

    return jsonify({
        'status': 'healthy',
        'groq_configured': groq_client is not None,
        'youtube_api_configured': youtube_client is not None,
        'transcript_api_has_method': has_transcript_method,
        'transcript_api_type': str(type(YouTubeTranscriptApi))
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
