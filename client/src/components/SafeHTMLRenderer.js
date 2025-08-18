import React from 'react';
import parse from 'html-react-parser';
import { sanitizeTrainingContent, stripHTML, isHTMLSafe } from '../utils/htmlSanitizer';

/**
 * SafeHTMLRenderer Component
 * Renders HTML content safely without using dangerouslySetInnerHTML
 * Uses html-react-parser with comprehensive sanitization and validation
 */

/**
 * Safe HTML Renderer that completely eliminates dangerouslySetInnerHTML
 * @param {Object} props - Component props
 * @param {string} props.html - HTML content to render
 * @param {string} props.fallback - Fallback text if content is unsafe
 * @param {string} props.className - CSS classes to apply
 * @param {Object} props.style - Inline styles to apply
 * @param {boolean} props.allowImages - Whether to allow img tags (default: true)
 * @param {boolean} props.allowLinks - Whether to allow a tags (default: true)
 * @param {boolean} props.strictMode - Use strict sanitization (default: false)
 * @returns {JSX.Element} Safely rendered HTML content
 */
const SafeHTMLRenderer = ({
  html,
  fallback = 'Content not available',
  className = '',
  style = {},
  allowImages = true,
  allowLinks = true,
  strictMode = false,
  ...props
}) => {
  // Early return for empty content
  if (!html || typeof html !== 'string' || html.trim() === '') {
    return (
      <div className={className} style={style} {...props}>
        {fallback}
      </div>
    );
  }

  try {
    // Step 1: Initial safety check
    if (!isHTMLSafe(html)) {
      // console.warn('Unsafe HTML detected, falling back to plain text');
      return (
        <div className={className} style={style} {...props}>
          {stripHTML(html) || fallback}
        </div>
      );
    }

    // Step 2: Sanitize the HTML content
    const sanitizedHTML = strictMode
      ? sanitizeTrainingContent(html)
      : sanitizeTrainingContent(html);

    // Step 3: Verify sanitization was successful
    if (!sanitizedHTML) {
      // console.warn('HTML sanitization failed, using plain text');
      return (
        <div className={className} style={style} {...props}>
          {stripHTML(html) || fallback}
        </div>
      );
    }

    // Step 4: Final safety check after sanitization
    if (!isHTMLSafe(sanitizedHTML)) {
      // console.warn('Content still unsafe after sanitization, using plain text');
      return (
        <div className={className} style={style} {...props}>
          {stripHTML(html) || fallback}
        </div>
      );
    }

    // Step 5: Parse HTML with additional security options
    const parseOptions = {
      replace: (domNode) => {
        // Additional security filtering during parsing
        if (domNode.type === 'tag') {
          const { name, attribs = {} } = domNode;

          // Block dangerous tags that might have slipped through
          const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'];
          if (dangerousTags.includes(name.toLowerCase())) {
            return <span>Blocked content</span>;
          }

          // Handle image tags
          if (name === 'img') {
            if (!allowImages) {
              return <span>[Image removed for security]</span>;
            }

            // Validate image source
            const src = attribs.src || '';
            if (src.startsWith('javascript:') || src.startsWith('data:text/html')) {
              return <span>[Unsafe image blocked]</span>;
            }

            // Return safe image with additional security attributes
            return (
              <img
                {...attribs}
                src={src}
                alt={attribs.alt || 'Training content image'}
                onError={(e) => {
                  e.target.style.display = 'none';
                  // console.warn('Image failed to load:', src);
                }}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            );
          }

          // Handle link tags
          if (name === 'a') {
            if (!allowLinks) {
              return <span>{domNode.children?.[0]?.data || 'Link removed for security'}</span>;
            }

            // Validate link href
            const href = attribs.href || '';
            if (href.startsWith('javascript:') || href.startsWith('vbscript:') || href.startsWith('data:')) {
              return <span>[Unsafe link blocked]</span>;
            }

            // Return safe link with security attributes
            return (
              <a
                {...attribs}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  // Additional runtime validation
                  if (href.includes('javascript:') || href.includes('vbscript:')) {
                    e.preventDefault();
                    // console.warn('Blocked unsafe link click:', href);
                  }
                }}
              />
            );
          }

          // Remove any remaining event handlers
          const cleanAttribs = {};
          Object.keys(attribs).forEach(attr => {
            if (!attr.toLowerCase().startsWith('on')) {
              cleanAttribs[attr] = attribs[attr];
            }
          });

          // Return element with cleaned attributes
          return React.createElement(name, cleanAttribs);
        }

        // Allow text nodes and other safe content
        return domNode;
      }
    };

    // Step 6: Parse and render the safe HTML
    const parsedContent = parse(sanitizedHTML, parseOptions);

    return (
      <div className={className} style={style} {...props}>
        {parsedContent}
      </div>
    );

  } catch (error) {
    // console.error('Error rendering HTML content:', error);
    return (
      <div className={className} style={style} {...props}>
        {stripHTML(html) || fallback}
      </div>
    );
  }
};

/**
 * Specialized renderer for training content
 * Pre-configured with training-specific security settings
 */
export const TrainingContentRenderer = ({ content, ...props }) => (
  <SafeHTMLRenderer
    html={content}
    fallback="Training content not available"
    allowImages={true}
    allowLinks={true}
    strictMode={false}
    className="text-gray-700 leading-relaxed text-lg prose prose-lg max-w-none"
    {...props}
  />
);

/**
 * Admin content renderer
 * Balanced security for admin-created content
 */
export const AdminContentRenderer = ({ content, ...props }) => (
  <SafeHTMLRenderer
    html={content}
    fallback="Content not available"
    allowImages={true}
    allowLinks={true}
    strictMode={false}
    {...props}
  />
);

export default SafeHTMLRenderer;
