const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Summary prompts optimized for shareability and value
const PROMPTS = {
  short: `Write a compelling 1-2 sentence summary that makes someone want to read this article. Include the most surprising or valuable insight. Use specific numbers/facts when possible. Make it tweet-worthy and shareable.`,
  
  medium: `Create a 3-5 sentence summary that captures:
- The core insight or surprising finding
- Key evidence (numbers, studies, examples) 
- Who should care and why
- What makes this timely/important now

Write like you're explaining to a smart friend. Be conversational but informative. Focus on value, not just facts.`,
  
  detailed: `Create an executive-style summary with these sections:

🎯 **Key Takeaway:** What's the main insight in one sentence?

📊 **The Evidence:** What data, examples, or research supports this?

💡 **Why It Matters:** Who should care and what are the implications?

🔮 **What's Next:** What questions remain or what should happen?

Use specific numbers, names, and facts. Make each point actionable and valuable. Write for busy professionals who want the substance quickly.`
};

// Generate all three summary levels at once
async function generateSummaries(content) {
  try {
    // Truncate content if too long
    const truncatedContent = content.length > 30000 
      ? content.substring(0, 30000) + '...[truncated]'
      : content;

    // Generate all three levels in parallel for speed
    const [shortResponse, mediumResponse, detailedResponse] = await Promise.all([
      generateSingleSummary(truncatedContent, 'short'),
      generateSingleSummary(truncatedContent, 'medium'), 
      generateSingleSummary(truncatedContent, 'detailed')
    ]);

    return {
      short: shortResponse,
      medium: mediumResponse,
      detailed: detailedResponse
    };
    
  } catch (error) {
    console.error('Error generating summaries:', error);
    throw new Error('Failed to generate summaries');
  }
}

// Generate single summary level with Gemini
async function generateSingleSummary(content, level) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `${PROMPTS[level]}\n\nArticle content:\n\n${content}`;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  return text.trim() || 'Summary generation failed';
}

// Fallback summaries when API fails
const FALLBACK_SUMMARIES = {
  short: "Summary temporarily unavailable. This article has been saved and will be processed shortly.",
  medium: "Summary temporarily unavailable due to high demand. The article content has been saved to our database and will be processed automatically. Please check back in a few minutes for the complete summary.",
  detailed: "• Summary generation is temporarily unavailable\n• Your article has been saved and queued for processing\n• Summaries are usually ready within 30 seconds\n• You can bookmark this link and return later\n• This helps us handle high traffic while maintaining quality"
};

// Generate summaries with fallback
async function generateSummariesWithFallback(content) {
  try {
    console.log('Generating summaries with Gemini...');
    return await generateSummaries(content);
  } catch (error) {
    console.warn('Using fallback summaries due to API error:', error.message);
    return FALLBACK_SUMMARIES;
  }
}

module.exports = {
  generateSummaries: generateSummariesWithFallback,
  generateSingleSummary
};