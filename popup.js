// TinyRead Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Load and display stats
  await loadStats();
  
  // Add event listeners
  document.getElementById('feedback-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'mailto:feedback@tinyread.ai?subject=TinyRead Extension Feedback' });
  });
  
  // Summarize button
  document.getElementById('summarize-btn').addEventListener('click', async () => {
    const button = document.getElementById('summarize-btn');
    button.textContent = 'Summarizing...';
    button.disabled = true;
    
    // Get current active tab and trigger summary
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject and execute the summary function
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: triggerSummary
    });
    
    // Close popup
    window.close();
  });
});

// Load usage statistics
async function loadStats() {
  try {
    const stats = await chrome.storage.local.get(['summariesCount', 'reuseCount', 'timeSaved']);
    
    document.getElementById('summaries-count').textContent = stats.summariesCount || 0;
    document.getElementById('reuse-count').textContent = stats.reuseCount || 0;
    document.getElementById('time-saved').textContent = stats.waterBottlesSaved || 0;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Format time saved in seconds to human readable
function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  } else {
    return `${Math.floor(seconds / 3600)}h`;
  }
}

// Function to inject into content script
function triggerSummary() {
  // This runs in the context of the page
  if (typeof showOverlay === 'function') {
    showOverlay();
  } else {
    // Force create overlay even if widget detection failed
    console.log('Forcing summary overlay creation...');
    
    // Try to run the content script functions directly
    if (typeof createOverlay === 'function') {
      showOverlay();
    } else {
      // Last resort - just show we tried
      console.log('TinyRead: Content script not fully loaded. Please refresh and try again.');
    }
  }
}