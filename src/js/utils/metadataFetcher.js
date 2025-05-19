/**
 * Metadata Fetcher Utility
 * Fetches and parses metadata from URLs for rich link previews
 */

// Cloudflare Worker URL for fetching metadata
const METADATA_API_URL = 'https://link-preview-worker.dunyayavas.workers.dev';

/**
 * Fetch metadata from a URL using the Cloudflare Worker
 * 
 * @param {string} url URL to fetch metadata from
 * @returns {Promise<Object>} Promise resolving to metadata object
 */
// Cache for metadata to avoid repeated failed requests
const metadataCache = new Map();

export async function fetchMetadata(url) {
  try {
    // Check if we already have this URL in the cache
    if (metadataCache.has(url)) {
      return metadataCache.get(url);
    }
    
    // For LinkedIn URLs, check if the worker is having issues
    if (url.includes('linkedin.com')) {
      // If we've had recent failures with LinkedIn, just use generated metadata
      if (fetchMetadata.linkedInFailures && fetchMetadata.linkedInFailures > 3) {
        const generatedMetadata = generateLinkedInMetadata(url);
        metadataCache.set(url, generatedMetadata);
        return generatedMetadata;
      }
      
      try {
        const workerUrl = `${METADATA_API_URL}?url=${encodeURIComponent(url)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(workerUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Increment LinkedIn failures counter
          fetchMetadata.linkedInFailures = (fetchMetadata.linkedInFailures || 0) + 1;
          throw new Error(`Failed to fetch LinkedIn metadata: ${response.status}`);
        }
        
        const metadata = await response.json();
        
        // If the worker couldn't get good metadata, fall back to generated data
        if (!metadata.title || metadata.error) {
          const generatedMetadata = generateLinkedInMetadata(url);
          metadataCache.set(url, generatedMetadata);
          return generatedMetadata;
        }
        
        // Reset failures counter on success
        fetchMetadata.linkedInFailures = 0;
        
        // For real metadata from the worker, we don't want to show any captions at all
        delete metadata.caption;
        metadata.realCaption = null;
        
        // Cache the successful result
        metadataCache.set(url, metadata);
        return metadata;
      } catch (error) {
        // Silently fall back to generated metadata for LinkedIn
        const generatedMetadata = generateLinkedInMetadata(url);
        metadataCache.set(url, generatedMetadata);
        return generatedMetadata;
      }
    } else if (url.includes('pinterest.com')) {
      try {
        const workerUrl = `${METADATA_API_URL}?url=${encodeURIComponent(url)}`;
        const response = await fetch(workerUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Pinterest metadata: ${response.status}`);
        }
        
        const metadata = await response.json();
        
        if (!metadata.title || metadata.error) {
          throw new Error('Invalid Pinterest metadata');
        }
        
        delete metadata.caption;
        metadata.realCaption = null;
        
        metadataCache.set(url, metadata);
        return metadata;
      } catch (error) {
        // Fall back to generic Pinterest metadata
        const pinterestMetadata = {
          title: 'Pinterest',
          description: 'View this content on Pinterest',
          image: 'https://s.pinimg.com/webapp/favicon-56d11a4a.png',
          url: url,
          siteName: 'Pinterest',
          realCaption: null
        };
        metadataCache.set(url, pinterestMetadata);
        return pinterestMetadata;
      }
    } else {
      // Generic metadata for other URLs
      return {
        title: 'Web Page',
        description: 'No metadata available for this URL',
        image: null,
        url: url,
        siteName: new URL(url).hostname
      };
    }
  } catch (error) {
    // Only log errors that aren't related to LinkedIn or Pinterest
    if (!url.includes('linkedin.com') && !url.includes('pinterest.com')) {
      console.error('Error fetching metadata:', error);
    }
    
    // Generate appropriate fallback metadata based on URL
    let fallbackMetadata;
    
    if (url.includes('linkedin.com')) {
      fallbackMetadata = generateLinkedInMetadata(url);
    } else if (url.includes('pinterest.com')) {
      fallbackMetadata = {
        title: 'Pinterest',
        description: 'View this content on Pinterest',
        image: 'https://s.pinimg.com/webapp/favicon-56d11a4a.png',
        url: url,
        siteName: 'Pinterest',
        realCaption: null
      };
    } else {
      fallbackMetadata = {
        title: 'Web Page',
        description: 'Error fetching metadata',
        image: null,
        url: url,
        siteName: new URL(url).hostname
      };
    }
    
    // Cache the fallback metadata to prevent repeated failed requests
    metadataCache.set(url, fallbackMetadata);
    return fallbackMetadata;
  }
}

/**
 * Generate mock LinkedIn metadata based on URL patterns
 * In a real implementation, this would be fetched from the actual page
 * 
 * @param {string} url LinkedIn URL
 * @returns {Object} Metadata object
 */
function generateLinkedInMetadata(url) {
  const lowerUrl = url.toLowerCase();
  const metadata = {
    url: url,
    siteName: 'LinkedIn'
  };
  
  // Extract LinkedIn content type
  let contentType = 'unknown';
  if (lowerUrl.includes('/posts/')) {
    contentType = 'post';
  } else if (lowerUrl.includes('/pulse/')) {
    contentType = 'article';
  } else if (lowerUrl.includes('/in/')) {
    contentType = 'profile';
  } else if (lowerUrl.includes('/company/')) {
    contentType = 'company';
  }
  
  // Default image for all LinkedIn content (LinkedIn logo)
  metadata.image = 'https://cdn-icons-png.flaticon.com/512/174/174857.png';
  
  // Add mock post caption/content for all types
  metadata.caption = generateMockContent(contentType);
  
  // Set realCaption to null for mock data
  metadata.realCaption = null;
  
  // Extract information based on content type
  if (contentType === 'profile') {
    // Extract username from profile URL
    const regex = /linkedin\.com\/in\/([^\/\?#]+)/i;
    const match = url.match(regex);
    if (match && match[1]) {
      const username = match[1].replace(/-/g, ' ');
      metadata.title = `${username} | LinkedIn`;
      metadata.description = `View ${username}'s profile on LinkedIn, the world's largest professional community.`;
      // Profile image placeholder
      metadata.image = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    }
  } else if (contentType === 'company') {
    // Extract company name from company URL
    const regex = /linkedin\.com\/company\/([^\/\?#]+)/i;
    const match = url.match(regex);
    if (match && match[1]) {
      const company = match[1].replace(/-/g, ' ');
      metadata.title = `${company} | LinkedIn`;
      metadata.description = `Learn about ${company}, including available jobs, company insights, and more.`;
      // Company image placeholder
      metadata.image = 'https://cdn-icons-png.flaticon.com/512/2910/2910791.png';
    }
  } else if (contentType === 'post') {
    // Extract username from post URL
    const regex = /linkedin\.com\/posts\/([^\/\?#]+)/i;
    const match = url.match(regex);
    if (match && match[1]) {
      const username = match[1].replace(/-/g, ' ');
      metadata.title = `LinkedIn Post by ${username}`;
      metadata.description = `Check out this post on LinkedIn by ${username}.`;
      // Post image placeholder
      metadata.image = 'https://cdn-icons-png.flaticon.com/512/5968/5968884.png';
    }
  } else if (contentType === 'article') {
    // Extract article title and author from article URL
    const regex = /linkedin\.com\/pulse\/([^\/\?#]+)(?:-([^\/\?#]+))?/i;
    const match = url.match(regex);
    if (match) {
      const title = match[1] ? match[1].replace(/-/g, ' ') : 'Article';
      const author = match[2] ? match[2].replace(/-/g, ' ') : '';
      
      metadata.title = title.charAt(0).toUpperCase() + title.slice(1);
      metadata.description = author ? `Article by ${author} on LinkedIn` : 'Read this article on LinkedIn';
      // Article image placeholder
      metadata.image = 'https://cdn-icons-png.flaticon.com/512/2258/2258853.png';
    }
  } else {
    // Generic LinkedIn content
    metadata.title = 'LinkedIn';
    metadata.description = 'View this content on LinkedIn, the world\'s largest professional network.';
  }
  
  return metadata;
}

/**
 * Detect LinkedIn content type from URL
 * 
 * @param {string} url LinkedIn URL
 * @returns {string} Content type (profile, company, post, article, or unknown)
 */
function detectContentType(url) {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('/posts/')) {
    return 'post';
  } else if (lowerUrl.includes('/pulse/')) {
    return 'article';
  } else if (lowerUrl.includes('/in/')) {
    return 'profile';
  } else if (lowerUrl.includes('/company/')) {
    return 'company';
  }
  
  return 'unknown';
}

/**
 * Generate mock content based on content type
 * 
 * @param {string} contentType Type of LinkedIn content
 * @returns {string} Mock content
 */
function generateMockContent(contentType) {
  const contentMap = {
    'profile': 'I am excited to share that I have joined a new company as a Senior Developer. Looking forward to this new journey! #NewBeginnings #CareerGrowth',
    'company': 'We are thrilled to announce our latest product launch! After months of hard work, our team has created something truly innovative. Check out the link to learn more. #ProductLaunch #Innovation',
    'post': 'Just finished an amazing project with my team. It is incredible what we can achieve when we collaborate effectively. #Teamwork #ProjectSuccess',
    'article': 'In my latest article, I discuss the future of remote work and how companies can adapt to this new normal. Read more to discover key strategies for success. #RemoteWork #FutureOfWork',
    'unknown': 'Sharing some thoughts on LinkedIn about professional development and career growth. What strategies have worked for you? #ProfessionalDevelopment'
  };
  
  return contentMap[contentType] || contentMap['unknown'];
}
