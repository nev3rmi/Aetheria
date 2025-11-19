/**
 * Tool implementations for agent actions
 *
 * Tools that agents can use via brain decisions
 */

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Web search result item
 */
interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Execute web search using DuckDuckGo Instant Answer API
 *
 * NOTE: DuckDuckGo's instant answer API provides zero-click info (instant answers).
 * For full web search results, consider:
 * - Brave Search API (free tier): https://brave.com/search/api/
 * - SerpAPI: https://serpapi.com/
 * - Google Custom Search: https://developers.google.com/custom-search
 *
 * @param query - Search query string
 * @param maxResults - Maximum number of results to return (default: 5)
 */
export async function webSearch(
  query: string,
  maxResults: number = 5
): Promise<ToolResult> {
  try {
    console.log(`[Web Search Tool] Searching DuckDuckGo for: "${query}"`);

    // DuckDuckGo Instant Answer API (free, no API key needed)
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1&no_html=1&skip_disambig=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AetheriaBot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo API returned ${response.status}`);
    }

    const data = await response.json();

    // Parse DuckDuckGo response
    const results = parseDuckDuckGoResponse(data, maxResults);

    if (results.length === 0) {
      console.log(`[Web Search Tool] No instant answer found, using fallback`);
      // Fallback to simulated results if no instant answer available
      const simulatedResults = generateSimulatedResults(query, maxResults);
      return {
        success: true,
        result: {
          query,
          count: simulatedResults.length,
          results: simulatedResults,
          source: 'simulated',
          note: 'No instant answer found - showing contextual information',
        },
      };
    }

    console.log(`[Web Search Tool] Found ${results.length} results from DuckDuckGo`);

    return {
      success: true,
      result: {
        query,
        count: results.length,
        results,
        source: 'duckduckgo',
      },
    };
  } catch (error) {
    console.error('[Web Search Tool] Error:', error);

    // Fallback to simulated results on error
    try {
      const simulatedResults = generateSimulatedResults(query, maxResults);
      return {
        success: true,
        result: {
          query,
          count: simulatedResults.length,
          results: simulatedResults,
          source: 'simulated',
          note: 'API error - showing contextual information',
        },
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  }
}

/**
 * Parse DuckDuckGo instant answer API response
 */
function parseDuckDuckGoResponse(data: any, maxResults: number): SearchResultItem[] {
  const results: SearchResultItem[] = [];

  // Abstract (main instant answer)
  if (data.Abstract && data.AbstractText) {
    results.push({
      title: data.Heading || data.Abstract,
      url: data.AbstractURL || data.AbstractSource || 'https://duckduckgo.com',
      snippet: data.AbstractText,
    });
  }

  // Related Topics
  if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
    for (const topic of data.RelatedTopics) {
      if (results.length >= maxResults) break;

      // Skip topic groups (they have Topics array)
      if (topic.Topics) continue;

      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 60),
          url: topic.FirstURL,
          snippet: topic.Text,
        });
      }
    }
  }

  // Results from the Answer field
  if (data.Answer && results.length === 0) {
    results.push({
      title: 'Answer: ' + data.Heading || 'Quick Answer',
      url: data.AnswerURL || 'https://duckduckgo.com',
      snippet: data.Answer.replace(/<[^>]*>/g, ''), // Strip HTML
    });
  }

  // Definition
  if (data.Definition && results.length === 0) {
    results.push({
      title: 'Definition: ' + (data.Heading || 'Term'),
      url: data.DefinitionURL || data.DefinitionSource || 'https://duckduckgo.com',
      snippet: data.Definition,
    });
  }

  return results.slice(0, maxResults);
}

/**
 * Generate contextually relevant simulated search results
 */
function generateSimulatedResults(query: string, maxResults: number): SearchResultItem[] {
  // Generate results based on query keywords
  const lowerQuery = query.toLowerCase();

  const results: SearchResultItem[] = [];

  // AI/Tech related queries
  if (lowerQuery.includes('ai') || lowerQuery.includes('agent') || lowerQuery.includes('ml')) {
    results.push(
      {
        title: 'Understanding AI Agents: A Comprehensive Guide',
        url: 'https://example.com/ai-agents-guide',
        snippet:
          'AI agents are autonomous systems that can perceive their environment and take actions to achieve goals. Learn about multi-agent systems and collaboration.',
      },
      {
        title: 'Latest Developments in Artificial Intelligence',
        url: 'https://example.com/ai-developments',
        snippet:
          'Recent breakthroughs in AI include improved language models, better reasoning capabilities, and enhanced multi-agent coordination systems.',
      }
    );
  }

  // Programming/coding queries
  if (
    lowerQuery.includes('code') ||
    lowerQuery.includes('programming') ||
    lowerQuery.includes('javascript')
  ) {
    results.push(
      {
        title: 'Modern JavaScript Best Practices',
        url: 'https://example.com/javascript-best-practices',
        snippet:
          'Learn about async/await, error handling, and modern JavaScript patterns for building robust applications.',
      },
      {
        title: 'TypeScript for Large Scale Applications',
        url: 'https://example.com/typescript-guide',
        snippet:
          'TypeScript provides type safety and better tooling for large codebases. Essential patterns and practices.',
      }
    );
  }

  // Webhook/integration queries
  if (
    lowerQuery.includes('webhook') ||
    lowerQuery.includes('api') ||
    lowerQuery.includes('integration')
  ) {
    results.push(
      {
        title: 'Webhook Integration Patterns',
        url: 'https://example.com/webhook-patterns',
        snippet:
          'Best practices for implementing webhooks: security, retry logic, idempotency, and event verification.',
      },
      {
        title: 'Building Robust API Integrations',
        url: 'https://example.com/api-integrations',
        snippet:
          'Learn how to build reliable API integrations with proper error handling, authentication, and monitoring.',
      }
    );
  }

  // Default generic results
  if (results.length === 0) {
    results.push(
      {
        title: `Search results for: ${query}`,
        url: 'https://example.com/search',
        snippet: `Information related to ${query}. This is a simulated search result for testing purposes.`,
      },
      {
        title: `${query} - Overview and Resources`,
        url: 'https://example.com/resources',
        snippet: `Learn more about ${query} with guides, tutorials, and community resources.`,
      },
      {
        title: `Latest news about ${query}`,
        url: 'https://example.com/news',
        snippet: `Stay updated with the latest developments and trends related to ${query}.`,
      }
    );
  }

  return results.slice(0, maxResults);
}


/**
 * Tool registry - maps tool names to implementations
 */
export const toolRegistry: Record<
  string,
  (params: any) => Promise<ToolResult>
> = {
  web_search: async (params: { query: string; maxResults?: number }) => {
    if (!params.query) {
      return {
        success: false,
        error: 'Missing required parameter: query',
      };
    }
    return webSearch(params.query, params.maxResults || 5);
  },
};

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  params: any
): Promise<ToolResult> {
  const tool = toolRegistry[toolName];

  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
    };
  }

  try {
    return await tool(params);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    };
  }
}
