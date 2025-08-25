// TinyRead Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Load and display stats
  await loadStats();
  
  // Add event listeners
  document.getElementById('feedback-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'mailto:feedback@tinyread.ai?subject=TinyRead Extension Feedback' });
  });
});

// Load usage statistics
async function loadStats() {
  try {
    const stats = await chrome.storage.local.get(['summariesCount', 'reuseCount', 'timeSaved']);
    
    document.getElementById('summaries-count').textContent = stats.summariesCount || 0;
    document.getElementById('reuse-count').textContent = stats.reuseCount || 0;
    document.getElementById('time-saved').textContent = formatTime(stats.timeSaved || 0);
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