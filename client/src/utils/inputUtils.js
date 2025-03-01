/**
 * Utility functions for form inputs
 */

/**
 * Disables the scroll wheel functionality on number inputs
 * This should be called when the application loads
 */
export const disableNumberInputScrolling = () => {
  // Function to prevent scroll wheel from changing number input values
  const preventScroll = (e) => {
    // Only if the target is a number input
    if (e.target.type === 'number') {
      e.preventDefault();
      return false;
    }
    return true;
  };

  // Add global event listeners to disable scroll wheel on number inputs
  document.addEventListener('wheel', preventScroll, { passive: false });
  document.addEventListener('mousewheel', preventScroll, { passive: false }); // For older browsers
  document.addEventListener('DOMMouseScroll', preventScroll, { passive: false }); // For Firefox
  
  // Also add a MutationObserver to handle dynamically added number inputs
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === 1) { // ELEMENT_NODE
            // Check if the added node is a number input
            if (node.tagName === 'INPUT' && node.type === 'number') {
              node.addEventListener('wheel', preventScroll, { passive: false });
              node.addEventListener('mousewheel', preventScroll, { passive: false });
              node.addEventListener('DOMMouseScroll', preventScroll, { passive: false });
            }
            
            // Check for number inputs within the added node
            const numberInputs = node.querySelectorAll('input[type="number"]');
            numberInputs.forEach(input => {
              input.addEventListener('wheel', preventScroll, { passive: false });
              input.addEventListener('mousewheel', preventScroll, { passive: false });
              input.addEventListener('DOMMouseScroll', preventScroll, { passive: false });
            });
          }
        }
      }
    });
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });
}; 