import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Tabs,
  Tab,
  Alert,
  Chip,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import toast from 'react-hot-toast';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Upload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import RichTextEditor from './RichTextEditor';
import MediaUploader from './MediaUploader';
import ContentVersioning from './ContentVersioning';
import { AdminContentRenderer } from '../SafeHTMLRenderer';
import { sanitizeAdminHTML, isHTMLSafe } from '../../utils/htmlSanitizer';
import useAutoSave from '../../hooks/useAutoSave';
import AutoSaveIndicator from '../ContentEditor/AutoSaveIndicator';
import { EnhancedErrorBoundary } from '../common/EnhancedErrorBoundary';

/**
 * Rich Content Editor for Training Phases
 * Comprehensive editor with support for learning objectives, rich text, media uploads, and preview
 */
const RichContentEditor = ({
  phaseData,
  onSave,
  onCancel,
  onPreview,
  onStatusChange,
  onVersionRestore,
  onApprovalSubmit,
  isLoading = false,
  readOnly = false,
  currentUser = null
}) => {
  console.log('RichContentEditor mounted with props:', {
    phaseData,
    isLoading,
    readOnly,
    currentUser
  });
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState(() => {
    const initialState = {
      title: '',
      description: '',
      time_limit: 24,
      passing_score: 80,
      category: 'general',
      content: {
        overview: '',
        objectives: [],
        keyPoints: [],
        procedures: [],
        additionalContent: ''
      },
      media_attachments: [],
      status: 'draft'
    };
    console.log('Initial formData state:', initialState);
    return initialState;
  });
  const [errors, setErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState({
    mainContent: true,
    objectives: true,
    keyPoints: false,
    additional: false
  });

  // Handle accordion panel expansion
  const handlePanelChange = (panel) => (event, isExpanded) => {
    setExpandedPanels(prev => ({
      ...prev,
      [panel]: isExpanded
    }));
  };

  // Auto-save functionality
  const autoSaveFunction = useCallback(async (data) => {
    if (data.title.trim() || data.items.length > 0) {
      return onSave(data, { autoSave: true });
    }
  }, [onSave]);

  const { saveStatus, lastSaved, hasUnsavedChanges: autoSaveUnsavedChanges, forceSave } = useAutoSave(
    formData,
    autoSaveFunction,
    30000, // 30 seconds
    !isLoading && !readOnly
  );

  // Initialize form data when phaseData changes
  useEffect(() => {
    console.log('useEffect triggered with phaseData:', phaseData);
    if (phaseData) {
      // Handle both old format (with items array) and new simplified format
      const firstItem = phaseData.items?.[0] || {};
      const initialFormData = {
        title: phaseData.title || '',
        description: phaseData.description || '',
        time_limit: phaseData.time_limit || 24,
        passing_score: phaseData.passing_score || 80,
        category: phaseData.category || firstItem.category || 'general',
        content: phaseData.content || firstItem.content || {
          overview: '',
          objectives: [],
          keyPoints: [],
          procedures: [],
          additionalContent: ''
        },
        media_attachments: phaseData.media_attachments || [],
        status: phaseData.status || 'draft'
      };
      console.log('Setting initial formData:', initialFormData);
      setFormData(initialFormData);
      setHasUnsavedChanges(false);
    }
  }, [phaseData]);

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Handle content field changes
  const handleContentChange = (contentField, value) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [contentField]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  // Handle array field changes in content
  const handleArrayFieldChange = (field, index, value) => {
    const updatedArray = [...(formData.content[field] || [])];
    updatedArray[index] = value;
    handleContentChange(field, updatedArray);
  };

  // Add array item
  const addArrayItem = (field) => {
    const updatedArray = [...(formData.content[field] || []), ''];
    handleContentChange(field, updatedArray);
  };

  // Remove array item
  const removeArrayItem = (field, index) => {
    const updatedArray = [...(formData.content[field] || [])];
    updatedArray.splice(index, 1);
    handleContentChange(field, updatedArray);
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.time_limit <= 0) {
      newErrors.time_limit = 'Time limit must be greater than 0';
    }

    if (formData.passing_score < 0 || formData.passing_score > 100) {
      newErrors.passing_score = 'Passing score must be between 0 and 100';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.content?.overview?.trim()) {
      newErrors.overview = 'Training overview is required';
    }

    // Validate HTML content safety
    if (formData.content?.overview && !isHTMLSafe(formData.content.overview)) {
      newErrors.content = 'Content contains unsafe HTML';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Sanitize HTML content before saving
      const sanitizedFormData = {
        ...formData,
        content: {
          ...formData.content,
          overview: formData.content.overview ? sanitizeAdminHTML(formData.content.overview) : '',
          additionalContent: formData.content.additionalContent ? sanitizeAdminHTML(formData.content.additionalContent) : '',
          objectives: formData.content.objectives?.map(obj => typeof obj === 'string' ? sanitizeAdminHTML(obj) : obj),
          keyPoints: formData.content.keyPoints?.map(kp => typeof kp === 'string' ? sanitizeAdminHTML(kp) : kp),
          procedures: formData.content.procedures?.map(proc => typeof proc === 'string' ? sanitizeAdminHTML(proc) : proc)
        }
      };

      await onSave(sanitizedFormData);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save changes');
    }
  };

  // Handle preview - Feature temporarily disabled
  const handlePreview = () => {
    toast('Preview functionality has been temporarily disabled during system cleanup. Content can be saved and viewed in the crew interface.', { icon: 'ℹ️' });
    if (onPreview) {
      onPreview(formData);
    }
  };

  // Tab panel component
  const TabPanel = ({ children, value, index, ...other }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`content-tabpanel-${index}`}
      aria-labelledby={`content-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );

  return (
    <Paper elevation={2} sx={{ width: '100%', minHeight: '600px' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5" component="h2">
                Rich Content Editor
              </Typography>
              <AutoSaveIndicator
                saveStatus={saveStatus}
                lastSaved={lastSaved}
                hasUnsavedChanges={hasUnsavedChanges || autoSaveUnsavedChanges}
              />
            </Box>
          </Grid>
          <Grid item>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<CloseIcon />}
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={isLoading}
              >
                Preview
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={isLoading || readOnly}
              >
                Save
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Error Alert */}
      {Object.keys(errors).length > 0 && (
        <Alert severity="error" sx={{ m: 2 }}>
          Please fix the following errors:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          aria-label="content editor tabs"
        >
          <Tab label="Basic Information" />
          <Tab label="Training Content" />
          <Tab label="Media & Resources" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {/* Basic Information Tab */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phase Title"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              disabled={readOnly}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Time Limit (hours)"
              type="number"
              value={formData.time_limit}
              onChange={(e) => handleFieldChange('time_limit', parseInt(e.target.value) || 0)}
              error={!!errors.time_limit}
              helperText={errors.time_limit}
              disabled={readOnly}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
              disabled={readOnly}
              required
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Passing Score (%)"
              type="number"
              value={formData.passing_score}
              onChange={(e) => handleFieldChange('passing_score', parseInt(e.target.value) || 0)}
              error={!!errors.passing_score}
              helperText={errors.passing_score}
              disabled={readOnly}
              inputProps={{ min: 0, max: 100 }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth error={!!errors.category}>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => handleFieldChange('category', e.target.value)}
                disabled={readOnly}
                label="Category"
                required
              >
                <MenuItem value="orientation">Orientation</MenuItem>
                <MenuItem value="safety">Safety</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
                <MenuItem value="policy">Policy</MenuItem>
                <MenuItem value="deck">Deck Operations</MenuItem>
                <MenuItem value="cargo">Cargo</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="navigation">Navigation</MenuItem>
                <MenuItem value="engine">Engine</MenuItem>
                <MenuItem value="management">Management</MenuItem>
                <MenuItem value="security">Security</MenuItem>
                <MenuItem value="documentation">Documentation</MenuItem>
                <MenuItem value="general">General</MenuItem>
              </Select>
              {errors.category && <Typography variant="caption" color="error">{errors.category}</Typography>}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                disabled={readOnly}
                label="Status"
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="published">Published</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* Training Content Tab */}
        <Box>
          {/* Main Training Content Section */}
          <Accordion
            expanded={expandedPanels.mainContent}
            onChange={handlePanelChange('mainContent')}
            elevation={0}
            sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="h6">Main Training Content</Typography>
                {formData.content?.overview && (
                  <Chip label="✓" size="small" color="success" />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="caption" color="text.secondary" paragraph>
                Write the main training content here - this is where you add the actual lessons, instructions, and detailed information that crew members will study
              </Typography>
              <RichTextEditor
                value={formData.content?.overview || ''}
                onChange={(value) => handleContentChange('overview', value)}
                placeholder="Enter the full training content here. Include all lessons, explanations, instructions, and information that crew members need to learn..."
                error={!!errors.overview}
                helperText={errors.overview}
                disabled={readOnly}
              />
            </AccordionDetails>
          </Accordion>

          {/* Learning Objectives */}
          <Accordion
            expanded={expandedPanels.objectives}
            onChange={handlePanelChange('objectives')}
            elevation={0}
            sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="h6">Learning Objectives</Typography>
                {formData.content?.objectives?.length > 0 && (
                  <Chip label={formData.content.objectives.length} size="small" color="primary" />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="caption" color="text.secondary" paragraph>
                Define clear objectives that crew members will achieve
              </Typography>
              <Box>
                {(formData.content?.objectives || []).map((objective, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      fullWidth
                      value={objective}
                      onChange={(e) => handleArrayFieldChange('objectives', idx, e.target.value)}
                      placeholder={`Objective ${idx + 1}`}
                      disabled={readOnly}
                      size="small"
                    />
                    <IconButton
                      onClick={() => removeArrayItem('objectives', idx)}
                      disabled={readOnly}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => addArrayItem('objectives')}
                  disabled={readOnly}
                  variant="outlined"
                  size="small"
                  sx={{ mt: 1 }}
                >
                  Add Objective
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Key Points and Procedures */}
          <Accordion
            expanded={expandedPanels.keyPoints}
            onChange={handlePanelChange('keyPoints')}
            elevation={0}
            sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="h6">Key Points & Procedures</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {formData.content?.keyPoints?.length > 0 && (
                    <Chip label={`${formData.content.keyPoints.length} points`} size="small" color="info" />
                  )}
                  {formData.content?.procedures?.length > 0 && (
                    <Chip label={`${formData.content.procedures.length} steps`} size="small" color="info" />
                  )}
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Key Points */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Key Points
                  </Typography>
                  <Typography variant="caption" color="text.secondary" paragraph>
                    Important points to remember
                  </Typography>
                  <Box>
                    {(formData.content?.keyPoints || []).map((point, idx) => (
                      <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          fullWidth
                          value={point}
                          onChange={(e) => handleArrayFieldChange('keyPoints', idx, e.target.value)}
                          placeholder={`Key point ${idx + 1}`}
                          disabled={readOnly}
                          size="small"
                        />
                        <IconButton
                          onClick={() => removeArrayItem('keyPoints', idx)}
                          disabled={readOnly}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => addArrayItem('keyPoints')}
                      disabled={readOnly}
                      variant="outlined"
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      Add Key Point
                    </Button>
                  </Box>
                </Grid>

                {/* Procedures */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Procedures
                  </Typography>
                  <Typography variant="caption" color="text.secondary" paragraph>
                    Step-by-step procedures to follow
                  </Typography>
                  <Box>
                    {(formData.content?.procedures || []).map((procedure, idx) => (
                      <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          fullWidth
                          value={procedure}
                          onChange={(e) => handleArrayFieldChange('procedures', idx, e.target.value)}
                          placeholder={`Step ${idx + 1}`}
                          disabled={readOnly}
                          size="small"
                        />
                        <IconButton
                          onClick={() => removeArrayItem('procedures', idx)}
                          disabled={readOnly}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => addArrayItem('procedures')}
                      disabled={readOnly}
                      variant="outlined"
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      Add Procedure Step
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Additional Content */}
          <Accordion
            expanded={expandedPanels.additional}
            onChange={handlePanelChange('additional')}
            elevation={0}
            sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="h6">Additional Content</Typography>
                <Chip label="Optional" size="small" color="default" />
                {formData.content?.additionalContent && (
                  <Chip label="✓" size="small" color="success" />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="caption" color="text.secondary" paragraph>
                Add any supplementary materials, detailed explanations, or media content
              </Typography>
              <RichTextEditor
                value={formData.content?.additionalContent || ''}
                onChange={(value) => handleContentChange('additionalContent', value)}
                placeholder="Include any additional resources, examples, case studies, or reference materials..."
                disabled={readOnly}
              />
            </AccordionDetails>
          </Accordion>

          {/* Content Quality Check */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom>
              Content Completeness
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label={`Overview: ${formData.content?.overview ? '✓' : '✗'}`}
                size="small"
                color={formData.content?.overview ? 'success' : 'error'}
              />
              <Chip
                label={`Objectives: ${formData.content?.objectives?.length || 0}`}
                size="small"
                color={formData.content?.objectives?.length > 0 ? 'success' : 'warning'}
              />
              <Chip
                label={`Key Points: ${formData.content?.keyPoints?.length || 0}`}
                size="small"
                color={formData.content?.keyPoints?.length > 0 ? 'success' : 'warning'}
              />
              <Chip
                label={`Procedures: ${formData.content?.procedures?.length || 0}`}
                size="small"
                color={formData.content?.procedures?.length > 0 ? 'success' : 'warning'}
              />
              <Chip
                label={`Additional Content: ${formData.content?.additionalContent ? '✓' : '○'}`}
                size="small"
                color={formData.content?.additionalContent ? 'success' : 'default'}
              />
            </Box>
          </Paper>
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {/* Media & Resources Tab */}
        <Typography variant="h6" gutterBottom>Media & Resources</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Upload and manage media files for this training phase. These files can be referenced in training items and will be available to crew members during training.
        </Typography>

        <MediaUploader
          phaseId={phaseData?.id}
          mediaFiles={formData.media_attachments || []}
          onUpload={async (uploadedFile) => {
            // Add uploaded file to media attachments
            const updatedAttachments = [...(formData.media_attachments || []), uploadedFile];
            handleFieldChange('media_attachments', updatedAttachments);
          }}
          onDelete={async (fileId) => {
            // Remove file from media attachments
            const updatedAttachments = (formData.media_attachments || []).filter(file => file.id !== fileId);
            handleFieldChange('media_attachments', updatedAttachments);
          }}
          onUpdate={async (updatedFile) => {
            // Update file in media attachments
            const updatedAttachments = (formData.media_attachments || []).map(file =>
              file.id === updatedFile.id ? updatedFile : file
            );
            handleFieldChange('media_attachments', updatedAttachments);
          }}
          readOnly={readOnly}
          maxFiles={20}
          maxFileSize={50 * 1024 * 1024} // 50MB
        />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {/* Settings Tab */}
        <Typography variant="h6" gutterBottom>Content Management & Versioning</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage content versions, approval workflow, and publishing status.
        </Typography>

        <ContentVersioning
          phaseData={phaseData}
          onStatusChange={onStatusChange}
          onVersionRestore={onVersionRestore}
          onApprovalSubmit={onApprovalSubmit}
          readOnly={readOnly}
          currentUser={currentUser}
        />
      </TabPanel>

      {/* Content Preview Dialog - Feature removed */}
    </Paper>
  );
};

// Wrap with error boundary for better error handling
const RichContentEditorWithErrorBoundary = (props) => (
  <EnhancedErrorBoundary context="content-editor">
    <RichContentEditor {...props} />
  </EnhancedErrorBoundary>
);

export default RichContentEditorWithErrorBoundary;
