// Generate password hash from environment variable
const bcrypt = require('bcrypt');

const password = process.env.PASSWORD_TO_HASH;
if (!password) {
  console.error('PASSWORD_TO_HASH environment variable is required');
  console.log('Usage: PASSWORD_TO_HASH="your-password" node generate-password-hash.js');
  process.exit(1);
}

const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  
  console.log('Password hash generated successfully');
  console.log('Hash:', hash);
  console.log('\nUse this hash in the migration file');
});