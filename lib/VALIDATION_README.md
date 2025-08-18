# Validation Library Documentation

## Overview

The validation library provides comprehensive input validation, sanitization, and security features for all API endpoints in the maritime onboarding system.

## Features

- **Email Validation**: Enhanced validation with disposable email detection
- **Password Validation**: Complexity requirements with strength scoring
- **File Upload Validation**: Magic byte verification and size limits
- **Request Body Size Limits**: Prevent DoS attacks
- **Input Sanitization**: XSS and injection prevention
- **Type Validation**: UUID, phone, URL, date, enum, and more

## Usage

### Basic Validation

```javascript
const { validators, validateObject, schema } = require('./lib/validation');

// Single field validation
const emailResult = validators.email('test@example.com');
if (!emailResult.valid) {
  console.error(emailResult.error);
}

// Object validation with schema
const validationSchema = {
  email: schema.email({ required: true }),
  password: schema.password({ required: true }),
  firstName: schema.string({ 
    required: true, 
    options: { 
      minLength: 1, 
      maxLength: 100,
      pattern: /^[a-zA-Z\s\-']+$/
    }
  })
};

const errors = validateObject(req.body, validationSchema);
if (errors.length > 0) {
  throw createValidationError('Validation failed', { errors });
}
```

### Password Requirements

- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character (@$!%*?&)
- No common passwords
- No more than 2 repeated characters

```javascript
const result = validators.password('MySecurePass123!');
console.log(result.strength); // 'strong', 'medium', or 'weak'
```

### File Upload Validation

```javascript
const { fileValidators } = require('./lib/validation');

// Validate file metadata
const uploadValidation = await fileValidators.validateUpload(file, 'image');
if (!uploadValidation.valid) {
  throw new Error(uploadValidation.errors.join(', '));
}

// Validate file content by magic bytes
const fileBuffer = await fs.readFile(file.path);
const typeValidation = await fileValidators.validateFileType(fileBuffer, 'image');
if (!typeValidation.valid) {
  throw new Error(typeValidation.error);
}
```

### Body Size Limits

```javascript
const { withBodySizeLimit } = require('./lib/middleware/bodySizeLimit');

// Wrap handler with body size limit
module.exports = withBodySizeLimit(handler, 'auth'); // 10KB limit
module.exports = withBodySizeLimit(handler, 'upload'); // 50MB limit
module.exports = withBodySizeLimit(handler, 'api'); // 512KB limit
```

### Input Sanitization

```javascript
const { sanitizers } = require('./lib/validation');

// HTML sanitization (prevents XSS)
const safeHtml = sanitizers.html(userInput);

// Filename sanitization (prevents path traversal)
const safeFilename = sanitizers.filename(uploadedFilename);

// SQL escaping (use parameterized queries instead!)
const escapedString = sanitizers.sql(userInput);

// Log output sanitization (prevents log injection)
const safeLogMessage = sanitizers.log(userInput);

// General text sanitization
const safeText = sanitizers.text(userInput, { maxLength: 200 });
```

## Validation Types

### Email
- Format validation
- Disposable email detection
- Length limits (max 254 chars)
- Normalization to lowercase

### Password
- Complexity requirements
- Common password detection
- Strength scoring
- Configurable requirements

### UUID
- Standard UUID v4 format
- Case-insensitive
- Normalization to lowercase

### Phone Number
- International format support
- Formatting character removal
- Optional locale validation

### URL
- Protocol validation
- Private/local address blocking
- Suspicious port detection
- Domain validation

### String
- Length constraints
- Pattern matching
- Alphanumeric validation
- Whitespace trimming

### Number
- Range validation
- Integer validation
- Type coercion

### Boolean
- Multiple format support ('true', '1', 'yes', 'on')
- Type coercion

### Date
- ISO 8601 format
- Range validation
- Timezone handling

### Enum
- Allowed value validation
- Case-sensitive matching

## File Upload Configuration

### Image Files
- Max size: 10MB
- Allowed types: JPEG, PNG, WebP, GIF
- Magic byte validation

### Video Files  
- Max size: 100MB
- Allowed types: MP4, WebM, OGG
- Magic byte validation

### Document Files
- Max size: 25MB
- Allowed types: PDF, DOC, DOCX
- Magic byte validation

## Security Best Practices

1. **Always validate on the server**: Never trust client-side validation
2. **Use parameterized queries**: SQL sanitization is a last resort
3. **Validate file content**: Don't trust MIME types alone
4. **Set appropriate limits**: Prevent resource exhaustion
5. **Sanitize for context**: HTML for display, filenames for storage
6. **Log validation failures**: Monitor for attack patterns

## Error Handling

```javascript
const { createValidationError } = require('./lib/apiHandler');

// Validation errors return structured responses
{
  error: 'Validation failed',
  details: {
    errors: [
      { field: 'email', error: 'Invalid email format' },
      { field: 'password', error: 'Password must be at least 12 characters long' }
    ]
  }
}
```

## Integration with API Endpoints

```javascript
// Example: Admin login endpoint
const { validators, validateObject } = require('./lib/validation');
const { withBodySizeLimit } = require('./lib/middleware/bodySizeLimit');

async function handler(req, res) {
  // Define validation schema
  const schema = {
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string', options: { minLength: 1 } }
  };

  // Validate request
  const errors = validateObject(req.body, schema);
  if (errors.length > 0) {
    throw createValidationError('Validation failed', { errors });
  }

  // Use validated values
  const { email, password } = req.body;
  // ... rest of handler
}

// Export with rate limiting and body size limit
module.exports = authRateLimit(withBodySizeLimit(handler, 'auth'));
```

## Testing

Run validation tests:
```bash
npm test tests/unit/lib/validation.test.js
```

## Performance Considerations

- Validation is synchronous (except file type checking)
- Regex patterns are compiled once
- Magic byte checking only reads first 8 bytes
- Body size limits stream data to prevent memory issues

## Future Enhancements

- [ ] Add credit card validation
- [ ] Add IBAN validation  
- [ ] Add postal code validation by country
- [ ] Add custom error message localization
- [ ] Add async validation support
- [ ] Add JSON schema validation