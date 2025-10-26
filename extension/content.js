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
  const videoId = getVideoId();
  if (!videoId) return;

  // Check if button already exists in DOM (prevent duplicates)
  const existingButton = document.getElementById('yt-summarize-btn');
  if (existingButton) {
    console.log('Summarize button already exists, skipping...');
    summaryButton = existingButton;
    return;
  }

  // Remove old button reference if exists
  if (summaryButton) {
    summaryButton.remove();
    summaryButton = null;
  }

  // Find the actions bar below the video (where like/share buttons are)
  const actionsBar = document.querySelector('#actions ytd-menu-renderer');

  if (!actionsBar) {
    console.log('Actions bar not found yet, will retry...');
    return;
  }

  // IMPORTANT: Check if transcript button exists before showing Summarize button
  const engagementPanels = document.querySelector('#panels');
  if (!engagementPanels) {
    console.log('Panels area not ready yet, will retry...');
    return;
  }

  const buttons = engagementPanels.querySelectorAll('button');
  let hasTranscriptButton = false;

  for (const button of buttons) {
    const ariaLabel = button.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.toLowerCase().includes('transcript')) {
      hasTranscriptButton = true;
      break;
    }
  }

  if (!hasTranscriptButton) {
    console.log('Transcript button not ready yet, will retry...');
    return;
  }

  // Now we know transcript button exists, safe to show Summarize button
  console.log('Transcript button found, adding Summarize button');

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

      // Simplified: Just use the panel extraction method (reliable and stable)
      extractFromPanel(resolve, reject);

    } catch (error) {
      console.error('Error in getTranscript:', error);
      reject('Error getting transcript: ' + error.message);
    }
  });
}

function extractFromPanel(resolve, reject) {
  // Open transcript panel and extract (will be briefly visible)
  try {
    console.log('Opening transcript panel to extract...');

    // Function to find transcript button with retry
    const findTranscriptButton = (attempt = 0) => {
      const engagementPanels = document.querySelector('#panels');
      if (!engagementPanels) {
        if (attempt < 5) {
          console.log(`Panels not found, retry ${attempt + 1}/5...`);
          setTimeout(() => findTranscriptButton(attempt + 1), 500);
          return;
        }
        reject('Could not find engagement panels area. YouTube may still be loading. Please try again.');
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
        if (attempt < 5) {
          console.log(`Transcript button not found, retry ${attempt + 1}/5...`);
          setTimeout(() => findTranscriptButton(attempt + 1), 500);
          return;
        }
        reject('Could not find transcript button. This video may not have captions enabled.');
        return;
      }

      // Found the button, proceed with extraction
      console.log(`Found transcript button on attempt ${attempt + 1}`);
      extractTranscript(transcriptButton);
    };

    // Start looking for the button immediately
    findTranscriptButton();

    function extractTranscript(transcriptButton) {
      // Click to open the transcript panel
      transcriptButton.click();
      console.log('Clicked transcript button, waiting for panel to load...');

      // Wait for panel to appear and be fully loaded
      const waitForSegments = (attempt = 0) => {
        setTimeout(() => {
          try {
            const transcriptPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]');

            if (!transcriptPanel) {
              if (attempt < 3) {
                console.log(`Panel not found, retry ${attempt + 1}/3...`);
                waitForSegments(attempt + 1);
                return;
              }
              console.error('Transcript panel did not open after retries');
              transcriptButton.click(); // Try to close if it's stuck
              reject('Transcript panel did not open. Please try again.');
              return;
            }

            // Check if panel is visible (YouTube sets visibility attribute)
            const isVisible = transcriptPanel.getAttribute('visibility') === 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED';
            if (!isVisible && attempt < 3) {
              console.log(`Panel not expanded yet, retry ${attempt + 1}/3...`);
              waitForSegments(attempt + 1);
              return;
            }

            console.log('Transcript panel found and expanded, searching for segments...');

            // Try multiple selectors for transcript segments
            let segments = transcriptPanel.querySelectorAll('yt-formatted-string.segment-text');
            console.log('Selector 1 (yt-formatted-string.segment-text):', segments.length, 'segments');

            if (!segments || segments.length === 0) {
              segments = transcriptPanel.querySelectorAll('.segment-text');
              console.log('Selector 2 (.segment-text):', segments.length, 'segments');
            }

            if (!segments || segments.length === 0) {
              segments = transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer');
              console.log('Selector 3 (ytd-transcript-segment-renderer):', segments.length, 'segments');
            }

            // If still no segments and we haven't retried enough, try again
            // Use longer delay when panel is expanded but segments haven't loaded
            if ((!segments || segments.length === 0) && attempt < 5) {
              console.log(`No segments found yet, retry ${attempt + 1}/5... (waiting longer for YouTube to load)`);
              waitForSegments(attempt + 1);
              return;
            }

            if (!segments || segments.length === 0) {
              console.error('No transcript segments found with any selector after retries');
              console.log('Panel HTML preview:', transcriptPanel.innerHTML.substring(0, 500));
              transcriptButton.click();
              reject('No transcript segments found. This video may not have captions, or try refreshing the page.');
              return;
            }

            // Extract text with timestamps
            let transcriptWithTimestamps = [];
            segments.forEach(segment => {
              const text = segment.textContent || segment.innerText;

              // Get the timestamp from the parent element
              const segmentRenderer = segment.closest('ytd-transcript-segment-renderer');
              let timestamp = '0:00';

              if (segmentRenderer) {
                const timestampElement = segmentRenderer.querySelector('.segment-timestamp');
                if (timestampElement) {
                  timestamp = timestampElement.textContent.trim();
                }
              }

              if (text) {
                transcriptWithTimestamps.push({
                  time: timestamp,
                  text: text.trim()
                });
              }
            });

            console.log('Extracted transcript with timestamps, segments:', transcriptWithTimestamps.length);

            // Close the panel gently (wait a bit before closing)
            setTimeout(() => {
              transcriptButton.click();
            }, 300);

            if (transcriptWithTimestamps.length === 0) {
              reject('No transcript data extracted');
              return;
            }

            resolve(transcriptWithTimestamps);

          } catch (e) {
            console.error('Error extracting transcript:', e);
            // Try to close panel
            try {
              transcriptButton.click();
            } catch (closeErr) {
              console.error('Could not close panel:', closeErr);
            }
            reject('Failed to extract transcript: ' + e.message);
          }
        }, attempt === 0 ? 1500 : (attempt > 2 ? 1500 : 1000)); // First: 1.5s, attempts 1-2: 1s, attempts 3-5: 1.5s
      };

      // Start the extraction process
      waitForSegments(0);
    }

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

    // Get video title
    const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
    const videoTitle = titleElement ? titleElement.textContent.trim() : '';
    console.log('Video title:', videoTitle);

    // Get transcript with timestamps
    const transcriptData = await getTranscript(videoId);
    console.log('Transcript fetched, segments:', transcriptData.length);

    // Send to backend for summarization
    const response = await fetch('https://web-production-f6684.up.railway.app/api/summarize-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: videoId,
        title: videoTitle,
        transcript: transcriptData
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

  // Keep trying every 3 seconds with max 3 attempts (reduced from 5)
  let attempts = 0;
  const maxAttempts = 3;

  checkInterval = setInterval(() => {
    attempts++;
    createSummarizeButton();

    // Stop after max attempts even if button wasn't added
    if (attempts >= maxAttempts) {
      console.log('Max attempts reached, stopping button check');
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }, 3000); // Increased from 2s to 3s
}

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-add button when navigating to new video (YouTube is SPA)
// Listen to YouTube's native navigation event instead of polling
document.addEventListener('yt-navigate-finish', () => {
  console.log('YouTube navigation detected, re-initializing...');

  // Remove old button from DOM if exists
  const oldButton = document.getElementById('yt-summarize-btn');
  if (oldButton) {
    oldButton.remove();
  }
  summaryButton = null;

  // Clear old interval if exists
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }

  // Re-initialize after YouTube loads new page
  setTimeout(init, 1500);
});
