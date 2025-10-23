/**
 * YouTube Video Summarizer - Frontend Logic
 */

// Get DOM elements
const urlInput = document.getElementById('youtubeUrl');
const summarizeBtn = document.getElementById('summarizeBtn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const resultDiv = document.getElementById('result');
const summaryContent = document.getElementById('summaryContent');
const videoInfo = document.getElementById('videoInfo');

// Allow Enter key to trigger summarization
urlInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        summarizeVideo();
    }
});

// Add button click listener
summarizeBtn.addEventListener('click', summarizeVideo);

/**
 * Main function to summarize a YouTube video
 */
async function summarizeVideo() {
    const url = urlInput.value.trim();

    // Validate input
    if (!url) {
        showError('Please enter a YouTube URL');
        return;
    }

    // Reset UI
    hideAll();
    showLoading();

    try {
        // Call backend API
        const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to summarize video');
        }

        // Display results
        showResult(data);

    } catch (error) {
        showError(error.message);
    }
}

/**
 * Show loading state
 */
function showLoading() {
    loadingDiv.classList.remove('hidden');
    summarizeBtn.disabled = true;
}

/**
 * Show error message
 */
function showError(message) {
    hideAll();
    errorMessage.textContent = message;
    errorDiv.classList.remove('hidden');
    summarizeBtn.disabled = false;
}

/**
 * Show summary result
 */
function showResult(data) {
    hideAll();
    summaryContent.textContent = data.summary;
    videoInfo.textContent = `Video ID: ${data.video_id} | Transcript length: ${data.transcript_length} characters`;
    resultDiv.classList.remove('hidden');
    summarizeBtn.disabled = false;
}

/**
 * Hide all result sections
 */
function hideAll() {
    loadingDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    resultDiv.classList.add('hidden');
}

// Show a friendly message on page load
console.log('YouTube Summarizer loaded! Paste a YouTube URL and click Summarize.');
