import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const htmlPath = path.join(process.cwd(), 'public', 'summary.html');
  
  try {
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error serving summary page:', error);
    res.status(500).send('Error loading summary page');
  }
}