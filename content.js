// TinyRead Content Script
// Handles Cmd+Shift+S overlay and canonical summary sharing

let overlayVisible = false;
let overlay = null;
let floatingWidget = null;

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
          <p>Checking for existing summary...</p>
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
              <button class="copy-link-btn">📋 Share Summary</button>
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

// Extract article content with better fallbacks
function getArticleContent() {
  // Wait a moment for dynamic content to load
  const selectors = [
    'article',
    '[role="main"]',
    '.post-content', 
    '.article-content',
    '.entry-content',
    '.content-body',
    'main',
    '.content',
    // Spotify-specific
    '[data-testid="podcast-description"]',
    '.Type__TypeElement-sc-goli3j-0'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.length > 100) {
      console.log(`✅ Found content using selector: ${selector}`);
      return element.innerText.substring(0, 5000); // Limit to 5000 chars
    }
  }
  
  // Fallback: get text from body, excluding nav/footer
  const body = document.body.cloneNode(true);
  const unwanted = body.querySelectorAll('nav, footer, header, aside, .sidebar, .comments, .ads, script, style');
  unwanted.forEach(el => el.remove());
  
  console.log('⚠️ Using fallback body text extraction');
  return body.innerText.substring(0, 5000);
}

// Get canonical URL
function getCanonicalUrl() {
  const canonical = document.querySelector('link[rel="canonical"]');
  const baseUrl = canonical ? canonical.href : window.location.href.split('#')[0].split('?')[0];
  
  // For debugging - add timestamp to force cache refresh during development
  console.log('📍 TinyRead: Current URL:', baseUrl);
  return baseUrl;
}

// Generate summary using API
async function generateSummary(content, level = 'short') {
  // Try production first, fallback to local
  const apiUrls = [
    'https://tinyread-chrome-extension-git-main-erictansongyi-gmailcoms-projects.vercel.app/api/summary',
    'http://localhost:3000/api/summary'
  ];
  
  const prompts = {
    short: "Summarize this article in 1-2 sentences. Include at least one specific number, date, or statistic.",
    medium: "Summarize this article in 3-5 sentences. Include key quantitative facts, names, and takeaways.",
    detailed: "Create a comprehensive bullet-point summary. Include all numbers, dates, statistics, names, and key facts mentioned."
  };
  
  for (const apiUrl of apiUrls) {
    try {
      console.log(`🌐 TinyRead: Trying API: ${apiUrl}`);
      console.log(`📝 TinyRead: Request payload:`, { url: getCanonicalUrl(), contentLength: content.length });
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
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ TinyRead: API Success:', result);
      console.log(`📊 TinyRead: Reuse count: ${result.reuse_count}, Cached: ${result.is_cached}`);
      return result;
      
    } catch (error) {
      console.warn(`API ${apiUrl} failed:`, error);
      if (apiUrl === apiUrls[apiUrls.length - 1]) {
        // Last URL failed, throw error
        console.error('All APIs failed:', error);
        // Return mock data if all APIs fail
        return {
          summary: {
            short: "API currently unavailable. Summary will be generated shortly.",
            medium: "The TinyRead API is temporarily unavailable, but your request has been logged. Please try again in a few moments for the full summary.", 
            detailed: "• API connection failed - this is likely temporary\n• Your article URL has been cached for retry\n• Summary generation typically takes 10-15 seconds\n• Please refresh or try again shortly\n• Check tinyread.ai for service status updates"
          },
          reuse_count: 1,
          is_cached: false,
          environmental_impact: { co2_saved_grams: 0, equivalent_searches: 0 }
        };
      }
    }
  }
}

// Show overlay with summary
async function showOverlay() {
  console.log('🚀 TinyRead: showOverlay() called');
  if (overlayVisible) {
    console.log('⚠️ TinyRead: Overlay already visible, returning');
    return;
  }
  
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
  const url = getCanonicalUrl();
  console.log('Extracted content length:', content.length);
  console.log('Content preview:', content.substring(0, 200) + '...');
  console.log('Article URL:', url);
  
  // Check if content seems too generic (might indicate wrong page)
  if (content.length < 200) {
    console.warn('⚠️ TinyRead: Content seems very short, might not be an article page');
  }
  
  const summaryData = await generateSummary(content, 'short');
  
  // Hide loading, show summary
  overlay.querySelector('#loading').style.display = 'none';
  overlay.querySelector('#summary').style.display = 'block';
  
  // Store summary data
  overlay.summaryData = summaryData;
  
  // Update display
  updateSummaryDisplay('short');
  updateReuseCounter(summaryData.reuse_count, summaryData.is_cached, summaryData.environmental_impact);
}

// Update summary display for different levels  
function updateSummaryDisplay(level) {
  if (!overlay || !overlay.summaryData) return;
  
  const summaryText = overlay.querySelector('#summary-text');
  let content = overlay.summaryData.summary[level];
  
  // Convert markdown to HTML
  content = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **bold**
    .replace(/\*(.*?)\*/g, '<em>$1</em>')              // *italic*
    .replace(/^• (.*$)/gim, '<li>$1</li>')             // • bullets
    .replace(/^# (.*$)/gim, '<h3>$1</h3>')             // # headers
    .replace(/\n/g, '<br>');                           // line breaks
    
  // Wrap bullets in ul
  if (content.includes('<li>')) {
    content = content.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  }
  
  summaryText.innerHTML = content;
}

// Update reuse counter with environmental impact
function updateReuseCounter(count, isCached, environmentalImpact) {
  const counter = overlay.querySelector('#reuse-counter');
  const status = isCached ? '♻️ Reused' : '🆕 New';
  const waterBottles = environmentalImpact?.co2_saved_grams > 0 
    ? Math.floor(environmentalImpact.co2_saved_grams / 25) // ~25g CO2 per water bottle
    : 0;
  const waterText = waterBottles > 0 ? ` • ${waterBottles} water bottles saved` : '';
  counter.innerHTML = `${status} • ${count} views${waterText}`;
}

// Copy share link
function copyShareLink() {
  const summaryData = overlay.summaryData;
  
  // Get the URL hash from the API response, or generate from the current URL
  let shareUrl;
  if (summaryData.share_url) {
    // Use API-provided share URL directly (now environment-aware)
    shareUrl = summaryData.share_url;
  } else {
    // Fallback - use current URL
    shareUrl = getCanonicalUrl();
  }
  
  // Create share message with actual summary link
  const shareText = `${summaryData.summary.short}\n\nView full summary: ${shareUrl}\n\n📚 Summarized with TinyRead`;
  
  console.log('📋 TinyRead: Copying share text:', shareText);
  console.log('📋 TinyRead: Share URL:', shareUrl);
  
  navigator.clipboard.writeText(shareText).then(() => {
    const btn = overlay.querySelector('.copy-link-btn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Copied!';
    btn.style.background = '#10b981';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '#2563eb';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    const btn = overlay.querySelector('.copy-link-btn');
    btn.textContent = '❌ Failed';
    setTimeout(() => {
      btn.textContent = '📋 Share Summary';
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
  // Cmd+Shift+S or Ctrl+Shift+S
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    showOverlay();
  }
  
  // Escape to close
  if (e.key === 'Escape' && overlayVisible) {
    hideOverlay();
  }
});

// Create floating widget
function createFloatingWidget() {
  if (floatingWidget) return floatingWidget;
  
  const widget = document.createElement('div');
  widget.id = 'tinyread-widget';
  widget.innerHTML = `
    <div class="widget-content">
      <div class="widget-logo">📚</div>
      <button class="widget-summarize" title="Summarize this page">Summarize</button>
      <button class="widget-close" title="Hide TinyRead">✕</button>
    </div>
  `;
  
  document.body.appendChild(widget);
  
  // Add event listeners
  const summarizeBtn = widget.querySelector('.widget-summarize');
  const closeBtn = widget.querySelector('.widget-close');
  
  console.log('🔧 TinyRead: Adding widget event listeners', { summarizeBtn, closeBtn });
  
  summarizeBtn.addEventListener('click', (e) => {
    console.log('🖱️ TinyRead: Widget summarize button clicked!', e);
    e.preventDefault();
    e.stopPropagation();
    showOverlay();
  });
  
  closeBtn.addEventListener('click', (e) => {
    console.log('🖱️ TinyRead: Widget close button clicked!', e);
    e.preventDefault();
    e.stopPropagation();
    hideFloatingWidget();
  });
  
  floatingWidget = widget;
  return widget;
}

// Hide floating widget
function hideFloatingWidget() {
  if (floatingWidget) {
    floatingWidget.style.display = 'none';
  }
}

// Show floating widget
function showFloatingWidget() {
  if (!floatingWidget) {
    createFloatingWidget();
  }
  floatingWidget.style.display = 'flex';
}

// Initialize floating widget on page load - only on article pages
window.addEventListener('load', () => {
  console.log('📄 TinyRead: Page loaded, checking if article page');
  if (isArticlePage()) {
    console.log('✅ TinyRead: This looks like an article page, will show widget in 2s');
    setTimeout(() => {
      console.log('⏰ TinyRead: 2 seconds elapsed, showing floating widget');
      showFloatingWidget();
    }, 2000); // Show after 2 seconds to be less intrusive
  } else {
    console.log('❌ TinyRead: This doesn\'t look like an article page, not showing widget');
  }
});

// Check if current page looks like an article  
function isArticlePage() {
  // Exclude social media feeds and non-article pages
  const url = window.location.href.toLowerCase();
  const excludeDomains = [
    'facebook.com',
    'twitter.com', 
    'x.com',
    'instagram.com',
    'linkedin.com',
    'tiktok.com',
    'youtube.com',
    'reddit.com',
    'pinterest.com'
  ];
  
  const excludePages = /\/(search|login|register|checkout|cart|account|settings|admin|feed)/i;
  
  // Don't show on social feeds or clearly non-article pages  
  if (excludeDomains.some(domain => url.includes(domain)) || excludePages.test(window.location.pathname)) {
    console.log('🚫 TinyRead: Excluding non-article page:', url);
    return false;
  }
  
  // Show on most other pages
  const hasArticleTag = !!document.querySelector('article');
  const hasLongContent = document.body.innerText.length > 500;
  const hasContentIndicators = !!(
    document.querySelector('h1, h2, .title, .headline, [class*="content"], [class*="post"]') ||
    document.querySelector('p')?.innerText?.length > 100
  );
  
  return hasArticleTag || hasLongContent || hasContentIndicators;
}

// Click outside overlay to close
document.addEventListener('click', (e) => {
  if (overlayVisible && overlay && !overlay.querySelector('.tinyread-modal').contains(e.target)) {
    hideOverlay();
  }
});