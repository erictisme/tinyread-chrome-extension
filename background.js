// TinyRead Background Script
// Handles extension lifecycle and API communication

// Extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('TinyRead extension installed');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateSummary') {
    generateSummary(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
});

// Generate summary via API
async function generateSummary(data) {
  const apiUrl = 'https://your-api-endpoint.com/api/summary'; // TODO: Replace with actual API
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
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
      is_cached: Math.random() > 0.5,
      share_url: `https://tinyread.ai/s/${btoa(data.url).replace(/[+/=]/g, '')}`
    };
  }
}