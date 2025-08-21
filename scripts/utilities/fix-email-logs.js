// Script to fix all logEmail calls in emailService.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'lib', 'emailService.js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix pattern 1: logEmail(userId, 'type', subject, 'sent')
content = content.replace(
  /await logEmail\(userId, '[^']+', subject, 'sent'\);/g,
  'await logEmail(recipientEmail, subject, magicLink || "Email sent", \'sent\');'
);

// Fix pattern 2: logEmail(userId, 'type', subject, 'sent', 'Mock mode...')
content = content.replace(
  /await logEmail\(userId, '[^']+', subject, 'sent', 'Mock mode[^']+'\);/g,
  'await logEmail(recipientEmail, subject, `Mock mode - Magic link: ${magicLink}`, \'mock\');'
);

// Fix pattern 3: logEmail(userId, 'type', 'Subject', 'failed', ...)
content = content.replace(
  /await logEmail\(userId, '[^']+', '([^']+)', 'failed',\s*[^)]+\);/g,
  'await logEmail(recipientEmail || await getUserEmail(userId), \'$1\', error.message || \'Failed to send\', \'failed\');'
);

// Write the fixed content back
fs.writeFileSync(filePath, content);
console.log('Fixed all logEmail calls in emailService.js');