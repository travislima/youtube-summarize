// Popup script for article summarization
const API_URL = 'https://web-production-f6684.up.railway.app';

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
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['Readability.js']
      });

      // Execute article extraction
      const extractionResults = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: extractArticleContent
      });

      const articleData = extractionResults[0].result;

      if (!articleData || !articleData.textContent) {
        throw new Error('Could not extract article content from this page. This might not be an article page.');
      }

      // Show summarizing state
      summarizeBtn.textContent = 'Summarizing...';
      statusDiv.textContent = `Found article: "${articleData.title}"`;

      // Send to backend for summarization
      const response = await fetch(`${API_URL}/api/summarize-article`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: articleData.title,
          content: articleData.textContent,
          excerpt: articleData.excerpt
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      // Display summary
      summaryDiv.innerHTML = formatSummary(data.summary);
      statusDiv.textContent = 'Summary complete!';
      summarizeBtn.textContent = 'Summarize Article';
      summarizeBtn.disabled = false;

      // Add copy button
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
      summarizeBtn.textContent = 'Summarize Article';
      summarizeBtn.disabled = false;
    }
  });
}

// Function to extract article content (runs in page context)
function extractArticleContent() {
  try {
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
