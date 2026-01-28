// lib/knowledge/webScraper.ts
import * as cheerio from 'cheerio';
import { URL } from 'url';

interface ScrapedPage {
  url: string;
  content: string;
  title: string;
  metadata: {
    description?: string;
    keywords?: string;
    author?: string;
    lastModified?: string;
    wordCount: number;
    links: number;
    images: number;
  };
}

interface SitemapInfo {
  urls: string[];
  totalPages: number;
  isSitemapIndex: boolean;
  childSitemaps?: string[];
}

/**
 * Main function to process a URL with optional crawling
 */
export async function processURL(
  url: string,
  crawlSubpages: boolean = false,
  maxPages?: number // Optional - will use sitemap count if available
): Promise<{
  content: string;
  metadata: any;
  pages?: ScrapedPage[];
}> {
  try {
    // Validate URL
    const validatedUrl = validateAndNormalizeURL(url);
    
    // Check if it's a sitemap URL - if yes, process it directly
    if (isSitemapUrl(validatedUrl)) {
      return await processSitemapDirectly(validatedUrl, maxPages);
    }
    
    if (!crawlSubpages) {
      // Just scrape the single page
      const page = await scrapePage(validatedUrl);
      return {
        content: page.content,
        metadata: {
          ...page.metadata,
          url: page.url,
          title: page.title,
          scrapedAt: new Date().toISOString(),
          pageCount: 1,
        },
      };
    }

    // Crawl multiple pages - if maxPages not provided, try to get from sitemap
    let actualMaxPages = maxPages;
    if (!actualMaxPages) {
      const sitemapInfo = await discoverSitemaps(validatedUrl);
      if (sitemapInfo.totalPages > 0) {
        console.log(`Auto-detected ${sitemapInfo.totalPages} pages from sitemap`);
        actualMaxPages = Math.min(sitemapInfo.totalPages, 100); // Cap at 100 for auto-detection
      } else {
        // Default to 50 if no sitemap found
        actualMaxPages = 50;
        console.log(`No sitemap found, defaulting to ${actualMaxPages} pages`);
      }
    }

    const pages = await crawlWebsite(validatedUrl, actualMaxPages);
    
    // Combine all content
    const combinedContent = pages
      .map((page, index) => {
        return `\n\n--- Page ${index + 1}: ${page.title} (${page.url}) ---\n\n${page.content}`;
      })
      .join('\n');

    return {
      content: combinedContent,
      metadata: {
        url: validatedUrl,
        scrapedAt: new Date().toISOString(),
        pageCount: pages.length,
        maxPagesRequested: actualMaxPages,
        totalWordCount: pages.reduce((sum, p) => sum + p.metadata.wordCount, 0),
        pages: pages.map(p => ({
          url: p.url,
          title: p.title,
          wordCount: p.metadata.wordCount,
        })),
      },
      pages,
    };
  } catch (error) {
    throw new Error(`Failed to process URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process a sitemap directly
 */
async function processSitemapDirectly(
  sitemapUrl: string, 
  maxPages?: number
): Promise<{
  content: string;
  metadata: any;
  pages?: ScrapedPage[];
}> {
  try {
    const validatedUrl = validateAndNormalizeURL(sitemapUrl);
    
    // Extract URLs directly from the provided sitemap
    const { urls, isSitemapIndex, childSitemaps } = await extractSitemapInfo(validatedUrl);
    
    if (urls.length === 0) {
      // If no URLs found, it might be a sitemap index - try to get child sitemaps
      if (childSitemaps && childSitemaps.length > 0) {
        console.log(`Found sitemap index with ${childSitemaps.length} child sitemaps`);
        const allUrls: string[] = [];
        
        // Process each child sitemap (limit to first 3 for performance)
        for (const childUrl of childSitemaps.slice(0, 3)) {
          try {
            const childInfo = await extractSitemapInfo(childUrl);
            allUrls.push(...childInfo.urls);
            console.log(`Extracted ${childInfo.urls.length} URLs from ${childUrl}`);
          } catch (error) {
            console.error(`Failed to process child sitemap ${childUrl}:`, error);
          }
        }
        
        if (allUrls.length === 0) {
          throw new Error('No URLs found in child sitemaps');
        }
        
        return await scrapeUrlsFromList(allUrls, validatedUrl, maxPages, isSitemapIndex, childSitemaps);
      }
      
      throw new Error('No URLs found in sitemap');
    }
    
    return await scrapeUrlsFromList(urls, validatedUrl, maxPages, isSitemapIndex, childSitemaps);
    
  } catch (error) {
    throw new Error(`Failed to process sitemap: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to scrape a list of URLs
 */
async function scrapeUrlsFromList(
  urls: string[],
  sitemapUrl: string,
  maxPages?: number,
  isSitemapIndex: boolean = false,
  childSitemaps?: string[]
): Promise<{
  content: string;
  metadata: any;
  pages?: ScrapedPage[];
}> {
  const actualMaxPages = maxPages || urls.length;
  const pagesToScrape = Math.min(actualMaxPages, urls.length);
  
  console.log(`Sitemap contains ${urls.length} URLs. Scraping ${pagesToScrape} pages.`);
  
  // Crawl those URLs
  const pages: ScrapedPage[] = [];
  for (const url of urls.slice(0, pagesToScrape)) {
    try {
      console.log(`Scraping: ${url} (${pages.length + 1}/${pagesToScrape})`);
      const page = await scrapePage(url);
      pages.push(page);
      await delay(1000); // Be respectful
    } catch (error) {
      console.error(`Failed to scrape ${url}:`, error);
    }
  }
  
  if (pages.length === 0) {
    throw new Error('Failed to scrape any pages from sitemap');
  }
  
  // Combine content
  const combinedContent = pages
    .map((page, index) => {
      return `\n\n--- Page ${index + 1}: ${page.title} (${page.url}) ---\n\n${page.content}`;
    })
    .join('\n');

  return {
    content: combinedContent,
    metadata: {
      sitemapUrl: sitemapUrl,
      scrapedAt: new Date().toISOString(),
      pageCount: pages.length,
      totalPagesInSitemap: urls.length,
      sitemapStats: {
        isSitemapIndex: isSitemapIndex,
        childSitemaps: childSitemaps?.length || 0,
        urlsFound: urls.length,
      },
      maxPagesRequested: actualMaxPages,
      totalWordCount: pages.reduce((sum, p) => sum + p.metadata.wordCount, 0),
      pages: pages.map(p => ({
        url: p.url,
        title: p.title,
        wordCount: p.metadata.wordCount,
      })),
    },
    pages,
  };
}

/**
 * Process a sitemap (public API)
 */
export async function processSitemap(
  sitemapUrl: string, 
  maxPages?: number
): Promise<{
  content: string;
  metadata: any;
  pages?: ScrapedPage[];
}> {
  return processSitemapDirectly(sitemapUrl, maxPages);
}

/**
 * Discover sitemaps from a base URL
 */
async function discoverSitemaps(baseUrl: string): Promise<SitemapInfo> {
  const urls: string[] = [];
  const childSitemaps: string[] = [];
  let isSitemapIndex = false;
  
  const parsedUrl = new URL(baseUrl);
  const sitemapUrls = [
    `${parsedUrl.protocol}//${parsedUrl.host}/sitemap`,
    `${parsedUrl.protocol}//${parsedUrl.host}/sitemap.xml`,
    `${parsedUrl.protocol}//${parsedUrl.host}/sitemap_index.xml`,
    `${parsedUrl.protocol}//${parsedUrl.host}/sitemap-index.xml`,
    `${parsedUrl.protocol}//${parsedUrl.host}/sitemap-products.xml`,
    `${parsedUrl.protocol}//${parsedUrl.host}/sitemap-posts.xml`,
    `${parsedUrl.protocol}//${parsedUrl.host}/sitemap-pages.xml`,
  ];

  // Remove duplicates
  const uniqueSitemapUrls = [...new Set(sitemapUrls)];

  for (const sitemapUrl of uniqueSitemapUrls) {
    try {
      const result = await extractSitemapInfo(sitemapUrl);
      if (result.urls.length > 0) {
        urls.push(...result.urls);
        if (result.isSitemapIndex) {
          isSitemapIndex = true;
          if (result.childSitemaps) {
            childSitemaps.push(...result.childSitemaps);
          }
        }
        console.log(`Found sitemap at ${sitemapUrl} with ${result.urls.length} URLs`);
        break; // Found a valid sitemap, stop searching
      }
    } catch (error) {
      // Sitemap not found, try next URL
      continue;
    }
  }

  return {
    urls: [...new Set(urls)], // Remove duplicates
    totalPages: urls.length,
    isSitemapIndex,
    childSitemaps: childSitemaps.length > 0 ? [...new Set(childSitemaps)] : undefined,
  };
}

/**
 * Extract comprehensive info from a sitemap
 */
async function extractSitemapInfo(sitemapUrl: string): Promise<SitemapInfo> {
  const urls: string[] = [];
  const childSitemaps: string[] = [];
  let isSitemapIndex = false;
  
  try {
    const xml = await fetchHTML(sitemapUrl);
    const $ = cheerio.load(xml, { xmlMode: true });
    
    // Check if this is a sitemap index (contains sitemap elements)
    const sitemapElements = $('sitemap').toArray();
    const sitemapLocs = $('sitemap > loc').toArray();
    
    if (sitemapElements.length > 0 || sitemapLocs.length > 0) {
      isSitemapIndex = true;
      
      // This is a sitemap index - extract child sitemap URLs
      $('sitemap > loc').each((_, element) => {
        const childSitemapUrl = $(element).text().trim();
        if (childSitemapUrl) {
          childSitemaps.push(childSitemapUrl);
        }
      });
      
      // Also check for sitemap elements with loc children
      $('sitemap').each((_, element) => {
        const loc = $(element).find('loc').text().trim();
        if (loc && !childSitemaps.includes(loc)) {
          childSitemaps.push(loc);
        }
      });
      
      // Recursively process child sitemaps (optional - can be limited for performance)
      const childPromises = childSitemaps.slice(0, 5).map(async (childUrl) => {
        try {
          const childInfo = await extractSitemapInfo(childUrl);
          urls.push(...childInfo.urls);
        } catch (error) {
          console.error(`Failed to fetch child sitemap ${childUrl}:`, error);
        }
      });
      
      await Promise.all(childPromises);
    }
    
    // Get regular URLs from current sitemap
    // Look for both direct <loc> and <url><loc> patterns
    $('url > loc').each((_, element) => {
      const url = $(element).text().trim();
      if (url) {
        urls.push(url);
      }
    });
    
    // Also check for direct <loc> elements (some sitemaps might not use <url> wrapper)
    $('loc').each((_, element) => {
      const url = $(element).text().trim();
      if (url && !urls.includes(url)) {
        // Check if this is not a sitemap URL to avoid duplicates
        const isSitemap = url.toLowerCase().includes('sitemap') && 
                         (url.toLowerCase().endsWith('.xml') || 
                          url.includes('/sitemap'));
        
        if (!isSitemap) {
          urls.push(url);
        }
      }
    });
    
  } catch (error) {
    throw new Error(`Failed to extract info from sitemap: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    urls: [...new Set(urls)],
    totalPages: urls.length,
    isSitemapIndex,
    childSitemaps: childSitemaps.length > 0 ? [...new Set(childSitemaps)] : undefined,
  };
}

/**
 * Extract URLs from a direct sitemap URL
 */
async function getSitemapUrlsFromDirectUrl(sitemapUrl: string): Promise<string[]> {
  try {
    const info = await extractSitemapInfo(sitemapUrl);
    return info.urls;
  } catch (error) {
    console.error(`Failed to parse sitemap ${sitemapUrl}:`, error);
    return [];
  }
}

/**
 * Crawl website starting from a URL
 */
async function crawlWebsite(
  startUrl: string,
  maxPages: number
): Promise<ScrapedPage[]> {
  const baseUrl = new URL(startUrl);
  const baseDomain = baseUrl.hostname;
  
  const visited = new Set<string>();
  const toVisit: string[] = [startUrl];
  const scrapedPages: ScrapedPage[] = [];

  // Try to get URLs from sitemap discovery
  const sitemapInfo = await discoverSitemaps(startUrl);
  if (sitemapInfo.urls.length > 0) {
    console.log(`Found ${sitemapInfo.urls.length} URLs in sitemap discovery`);
    toVisit.push(...sitemapInfo.urls.slice(0, maxPages));
  }

  while (toVisit.length > 0 && scrapedPages.length < maxPages) {
    const currentUrl = toVisit.shift()!;
    
    // Skip if already visited
    if (visited.has(currentUrl)) {
      continue;
    }
    
    visited.add(currentUrl);

    try {
      console.log(`Scraping: ${currentUrl} (${scrapedPages.length + 1}/${maxPages})`);
      
      const page = await scrapePage(currentUrl);
      scrapedPages.push(page);

      // Extract links from the page if we haven't reached max pages
      if (scrapedPages.length < maxPages && sitemapInfo.urls.length === 0) {
        const html = await fetchHTML(currentUrl);
        const $ = cheerio.load(html);
        
        $('a[href]').each((_, element) => {
          const href = $(element).attr('href');
          if (href) {
            const absoluteUrl = resolveURL(href, currentUrl);
            
            // Only add URLs from the same domain
            if (absoluteUrl && isSameDomain(absoluteUrl, baseDomain) && !visited.has(absoluteUrl)) {
              toVisit.push(absoluteUrl);
            }
          }
        });
      }

      // Add delay to be respectful to the server
      await delay(1000);
    } catch (error) {
      console.error(`Failed to scrape ${currentUrl}:`, error);
    }
  }

  return scrapedPages;
}

/**
 * Check if URL is a sitemap
 */
function isSitemapUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('sitemap') && 
         (lowerUrl.endsWith('.xml') || 
          lowerUrl.includes('sitemap.xml') || 
          lowerUrl.includes('sitemap_index.xml') ||
          lowerUrl.includes('sitemap-index.xml') ||
          lowerUrl.includes('/sitemap') && !lowerUrl.includes('.html'));
}

/**
 * Scrape a single page
 */
async function scrapePage(url: string): Promise<ScrapedPage> {
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $('script, style, nav, footer, header, iframe, noscript').remove();
  $('.advertisement, .ads, #cookie-banner, .cookie-notice').remove();

  // Extract metadata
  const title = $('title').text().trim() || 
                $('h1').first().text().trim() || 
                'Untitled Page';
  
  const description = $('meta[name="description"]').attr('content') || 
                      $('meta[property="og:description"]').attr('content') || 
                      '';
  
  const keywords = $('meta[name="keywords"]').attr('content') || '';
  const author = $('meta[name="author"]').attr('content') || '';
  const lastModified = $('meta[name="last-modified"]').attr('content') || 
                       $('meta[property="article:modified_time"]').attr('content') || 
                       '';

  // Extract main content
  let content = '';
  
  // Try to find main content area
  const mainSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.main-content',
    '#main-content',
    '.content',
    '#content',
    '.product-details',
    '.product-description',
    '.entry-content',
    '.post-content',
  ];

  let mainSelector = 'body';
  for (const selector of mainSelectors) {
    if ($(selector).length > 0) {
      mainSelector = selector;
      break;
    }
  }

  // Extract text from paragraphs, headings, and lists
  $(`${mainSelector}`).find('h1, h2, h3, h4, h5, h6, p, li, td, th, .product-title, .product-name, .price').each((_, element) => {
    const text = $(element).text().trim();
    if (text) {
      content += text + '\n\n';
    }
  });

  // Clean up content
  content = content
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Count links and images
  const links = $(`${mainSelector}`).find('a[href]').length;
  const images = $(`${mainSelector}`).find('img').length;

  return {
    url,
    content,
    title,
    metadata: {
      description,
      keywords,
      author,
      lastModified,
      wordCount: countWords(content),
      links,
      images,
    },
  };
}

/**
 * Fetch HTML from a URL
 */
async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xml')) {
    throw new Error(`Invalid content type: ${contentType}`);
  }

  return await response.text();
}

/**
 * Validate and normalize URL
 */
function validateAndNormalizeURL(url: string): string {
  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const parsed = new URL(url);
    
    // Remove trailing slash and fragments
    return parsed.origin + parsed.pathname.replace(/\/$/, '') + parsed.search;
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Resolve relative URL to absolute
 */
function resolveURL(href: string, baseUrl: string): string | null {
  try {
    // Skip non-http protocols
    if (href.startsWith('mailto:') || 
        href.startsWith('tel:') || 
        href.startsWith('javascript:') ||
        href.startsWith('#')) {
      return null;
    }

    const absolute = new URL(href, baseUrl);
    
    // Skip non-HTML resources
    const ext = absolute.pathname.split('.').pop()?.toLowerCase();
    const skipExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'mp4', 'mp3', 'zip', 'exe', 'dmg'];
    if (ext && skipExtensions.includes(ext)) {
      return null;
    }

    return absolute.href;
  } catch (error) {
    return null;
  }
}

/**
 * Check if URL is from the same domain
 */
function isSameDomain(url: string, baseDomain: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === baseDomain || parsed.hostname.endsWith('.' + baseDomain);
  } catch (error) {
    return false;
  }
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Export additional helper functions if needed
 */
export const webScraperUtils = {
  validateAndNormalizeURL,
  resolveURL,
  isSameDomain,
  countWords,
  isSitemapUrl,
  extractSitemapInfo,
  discoverSitemaps,
};