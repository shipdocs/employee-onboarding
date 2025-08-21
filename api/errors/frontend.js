/**
 * Frontend Error Logging API Endpoint
 * Receives and processes frontend errors from React Error Boundaries
 */

const { supabase } = require('../../lib/database-supabase-compat');
// Use CommonJS for errorHandler (it's a CommonJS module)
const ErrorHandler = require('../../lib/errorHandler.js');
const { apiRateLimit } = require('../../lib/rateLimit');
const { createValidationError } = ErrorHandler;

async function handleRequest(req, res) {
  if (req.method !== 'POST') {
    throw createValidationError('VALIDATION_INVALID_METHOD', 'Method not allowed', {
      allowedMethods: ['POST'],
      requestedMethod: req.method
    });
  }

  const {
    id,
    type,
    message,
    stack,
    timestamp,
    sessionId,
    url,
    userAgent,
    viewport,
    context
  } = req.body;

  // Validate required fields
  if (!type || !message) {
    throw createValidationError('VALIDATION_REQUIRED_FIELD', 'Type and message are required', {
      missingFields: [
        ...(!type ? ['type'] : []),
        ...(!message ? ['message'] : [])
      ]
    });
  }

  // Validate error type
  const validTypes = [
    'REACT_ERROR_BOUNDARY',
    'UNHANDLED_PROMISE_REJECTION',
    'GLOBAL_JAVASCRIPT_ERROR',
    'CUSTOM_APPLICATION_ERROR',
    'PERFORMANCE_ISSUE'
  ];

  if (!validTypes.includes(type)) {
    throw createValidationError('VALIDATION_INVALID_ERROR_TYPE', 'Invalid error type', {
      validTypes,
      receivedType: type
    });
  }

  try {
    // Get client info
    const clientIP = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    const sessionIdHeader = req.headers['x-session-id'];

    // Prepare error data for database
    const errorData = {
      error_id: id || `fe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error_type: type,
      message: message.substring(0, 1000), // Limit message length
      stack_trace: stack ? stack.substring(0, 5000) : null, // Limit stack trace length
      timestamp: timestamp || new Date().toISOString(),
      session_id: sessionId || sessionIdHeader,
      url: url ? url.substring(0, 500) : null, // Limit URL length
      user_agent: userAgent ? userAgent.substring(0, 500) : null,
      ip_address: clientIP,
      viewport_width: viewport?.width,
      viewport_height: viewport?.height,
      context: context ? JSON.stringify(context) : null,
      created_at: new Date().toISOString()
    };

    // Insert into frontend_errors table
    const { error: insertError } = await supabase
      .from('frontend_errors')
      .insert(errorData);

    if (insertError) {
      console.error('Failed to insert frontend error:', insertError);
      throw new Error('Failed to save error to database');
    }

    // Log to console for monitoring (system_logs table doesn't exist)
    console.log('Frontend error logged:', {
      errorType: type,
      errorId: errorData.error_id,
      sessionId: errorData.session_id,
      url: errorData.url,
      message: message.substring(0, 200) // Shorter message for logs
    });

    // Check for critical errors that need immediate attention
    const criticalTypes = ['REACT_ERROR_BOUNDARY', 'UNHANDLED_PROMISE_REJECTION'];
    if (criticalTypes.includes(type)) {
      // Critical error detected - logged to database
    }

    // Return success response
    res.status(201).json({
      success: true,
      errorId: errorData.error_id,
      message: 'Error logged successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // If it's already an APIError, re-throw it
    if (error.name === 'APIError' || error.name === 'ValidationError') {
      throw error;
    }

    // Handle unexpected errors
    console.error('Frontend error logging failed:', error);
    throw new Error('Failed to process frontend error');
  }
}

async function handler(req, res) {
  try {
    // Add request ID
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    res.setHeader('X-Request-ID', req.requestId);

    // Handle the request
    await handleRequest(req, res);
  } catch (error) {
    // Handle errors
    ErrorHandler.handle(error, req, res);
  }
}

module.exports = apiRateLimit(handler);
