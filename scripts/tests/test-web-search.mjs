#!/usr/bin/env node

/**
 * Test Web Search Tool
 */

// Direct test of the web search implementation
async function testWebSearch() {
  console.log('🔍 Testing Web Search Tool\n');

  // Simulate the tool execution
  const query = 'AI agents collaboration';
  const maxResults = 3;

  console.log(`Query: "${query}"`);
  console.log(`Max results: ${maxResults}\n`);

  try {
    console.log('Calling DuckDuckGo search...');

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AetheriaBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Search API returned ${response.status}`);
    }

    const html = await response.text();
    console.log(`✅ Received ${html.length} bytes of HTML\n`);

    // Parse results using simplified regex
    const results = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gs;
    let match;
    let count = 0;

    while ((match = resultRegex.exec(html)) !== null && count < maxResults) {
      const url = decodeURIComponent(match[1]);
      const titleHtml = match[2];

      // Clean HTML
      const title = titleHtml
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (title && url) {
        results.push({ title, url });
        count++;
      }
    }

    console.log(`📊 Found ${results.length} results:\n`);

    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.title}`);
      console.log(`   ${result.url}\n`);
    });

    if (results.length > 0) {
      console.log('✅ Web search tool is working!\n');
      console.log('🎯 The agent can now:');
      console.log('   • Search the web for information');
      console.log('   • Get relevant results from DuckDuckGo');
      console.log('   • Use search results to make smarter decisions');
    } else {
      console.log('⚠️  No results found - search might need debugging');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testWebSearch();
