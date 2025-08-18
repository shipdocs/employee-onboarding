/**
 * React hook for safe HTML rendering
 * Uses SafeContentRenderer to sanitize HTML content before rendering
 */

import { useMemo } from 'react';

// Import SafeContentRenderer - we'll need to make it available in the client
// For now, we'll create a simplified version that mimics the server-side functionality
const sanitizeHTML = (content, options = {}) => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Basic client-side sanitization
  // In a real implementation, you'd use DOMPurify directly
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;

  // Remove dangerous elements
  const dangerousElements = tempDiv.querySelectorAll('script, object, embed, iframe, form, input, textarea, select, button');
  dangerousElements.forEach(el => el.remove());

  // Remove dangerous attributes
  const allElements = tempDiv.querySelectorAll('*');
  allElements.forEach(el => {
    // Remove event handlers
    const attributes = [...el.attributes];
    attributes.forEach(attr => {
      if (attr.name.startsWith('on') || attr.name === 'style') {
        el.removeAttribute(attr.name);
      }
    });

    // Remove javascript: URLs
    if (el.href && el.href.startsWith('javascript:')) {
      el.removeAttribute('href');
    }
    if (el.src && el.src.startsWith('javascript:')) {
      el.removeAttribute('src');
    }
  });

  return tempDiv.innerHTML;
};

/**
 * Hook for safe HTML rendering
 * @param {string} content - HTML content to sanitize
 * @param {object} options - Sanitization options
 * @returns {object} - Object with sanitized HTML for dangerouslySetInnerHTML
 */
export const useSafeHTML = (content, options = {}) => {
  const sanitizedHTML = useMemo(() => {
    return sanitizeHTML(content, options);
  }, [content, options]);

  return {
    __html: sanitizedHTML
  };
};

/**
 * Hook for safe text content (strips all HTML)
 * @param {string} content - HTML content to convert to text
 * @returns {string} - Plain text content
 */
export const useSafeText = (content) => {
  return useMemo(() => {
    if (!content || typeof content !== 'string') {
      return '';
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    return tempDiv.textContent || tempDiv.innerText || '';
  }, [content]);
};

/**
 * Component for safe HTML rendering
 * @param {object} props - Component props
 * @param {string} props.content - HTML content to render
 * @param {string} props.tag - HTML tag to use (default: div)
 * @param {object} props.options - Sanitization options
 * @param {object} props.style - CSS styles
 * @param {string} props.className - CSS class name
 * @returns {JSX.Element} - Safe HTML component
 */
export const SafeHTMLRenderer = ({ 
  content, 
  tag: Tag = 'div', 
  options = {}, 
  style = {}, 
  className = '',
  ...props 
}) => {
  const safeHTML = useSafeHTML(content, options);

  return (
    <Tag
      style={style}
      className={className}
      dangerouslySetInnerHTML={safeHTML}
      {...props}
    />
  );
};

export default useSafeHTML;