import React, { useState } from 'react';
import {
  Image,
  Play,
  FileText,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

/**
 * Media Attachments Component
 * Displays media files associated with training content
 */
const MediaAttachments = ({ mediaFiles = [], title = 'Resources' }) => {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!mediaFiles || mediaFiles.length === 0) {
    return null;
  }

  // Get file icon based on type
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'video':
        return <Play className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle media preview
  const handlePreview = (media, index) => {
    setSelectedMedia(media);
    setCurrentIndex(index);
  };

  // Navigate through media in preview
  const navigateMedia = (direction) => {
    const newIndex = direction === 'next'
      ? (currentIndex + 1) % mediaFiles.length
      : (currentIndex - 1 + mediaFiles.length) % mediaFiles.length;

    setCurrentIndex(newIndex);
    setSelectedMedia(mediaFiles[newIndex]);
  };

  // Close preview
  const closePreview = () => {
    setSelectedMedia(null);
    setCurrentIndex(0);
  };

  return (
    <>
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          {title}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mediaFiles.map((media, index) => (
            <div
              key={media.id || index}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              {/* Media Preview */}
              <div className="relative">
                {media.file_type === 'image' ? (
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    <img
                      src={media.file_path}
                      alt={media.alt_text || media.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                      <button
                        onClick={() => handlePreview(media, index)}
                        className="opacity-0 hover:opacity-100 bg-white bg-opacity-90 p-2 rounded-full transition-opacity duration-200"
                      >
                        <Eye className="h-5 w-5 text-gray-700" />
                      </button>
                    </div>
                  </div>
                ) : media.file_type === 'video' ? (
                  <div className="aspect-video bg-gray-900 relative flex items-center justify-center">
                    <Play className="h-12 w-12 text-white opacity-80" />
                    <button
                      onClick={() => handlePreview(media, index)}
                      className="absolute inset-0 flex items-center justify-center hover:bg-black hover:bg-opacity-20 transition-all duration-200"
                    >
                      <div className="bg-white bg-opacity-90 p-2 rounded-full">
                        <Eye className="h-5 w-5 text-gray-700" />
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-50 flex items-center justify-center">
                    {getFileIcon(media.file_type)}
                  </div>
                )}
              </div>

              {/* Media Info */}
              <div className="p-4">
                <h4 className="font-medium text-gray-900 text-sm mb-1 truncate" title={media.file_name}>
                  {media.file_name}
                </h4>

                {media.description && (
                  <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                    {media.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 capitalize">
                    {media.file_type}
                    {media.file_size && ` • ${formatFileSize(media.file_size)}`}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePreview(media, index)}
                      className="text-blue-600 hover:text-blue-700 p-1"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <a
                      href={media.file_path}
                      download={media.file_name}
                      className="text-gray-600 hover:text-gray-700 p-1"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Media Preview Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full w-full">
            {/* Close Button */}
            <button
              onClick={closePreview}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation Buttons */}
            {mediaFiles.length > 1 && (
              <>
                <button
                  onClick={() => navigateMedia('prev')}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  onClick={() => navigateMedia('next')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Media Content */}
            <div className="bg-white rounded-lg overflow-hidden">
              {selectedMedia.file_type === 'image' ? (
                <img
                  src={selectedMedia.file_path}
                  alt={selectedMedia.alt_text || selectedMedia.file_name}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              ) : selectedMedia.file_type === 'video' ? (
                <video
                  src={selectedMedia.file_path}
                  controls
                  className="w-full h-auto max-h-[70vh]"
                  autoPlay
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="p-8 text-center">
                  <div className="mb-4">
                    {getFileIcon(selectedMedia.file_type)}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedMedia.file_name}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Preview not available for this file type
                  </p>
                  <a
                    href={selectedMedia.file_path}
                    download={selectedMedia.file_name}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </a>
                </div>
              )}

              {/* Media Info */}
              <div className="p-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-1">
                  {selectedMedia.file_name}
                </h3>

                {selectedMedia.description && (
                  <p className="text-gray-600 text-sm mb-2">
                    {selectedMedia.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="capitalize">
                    {selectedMedia.file_type}
                    {selectedMedia.file_size && ` • ${formatFileSize(selectedMedia.file_size)}`}
                  </span>

                  {mediaFiles.length > 1 && (
                    <span>
                      {currentIndex + 1} of {mediaFiles.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MediaAttachments;
