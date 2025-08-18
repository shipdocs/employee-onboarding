# Changelog

All notable changes to the Maritime Onboarding System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive changelog documentation
- State management for accordion panels in content editor
- Real media upload functionality with progress tracking
- Support for both image and video uploads to Supabase Storage
- Environment variable fallback for SUPABASE_SERVICE_KEY
- Request ID tracking in error handlers

### Changed
- Renamed "Training Overview" to "Main Training Content" for clarity
- Updated placeholder text to clarify where training content should be written
- Improved error handling in frontend error logging endpoint
- Enhanced media uploader to use actual API endpoints instead of mock uploads

### Fixed
- Critical DOM manipulation errors in content editor ("Failed to execute 'removeChild' on 'Node'")
- Removed conflicting SafeHTMLRenderer from RichTextEditor component
- Fixed accordion expand/collapse functionality in content editor
- Resolved 500 errors from /api/errors/frontend endpoint
- Fixed ES module syntax errors in workflow API routes (converted to CommonJS)
- Corrected promise handling in error endpoint
- Fixed media file display to use Supabase Storage public URLs
- Added safety check for toast element removal in ContentManagementPage

### Security
- Added proper error handling for missing environment variables
- Implemented secure file upload with validation and logging

## [0.9.0] - 2025-01-06

### Added
- Workflow Management System with multi-phase training support
- Rich Content Editor with WYSIWYG capabilities
- Media & Resources tab for file management
- Auto-save functionality for content editing
- Content versioning system
- Approval workflow for content changes

### Changed
- Migrated from legacy training system to workflow-based architecture
- Updated content management UI for better user experience
- Improved role-based access control for content editing

### Fixed
- Pre-commit hook issues with console.error statements
- Module syntax compatibility with Vercel serverless functions

## [0.8.0] - 2024-12-15

### Added
- Multi-language support (English and Dutch)
- Certificate generation with QR codes
- Audit logging system
- Email notification service with MailerSend integration

### Changed
- Enhanced security with JWT token blacklisting
- Improved database schema with Row Level Security

### Fixed
- Authentication flow for crew members using magic links
- Session management across different user roles

## [0.7.0] - 2024-11-20

### Added
- Three-tier development pipeline (Local, Testing, Preview, Production)
- Supabase integration for database and file storage
- Role-based authentication system (Admin, Manager, Crew)
- Training progress tracking
- Quiz system with attempt history

### Changed
- Migrated from Firebase to Supabase
- Restructured API to serverless functions
- Updated frontend to React 18

### Security
- Implemented Row Level Security policies
- Added input validation across all API endpoints
- Secure file upload with type validation

## [0.6.0] - 2024-10-01

### Added
- Initial Maritime Onboarding System setup
- Basic training module structure
- User authentication
- Company isolation for multi-tenant support

### Changed
- Project structure to support Vercel deployment
- Database schema for maritime-specific requirements

---

## Version History Links

- [Unreleased](https://github.com/shipdocs/new-onboarding-2025/compare/v0.9.0...HEAD)
- [0.9.0](https://github.com/shipdocs/new-onboarding-2025/releases/tag/v0.9.0)
- [0.8.0](https://github.com/shipdocs/new-onboarding-2025/releases/tag/v0.8.0)
- [0.7.0](https://github.com/shipdocs/new-onboarding-2025/releases/tag/v0.7.0)
- [0.6.0](https://github.com/shipdocs/new-onboarding-2025/releases/tag/v0.6.0)

---

## Contributing to this Changelog

When making changes to the project:

1. Add your changes to the [Unreleased] section
2. Use the appropriate category (Added, Changed, Deprecated, Removed, Fixed, Security)
3. Write clear, user-focused descriptions
4. Follow conventional commit messages for automatic generation:
   - `feat:` for new features → Added
   - `fix:` for bug fixes → Fixed
   - `docs:` for documentation → Changed
   - `refactor:` for code changes → Changed
   - `style:` for formatting → Changed
   - `test:` for test additions → Added
   - `chore:` for maintenance → Changed
   - `security:` for security fixes → Security

## Automation

To generate changelog entries from commits:

```bash
# Install conventional-changelog
npm install -D conventional-changelog-cli

# Generate changelog
npx conventional-changelog -p angular -i CHANGELOG.md -s

# Or use auto-changelog
npm install -D auto-changelog
npx auto-changelog
```

## Release Process

1. Move items from [Unreleased] to a new version section
2. Update version number and date
3. Create git tag: `git tag -a v1.0.0 -m "Release version 1.0.0"`
4. Push tag: `git push origin v1.0.0`
5. Create GitHub release with changelog section as notes