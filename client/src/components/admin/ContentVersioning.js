import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  History as HistoryIcon,
  Publish as PublishIcon,
  Edit as DraftIcon,
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
  Compare as CompareIcon,
  CheckCircle as ApprovedIcon,
  Schedule as PendingIcon,
  Cancel as RejectedIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';

/**
 * Content Versioning Component
 * Manages content versions, approval workflow, and publishing states
 */
const ContentVersioning = ({
  phaseData,
  onStatusChange,
  onVersionRestore,
  onApprovalSubmit,
  readOnly = false,
  currentUser
}) => {
  const [versionHistory, setVersionHistory] = useState([]);
  const [publishDialog, setPublishDialog] = useState({ open: false, action: null });
  const [approvalDialog, setApprovalDialog] = useState({ open: false });
  const [compareDialog, setCompareDialog] = useState({ open: false, versions: [] });
  const [approvalNotes, setApprovalNotes] = useState('');

  // Mock version history (in real app, this would come from API)
  useEffect(() => {
    if (phaseData) {
      const mockHistory = [
        {
          id: 1,
          version: phaseData.version || 1,
          status: phaseData.status || 'draft',
          created_at: new Date().toISOString(),
          created_by: currentUser?.name || 'Current User',
          change_summary: 'Current version',
          change_type: 'update',
          is_current: true
        },
        {
          id: 2,
          version: (phaseData.version || 1) - 1,
          status: 'published',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          created_by: 'Admin User',
          change_summary: 'Updated learning objectives and procedures',
          change_type: 'update',
          is_current: false
        },
        {
          id: 3,
          version: (phaseData.version || 1) - 2,
          status: 'archived',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: 'Content Manager',
          change_summary: 'Initial content creation',
          change_type: 'create',
          is_current: false
        }
      ];
      setVersionHistory(mockHistory);
    }
  }, [phaseData, currentUser]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'default';
      case 'pending_approval': return 'info';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'published': return <PublishIcon />;
      case 'draft': return <DraftIcon />;
      case 'archived': return <ArchiveIcon />;
      case 'pending_approval': return <PendingIcon />;
      case 'rejected': return <RejectedIcon />;
      default: return <DraftIcon />;
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    try {
      if (onStatusChange) {
        await onStatusChange(newStatus, approvalNotes);
      }
      setPublishDialog({ open: false, action: null });
      setApprovalNotes('');
    } catch (error) {
      // console.error('Status change failed:', error);
    }
  };

  // Handle version restore
  const handleVersionRestore = async (version) => {
    if (window.confirm(`Are you sure you want to restore version ${version.version}? This will create a new version with the restored content.`)) {
      try {
        if (onVersionRestore) {
          await onVersionRestore(version);
        }
      } catch (error) {
        // console.error('Version restore failed:', error);
      }
    }
  };

  // Handle approval submission
  const handleApprovalSubmit = async () => {
    try {
      if (onApprovalSubmit) {
        await onApprovalSubmit(approvalNotes);
      }
      setApprovalDialog({ open: false });
      setApprovalNotes('');
    } catch (error) {
      // console.error('Approval submission failed:', error);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get workflow actions based on current status
  const getWorkflowActions = () => {
    const status = phaseData?.status || 'draft';
    const actions = [];

    switch (status) {
      case 'draft':
        actions.push(
          { label: 'Submit for Approval', action: 'pending_approval', color: 'info', icon: <PendingIcon /> },
          { label: 'Publish Directly', action: 'published', color: 'success', icon: <PublishIcon /> }
        );
        break;
      case 'pending_approval':
        if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
          actions.push(
            { label: 'Approve & Publish', action: 'published', color: 'success', icon: <ApprovedIcon /> },
            { label: 'Reject', action: 'rejected', color: 'error', icon: <RejectedIcon /> }
          );
        }
        break;
      case 'published':
        actions.push(
          { label: 'Create Draft', action: 'draft', color: 'warning', icon: <DraftIcon /> },
          { label: 'Archive', action: 'archived', color: 'default', icon: <ArchiveIcon /> }
        );
        break;
      case 'rejected':
        actions.push(
          { label: 'Revise & Resubmit', action: 'pending_approval', color: 'info', icon: <PendingIcon /> },
          { label: 'Save as Draft', action: 'draft', color: 'warning', icon: <DraftIcon /> }
        );
        break;
      case 'archived':
        actions.push(
          { label: 'Restore', action: 'draft', color: 'primary', icon: <RestoreIcon /> }
        );
        break;
    }

    return actions;
  };

  return (
    <Box>
      {/* Current Status */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                icon={getStatusIcon(phaseData?.status)}
                label={phaseData?.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                color={getStatusColor(phaseData?.status)}
                size="large"
              />
              <Box>
                <Typography variant="h6">
                  Version {phaseData?.version || 1}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last updated: {formatDate(phaseData?.updated_at || new Date().toISOString())}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {!readOnly && getWorkflowActions().map((action, index) => (
                <Button
                  key={index}
                  variant={action.color === 'success' ? 'contained' : 'outlined'}
                  color={action.color}
                  startIcon={action.icon}
                  onClick={() => setPublishDialog({ open: true, action: action.action, label: action.label })}
                  size="small"
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </Grid>
        </Grid>

        {/* Approval Information */}
        {phaseData?.approved_by && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Approved by:</strong> {phaseData.approved_by} on {formatDate(phaseData.approved_at)}
            </Typography>
            {phaseData.approval_notes && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Notes:</strong> {phaseData.approval_notes}
              </Typography>
            )}
          </Alert>
        )}
      </Paper>

      {/* Version History */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Version History
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CompareIcon />}
            onClick={() => setCompareDialog({ open: true, versions: versionHistory.slice(0, 2) })}
            disabled={versionHistory.length < 2}
          >
            Compare Versions
          </Button>
        </Box>

        <List>
          {versionHistory.map((version, index) => (
            <React.Fragment key={version.id}>
              <ListItem
                sx={{
                  bgcolor: version.is_current ? 'primary.50' : 'inherit',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemIcon>
                  {getStatusIcon(version.status)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        Version {version.version}
                      </Typography>
                      <Chip
                        label={version.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(version.status)}
                        variant="outlined"
                      />
                      {version.is_current && (
                        <Chip label="Current" size="small" color="primary" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {version.change_summary}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        By {version.created_by} on {formatDate(version.created_at)}
                      </Typography>
                    </Box>
                  }
                />
                {!version.is_current && !readOnly && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Preview this version">
                      <IconButton size="small">
                        <PreviewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Restore this version">
                      <IconButton
                        size="small"
                        onClick={() => handleVersionRestore(version)}
                      >
                        <RestoreIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </ListItem>
              {index < versionHistory.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Publish/Status Change Dialog */}
      <Dialog
        open={publishDialog.open}
        onClose={() => setPublishDialog({ open: false, action: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {publishDialog.label}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to {publishDialog.label?.toLowerCase()}?
          </Typography>

          {(publishDialog.action === 'published' || publishDialog.action === 'rejected') && (
            <TextField
              fullWidth
              label="Notes (optional)"
              multiline
              rows={3}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              sx={{ mt: 2 }}
              placeholder="Add any notes about this action..."
            />
          )}

          {publishDialog.action === 'published' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Publishing will make this content immediately available to all crew members.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialog({ open: false, action: null })}>
            Cancel
          </Button>
          <Button
            onClick={() => handleStatusChange(publishDialog.action)}
            variant="contained"
            color={publishDialog.action === 'published' ? 'success' : 'primary'}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Compare Versions Dialog */}
      <Dialog
        open={compareDialog.open}
        onClose={() => setCompareDialog({ open: false, versions: [] })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Compare Versions</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            Version comparison functionality will show detailed differences between selected versions.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialog({ open: false, versions: [] })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContentVersioning;
