# TinyRead Chrome Extension

Instant, reusable AI summaries for any article. Press Cmd+E to get started.

## Features

- **Instant Summaries**: Get AI-powered summaries in 3 levels (short, medium, detailed)
- **Reusable Content**: View cached summaries instantly if someone has already summarized the article
- **Simple UX**: Press Cmd+E on any article page to open the summary overlay
- **Share Links**: Copy shareable links to summaries
- **Usage Stats**: Track your time saved and reuse rate

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select this directory
5. The extension should now appear in your browser

## Usage

1. Navigate to any article page
2. Press `Cmd+E` (or `Ctrl+E` on Windows/Linux)
3. Wait for the summary to generate (or see cached version instantly)
4. Switch between Short/Medium/Detailed views
5. Copy shareable links to send to others

## Development

The extension consists of:

- `manifest.json` - Extension configuration
- `content.js` - Handles the overlay and keyboard shortcuts
- `overlay.css` - Styles for the summary overlay
- `background.js` - Service worker for API communication
- `popup.html/js` - Extension popup with stats

### API Integration

The extension is currently using mock data. To integrate with a real API:

1. Replace the API URL in `content.js` and `background.js`
2. Implement the backend API following the expected request/response format
3. Update CORS settings to allow the extension origin

## Roadmap

- [ ] Backend API implementation
- [ ] User authentication
- [ ] Summary quality ratings
- [ ] Custom prompt templates
- [ ] Export to PDF/Markdown
- [ ] Team sharing features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with the extension loaded in development mode
5. Submit a pull request