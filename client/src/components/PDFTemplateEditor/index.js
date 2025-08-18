import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TemplateCanvas from './TemplateCanvas';
import FieldToolbox from './FieldToolbox';
import PropertyPanel from './PropertyPanel';
import TemplateHeader from './TemplateHeader';
import { TemplateProvider, useTemplate } from './TemplateContext';
import './PDFTemplateEditor.css';

const PDFTemplateEditor = ({
  templateId = null,
  initialTemplate = null,
  onSave,
  onPreview,
  onClose,
  dataSource = null, // For field suggestions
  isSaving = false,
  isPreviewing = false
}) => {
  const [selectedField, setSelectedField] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 595, height: 842 }); // A4 default
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const canvasRef = useRef(null);

  const handleFieldSelect = useCallback((field) => {
    // console.log('Field selected:', field);
    setSelectedField(field);
  }, []);

  const handleCanvasClick = useCallback((e) => {
    // Deselect field if clicking on empty canvas
    if (e.target === e.currentTarget) {
      // console.log('Canvas clicked - deselecting field');
      setSelectedField(null);
    }
  }, []);

  // Component to initialize the template state with the initialTemplate prop
  const TemplateInitializer = ({ initialTemplate }) => {
    const { loadTemplate, template } = useTemplate();

    useEffect(() => {
      // Only load template if it's different from current template and not already loaded
      if (initialTemplate && (!template.id || template.id !== initialTemplate.id)) {
        // console.log('Initializing template with background image:', !!initialTemplate.backgroundImage);
        // console.log('Initializing template with fields count:', initialTemplate.fields?.length || 0);
        loadTemplate(initialTemplate);
      }
    }, [initialTemplate?.id, loadTemplate]); // Use template ID as dependency to prevent unnecessary reloads

    return null;
  };

  // Component for keyboard shortcuts
  const KeyboardShortcuts = ({ selectedField, onFieldSelect }) => {
    const { deleteField, duplicateField } = useTemplate();

    useEffect(() => {
      const handleKeyDown = (e) => {
        // Delete key to delete selected field
        if (e.key === 'Delete' && selectedField) {
          e.preventDefault();
          if (window.confirm('Delete selected field?')) {
            deleteField(selectedField.id);
            onFieldSelect(null);
          }
        }

        // Ctrl/Cmd + D to duplicate
        if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedField) {
          e.preventDefault();
          duplicateField(selectedField.id);
        }

        // Escape to deselect
        if (e.key === 'Escape') {
          onFieldSelect(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedField, deleteField, duplicateField, onFieldSelect]);

    return null;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <TemplateProvider>
        <TemplateInitializer initialTemplate={initialTemplate} />
        <KeyboardShortcuts selectedField={selectedField} onFieldSelect={setSelectedField} />
        <div className="pdf-template-editor">
          {/* Header with controls */}
          <TemplateHeader
            zoom={zoom}
            onZoomChange={setZoom}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid(!showGrid)}
            snapToGrid={snapToGrid}
            onToggleSnap={() => setSnapToGrid(!snapToGrid)}
            onSave={onSave}
            onPreview={onPreview}
            onClose={onClose}
            isSaving={isSaving}
            isPreviewing={isPreviewing}
          />

          <div className="editor-layout">
            {/* Left sidebar - Field toolbox */}
            <div className="editor-sidebar left">
              <FieldToolbox dataSource={dataSource} />
            </div>

            {/* Main canvas area */}
            <div className="editor-main">
              <div className="canvas-container">
                <TemplateCanvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  zoom={zoom}
                  showGrid={showGrid}
                  snapToGrid={snapToGrid}
                  selectedField={selectedField}
                  onFieldSelect={handleFieldSelect}
                  onClick={handleCanvasClick}
                />
              </div>
            </div>

            {/* Right sidebar - Properties */}
            <div className="editor-sidebar right">
              <PropertyPanel
                selectedField={selectedField}
                onFieldUpdate={setSelectedField}
              />
            </div>
          </div>
        </div>
      </TemplateProvider>
    </DndProvider>
  );
};

export default PDFTemplateEditor;
