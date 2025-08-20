import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import {
  validateFile,
  createPreviewUrl,
  revokePreviewUrl,
  formatFileSize,
  fileToBase64
} from '../../../utils/quiz/fileHandling';

/**
 * FileUploadQuestion Component
 * Handles file upload questions with preview and validation
 */
const FileUploadQuestion = ({
  question,
  answer,
  onAnswerChange,
  uploadedFile,
  onFileUpload,
  isOffline
}) => {
  const [preview, setPreview] = useState(uploadedFile ? createPreviewUrl(uploadedFile) : null);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error);
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const previewUrl = createPreviewUrl(file);
      setPreview(previewUrl);

      // Convert to base64 for storage
      const base64 = await fileToBase64(file);

      // Update parent state
      onFileUpload(question.id, file);
      onAnswerChange(question.id, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        base64: isOffline ? base64 : undefined // Only store base64 in offline mode
      });

      // Clean up old preview URL
      if (preview && preview !== previewUrl) {
        revokePreviewUrl(preview);
      }
    } catch (error) {
      // console.error('File upload error:', error);
      setUploadError('Failed to process file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    if (preview) {
      revokePreviewUrl(preview);
    }
    setPreview(null);
    setUploadError('');
    onFileUpload(question.id, null);
    onAnswerChange(question.id, null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasUpload = !!(uploadedFile || answer);

  // Cleanup preview URLs on component unmount and before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (preview && preview.startsWith('blob:')) {
        revokePreviewUrl(preview);
      }
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function for component unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (preview && preview.startsWith('blob:')) {
        revokePreviewUrl(preview);
      }
    };
  }, [preview]);

  return (
    <div className="space-y-6">
      {/* Question Text */}
      <h2 className="text-xl font-semibold text-gray-900">
        {question.question}
      </h2>

      {/* Upload Instructions */}
      {question.instructions && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-800">{question.instructions}</p>
        </div>
      )}

      {/* File Upload Area */}
      <div className="space-y-4">
        {!hasUpload ? (
          <label className="relative block">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="sr-only"
              disabled={isUploading}
              aria-label="Upload file"
            />
            <div className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-all hover:border-blue-400 hover:bg-blue-50
              ${uploadError ? 'border-red-300 bg-red-50' : 'border-gray-300'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}>
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-base font-medium text-gray-700 mb-2">
                Click to upload a photo
              </p>
              <p className="text-sm text-gray-500">
                Accepted formats: JPEG, PNG, WebP (Max 5MB)
              </p>
            </div>
          </label>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            {preview && (
              <div className="relative rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={preview}
                  alt="Uploaded preview"
                  className="w-full h-auto max-h-96 object-contain"
                  onError={() => setPreview(null)}
                />
                <button
                  onClick={handleRemoveFile}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  aria-label="Remove uploaded file"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* File Info */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <p className="font-medium text-green-800">File uploaded successfully</p>
                  {answer && (
                    <div className="mt-2 text-sm text-green-700">
                      <p>Name: {answer.fileName}</p>
                      <p>Size: {formatFileSize(answer.fileSize)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Replace Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <ImageIcon className="h-5 w-5 mr-2" />
              Replace Photo
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="flex items-start p-4 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
          <p className="text-sm text-red-800">{uploadError}</p>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mr-3"></div>
          <span className="text-gray-600">Processing image...</span>
        </div>
      )}

      {/* Offline Indicator */}
      {isOffline && hasUpload && (
        <div className="text-center text-sm text-gray-600 flex items-center justify-center">
          <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
          Photo saved locally - will sync when online
        </div>
      )}

    </div>
  );
};

export default FileUploadQuestion;
