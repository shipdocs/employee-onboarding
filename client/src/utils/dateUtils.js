/**
 * Utility functions for date formatting and validation
 */

/**
 * Format a date with validation
 * @param {string|Date|null} date - The date to format
 * @param {Object} options - Formatting options
 * @param {string} options.invalidMessage - Message to display for invalid dates (default: "Not Set")
 * @param {Object} options.formatOptions - Options for toLocaleDateString (locale, formatting options)
 * @returns {string} Formatted date string or invalid message
 */
export const formatDate = (date, options = {}) => {
  // Default options
  const {
    invalidMessage = 'Not Set',
    formatOptions = {}
  } = options;

  // Check for null or undefined
  if (date === null || date === undefined) {
    return invalidMessage;
  }

  // Try to create a valid date object
  const dateObj = new Date(date);

  // Check if date is valid (Invalid Date objects return NaN for getTime())
  if (isNaN(dateObj.getTime())) {
    return invalidMessage;
  }

  // Return formatted date
  return dateObj.toLocaleDateString(undefined, formatOptions);
};

