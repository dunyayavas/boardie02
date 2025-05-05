/**
 * Metadata Fetcher Utility
 * Fetches and parses metadata from URLs for rich link previews
 */

/**
 * Fetch metadata from a URL
 * This is a mock implementation since we can't make actual fetch requests from the client
 * In a real implementation, this would be a server-side API call
 * 
 * @param {string} url URL to fetch metadata from
 * @returns {Promise<Object>} Promise resolving to metadata object
 */
export async function fetchMetadata(url) {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      // For LinkedIn URLs, return mock metadata based on URL patterns
      if (url.includes('linkedin.com')) {
        const metadata = generateLinkedInMetadata(url);
        resolve(metadata);
      } else {
        // Generic metadata for other URLs
        resolve({
          title: 'Web Page',
          description: 'No metadata available for this URL',
          image: null,
          url: url,
          siteName: new URL(url).hostname
        });
      }
    }, 500);
  });
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
