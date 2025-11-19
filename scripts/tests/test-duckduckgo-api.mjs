#!/usr/bin/env node

/**
 * Test DuckDuckGo Instant Answer API
 */

async function testDuckDuckGoAPI() {
  console.log('🦆 Testing DuckDuckGo Instant Answer API\n');

  const testQueries = [
    'JavaScript',
    'TypeScript programming',
    'What is AI',
    'webhooks api',
    'convex database',
  ];

  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log('─'.repeat(60));

    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1&no_html=1&skip_disambig=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AetheriaBot/1.0',
        },
      });

      if (!response.ok) {
        console.log(`❌ API returned ${response.status}`);
        continue;
      }

      const data = await response.json();

      // Show what we got
      console.log('\n📦 API Response:');
      console.log(`   Heading: ${data.Heading || '(none)'}`);
      console.log(`   Abstract: ${data.AbstractText ? data.AbstractText.substring(0, 100) + '...' : '(none)'}`);
      console.log(`   Answer: ${data.Answer || '(none)'}`);
      console.log(`   Definition: ${data.Definition ? data.Definition.substring(0, 100) + '...' : '(none)'}`);
      console.log(`   Related Topics: ${data.RelatedTopics ? data.RelatedTopics.length : 0} items`);

      // Parse results
      const results = [];

      // Abstract
      if (data.Abstract && data.AbstractText) {
        results.push({
          type: 'Abstract',
          title: data.Heading || data.Abstract,
          url: data.AbstractURL || data.AbstractSource || 'https://duckduckgo.com',
          snippet: data.AbstractText.substring(0, 150) + '...',
        });
      }

      // Related Topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 3)) {
          if (topic.Topics) continue; // Skip groups

          if (topic.Text && topic.FirstURL) {
            results.push({
              type: 'Related',
              title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 60),
              url: topic.FirstURL,
              snippet: topic.Text.substring(0, 100),
            });
          }
        }
      }

      // Answer
      if (data.Answer && results.length === 0) {
        results.push({
          type: 'Answer',
          title: 'Quick Answer',
          url: data.AnswerURL || 'https://duckduckgo.com',
          snippet: data.Answer.replace(/<[^>]*>/g, ''),
        });
      }

      if (results.length > 0) {
        console.log(`\n✅ Found ${results.length} results:`);
        results.forEach((r, i) => {
          console.log(`\n   ${i + 1}. [${r.type}] ${r.title}`);
          console.log(`      ${r.url}`);
          console.log(`      ${r.snippet}`);
        });
      } else {
        console.log('\n⚠️  No instant answer available for this query');
      }

    } catch (error) {
      console.log(`\n❌ Error: ${error.message}`);
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 DuckDuckGo API Summary');
  console.log('='.repeat(60));
  console.log('✅ Free, no API key required');
  console.log('✅ Returns instant answers (zero-click info)');
  console.log('⚠️  Limited to curated content (not full web search)');
  console.log('💡 Best for: definitions, facts, entities');
  console.log('💡 Fallback to simulated results when no instant answer\n');
}

testDuckDuckGoAPI();
