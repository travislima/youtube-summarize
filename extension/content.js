/**
 * YouTube Video Summarizer - Content Script
 * This script runs on YouTube pages and adds a "Summarize" button
 */

console.log('YouTube Summarizer extension loaded!');

// Wait for YouTube to load
let checkInterval;
let summaryButton = null;

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

function createSummarizeButton() {
  // Remove old button if exists
  if (summaryButton) {
    summaryButton.remove();
  }

  const videoId = getVideoId();
  if (!videoId) return;

  // Find the actions bar below the video (where like/share buttons are)
  const actionsBar = document.querySelector('#actions ytd-menu-renderer');

  if (!actionsBar) {
    console.log('Actions bar not found yet, will retry...');
    return;
  }

  // Create the summarize button
  summaryButton = document.createElement('button');
  summaryButton.id = 'yt-summarize-btn';
  summaryButton.className = 'yt-summarize-button';
  summaryButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>Summarize</span>
  `;

  summaryButton.addEventListener('click', handleSummarize);

  // Insert the button
  const topLevelButtons = actionsBar.querySelector('#top-level-buttons-computed');
  if (topLevelButtons) {
    topLevelButtons.insertBefore(summaryButton, topLevelButtons.firstChild);
    console.log('Summarize button added!');

    // Stop checking once button is added
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }
}

async function getTranscript(videoId) {
  return new Promise((resolve, reject) => {
    // Try to get transcript from YouTube's player
    try {
      // Method 1: Try to get from timedtext
      const video = document.querySelector('video');
      console.log('Video element found:', !!video);
      if (!video) {
        reject('Video element not found');
        return;
      }

      // Fetch transcript using YouTube's timedtext API
      const lang = 'en';
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`;
      console.log('Fetching transcript from:', url);

      fetch(url)
        .then(response => {
          console.log('Transcript response status:', response.status);
          console.log('Transcript response ok:', response.ok);
          return response.text();
        })
        .then(data => {
          console.log('Transcript data length:', data.length);
          console.log('Transcript data preview:', data.substring(0, 200));
          if (!data || data.length < 10) {
            reject('No transcript available for this video');
            return;
          }

          // Parse the XML response
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(data, 'text/xml');
          const textElements = xmlDoc.getElementsByTagName('text');

          if (textElements.length === 0) {
            reject('No transcript found');
            return;
          }

          // Extract text content
          let transcript = '';
          for (let i = 0; i < textElements.length; i++) {
            const text = textElements[i].textContent;
            if (text) {
              // Decode HTML entities
              const temp = document.createElement('textarea');
              temp.innerHTML = text;
              transcript += temp.value + ' ';
            }
          }

          resolve(transcript.trim());
        })
        .catch(err => {
          reject('Failed to fetch transcript: ' + err.message);
        });

    } catch (error) {
      reject('Error accessing transcript: ' + error.message);
    }
  });
}

async function handleSummarize() {
  const videoId = getVideoId();
  if (!videoId) {
    showNotification('Error: Could not get video ID', 'error');
    return;
  }

  // Disable button and show loading state
  summaryButton.disabled = true;
  summaryButton.innerHTML = `
    <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>
    <span>Summarizing...</span>
  `;

  try {
    console.log('Fetching transcript for video:', videoId);

    // Get transcript
    const transcript = await getTranscript(videoId);
    console.log('Transcript fetched, length:', transcript.length);

    // Send to backend for summarization
    const response = await fetch('http://localhost:8000/api/summarize-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: videoId,
        transcript: transcript
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to summarize');
    }

    console.log('Summary received!');
    showSummaryModal(data.summary, videoId);

  } catch (error) {
    console.error('Full error object:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    let errorMsg = 'Unknown error occurred';
    if (error.message) {
      errorMsg = error.message;
    } else if (typeof error === 'string') {
      errorMsg = error;
    } else {
      errorMsg = String(error);
    }

    showNotification('Error: ' + errorMsg, 'error');
  } finally {
    // Reset button
    summaryButton.disabled = false;
    summaryButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Summarize</span>
    `;
  }
}

function showSummaryModal(summary, videoId) {
  // Remove existing modal if any
  const existingModal = document.getElementById('yt-summary-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'yt-summary-modal';
  modal.className = 'yt-summary-modal';
  modal.innerHTML = `
    <div class="yt-summary-modal-content">
      <div class="yt-summary-modal-header">
        <h2>Video Summary</h2>
        <button class="yt-summary-close">&times;</button>
      </div>
      <div class="yt-summary-modal-body">
        <p class="yt-summary-text">${summary.replace(/\n/g, '<br>')}</p>
      </div>
      <div class="yt-summary-modal-footer">
        <small>Video ID: ${videoId}</small>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close button handler
  const closeBtn = modal.querySelector('.yt-summary-close');
  closeBtn.addEventListener('click', () => modal.remove());

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `yt-summary-notification yt-summary-notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('yt-summary-notification-fade');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize
function init() {
  console.log('Initializing YouTube Summarizer...');

  // Try to add button immediately
  createSummarizeButton();

  // Keep trying every 2 seconds until button is added
  checkInterval = setInterval(createSummarizeButton, 2000);
}

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-add button when navigating to new video (YouTube is SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('URL changed, re-initializing...');
    summaryButton = null;

    // Clear old interval if exists
    if (checkInterval) {
      clearInterval(checkInterval);
    }

    // Re-initialize
    setTimeout(init, 1000);
  }
}).observe(document, { subtree: true, childList: true });
