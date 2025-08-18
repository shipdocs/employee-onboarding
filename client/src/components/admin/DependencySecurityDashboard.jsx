/**
 * Dependency Security Dashboard
 * 
 * Web interface for managing dependency vulnerabilities, running scans,
 * and executing remediation actions.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Security,
  Warning,
  CheckCircle,
  Error,
  Refresh,
  Build,
  History,
  Assessment,
  Schedule,
  PlayArrow,
  Stop
} from '@mui/icons-material';

const DependencySecurityDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanDialog, setScanDialog] = useState(false);
  const [remediationDialog, setRemediationDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadScanHistory();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/security/dependency-management?action=dashboard');
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScanHistory = async () => {
    try {
      const response = await fetch('/api/security/dependency-management?action=scan-history&limit=10');
      const data = await response.json();
      
      if (data.success) {
        setScanHistory(data.data.scans);
      }
    } catch (error) {
      console.error('Failed to load scan history:', error);
    }
  };

  const runScan = async (options = {}) => {
    setIsScanning(true);
    setScanDialog(false);
    
    try {
      const response = await fetch('/api/security/dependency-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run-scan',
          ...options
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Poll for scan completion
        setTimeout(() => {
          loadDashboardData();
          loadScanHistory();
          setIsScanning(false);
        }, 30000); // Check after 30 seconds
      }
    } catch (error) {
      console.error('Failed to start scan:', error);
      setIsScanning(false);
    }
  };

  const executeRemediation = async (scanId, actionIds = []) => {
    try {
      const response = await fetch('/api/security/dependency-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute-remediation',
          scanId,
          actionIds
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRemediationDialog(false);
        // Refresh data after remediation
        setTimeout(() => {
          loadDashboardData();
          loadScanHistory();
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to execute remediation:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return <Error color="error" />;
      case 'high': return <Warning color="warning" />;
      case 'medium': return <Warning color="info" />;
      case 'low': return <CheckCircle color="success" />;
      default: return <Security />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const stats = dashboardData?.vulnerabilityStats || {};
  const quickActions = dashboardData?.quickActions || [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dependency Security Dashboard
      </Typography>

      {/* Security Status Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Vulnerabilities
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalVulnerabilities || 0}
                  </Typography>
                </Box>
                <Security fontSize="large" color={stats.totalVulnerabilities > 0 ? 'error' : 'success'} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Critical</Typography>
              <Typography variant="h5" color="error">
                {stats.criticalCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>High</Typography>
              <Typography variant="h5" color="warning.main">
                {stats.highCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Medium</Typography>
              <Typography variant="h5" color="info.main">
                {stats.mediumCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Last Scan
              </Typography>
              <Typography variant="body1">
                {stats.lastScanDate 
                  ? new Date(stats.lastScanDate).toLocaleString()
                  : 'Never'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Security Status Alert */}
      {stats.criticalCount > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Critical vulnerabilities detected!</strong> Immediate action required.
          <Button 
            color="inherit" 
            size="small" 
            onClick={() => runScan({ autoRemediate: true })}
            sx={{ ml: 2 }}
          >
            Auto Fix Now
          </Button>
        </Alert>
      )}

      {stats.highCount > 0 && stats.criticalCount === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>High severity vulnerabilities found.</strong> Address within 24 hours.
        </Alert>
      )}

      {stats.totalVulnerabilities === 0 && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <strong>All dependencies are secure!</strong> No vulnerabilities detected.
        </Alert>
      )}

      {/* Quick Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item>
              <Button
                variant="contained"
                startIcon={isScanning ? <CircularProgress size={20} /> : <Refresh />}
                onClick={() => setScanDialog(true)}
                disabled={isScanning}
              >
                {isScanning ? 'Scanning...' : 'Run Security Scan'}
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<Build />}
                onClick={() => setRemediationDialog(true)}
                disabled={stats.totalVulnerabilities === 0}
              >
                Auto Fix Issues
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<Assessment />}
                onClick={() => window.open('/api/security/dependency-management?action=report', '_blank')}
              >
                Generate Report
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<History />}
                onClick={() => loadScanHistory()}
              >
                Refresh History
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Scan History */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Scans
          </Typography>
          {scanHistory.length === 0 ? (
            <Typography color="textSecondary">
              No scan history available. Run your first scan to get started.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Scan ID</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Critical</TableCell>
                    <TableCell>High</TableCell>
                    <TableCell>Medium</TableCell>
                    <TableCell>Low</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scanHistory.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell>
                        {new Date(scan.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {scan.id.substring(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={scan.summary.totalVulnerabilities}
                          color={scan.summary.totalVulnerabilities > 0 ? 'error' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{scan.summary.criticalCount}</TableCell>
                      <TableCell>{scan.summary.highCount}</TableCell>
                      <TableCell>{scan.summary.mediumCount}</TableCell>
                      <TableCell>{scan.summary.lowCount}</TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => setSelectedScan(scan)}
                          >
                            <Assessment />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Scan Configuration Dialog */}
      <Dialog open={scanDialog} onClose={() => setScanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Run Security Scan</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Choose scan options:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><Security /></ListItemIcon>
              <ListItemText 
                primary="Full Scan" 
                secondary="Scan both server and client dependencies"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Build /></ListItemIcon>
              <ListItemText 
                primary="Auto-Remediation" 
                secondary="Automatically fix vulnerabilities where possible"
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialog(false)}>Cancel</Button>
          <Button onClick={() => runScan({ includeClient: true, autoRemediate: false })}>
            Scan Only
          </Button>
          <Button 
            onClick={() => runScan({ includeClient: true, autoRemediate: true })}
            variant="contained"
          >
            Scan & Auto Fix
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remediation Dialog */}
      <Dialog open={remediationDialog} onClose={() => setRemediationDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Execute Remediation</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            This will automatically fix vulnerabilities where patches are available.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Warning:</strong> This action will update your dependencies. 
            Make sure you have a backup and test thoroughly after remediation.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemediationDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => executeRemediation(scanHistory[0]?.id)}
            variant="contained"
            color="warning"
          >
            Execute Auto Fix
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scan Details Dialog */}
      {selectedScan && (
        <Dialog 
          open={!!selectedScan} 
          onClose={() => setSelectedScan(null)} 
          maxWidth="lg" 
          fullWidth
        >
          <DialogTitle>
            Scan Details - {new Date(selectedScan.timestamp).toLocaleString()}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Summary</Typography>
                <Box display="flex" gap={2}>
                  <Chip label={`Total: ${selectedScan.summary.totalVulnerabilities}`} />
                  <Chip label={`Critical: ${selectedScan.summary.criticalCount}`} color="error" />
                  <Chip label={`High: ${selectedScan.summary.highCount}`} color="warning" />
                  <Chip label={`Medium: ${selectedScan.summary.mediumCount}`} color="info" />
                  <Chip label={`Low: ${selectedScan.summary.lowCount}`} color="success" />
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedScan(null)}>Close</Button>
            <Button 
              variant="contained"
              onClick={() => {
                setSelectedScan(null);
                setRemediationDialog(true);
              }}
              disabled={selectedScan.summary.totalVulnerabilities === 0}
            >
              Fix Vulnerabilities
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Scanning Progress */}
      {isScanning && (
        <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
          <Card sx={{ p: 2, minWidth: 300 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={24} />
              <Box>
                <Typography variant="body2">Security scan in progress...</Typography>
                <Typography variant="caption" color="textSecondary">
                  This may take 2-5 minutes
                </Typography>
              </Box>
            </Box>
            <LinearProgress sx={{ mt: 1 }} />
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default DependencySecurityDashboard;