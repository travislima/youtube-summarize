"""
YouTube Video Summarizer
A simple Flask app that fetches YouTube transcripts and summarizes them using Groq AI
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
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

app = Flask(__name__)
CORS(app)

# Initialize rate limiter
# Global default: 100 requests per hour per IP
# The /api/summarize-transcript endpoint applies a separate 20 requests per minute limit
# Uses in-memory storage (suitable for Railway free tier)
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["100 per hour"],
    storage_uri="memory://"
)

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
    print(f"DEBUG: Attempting to fetch transcript for video ID: {video_id}")

    try:
        # Get the transcript - try English first, then any available language
        try:
            print(f"DEBUG: Trying English transcript...")
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        except Exception as e:
            print(f"DEBUG: English failed ({e}), trying any available language...")
            # If English not available, get any available transcript
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)

        # Combine all transcript entries into a single text
        transcript_text = ' '.join([entry['text'] for entry in transcript_list])

        print(f"DEBUG: Successfully fetched transcript, length: {len(transcript_text)} characters")

        if not transcript_text or len(transcript_text) < 10:
            raise Exception("Transcript is too short or empty")

        return transcript_text

    except TranscriptsDisabled:
        print(f"DEBUG: Transcripts disabled for video {video_id}")
        raise Exception("Transcripts are disabled for this video")
    except NoTranscriptFound:
        print(f"DEBUG: No transcript found for video {video_id}")
        raise Exception("No transcript found for this video. Please try a video with captions enabled.")
    except Exception as e:
        print(f"DEBUG: Error type: {type(e).__name__}")
        print(f"DEBUG: Error details: {str(e)}")
        error_msg = str(e)
        if "Transcript" in error_msg or "transcript" in error_msg:
            # Re-raise transcript-specific errors
            raise
        elif "no element found" in error_msg.lower() or "xml" in error_msg.lower():
            raise Exception("YouTube blocked the transcript request. This video may not have captions, or YouTube is blocking automated access. Try a different video.")
        else:
            raise Exception(f"Error fetching transcript: {error_msg}")


def summarize_text(text):
    """
    Summarize text using Groq AI (Llama model)
    Returns a concise, well-formatted summary with main talking points
    """
    if not groq_client:
        raise Exception("Groq API key not configured")

    try:
        # Create the prompt for summarization
        prompt = f"""You are a professional content summarizer. Create a concise, actionable summary of this video.

FORMAT YOUR RESPONSE EXACTLY AS SHOWN:

## Overview
[Write 2-3 sentences explaining what this video covers and who it's for. Write naturally - say "In this video..." or "This video explains..." NOT "This transcript discusses..." Be conversational and direct.]

## Key Points
* **Key concept 1**: One clear sentence explaining it
* **Key concept 2**: One clear sentence explaining it
* **Key concept 3**: One clear sentence explaining it
[If the video lists specific items like "10 tips" or "5 strategies", LIST EVERY SINGLE ONE with a brief explanation]

## Main Takeaways
* [Most important actionable insight - what should viewer remember or do?]
* [Second key insight - be specific and practical]
* [Third key insight - focus on value]

CRITICAL RULES:
- Write naturally, as if explaining to a friend
- DON'T say "the transcript discusses" or "the speaker mentions" - just state the points directly
- Use ## for section headers, * for bullets, **bold** for key terms
- Be concise - one sentence per bullet point
- If video has numbered items (tips, ways, steps), include ALL of them
- Focus on actionable insights, not just descriptions

Transcript:
{text[:6000]}"""

        # Call Groq API
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",  # Updated model (3.1 was decommissioned)
            temperature=0.5,
            max_tokens=1500,  # Increased for more detailed summaries
        )

        return chat_completion.choices[0].message.content

    except Exception as e:
        raise Exception(f"Error generating summary: {str(e)}")


def summarize_with_context(text, video_title, timestamped_transcript=None):
    """
    Summarize text using Groq AI with video title context and timestamps
    Returns a summary that answers the title's question with timestamps
    """
    if not groq_client:
        raise Exception("Groq API key not configured")

    try:
        # Build transcript with timestamps for context (sample every ~30 seconds)
        timestamp_context = ""
        if timestamped_transcript and isinstance(timestamped_transcript, list):
            # Sample timestamps throughout the video for AI reference
            sample_interval = max(1, len(timestamped_transcript) // 20)  # Get ~20 samples
            sampled = timestamped_transcript[::sample_interval]
            timestamp_context = "\n\nTimestamp samples for reference:\n"
            for segment in sampled[:20]:  # Limit to 20 samples
                timestamp_context += f"[{segment['time']}] {segment['text'][:100]}\n"

        # Extract the main question/topic from the title
        title_context = f"\n\nVideo Title: \"{video_title}\"\n" if video_title else ""

        # Create enhanced prompt
        prompt = f"""You are a professional content summarizer. Create a summary that directly answers the question or topic in the video title.{title_context}

Your task: Answer the question or explain the topic from the title clearly and directly.

FORMAT YOUR RESPONSE EXACTLY AS SHOWN:

## {video_title if video_title else "Video Summary"}

[Write 2-3 sentences directly answering the title's question or explaining the topic. If title says "How to..." then explain HOW. If it says "Why..." then explain WHY. Be direct and specific.]

## Key Points
* **[Point 1]** ([timestamp]) - One clear sentence
* **[Point 2]** ([timestamp]) - One clear sentence
* **[Point 3]** ([timestamp]) - One clear sentence
[If video lists "10 tips" or "5 ways", LIST EVERY SINGLE ONE with timestamps]

## Main Takeaways
* ([timestamp]) [Most important actionable insight]
* ([timestamp]) [Second key insight]
* ([timestamp]) [Third key insight]

CRITICAL RULES:
- Answer the title's question DIRECTLY - if it asks "how", explain how
- Include approximate timestamps (like "2:30" or "15:45") in parentheses for each main point
- Write naturally - say "In this video..." NOT "The transcript discusses..."
- Use ## for headers, * for bullets, **bold** for key terms
- If video has numbered items (tips, steps, ways), include ALL of them with timestamps
- Be concise but complete - every point should have a timestamp reference

Transcript:
{text[:6000]}{timestamp_context}"""

        # Call Groq API
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=1500,
        )

        return chat_completion.choices[0].message.content

    except Exception as e:
        raise Exception(f"Error generating summary: {str(e)}")


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
        print(f"DEBUG: Extracted video ID: {video_id} from URL: {url}")
        if not video_id:
            return jsonify({'error': 'Invalid YouTube URL'}), 400

        # Verify video exists and check for captions using YouTube API
        video_title, has_captions = verify_video_and_check_captions(video_id)
        print(f"DEBUG: Video title: {video_title}, has_captions: {has_captions}")

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


@app.route('/api/summarize-transcript', methods=['POST'])
@limiter.limit("20 per minute")  # Protect API key: max 20 summaries per minute per IP
def summarize_transcript():
    """
    API endpoint for Chrome extension
    Accepts transcript with timestamps directly (extension fetches it client-side)
    Expects JSON: {"video_id": "...", "title": "...", "transcript": [{time: "0:00", text: "..."}]}
    Returns JSON: {"summary": "..."}
    """
    try:
        data = request.get_json()

        if not data or 'transcript' not in data:
            return jsonify({'error': 'No transcript provided'}), 400

        transcript_data = data['transcript']
        video_id = data.get('video_id', 'unknown')
        video_title = data.get('title', '')

        print(f"DEBUG: Received transcript from extension for video {video_id}")
        print(f"DEBUG: Video title: {video_title}")
        print(f"DEBUG: Transcript segments: {len(transcript_data) if isinstance(transcript_data, list) else 'not a list'}")

        # Handle both old format (string) and new format (array of {time, text})
        if isinstance(transcript_data, str):
            # Old format - just plain text
            transcript_text = transcript_data
            timestamped_transcript = None
        else:
            # New format - array with timestamps
            transcript_text = ' '.join([segment['text'] for segment in transcript_data])
            timestamped_transcript = transcript_data

        if not transcript_text or len(transcript_text) < 10:
            return jsonify({'error': 'Transcript is too short or empty'}), 400

        # Generate summary with title and timestamps
        summary = summarize_with_context(transcript_text, video_title, timestamped_transcript)

        print(f"DEBUG: Summary generated successfully")

        return jsonify({
            'success': True,
            'video_id': video_id,
            'summary': summary,
            'transcript_length': len(transcript_text)
        })

    except Exception as e:
        print(f"DEBUG: Error in summarize_transcript: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/summarize-article', methods=['POST'])
@limiter.limit("20 per minute")  # Same rate limit as transcript endpoint
def summarize_article():
    """
    API endpoint for article summarization
    Expects JSON: {"title": "...", "content": "...", "excerpt": "..."}
    Returns JSON: {"summary": "..."}
    """
    try:
        data = request.get_json()

        if not data or 'content' not in data:
            return jsonify({'error': 'No article content provided'}), 400

        article_content = data['content']
        article_title = data.get('title', 'Article')
        article_excerpt = data.get('excerpt', '')

        print(f"DEBUG: Received article summarization request")
        print(f"DEBUG: Article title: {article_title}")
        print(f"DEBUG: Content length: {len(article_content)} characters")

        if not article_content or len(article_content) < 100:
            return jsonify({'error': 'Article content is too short (minimum 100 characters)'}), 400

        # Truncate very long articles (keep first 8000 chars to fit in context)
        if len(article_content) > 8000:
            article_content = article_content[:8000]
            print(f"DEBUG: Article truncated to 8000 characters")

        # Generate article summary
        summary = summarize_article_content(article_title, article_content, article_excerpt)

        print(f"DEBUG: Article summary generated successfully")

        return jsonify({
            'success': True,
            'title': article_title,
            'summary': summary,
            'content_length': len(article_content)
        })

    except Exception as e:
        print(f"DEBUG: Error in summarize_article: {e}")
        return jsonify({'error': str(e)}), 500


def summarize_article_content(title, content, excerpt=""):
    """
    Summarize article content using Groq AI
    Optimized for blog posts, news articles, and long-form content
    """
    if not groq_client:
        raise Exception("Groq API key not configured")

    try:
        excerpt_context = f"\n\nArticle Excerpt: {excerpt}" if excerpt else ""

        # Create article-specific summarization prompt
        prompt = f"""You are a professional content summarizer. Create a clear, actionable summary of this article.

Article Title: "{title}"{excerpt_context}

FORMAT YOUR RESPONSE EXACTLY AS SHOWN:

## Overview
[Write 2-3 sentences explaining what this article covers and why it matters. Be conversational and direct.]

## Key Points
* **Main idea 1**: One clear sentence explaining it
* **Main idea 2**: One clear sentence explaining it
* **Main idea 3**: One clear sentence explaining it
[If the article has numbered items like "10 tips" or "5 strategies", LIST EVERY SINGLE ONE with a brief explanation]

## Main Takeaways
* [Most important insight or action - what should the reader remember or do?]
* [Second key insight - be specific and practical]
* [Third key insight - focus on value]

CRITICAL RULES:
- Write naturally, as if explaining to a friend
- DON'T say "the article discusses" or "the author mentions" - just state the points directly
- Use ## for section headers, * for bullets, **bold** for key terms
- Be concise - one sentence per bullet point
- If article has numbered items (tips, ways, steps), include ALL of them
- Focus on actionable insights, not just descriptions

Article Content:
{content}"""

        # Call Groq API
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=1500,
        )

        return chat_completion.choices[0].message.content

    except Exception as e:
        raise Exception(f"Error generating article summary: {str(e)}")


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
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
