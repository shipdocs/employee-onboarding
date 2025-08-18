// Test script to run in browser console to debug translations

// Check if i18n is loaded
console.log('i18n instance:', window.i18n || 'Not found on window');

// Check current language
console.log('Current language:', localStorage.getItem('i18nextLng'));

// Test translation function access via React DevTools
console.log('To test translations, open React DevTools and look for components using useTranslation hook');

// Instructions for testing
console.log(`
=== Manual Testing Instructions ===

1. Open browser DevTools (F12)
2. Go to Console tab
3. Check for any i18n errors
4. Check current language: localStorage.getItem('i18nextLng')
5. Look at Network tab for any failed translation file loads
6. In React DevTools, find ManagerDashboard component and inspect its props

Key things to check:
- Are translation files being loaded? (Network tab)
- Is the language detected correctly? (Console)
- Are there any i18n initialization errors? (Console)
- Is the useTranslation hook returning a proper 't' function? (React DevTools)
`);