/**
 * Masonry Layout Module
 * Handles the calculation and application of heights for the masonry grid layout
 */

/**
 * Initialize the masonry layout by calculating and setting card heights
 */
export function initMasonryLayout() {
  // Wait for DOM to be fully loaded and all images to be rendered
  window.addEventListener('load', () => {
    console.log('Window loaded - initializing masonry layout');
    resizeAllGridItems();
    
    // Also resize on window resize (debounced)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        console.log('Window resized - updating masonry layout');
        resizeAllGridItems();
      }, 250);
    });
  });
  
  // Initial calculation (for content that loads quickly)
  setTimeout(() => {
    console.log('Initial masonry layout calculation');
    resizeAllGridItems();
  }, 100);
}

/**
 * Resize all grid items to create the masonry layout
 */
export function resizeAllGridItems() {
  const grid = document.querySelector('.masonry-grid');
  if (!grid) {
    console.warn('Masonry grid not found');
    return;
  }
  
  const items = document.querySelectorAll('.post-card');
  console.log(`Resizing ${items.length} grid items`);
  
  if (items.length === 0) {
    console.log('No grid items found');
    return;
  }
  
  // Calculate and set new heights
  items.forEach(item => {
    resizeGridItem(item);
  });
}

/**
 * Calculate and set the height for a single grid item
 * @param {HTMLElement} item The grid item to resize
 */
function resizeGridItem(item) {
  if (!item) return;
  
  // Get the grid row height
  const grid = document.querySelector('.masonry-grid');
  if (!grid) return;
  
  const gridStyles = window.getComputedStyle(grid);
  const rowHeight = parseInt(gridStyles.getPropertyValue('grid-auto-rows')) || 10;
  const rowGap = parseInt(gridStyles.getPropertyValue('grid-row-gap') || gridStyles.getPropertyValue('gap') || 0);
  
  // Get the content height - ensure we include all content
  const contentHeight = item.querySelector('.card-content')?.offsetHeight || item.offsetHeight;
  
  // Calculate how many rows this item should span (add a bit of buffer)
  const rowSpan = Math.max(20, Math.ceil((contentHeight + rowGap) / (rowHeight + rowGap)));
  
  // Set the custom property for the item's height
  item.style.setProperty('--card-height', rowSpan);
}

/**
 * Update the masonry layout when new content is added
 * @param {HTMLElement} newItem Optional new item that was added
 */
export function updateMasonryLayout(newItem = null) {
  // If a specific item was added, resize just that one
  if (newItem) {
    setTimeout(() => {
      resizeGridItem(newItem);
    }, 100);
  } else {
    // Otherwise resize all items
    setTimeout(resizeAllGridItems, 100);
  }
}
