import { useEffect } from 'react';

/**
 * Custom hook to disable scroll wheel on number inputs within a component
 * @param {React.RefObject} containerRef - Reference to the container element (optional)
 */
export const useDisableNumberInputScroll = (containerRef = null) => {
  useEffect(() => {
    // Function to prevent scroll wheel from changing number input values
    const preventScroll = (e) => {
      if (e.target.type === 'number') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      return true;
    };

    // If a container ref is provided, only apply to that container
    const container = containerRef?.current || document;
    
    // Find all number inputs in the container
    const numberInputs = container.querySelectorAll('input[type="number"]');
    
    // Add event listeners to each number input
    numberInputs.forEach(input => {
      input.addEventListener('wheel', preventScroll, { passive: false });
      
      // Also disable the mousewheel event which some browsers use
      input.addEventListener('mousewheel', preventScroll, { passive: false });
      
      // DOMMouseScroll is used by older Firefox
      input.addEventListener('DOMMouseScroll', preventScroll, { passive: false });
    });

    // Cleanup function to remove event listeners
    return () => {
      numberInputs.forEach(input => {
        input.removeEventListener('wheel', preventScroll);
        input.removeEventListener('mousewheel', preventScroll);
        input.removeEventListener('DOMMouseScroll', preventScroll);
      });
    };
  }, [containerRef]);
}; 