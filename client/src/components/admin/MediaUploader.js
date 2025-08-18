import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  Description as DocumentIcon,
  AudioFile as AudioIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

/**
 * Media Uploader Component
 * Handles file uploads for training content including images, videos, and documents
 */
const MediaUploader = ({
  phaseId,
  mediaFiles = [],
  onUpload,
  onDelete,
  onUpdate,
  readOnly = false,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    'video/*': ['.mp4', '.webm', '.ogg'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  }
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [editDialog, setEditDialog] = useState({ open: false, file: null });
  const [previewDialog, setPreviewDialog] = useState({ open: false, file: null });
  const [error, setError] = useState(null);

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles) => {
    if (readOnly || acceptedFiles.length === 0) return;

    // Check file count limit
    if (mediaFiles.length + acceptedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed. Currently have ${mediaFiles.length} files.`);
      return;
    }

    setUploading(true);

    for (const file of acceptedFiles) {
      try {
        // Validate file size
        if (file.size > maxFileSize) {
          alert(`File ${file.name} is too large. Maximum size is ${maxFileSize / 1024 / 1024}MB`);
          continue;
        }

        // Determine file type
        const fileType = getFileType(file.type);

        // Create file metadata
        const fileMetadata = {
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
          alt_text: '',
          description: '',
          sort_order: mediaFiles.length
        };

        // Update progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Upload file (this would integrate with your file upload service)
        const uploadedFile = await uploadFile(file, fileMetadata, (progress) => {
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        });

        // Call onUpload callback
        if (onUpload) {
          await onUpload(uploadedFile);
        }

        // Clear progress
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });

      } catch (error) {
        // console.error('Upload failed:', error);
        alert(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    setUploading(false);
  }, [mediaFiles.length, maxFiles, maxFileSize, readOnly, onUpload]);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    disabled: readOnly || uploading,
    multiple: true
  });

  // Get file type from MIME type
  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  // Get file icon
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image': return <ImageIcon />;
      case 'video': return <VideoIcon />;
      case 'audio': return <AudioIcon />;
      default: return <DocumentIcon />;
    }
  };

  // Mock upload function (replace with actual implementation)
  const uploadFile = async (file, metadata, onProgress) => {
    try {
      // Determine if it's an image or video
      const isVideo = file.type.startsWith('video/');
      const fieldName = isVideo ? 'video' : 'image';
      const endpoint = isVideo ? '/api/upload/content-video' : '/api/upload/content-image';

      // Create FormData for upload
      const formData = new FormData();
      formData.append(fieldName, file);
      formData.append('type', 'content');
      formData.append('phaseId', phaseId || '');

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

        // Handle successful upload
        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({
                id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...metadata,
                file_path: response.url || response.publicUrl,
                public_url: response.publicUrl || response.url,
                created_at: new Date().toISOString()
              });
            } catch (parseError) {
              reject(new Error('Failed to parse upload response'));
            }
          } else {
            let errorMessage = `Upload failed with status ${xhr.status}`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.error || errorMessage;
            } catch (e) {
              // Use default error message
            }
            reject(new Error(errorMessage));
          }
        });

        // Handle upload error
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        // Get auth token
        const token = localStorage.getItem('authToken');

        // Open request and set headers
        xhr.open('POST', endpoint);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        // Send the request
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // Handle file deletion
  const handleDelete = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        if (onDelete) {
          await onDelete(fileId);
        }
      } catch (error) {
        // console.error('Delete failed:', error);
        alert('Failed to delete file');
      }
    }
  };

  // Handle file edit
  const handleEdit = (file) => {
    setEditDialog({ open: true, file: { ...file } });
  };

  // Save file edits
  const handleSaveEdit = async () => {
    try {
      if (onUpdate) {
        await onUpdate(editDialog.file);
      }
      setEditDialog({ open: false, file: null });
    } catch (error) {
      // console.error('Update failed:', error);
      alert('Failed to update file');
    }
  };

  // Handle preview
  const handlePreview = (file) => {
    setPreviewDialog({ open: true, file });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Upload Area */}
      {!readOnly && (
        <Paper
          {...getRootProps()}
          elevation={1}
          sx={{
            p: 3,
            mb: 3,
            border: 2,
            borderStyle: 'dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            bgcolor: isDragActive ? 'primary.50' : 'background.paper',
            cursor: uploading ? 'not-allowed' : 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <input {...getInputProps()} />
          <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            or click to select files
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Supported: Images, Videos, PDFs, Documents (max {formatFileSize(maxFileSize)})
          </Typography>

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>Uploading...</Typography>
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <Box key={fileName} sx={{ mb: 1 }}>
                  <Typography variant="caption">{fileName}</Typography>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* Media Files Grid */}
      {mediaFiles.length > 0 ? (
        <Grid container spacing={2}>
          {mediaFiles.map((file) => (
            <Grid item xs={12} sm={6} md={4} key={file.id}>
              <Card elevation={2}>
                {/* Media Preview */}
                {file.file_type === 'image' ? (
                  <CardMedia
                    component="img"
                    height="140"
                    image={file.public_url || file.file_path}
                    alt={file.alt_text || file.file_name}
                    sx={{ objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 140,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.100'
                    }}
                  >
                    {getFileIcon(file.file_type)}
                  </Box>
                )}

                <CardContent sx={{ pb: 1 }}>
                  <Typography variant="subtitle2" noWrap title={file.file_name}>
                    {file.file_name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={file.file_type}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={formatFileSize(file.file_size)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  {file.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {file.description}
                    </Typography>
                  )}
                </CardContent>

                <CardActions sx={{ pt: 0 }}>
                  <IconButton size="small" onClick={() => handlePreview(file)}>
                    <PreviewIcon />
                  </IconButton>
                  {!readOnly && (
                    <>
                      <IconButton size="small" onClick={() => handleEdit(file)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(file.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info">
          No media files uploaded yet. {!readOnly && 'Use the upload area above to add files.'}
        </Alert>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, file: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit File Details</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Alt Text"
                value={editDialog.file?.alt_text || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  file: { ...prev.file, alt_text: e.target.value }
                }))}
                helperText="Alternative text for accessibility"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={editDialog.file?.description || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  file: { ...prev.file, description: e.target.value }
                }))}
                helperText="Brief description of the file content"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sort Order"
                type="number"
                value={editDialog.file?.sort_order || 0}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  file: { ...prev.file, sort_order: parseInt(e.target.value) || 0 }
                }))}
                helperText="Order in which this file appears"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, file: null })}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onClose={() => setPreviewDialog({ open: false, file: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{previewDialog.file?.file_name}</DialogTitle>
        <DialogContent>
          {previewDialog.file?.file_type === 'image' ? (
            <img
              src={previewDialog.file.public_url || previewDialog.file.file_path}
              alt={previewDialog.file.alt_text || previewDialog.file.file_name}
              style={{ width: '100%', height: 'auto' }}
            />
          ) : previewDialog.file?.file_type === 'video' ? (
            <video
              src={previewDialog.file.public_url || previewDialog.file.file_path}
              controls
              style={{ width: '100%', height: 'auto' }}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              {getFileIcon(previewDialog.file?.file_type)}
              <Typography variant="h6" sx={{ mt: 2 }}>
                {previewDialog.file?.file_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Preview not available for this file type
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog({ open: false, file: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MediaUploader;
