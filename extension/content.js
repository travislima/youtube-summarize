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

          // Use fetch with credentials to avoid CORS issues
          fetch(captionUrl, {
            method: 'GET',
            credentials: 'include',
            mode: 'cors'
          })
            .then(response => {
              console.log('Caption response status:', response.status);
              console.log('Caption response headers:', response.headers);
              return response.text();
            })
            .then(xmlData => {
              console.log('Caption data received, length:', xmlData.length);

              if (!xmlData || xmlData.length < 10) {
                console.log('Empty caption data from API, trying invisible panel method...');
                tryInvisibleTranscriptMethod(resolve, reject);
                return;
              }

              console.log('Caption data preview:', xmlData.substring(0, 500));

              // Parse XML
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
              const textElements = xmlDoc.getElementsByTagName('text');

              if (textElements.length === 0) {
                console.log('No text elements in XML, trying invisible panel method...');
                tryInvisibleTranscriptMethod(resolve, reject);
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
              console.log('Fetch failed, trying invisible panel method...');
              tryInvisibleTranscriptMethod(resolve, reject);
            });

        } else {
          // Try fallback method: Access transcript panel invisibly
          console.log('No captions in playerResponse, trying invisible panel method...');
          tryInvisibleTranscriptMethod(resolve, reject);
        }

      } catch (e) {
        console.error('Error extracting from page:', e);
        // Try fallback method
        tryInvisibleTranscriptMethod(resolve, reject);
      }

    } catch (error) {
      console.error('Error in getTranscript:', error);
      reject('Error getting transcript: ' + error.message);
    }
  });
}

function tryInvisibleTranscriptMethod(resolve, reject) {
  // Access transcript without visible panel opening
  try {
    console.log('Attempting invisible transcript extraction...');

    // Find the transcript button
    const engagementPanels = document.querySelector('#panels');
    if (!engagementPanels) {
      reject('Could not find engagement panels area');
      return;
    }

    const buttons = engagementPanels.querySelectorAll('button');
    let transcriptButton = null;

    for (const button of buttons) {
      const ariaLabel = button.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.toLowerCase().includes('transcript')) {
        transcriptButton = button;
        break;
      }
    }

    if (!transcriptButton) {
      reject('Could not find transcript button. This video may not have captions enabled.');
      return;
    }

    // Move panels off-screen (don't hide visibility so content renders)
    const allPanels = document.querySelectorAll('ytd-engagement-panel-section-list-renderer');
    const originalStyles = [];

    allPanels.forEach(panel => {
      originalStyles.push({
        position: panel.style.position,
        left: panel.style.left,
        opacity: panel.style.opacity,
        pointerEvents: panel.style.pointerEvents
      });
      panel.style.setProperty('position', 'fixed', 'important');
      panel.style.setProperty('left', '-9999px', 'important');
      panel.style.setProperty('opacity', '0', 'important');
      panel.style.setProperty('pointer-events', 'none', 'important');
    });

    // Click to load the transcript data (will load off-screen)
    transcriptButton.click();

    // Wait for panel to load and render content
    setTimeout(() => {
      try {
        const transcriptPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]');

        if (!transcriptPanel) {
          reject('Transcript panel did not load');
          return;
        }

        // Try multiple selectors for transcript segments
        let segments = transcriptPanel.querySelectorAll('yt-formatted-string.segment-text');

        if (!segments || segments.length === 0) {
          segments = transcriptPanel.querySelectorAll('.segment-text');
        }

        if (!segments || segments.length === 0) {
          segments = transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer');
        }

        if (!segments || segments.length === 0) {
          console.error('Could not find transcript segments. Panel HTML:', transcriptPanel.innerHTML.substring(0, 500));
          // Close the panel before rejecting
          transcriptButton.click();
          reject('No transcript segments found. Try clicking the transcript button manually first.');
          return;
        }

        let transcript = '';
        segments.forEach(segment => {
          const text = segment.textContent || segment.innerText;
          if (text) {
            transcript += text.trim() + ' ';
          }
        });

        transcript = transcript.trim();
        console.log('Extracted transcript invisibly, length:', transcript.length);

        // Restore panel styles and close it
        const allPanelsAfter = document.querySelectorAll('ytd-engagement-panel-section-list-renderer');
        allPanelsAfter.forEach((panel, index) => {
          if (originalStyles[index]) {
            panel.style.removeProperty('position');
            panel.style.removeProperty('left');
            panel.style.removeProperty('opacity');
            panel.style.removeProperty('pointer-events');
          }
        });
        transcriptButton.click();

        if (transcript.length < 10) {
          reject('Transcript too short or extraction failed');
          return;
        }

        resolve(transcript);

      } catch (e) {
        console.error('Error extracting from invisible panel:', e);

        // Restore panel styles
        const allPanelsAfter = document.querySelectorAll('ytd-engagement-panel-section-list-renderer');
        allPanelsAfter.forEach((panel, index) => {
          if (originalStyles[index]) {
            panel.style.removeProperty('position');
            panel.style.removeProperty('left');
            panel.style.removeProperty('opacity');
            panel.style.removeProperty('pointer-events');
          }
        });

        // Try to close panel if it's open
        if (transcriptButton) {
          transcriptButton.click();
        }
        reject('Failed to extract transcript: ' + e.message);
      }
    }, 2500); // Wait 2.5 seconds for panel to load and render

  } catch (error) {
    reject('Error in invisible transcript method: ' + error.message);
  }
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
    // Handle both Error objects and string rejections
    console.error('Summarization error:', error);

    let errorMsg = 'Unknown error occurred';
    if (error instanceof Error) {
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

function convertMarkdownToHTML(markdown) {
  // Enhanced markdown to HTML converter
  let html = markdown;

  // Convert headers (## Header or **Header**:)
  html = html.replace(/^## (.+)$/gm, '<h3 class="summary-header">$1</h3>');

  // Also handle **Header**: style (like the AI is currently outputting)
  html = html.replace(/^\*\*(.+?)\*\*:/gm, '<h3 class="summary-header">$1</h3>');

  // Convert bold (**text**) - do this after headers
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convert asterisk bullet points (* text)
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');

  // Convert bullet points (• text or - text)
  html = html.replace(/^[•\-] (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>\s*)+/gs, (match) => `<ul>${match}</ul>`);

  // Convert double line breaks to paragraph breaks
  html = html.split('\n\n').map(para => {
    // Don't wrap headers or lists in <p>
    if (para.includes('<h3') || para.includes('<ul>') || para.includes('<li>')) {
      return para;
    }
    // Wrap regular text in <p>
    return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
  }).join('');

  return html;
}

function showSummaryModal(summary, videoId) {
  // Remove existing modal if any
  const existingModal = document.getElementById('yt-summary-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Convert markdown to HTML
  const formattedSummary = convertMarkdownToHTML(summary);

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
        <div class="yt-summary-text">${formattedSummary}</div>
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

  // Keep trying every 3 seconds (increased from 2) with max 10 attempts
  let attempts = 0;
  const maxAttempts = 10;

  checkInterval = setInterval(() => {
    attempts++;
    createSummarizeButton();

    // Stop after max attempts even if button wasn't added
    if (attempts >= maxAttempts) {
      console.log('Max attempts reached, stopping button check');
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }, 3000);
}

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-add button when navigating to new video (YouTube is SPA)
// Use navigation API instead of observing all DOM changes
let lastUrl = location.href;

// Much more efficient: only check URL periodically instead of watching all DOM
setInterval(() => {
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
}, 1000); // Check every second instead of observing every DOM change
