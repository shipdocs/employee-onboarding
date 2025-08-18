import React, { useState, useRef } from 'react';
import {
  Save,
  Eye,
  X,
  ZoomIn,
  ZoomOut,
  Grid,
  Magnet,
  Undo,
  Redo,
  Download,
  Settings,
  FileImage,
  FileText
} from 'lucide-react';
import { useTemplate } from './TemplateContext';
import EditableTemplateName from './EditableTemplateName';
import * as pdfjs from 'pdfjs-dist';
import './TemplateHeader.css';

// Configure PDF.js worker - use local worker file with CDN fallback
if (typeof window !== 'undefined') {
  // Use absolute URL to ensure proper loading
  const workerUrl = `${window.location.origin}/pdf.worker.min.js`;
  const cdnWorkerUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  // console.log('PDF.js worker configured:', {
//     version: pdfjs.version,
//     workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
//     fallback: cdnWorkerUrl,
//     origin: window.location.origin
//   });

  // Test worker accessibility with same URL PDF.js will use
  fetch(workerUrl)
    .then(response => {
      if (response.ok) {
        // console.log('PDF worker file is accessible at:', workerUrl);
        return response.text();
      } else {
        // console.error('PDF worker file not accessible:', response.status);
        throw new Error(`Worker not accessible: ${response.status}`);
      }
    })
    .then(content => {
      // Check if we're getting JavaScript or HTML
      if (content.includes('<!DOCTYPE') || content.includes('<html')) {
        // console.error('Worker URL returns HTML instead of JavaScript!');
        // console.error('First 200 chars:', content.substring(0, 200));
        // console.log('Falling back to CDN worker...');
        pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
      } else {
        // console.log('Worker file contains JavaScript (first 100 chars):', content.substring(0, 100));
      }
    })
    .catch(error => {
      // console.error('Error checking PDF worker file:', error);
      // console.log('Falling back to CDN worker...');
      pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
    });
}

const TemplateHeader = ({
  zoom,
  onZoomChange,
  showGrid,
  onToggleGrid,
  snapToGrid,
  onToggleSnap,
  onSave,
  onPreview,
  onClose,
  isSaving = false,
  isPreviewing = false
}) => {
  const { template, isDirty, canUndo, canRedo, undo, redo, setBackgroundImage, importTemplate, saveTemplate } = useTemplate();
  const [showSettings, setShowSettings] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleZoomIn = () => {
    onZoomChange(Math.min(zoom + 0.1, 2));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoom - 0.1, 0.5));
  };

  const handleZoomReset = () => {
    onZoomChange(1);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);

    try {
      if (file.type === 'application/pdf') {
        await handlePDFImport(file);
      } else if (file.type.startsWith('image/')) {
        await handleImageImport(file);
      } else {
        alert('Please select a PDF or image file');
      }
    } catch (error) {
      // console.error('File import error:', error);
      alert('Failed to import file. Please try again.');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePDFImport = async (file) => {
    // console.log('Starting PDF import for file:', file.name, 'Size:', file.size);

    const fileReader = new FileReader();

    return new Promise((resolve, reject) => {
      fileReader.onload = async (e) => {
        try {
          // console.log('File read successfully, processing PDF...');

          const typedArray = new Uint8Array(e.target.result);
          // console.log('Loading PDF document...');

          // Check worker configuration
          // console.log('Worker config:', {
//   workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
//   version: pdfjs.version
//   });

          // Test worker accessibility
          try {
            const workerResponse = await fetch(pdfjs.GlobalWorkerOptions.workerSrc);
            // console.log('Worker accessible:', workerResponse.ok, workerResponse.status);
          } catch (workerError) {
            // console.error('Worker test failed:', workerError);
          }

          // Try different PDF loading configurations
          let loadingTask;

          try {
            // First try with worker
            loadingTask = pdfjs.getDocument({
              data: typedArray,
              verbosity: 1,
              disableAutoFetch: true,
              disableStream: true
            });
          } catch (workerError) {
            // console.warn('Worker failed, trying without worker:', workerError);

            // Fallback: try without worker (for smaller files)
            const originalWorkerSrc = pdfjs.GlobalWorkerOptions.workerSrc;
            pdfjs.GlobalWorkerOptions.workerSrc = null;

            loadingTask = pdfjs.getDocument({
              data: typedArray,
              verbosity: 1,
              disableAutoFetch: true,
              disableStream: true,
              disableWorker: true
            });

            // Restore worker config for future use
            pdfjs.GlobalWorkerOptions.workerSrc = originalWorkerSrc;
          }

          // console.log('Loading task created, awaiting PDF...');
          const pdf = await loadingTask.promise;
          // console.log('PDF loaded successfully, pages:', pdf.numPages);

          // Get first page
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2 });
          // console.log('Page viewport:', viewport.width, 'x', viewport.height);

          // Create canvas to render PDF page
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // console.log('Rendering PDF page to canvas...');
          // Render PDF page to canvas
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          // Convert canvas to data URL
          const imageDataUrl = canvas.toDataURL('image/png', 0.9);
          // console.log('PDF converted to image successfully');
          setBackgroundImage(imageDataUrl);

          resolve();
        } catch (error) {
          // console.error('PDF import error:', error);
          // console.error('Error details:', {
          //   name: error.name,
          //   message: error.message,
          //   stack: error.stack,
          //   toString: error.toString()
          // });
          reject(error);
        }
      };

      fileReader.onerror = (error) => {
        // console.error('File reader error:', error);
        reject(error);
      };

      fileReader.readAsArrayBuffer(file);
    }).catch(error => {
      // console.error('File import error caught:', error);
      // console.error('Caught error details:', {
      //   name: error?.name,
      //   message: error?.message,
      //   stack: error?.stack,
      //   toString: error?.toString()
      // });
      throw error;
    });
  };

  const handleImageImport = async (file) => {
    const fileReader = new FileReader();

    return new Promise((resolve, reject) => {
      fileReader.onload = (e) => {
        setBackgroundImage(e.target.result);
        resolve();
      };

      fileReader.onerror = reject;
      fileReader.readAsDataURL(file);
    });
  };

  const handleSave = () => {
    // console.log('Saving template with background image:', !!template.backgroundImage);
    // console.log('Saving template with fields count:', template.fields?.length || 0);
    saveTemplate(onSave);
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(template);
    }
  };

  const handleExportTemplate = () => {
    try {
      // Create a clean template object for export
      const exportTemplate = {
        name: template.name,
        description: template.description,
        pageSize: template.pageSize,
        orientation: template.orientation,
        fields: template.fields,
        metadata: {
          ...template.metadata,
          exportedAt: new Date().toISOString(),
          version: template.metadata?.version || 1
        }
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(exportTemplate, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_template.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      // console.error('Export error:', error);
      alert('Failed to export template');
    }
  };

  const handleImportTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedTemplate = JSON.parse(event.target.result);

          // Validate template structure
          if (!importedTemplate.name || !Array.isArray(importedTemplate.fields)) {
            throw new Error('Invalid template format');
          }

          // Load the template
          if (window.confirm(`Import template "${importedTemplate.name}"? This will replace the current template.`)) {
            importTemplate(importedTemplate);
            alert(`Template "${importedTemplate.name}" imported successfully!`);
          }
        } catch (error) {
          // console.error('Import error:', error);
          alert('Failed to import template. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="template-header">
      <div className="header-left">
        <div className="template-info">
          <EditableTemplateName onSave={onSave} autoSave={true} />
          <span className="template-meta">
            {template.fields.length} fields • Last saved: {new Date(template.metadata.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="header-center">
        {/* Zoom controls */}
        <div className="control-group">
          <button
            className="header-btn"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>

          <button
            className="zoom-display"
            onClick={handleZoomReset}
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            className="header-btn"
            onClick={handleZoomIn}
            disabled={zoom >= 2}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* View controls */}
        <div className="control-group">
          <button
            className={`header-btn ${showGrid ? 'active' : ''}`}
            onClick={onToggleGrid}
            title="Toggle Grid"
          >
            <Grid size={16} />
          </button>

          <button
            className={`header-btn ${snapToGrid ? 'active' : ''}`}
            onClick={onToggleSnap}
            title="Snap to Grid"
          >
            <Magnet size={16} />
          </button>
        </div>

        {/* History controls */}
        <div className="control-group">
          <button
            className="header-btn"
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
          >
            <Undo size={16} />
          </button>

          <button
            className="header-btn"
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
          >
            <Redo size={16} />
          </button>
        </div>

        {/* File operations */}
        <div className="control-group">
          <label className={`header-btn file-upload ${isImporting ? 'loading' : ''}`} title="Import PDF/Image as Background">
            {isImporting ? <div className="spinner" /> : <FileImage size={16} />}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={isImporting}
            />
          </label>

          <button
            className="header-btn"
            onClick={handleImportTemplate}
            title="Import Template JSON"
          >
            <FileText size={16} />
          </button>

          <button
            className="header-btn"
            onClick={handleExportTemplate}
            title="Export Template as JSON"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="header-right">
        <div className="control-group">
          <button
            className="header-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <Settings size={16} />
          </button>

          <button
            className="header-btn preview-btn"
            onClick={handlePreview}
            title="Preview PDF"
          >
            <Eye size={16} />
            Preview
          </button>

          <button
            className={`header-btn save-btn ${isSaving ? 'loading' : ''}`}
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            title="Save Template"
          >
            {isSaving ? <div className="spinner" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          <button
            className="header-btn close-btn"
            onClick={onClose}
            title="Close Editor"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Settings dropdown */}
      {showSettings && (
        <div className="settings-dropdown">
          <div className="settings-section">
            <h4>Page Settings</h4>
            <div className="setting-item">
              <label>Page Size:</label>
              <select defaultValue="A4">
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="Letter">Letter (8.5 × 11 in)</option>
                <option value="Legal">Legal (8.5 × 14 in)</option>
                <option value="A3">A3 (297 × 420 mm)</option>
              </select>
            </div>
            <div className="setting-item">
              <label>Orientation:</label>
              <select defaultValue="portrait">
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h4>Grid Settings</h4>
            <div className="setting-item">
              <label>Grid Size:</label>
              <input type="number" defaultValue="10" min="5" max="50" />
              <span>px</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateHeader;
