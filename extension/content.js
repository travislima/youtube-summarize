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
    try {
      console.log('Attempting to get transcript for video:', videoId);

      // Method 1: Try to extract from ytInitialPlayerResponse (embedded in page)
      try {
        // YouTube embeds data in the page source
        const scripts = document.querySelectorAll('script');
        let playerResponse = null;

        for (const script of scripts) {
          const text = script.textContent;
          if (text.includes('ytInitialPlayerResponse')) {
            // Extract the JSON object
            const match = text.match(/var ytInitialPlayerResponse = ({.+?});/);
            if (match) {
              playerResponse = JSON.parse(match[1]);
              console.log('Found ytInitialPlayerResponse');
              break;
            }
          }
        }

        if (playerResponse && playerResponse.captions) {
          const captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer?.captionTracks;

          if (!captionTracks || captionTracks.length === 0) {
            reject('No captions available for this video');
            return;
          }

          // Find English caption track
          const englishTrack = captionTracks.find(track =>
            track.languageCode === 'en' || track.languageCode.startsWith('en')
          ) || captionTracks[0]; // Fallback to first available

          console.log('Found caption track:', englishTrack.name.simpleText);

          // Fetch the caption data
          const captionUrl = englishTrack.baseUrl;
          console.log('Fetching captions from:', captionUrl);

          fetch(captionUrl)
            .then(response => response.text())
            .then(xmlData => {
              console.log('Caption data received, length:', xmlData.length);

              // Parse XML
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
              const textElements = xmlDoc.getElementsByTagName('text');

              if (textElements.length === 0) {
                reject('No transcript text found');
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

              transcript = transcript.trim();
              console.log('Extracted transcript length:', transcript.length);

              if (transcript.length < 10) {
                reject('Transcript too short');
                return;
              }

              resolve(transcript);
            })
            .catch(err => {
              console.error('Error fetching caption URL:', err);
              reject('Failed to fetch captions: ' + err.message);
            });

        } else {
          reject('No caption data found in page');
        }

      } catch (e) {
        console.error('Error extracting from page:', e);
        reject('Error extracting transcript: ' + e.message);
      }

    } catch (error) {
      console.error('Error in getTranscript:', error);
      reject('Error getting transcript: ' + error.message);
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
