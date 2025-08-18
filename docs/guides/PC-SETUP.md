# PC Setup - Maritime Onboarding System

## 🚀 Quick Setup for New PC

### Prerequisites
- Node.js v18+
- Git
- npm

### One-Command Setup
```bash
# 1. Clone repository
git clone https://github.com/shipdocs/new-onboarding-2025.git
cd new-onboarding-2025

# 2. Add project alias to your shell
echo "alias project='./dev.sh'" >> ~/.bashrc   # For bash
# OR
echo "alias project='./dev.sh'" >> ~/.zshrc    # For zsh

# 3. Reload shell
source ~/.bashrc  # or source ~/.zshrc

# 4. Install everything and build
project install

# 5. Start development
project run
```

## ⚙️ Environment Configuration

### Environment Variables
```bash
# Copy template and edit with your keys
cp .env.example .env.local
# Edit .env.local with your Supabase and MailerSend credentials
```

### Vercel Setup
```bash
# Install Vercel CLI if needed
npm install -g vercel

# Login and link project
vercel login
vercel link
# Select: shipdocs-projects team
# Select: new-onboarding-2025 project
```

### Supabase Setup
```bash
# Install Supabase CLI if needed
npm install -g supabase

# Link to fresh development project
supabase link --project-ref ocqnnyxnqaedarcohywe
```

## 🔄 Daily Development Workflow

```bash
# Start development server
project run

# After making React changes
project update

# Fresh install (if things break)
project fresh

# Get help
project help
```

## 🧪 Testing & Verification

### Test Application
- Navigate to: http://localhost:3000
- Admin login: adminmartexx@shipdocs.app
- API health: http://localhost:3000/api/health

### Test Manager Magic Link
1. Go to http://localhost:3000
2. Click "Manager Login" 
3. Enter manager email
4. Check email for magic link
5. Click link to authenticate

## 🎯 Available Commands

| Command | Description |
|---------|-------------|
| `project install` | Install dependencies and build |
| `project run` | Start development server |
| `project update` | Rebuild after React changes |
| `project fresh` | Clean install everything |
| `project test` | Test API connectivity |
| `project help` | Show all commands |

## 🚨 Troubleshooting

### If `project` command not found:
```bash
# Make sure alias is added to your shell profile
echo "alias project='./dev.sh'" >> ~/.bashrc
source ~/.bashrc
```

### If Vercel dev fails:
```bash
# Check if you're in the right directory
ls vercel.json  # Should exist

# Make sure build exists
project update
```

### If database connection fails:
```bash
# Re-link Supabase project
supabase link --project-ref ocqnnyxnqaedarcohywe
```

## ✅ Success Checklist

- [ ] Repository cloned
- [ ] `project` alias working
- [ ] Dependencies installed (`project install`)
- [ ] Development server starts (`project run`)
- [ ] Application loads at http://localhost:3000
- [ ] Admin login works
- [ ] Manager magic link works

**You're ready to develop! 🎉**
