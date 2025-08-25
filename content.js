// TinyRead Content Script
// Handles Cmd+E overlay and summary display

let overlayVisible = false;
let overlay = null;

// Create overlay element
function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'tinyread-overlay';
  overlay.innerHTML = `
    <div class="tinyread-modal">
      <div class="tinyread-header">
        <h3>TinyRead</h3>
        <button class="tinyread-close">&times;</button>
      </div>
      <div class="tinyread-content">
        <div class="tinyread-loading" id="loading">
          <div class="spinner"></div>
          <p>Generating summary...</p>
        </div>
        <div class="tinyread-summary" id="summary" style="display: none;">
          <div class="summary-tabs">
            <button class="tab-btn active" data-level="short">Short</button>
            <button class="tab-btn" data-level="medium">Medium</button>
            <button class="tab-btn" data-level="detailed">Detailed</button>
          </div>
          <div class="summary-content">
            <div class="summary-text" id="summary-text"></div>
            <div class="summary-actions">
              <button class="copy-link-btn">Copy Link</button>
              <div class="reuse-counter" id="reuse-counter"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  return overlay;
}

// Extract article content
function getArticleContent() {
  // Try multiple selectors to find article content
  const selectors = [
    'article',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    'main',
    '.content'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.innerText.substring(0, 5000); // Limit to 5000 chars
    }
  }
  
  // Fallback: get text from body, excluding nav/footer
  const body = document.body.cloneNode(true);
  const unwanted = body.querySelectorAll('nav, footer, header, aside, .sidebar, .comments');
  unwanted.forEach(el => el.remove());
  
  return body.innerText.substring(0, 5000);
}

// Get canonical URL
function getCanonicalUrl() {
  const canonical = document.querySelector('link[rel="canonical"]');
  return canonical ? canonical.href : window.location.href.split('#')[0].split('?')[0];
}

// Generate summary using API
async function generateSummary(content, level = 'short') {
  const apiUrl = 'https://your-api-endpoint.com/api/summary'; // TODO: Replace with actual API
  
  const prompts = {
    short: "Summarize this article in 1-2 sentences. Include at least one specific number, date, or statistic.",
    medium: "Summarize this article in 3-5 sentences. Include key quantitative facts, names, and takeaways.",
    detailed: "Create a comprehensive bullet-point summary. Include all numbers, dates, statistics, names, and key facts mentioned."
  };
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: getCanonicalUrl(),
        content: content,
        level: level,
        prompt: prompts[level]
      })
    });
    
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error generating summary:', error);
    // Return mock data for development
    return {
      summary: {
        short: "This is a mock short summary for development purposes.",
        medium: "This is a mock medium summary that provides more detail than the short version. It includes key points and context about the article content.",
        detailed: "• This is a mock detailed summary\n• It includes bullet points with specific information\n• Numbers, dates, and statistics would go here\n• Key names and facts are highlighted\n• This format provides comprehensive coverage"
      },
      reuse_count: Math.floor(Math.random() * 50) + 1,
      is_cached: Math.random() > 0.5
    };
  }
}

// Show overlay with summary
async function showOverlay() {
  if (overlayVisible) return;
  
  overlayVisible = true;
  overlay = createOverlay();
  
  // Add event listeners
  overlay.querySelector('.tinyread-close').addEventListener('click', hideOverlay);
  overlay.querySelector('.copy-link-btn').addEventListener('click', copyShareLink);
  
  // Tab switching
  const tabBtns = overlay.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      updateSummaryDisplay(e.target.dataset.level);
    });
  });
  
  // Get article content and generate summary
  const content = getArticleContent();
  const summaryData = await generateSummary(content, 'short');
  
  // Hide loading, show summary
  overlay.querySelector('#loading').style.display = 'none';
  overlay.querySelector('#summary').style.display = 'block';
  
  // Store summary data
  overlay.summaryData = summaryData;
  
  // Update display
  updateSummaryDisplay('short');
  updateReuseCounter(summaryData.reuse_count, summaryData.is_cached);
}

// Update summary display for different levels
function updateSummaryDisplay(level) {
  if (!overlay || !overlay.summaryData) return;
  
  const summaryText = overlay.querySelector('#summary-text');
  summaryText.textContent = overlay.summaryData.summary[level];
}

// Update reuse counter
function updateReuseCounter(count, isCached) {
  const counter = overlay.querySelector('#reuse-counter');
  const status = isCached ? 'Reused' : 'New';
  counter.innerHTML = `${status} • Viewed ${count} times`;
}

// Copy share link
function copyShareLink() {
  const url = getCanonicalUrl();
  const shareUrl = `https://tinyread.ai/s/${btoa(url).replace(/[+/=]/g, '')}`;
  
  navigator.clipboard.writeText(shareUrl).then(() => {
    const btn = overlay.querySelector('.copy-link-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

// Hide overlay
function hideOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
    overlayVisible = false;
  }
}

// Keyboard event listener
document.addEventListener('keydown', (e) => {
  // Cmd+E or Ctrl+E
  if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
    e.preventDefault();
    showOverlay();
  }
  
  // Escape to close
  if (e.key === 'Escape' && overlayVisible) {
    hideOverlay();
  }
});

// Click outside overlay to close
document.addEventListener('click', (e) => {
  if (overlayVisible && overlay && !overlay.querySelector('.tinyread-modal').contains(e.target)) {
    hideOverlay();
  }
});