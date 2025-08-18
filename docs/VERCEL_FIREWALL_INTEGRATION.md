# Vercel Firewall Integration

## Overview

This is a **real integration** with Vercel's Firewall API that provides automated IP blocking based on failed login attempts.

## Features

### ✅ Real Functionality
- **Actual API calls** to Vercel's Firewall API
- **Real IP blocking** at the edge level
- **Automated threat response** based on failed login patterns
- **Admin interface** for manual IP management

### ✅ Integration Points
- **Failed login processing** - Automatically blocks IPs after 10 failed attempts in 60 minutes
- **Admin controls** - Manual block/unblock functionality
- **Security logging** - All actions logged to security events
- **Connection testing** - Verify API connectivity

## Configuration

### Required Environment Variables

Add these to your Vercel environment variables:

```bash
VERCEL_ACCESS_TOKEN=your_vercel_access_token_here
VERCEL_PROJECT_ID=your_vercel_project_id_here
VERCEL_TEAM_ID=your_team_id_here  # Optional, for team accounts
```

### Getting Vercel Access Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Settings → Tokens
3. Create a new token with "Full Access" scope
4. Copy the token and add to environment variables

### Getting Project ID

1. Go to your project in Vercel Dashboard
2. Navigate to Settings → General
3. Copy the Project ID
4. Add to `VERCEL_PROJECT_ID` environment variable

## How It Works

### Automated Blocking

1. **Failed Login Detection**: When a user fails to login, the system logs the attempt
2. **Threshold Check**: If an IP has 10+ failed attempts in 60 minutes, it triggers blocking
3. **Vercel API Call**: Makes actual API call to Vercel to block the IP at edge level
4. **Global Propagation**: IP is blocked worldwide within seconds

### Manual Management

Admins can:
- **View blocked IPs** - See all currently blocked IP addresses
- **Block IPs manually** - Add specific IPs to the block list
- **Unblock IPs** - Remove IPs from the block list
- **Test connection** - Verify API connectivity

## API Endpoints

### Admin Firewall Management

```
GET  /api/admin/vercel-firewall     # Get firewall status and blocked IPs
POST /api/admin/vercel-firewall     # Execute firewall actions
```

### Supported Actions

- `block_ip` - Block a specific IP address
- `unblock_ip` - Unblock a specific IP address
- `test_connection` - Test Vercel API connectivity
- `get_config` - Get current firewall configuration
- `update_challenge_mode` - Enable/disable challenge mode
- `get_attack_data` - Get active attack data
- `create_bypass` - Create bypass rule for trusted IP

## Admin Interface

### Firewall Dashboard

Located in Admin Dashboard → Vercel Firewall tab:

- **Status Overview** - Integration status, firewall status, blocked IP count
- **Connection Test** - Verify API connectivity
- **Manual IP Management** - Block/unblock specific IPs
- **Blocked IPs List** - View and manage currently blocked IPs
- **Recent Actions** - View recent firewall actions and their status

### Configuration Status

The interface shows:
- ✅ **Enabled** - All environment variables configured correctly
- ❌ **Disabled** - Missing required environment variables
- 🔄 **Testing** - Connection test in progress

## Security Benefits

### Edge-Level Protection
- **Blocked before reaching application** - Malicious traffic stopped at CDN level
- **Global propagation** - Rules active worldwide in seconds
- **Reduced server load** - Blocked requests don't consume server resources

### Automated Response
- **No manual intervention** - System automatically blocks repeat offenders
- **Configurable thresholds** - Adjust blocking criteria as needed
- **Audit trail** - All actions logged for compliance

## Testing

### Test the Integration

1. **Check Configuration**
   - Go to Admin Dashboard → Vercel Firewall
   - Verify status shows "Enabled"
   - Click "Test Connection" button

2. **Test Manual Blocking**
   - Enter a test IP address (not your own!)
   - Add a reason and click "Block IP"
   - Verify IP appears in blocked list

3. **Test Automated Blocking**
   - Make 10+ failed login attempts from a test IP
   - Check security events for firewall actions
   - Verify IP gets automatically blocked

### Troubleshooting

#### "Integration Disabled" Error
- Check `VERCEL_ACCESS_TOKEN` is set correctly
- Check `VERCEL_PROJECT_ID` is set correctly
- Verify token has correct permissions

#### "Connection Test Failed" Error
- Verify token is valid and not expired
- Check project ID is correct
- Ensure token has firewall permissions

#### "API Error" Messages
- Check Vercel API status
- Verify project has firewall feature enabled
- Review token permissions

## Monitoring

### Security Events

All firewall actions are logged as security events:
- `vercel_firewall_action` - Successful API calls
- `firewall_action_failed` - Failed API calls
- `manual_ip_block` - Admin manual blocks
- `manual_ip_unblock` - Admin manual unblocks

### Metrics

Track:
- Number of blocked IPs
- Failed vs successful API calls
- Automated vs manual blocks
- Connection test results

## Limitations

### Vercel Plan Requirements
- Firewall API requires Pro plan or higher
- Some features may require Enterprise plan

### Rate Limits
- Vercel API has rate limits
- Excessive API calls may be throttled

### IP Blocking Scope
- Only blocks HTTP/HTTPS traffic
- Does not block other protocols
- Blocks apply to entire project

## Best Practices

1. **Whitelist Important IPs**
   - Add office/admin IPs to bypass rules
   - Use `create_bypass` action for trusted IPs

2. **Monitor False Positives**
   - Review blocked IPs regularly
   - Unblock legitimate users quickly

3. **Adjust Thresholds**
   - Start with conservative settings
   - Adjust based on attack patterns

4. **Regular Testing**
   - Test connection monthly
   - Verify blocking still works

## Support

For issues:
1. Check environment variables are set correctly
2. Test API connection in admin interface
3. Review security events for error details
4. Check Vercel API documentation for updates

## Changelog

### v1.0.0 - Initial Implementation
- Real Vercel Firewall API integration
- Automated IP blocking on failed logins
- Admin interface for manual management
- Connection testing and monitoring
- Security event logging
