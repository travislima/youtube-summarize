// Popup script for article summarization
const API_URL = 'https://web-production-f6684.up.railway.app';
const FETCH_TIMEOUT_MS = 30000; // 30 seconds for AI summarization

// Get current tab and determine if it's YouTube or an article page
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  const currentTab = tabs[0];
  const url = currentTab.url;

  // Check if we're on YouTube
  const isYouTube = url.includes('youtube.com/watch');

  if (isYouTube) {
    showYouTubeMode();
  } else {
    showArticleMode(currentTab.id);
  }
});

function showYouTubeMode() {
  // Show existing YouTube instructions
  document.getElementById('youtube-mode').style.display = 'block';
  document.getElementById('article-mode').style.display = 'none';
}

function showArticleMode(tabId) {
  // Show article summarization UI
  document.getElementById('youtube-mode').style.display = 'none';
  document.getElementById('article-mode').style.display = 'block';

  const summarizeBtn = document.getElementById('summarize-article-btn');
  const statusDiv = document.getElementById('article-status');
  const summaryDiv = document.getElementById('article-summary');

  summarizeBtn.addEventListener('click', async () => {
    try {
      // Disable button and show loading state
      summarizeBtn.disabled = true;
      summarizeBtn.textContent = 'Extracting article...';
      statusDiv.textContent = '';
      summaryDiv.textContent = '';

      // Inject Readability and extract article content
      // Uses activeTab permission: when user clicks extension icon, we get
      // temporary access to inject scripts into the current tab
      let readabilityResults;
      try {
        readabilityResults = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['Readability.js']
        });
      } catch (injectionError) {
        console.error('Readability.js injection failed:', injectionError);
        throw new Error('Failed to inject article reader. Please try reloading the page.');
      }

      // Validate injection succeeded before proceeding
      if (!readabilityResults || !Array.isArray(readabilityResults) || readabilityResults.length === 0) {
        console.error('Readability.js injection returned invalid result:', readabilityResults);
        throw new Error('Article reader failed to load. Please try again.');
      }

      // Check for injection errors
      const injectionResult = readabilityResults[0];
      if (injectionResult.error) {
        console.error('Readability.js injection error:', injectionResult.error);
        throw new Error('Article reader encountered an error. This page may not be compatible.');
      }

      console.log('Readability.js injected successfully');

      // Execute article extraction
      let extractionResults;
      try {
        extractionResults = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: extractArticleContent
        });
      } catch (extractionError) {
        console.error('Article extraction failed:', extractionError);
        throw new Error('Failed to extract article content. This might not be an article page.');
      }

      // Validate extraction results
      if (!extractionResults || !Array.isArray(extractionResults) || extractionResults.length === 0) {
        console.error('Article extraction returned invalid result:', extractionResults);
        throw new Error('Article extraction failed. Please try again.');
      }

      const articleData = extractionResults[0].result;

      if (!articleData || !articleData.textContent) {
        throw new Error('Could not extract article content from this page. This might not be an article page.');
      }

      // Show summarizing state
      summarizeBtn.textContent = 'Summarizing...';
      statusDiv.textContent = `Found article: "${articleData.title}"`;

      // Send to backend for summarization with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, FETCH_TIMEOUT_MS);

      let response;
      try {
        response = await fetch(`${API_URL}/api/summarize-article`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: articleData.title,
            content: articleData.textContent,
            excerpt: articleData.excerpt
          }),
          signal: controller.signal
        });

        // Clear timeout on successful response
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);

        // Handle timeout specifically
        if (fetchError.name === 'AbortError') {
          throw new Error(`Summarization timed out after ${FETCH_TIMEOUT_MS / 1000} seconds. The article might be too long or the server is slow. Please try again.`);
        }

        // Handle network errors
        throw new Error(`Network error: ${fetchError.message}. Please check your connection.`);
      }

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}. Please try again later.`);
      }

      const data = await response.json();

      // Display summary (sanitized to prevent XSS)
      // DOMPurify sanitizes HTML before inserting to prevent malicious scripts
      const formattedSummary = formatSummary(data.summary);
      const sanitizedSummary = DOMPurify.sanitize(formattedSummary, {
        ALLOWED_TAGS: ['div', 'strong', 'br'],
        ALLOWED_ATTR: ['class'],
        KEEP_CONTENT: true
      });
      summaryDiv.innerHTML = sanitizedSummary;

      statusDiv.textContent = 'Summary complete!';
      summarizeBtn.textContent = 'Summarize Article';
      summarizeBtn.disabled = false;

      // Add copy button (created safely with createElement)
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = 'Copy Summary';
      copyBtn.onclick = () => {
        const plainText = convertMarkdownToPlainText(data.summary);
        navigator.clipboard.writeText(plainText);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy Summary'; }, 2000);
      };
      summaryDiv.appendChild(copyBtn);

    } catch (error) {
      console.error('Summarization error:', error);
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.style.color = '#ff6b6b'; // Red color for errors
      summarizeBtn.textContent = 'Summarize Article';
      summarizeBtn.disabled = false;
    }
  });
}

// Function to extract article content (runs in page context)
function extractArticleContent() {
  try {
    // Check if Readability is available (it should be if injection succeeded)
    if (typeof Readability === 'undefined') {
      console.error('Readability is not defined - injection may have failed');
      return null;
    }

    // Clone the document to avoid modifying the actual page
    const documentClone = document.cloneNode(true);

    // Use Readability to parse the article
    const reader = new Readability(documentClone, {
      charThreshold: 500 // Minimum length to be considered an article
    });

    const article = reader.parse();

    if (!article) {
      return null;
    }

    return {
      title: article.title,
      textContent: article.textContent,
      excerpt: article.excerpt,
      length: article.length
    };
  } catch (error) {
    console.error('Article extraction error:', error);
    return null;
  }
}

// Format summary with markdown-like styling
// Returns HTML string that will be sanitized by DOMPurify before insertion
function formatSummary(summary) {
  let formatted = summary;

  // Convert ## headers to bold sections
  formatted = formatted.replace(/^## (.+)$/gm, '<div class="summary-header">$1</div>');

  // Convert **bold** to <strong>
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convert bullet points to list items
  formatted = formatted.replace(/^\* (.+)$/gm, '<div class="summary-bullet">• $1</div>');

  // Convert line breaks
  formatted = formatted.replace(/\n\n/g, '<br><br>');

  return formatted;
}

// Convert markdown to plain text for copying
function convertMarkdownToPlainText(markdown) {
  let text = markdown;

  // Convert ## headers to uppercase sections with spacing
  text = text.replace(/^## (.+)$/gm, '\n$1\n' + '='.repeat(50));

  // Remove **bold** markdown but keep the text
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');

  // Convert bullet points (* text) to simple bullets
  text = text.replace(/^\* (.+)$/gm, '• $1');

  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace
  text = text.trim();

  return text;
}
