# Supabase MCP Quick Reference 🚀

## 🎯 Common Commands

### Database Exploration
```
"List all database tables"
"Show me the users table"
"Describe the training_items table"
"What columns does the user_progress table have?"
```

### User Management
```
"Show me all users"
"Get users created in the last week"
"Find user with email john@maritime.com"
"Show user details for user ID 123"
```

### Training Progress
```
"Get training progress for user abc123"
"Show users who completed Phase 1"
"Find users stuck in Phase 2"
"Get completion rates by training phase"
```

### Analytics & Reporting
```
"Show training analytics for the last 30 days"
"Get completion statistics"
"Show the most popular training modules"
"Generate user engagement report"
```

### Data Operations
```
"Insert a new user with email test@example.com"
"Update user profile for user 123"
"Mark training item as completed for user 456"
"Delete test users created today"
```

### Maintenance
```
"Create a backup of all tables"
"Clean up old session data"
"Archive completed training records"
"Show database health status"
```

## 🔧 Setup Commands

```bash
# Setup MCP server
npm run supabase:setup-mcp

# Test configuration
npm run supabase:test-mcp

# Test Python server
python3 scripts/supabase-mcp-server.py --test
```

## 📁 Key Files

- **Config**: `.kiro/settings/mcp.json`
- **Server**: `scripts/supabase-mcp-server.py`
- **Setup**: `scripts/setup-supabase-mcp.js`
- **Test**: `scripts/test-supabase-mcp.js`
- **Docs**: `docs/supabase-mcp-integration.md`

## 🔒 Security Levels

### ✅ Auto-Approved (Safe)
- Reading data
- Listing tables
- Getting analytics
- Viewing progress

### ⚠️ Requires Confirmation
- Writing data
- Deleting records
- Running custom SQL
- Database backups

## 🛠️ Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| `list_tables` | List all tables | "Show all tables" |
| `describe_table` | Table structure | "Describe users table" |
| `query_table` | Query data | "Get first 10 users" |
| `get_user_progress` | Training progress | "Progress for user 123" |
| `get_training_analytics` | Analytics | "Show training stats" |
| `insert_data` | Add records | "Add new user" |
| `update_data` | Update records | "Update user email" |
| `delete_data` | Delete records | "Delete test data" |
| `execute_sql` | Custom SQL | "Run custom query" |
| `backup_database` | Create backups | "Backup users table" |

## 🚨 Troubleshooting

### Server Won't Start
1. Check Python: `python3 --version`
2. Check MCP: `python3 -c "import mcp; print('OK')"`
3. Check config: `npm run supabase:test-mcp`

### Connection Issues
1. Verify Supabase URL in config
2. Check service role key permissions
3. Test from Supabase dashboard

### Permission Errors
1. Use service role key (not anon key)
2. Check RLS policies
3. Verify key has database access

---

**💡 Pro Tip**: Start with simple queries like "List all tables" to test the connection, then move to more complex operations.