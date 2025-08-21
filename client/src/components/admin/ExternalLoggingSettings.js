import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  Typography,
  Switch,
  TextField,
  Button,
  FormControlLabel,
  Grid,
  Box,
  Alert,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  InputAdornment,
  Tooltip
} from '@mui/material';
import {
  CloudUpload,
  TestTube,
  Save,
  Delete,
  Add,
  Info,
  CheckCircle,
  Error,
  Warning,
  Visibility,
  VisibilityOff,
  Refresh,
  FilterList,
  Timeline,
  Security,
  History
} from '@mui/icons-material';

const ExternalLoggingSettings = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState([]);
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [filterDialog, setFilterDialog] = useState(false);
  const [newFilter, setNewFilter] = useState({
    filter_type: 'include',
    field_name: '',
    operator: 'equals',
    value: '',
    enabled: true
  });

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
    loadFilters();
    loadStatistics();
    loadAuditLogs();
  }, []);

  const loadConfiguration = async () => {
    try {
      const response = await axios.get('/api/admin/external-logging/config');
      setConfig(response.data.config);
    } catch (error) {
      toast.error('Failed to load external logging configuration');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const response = await axios.get('/api/admin/external-logging/filters');
      setFilters(response.data.filters);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await axios.get('/api/admin/external-logging/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await axios.get('/api/admin/external-logging/audit?limit=10');
      setAuditLogs(response.data.audit_logs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Don't send the API key if it wasn't changed
      const configToSave = { ...config };
      if (!config.api_key) {
        configToSave.skip_api_key_validation = true;
        delete configToSave.api_key;
      }

      const response = await axios.put('/api/admin/external-logging/config', configToSave);
      if (response.data.success) {
        toast.success('External logging configuration saved successfully');
        await loadConfiguration();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await axios.post('/api/admin/external-logging/test');
      if (response.data.success) {
        toast.success('Connection test successful! Logs are being sent to Grafana Cloud.');
      } else {
        toast.error(`Connection test failed: ${response.data.message}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleAddFilter = async () => {
    try {
      const response = await axios.post('/api/admin/external-logging/filters', newFilter);
      if (response.data.success) {
        toast.success('Filter added successfully');
        setFilterDialog(false);
        setNewFilter({
          filter_type: 'include',
          field_name: '',
          operator: 'equals',
          value: '',
          enabled: true
        });
        await loadFilters();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add filter');
    }
  };

  const handleDeleteFilter = async (filterId) => {
    try {
      await axios.delete(`/api/admin/external-logging/filters/${filterId}`);
      toast.success('Filter deleted successfully');
      await loadFilters();
    } catch (error) {
      toast.error('Failed to delete filter');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudUpload /> External Logging Configuration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        Configure external logging to Grafana Cloud for enhanced security monitoring and compliance. 
        Logs are sent in parallel with existing logging and never affect application performance.
      </Alert>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="Configuration" />
        <Tab label="Filters" />
        <Tab label="Statistics" />
        <Tab label="Audit Log" />
      </Tabs>

      {/* Configuration Tab */}
      {activeTab === 0 && config && (
        <Card>
          <CardContent>
            <Grid container spacing={3}>
              {/* Enable/Disable Toggle */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enabled}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>Enable External Logging</Typography>
                      {config.enabled ? (
                        <Chip label="Active" color="success" size="small" />
                      ) : (
                        <Chip label="Inactive" color="default" size="small" />
                      )}
                    </Box>
                  }
                />
              </Grid>

              {/* Connection Settings */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Connection Settings</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Grafana Cloud URL"
                  value={config.endpoint_url || ''}
                  onChange={(e) => setConfig({ ...config, endpoint_url: e.target.value })}
                  placeholder="https://logs-prod-us-central1.grafana.net"
                  helperText="Your Grafana Cloud Loki endpoint"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CloudUpload />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="User ID"
                  value={config.api_user || ''}
                  onChange={(e) => setConfig({ ...config, api_user: e.target.value })}
                  placeholder="123456"
                  helperText="Your Grafana Cloud numeric user ID"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Key"
                  type={showApiKey ? 'text' : 'password'}
                  value={config.api_key || ''}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder={config.api_key_configured ? '••••••••• (configured)' : 'glc_eyJvIjo...'}
                  helperText={config.api_key_configured ? 'API key is configured. Leave blank to keep existing.' : 'Your Grafana Cloud API key with logs:write permission'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end">
                          {showApiKey ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Logging Configuration */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Logging Configuration</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Log Level</InputLabel>
                  <Select
                    value={config.log_level || 'warn'}
                    onChange={(e) => setConfig({ ...config, log_level: e.target.value })}
                    label="Log Level"
                  >
                    <MenuItem value="error">Error</MenuItem>
                    <MenuItem value="warn">Warning</MenuItem>
                    <MenuItem value="info">Info</MenuItem>
                    <MenuItem value="debug">Debug</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Rate Limit (logs/minute)"
                  value={config.max_logs_per_minute || 100}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setConfig({ ...config, max_logs_per_minute: Number.isFinite(value) ? value : 100 });
                  }}
                  helperText="Maximum logs per minute to prevent overages"
                />
              </Grid>

              {/* Event Types */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Event Types to Log</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.include_security_events}
                      onChange={(e) => setConfig({ ...config, include_security_events: e.target.checked })}
                    />
                  }
                  label="Security Events (SQL injection, XSS, etc.)"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.include_auth_events}
                      onChange={(e) => setConfig({ ...config, include_auth_events: e.target.checked })}
                    />
                  }
                  label="Authentication Events (login failures, etc.)"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.include_error_logs}
                      onChange={(e) => setConfig({ ...config, include_error_logs: e.target.checked })}
                    />
                  }
                  label="Application Errors"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.include_audit_logs}
                      onChange={(e) => setConfig({ ...config, include_audit_logs: e.target.checked })}
                    />
                  }
                  label="Audit Logs (compliance)"
                />
              </Grid>

              {/* Performance Settings */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Performance Settings</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Batch Size"
                  value={config.batch_size || 10}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setConfig({ ...config, batch_size: Number.isFinite(value) && value > 0 ? value : 10 });
                  }}
                  helperText="Number of logs to batch before sending"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Flush Interval (ms)"
                  value={config.flush_interval_ms || 5000}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setConfig({ ...config, flush_interval_ms: Number.isFinite(value) && value > 0 ? value : 5000 });
                  }}
                  helperText="Time to wait before sending partial batch"
                />
              </Grid>

              {/* Connection Status */}
              {config.last_connection_test && (
                <Grid item xs={12}>
                  <Alert 
                    severity={config.last_connection_status === 'success' ? 'success' : 'error'}
                    sx={{ mt: 2 }}
                  >
                    Last connection test: {new Date(config.last_connection_test).toLocaleString()}
                    {config.last_error_message && ` - ${config.last_error_message}`}
                  </Alert>
                </Grid>
              )}

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                  >
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleTest}
                    disabled={testing || !config.enabled}
                    startIcon={testing ? <CircularProgress size={20} /> : <TestTube />}
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={loadConfiguration}
                    startIcon={<Refresh />}
                  >
                    Refresh
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Filters Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Log Filters</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setFilterDialog(true)}
              >
                Add Filter
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Field</TableCell>
                    <TableCell>Operator</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filters.map((filter) => (
                    <TableRow key={filter.id}>
                      <TableCell>
                        <Chip
                          label={filter.filter_type}
                          color={filter.filter_type === 'include' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{filter.field_name}</TableCell>
                      <TableCell>{filter.operator}</TableCell>
                      <TableCell>{filter.value}</TableCell>
                      <TableCell>
                        <Chip
                          label={filter.enabled ? 'Enabled' : 'Disabled'}
                          color={filter.enabled ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteFilter(filter.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filters.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No filters configured. All logs matching the event type settings will be sent.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Statistics Tab */}
      {activeTab === 2 && stats && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Logs Sent Today
                </Typography>
                <Typography variant="h4">
                  {stats.current?.logs_sent_today || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Logs This Month
                </Typography>
                <Typography variant="h4">
                  {stats.current?.logs_sent_month || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Last Log Sent
                </Typography>
                <Typography variant="body2">
                  {stats.current?.last_log_sent_at 
                    ? new Date(stats.current.last_log_sent_at).toLocaleString()
                    : 'Never'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Connection Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {stats.current?.last_connection_status === 'success' ? (
                    <CheckCircle color="success" />
                  ) : (
                    <Error color="error" />
                  )}
                  <Typography>
                    {stats.current?.last_connection_status || 'Untested'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Daily Statistics Chart would go here */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Daily Log Volume (Last 7 Days)
                </Typography>
                <Alert severity="info">
                  Grafana Cloud Free Tier: 10 GB/month • Current usage: ~{((stats.current?.logs_sent_month || 0) * 0.001).toFixed(2)} MB
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Audit Log Tab */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Configuration Change History</Typography>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Changed By</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.changed_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          color={log.action === 'enabled' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{log.changed_by}</TableCell>
                      <TableCell>
                        <Tooltip title={JSON.stringify(log.new_config, null, 2)}>
                          <IconButton size="small">
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No configuration changes recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Add Filter Dialog */}
      <Dialog open={filterDialog} onClose={() => setFilterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Log Filter</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Filter Type</InputLabel>
                <Select
                  value={newFilter.filter_type}
                  onChange={(e) => setNewFilter({ ...newFilter, filter_type: e.target.value })}
                  label="Filter Type"
                >
                  <MenuItem value="include">Include (only log if matches)</MenuItem>
                  <MenuItem value="exclude">Exclude (don't log if matches)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Field Name"
                value={newFilter.field_name}
                onChange={(e) => setNewFilter({ ...newFilter, field_name: e.target.value })}
                placeholder="e.g., severity, event_type, user_role"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Operator</InputLabel>
                <Select
                  value={newFilter.operator}
                  onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value })}
                  label="Operator"
                >
                  <MenuItem value="equals">Equals</MenuItem>
                  <MenuItem value="contains">Contains</MenuItem>
                  <MenuItem value="regex">Regex</MenuItem>
                  <MenuItem value="greater_than">Greater Than</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Value"
                value={newFilter.value}
                onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                placeholder="e.g., high, security_event, admin"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newFilter.enabled}
                    onChange={(e) => setNewFilter({ ...newFilter, enabled: e.target.checked })}
                  />
                }
                label="Enable this filter"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddFilter} 
            variant="contained"
            disabled={!newFilter.field_name || !newFilter.value}
          >
            Add Filter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExternalLoggingSettings;