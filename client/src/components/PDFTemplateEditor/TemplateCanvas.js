import React, { forwardRef, useCallback, useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { useTemplate } from './TemplateContext';
import FieldComponent from './FieldComponent';
import AlignmentGuides from './AlignmentGuides';
import './TemplateCanvas.css';

const TemplateCanvas = forwardRef(({
  width,
  height,
  zoom,
  showGrid,
  snapToGrid,
  selectedField,
  onFieldSelect,
  onClick
}, ref) => {
  const { template, addField, updateField } = useTemplate();
  const [draggedField, setDraggedField] = useState(null);
  const [alignmentGuides, setAlignmentGuides] = useState([]);
  const canvasRef = useRef(null);

  // Grid size for snapping
  const GRID_SIZE = 10;

  // Snap coordinate to grid
  const snapToGridCoord = useCallback((coord) => {
    if (!snapToGrid) return coord;
    return Math.round(coord / GRID_SIZE) * GRID_SIZE;
  }, [snapToGrid]);

  // Calculate alignment guides
  const calculateAlignmentGuides = useCallback((movingField, allFields) => {
    const guides = [];
    const threshold = 5; // Pixels

    allFields.forEach(field => {
      if (field.id === movingField.id) return;

      // Vertical alignment guides
      if (Math.abs(field.x - movingField.x) < threshold) {
        guides.push({
          type: 'vertical',
          position: field.x,
          start: Math.min(field.y, movingField.y),
          end: Math.max(field.y + field.height, movingField.y + movingField.height)
        });
      }

      if (Math.abs((field.x + field.width) - (movingField.x + movingField.width)) < threshold) {
        guides.push({
          type: 'vertical',
          position: field.x + field.width,
          start: Math.min(field.y, movingField.y),
          end: Math.max(field.y + field.height, movingField.y + movingField.height)
        });
      }

      // Horizontal alignment guides
      if (Math.abs(field.y - movingField.y) < threshold) {
        guides.push({
          type: 'horizontal',
          position: field.y,
          start: Math.min(field.x, movingField.x),
          end: Math.max(field.x + field.width, movingField.x + movingField.width)
        });
      }

      if (Math.abs((field.y + field.height) - (movingField.y + movingField.height)) < threshold) {
        guides.push({
          type: 'horizontal',
          position: field.y + field.height,
          start: Math.min(field.x, movingField.x),
          end: Math.max(field.x + field.width, movingField.x + movingField.width)
        });
      }
    });

    return guides;
  }, []);

  // Handle drop from toolbox
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'FIELD_TYPE',
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      const canvasRect = canvasRef.current.getBoundingClientRect();

      const x = snapToGridCoord((offset.x - canvasRect.left) / zoom);
      const y = snapToGridCoord((offset.y - canvasRect.top) / zoom);

      addField({
        type: item.fieldType,
        x: Math.max(0, Math.min(x, width - 100)),
        y: Math.max(0, Math.min(y, height - 30)),
        width: item.defaultWidth || 100,
        height: item.defaultHeight || 30,
        properties: item.defaultProperties || {}
      });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  }), [snapToGridCoord, zoom, width, height, addField]);

  // Handle field movement
  const handleFieldMove = useCallback((fieldId, xOrDeltaX, yOrDeltaY, isAbsolute = false) => {
    const field = template.fields.find(f => f.id === fieldId);
    if (!field) return;

    let newX, newY;

    if (isAbsolute) {
      // Absolute positioning (from drag)
      newX = snapToGridCoord(Math.max(0, Math.min(xOrDeltaX, width - field.width)));
      newY = snapToGridCoord(Math.max(0, Math.min(yOrDeltaY, height - field.height)));
    } else {
      // Delta positioning (from property panel)
      newX = snapToGridCoord(Math.max(0, Math.min(field.x + xOrDeltaX, width - field.width)));
      newY = snapToGridCoord(Math.max(0, Math.min(field.y + yOrDeltaY, height - field.height)));
    }

    const updatedField = { ...field, x: newX, y: newY };
    const guides = calculateAlignmentGuides(updatedField, template.fields);
    setAlignmentGuides(guides);

    updateField(fieldId, { x: newX, y: newY });
  }, [template.fields, width, height, snapToGridCoord, calculateAlignmentGuides, updateField]);

  // Handle field resize
  const handleFieldResize = useCallback((fieldId, newWidth, newHeight, newX, newY) => {
    const field = template.fields.find(f => f.id === fieldId);
    if (!field) return;

    const updates = {};

    // Update position if provided (for handles that change position)
    if (newX !== undefined && newY !== undefined) {
      updates.x = snapToGridCoord(Math.max(0, Math.min(newX, width - newWidth)));
      updates.y = snapToGridCoord(Math.max(0, Math.min(newY, height - newHeight)));
    }

    // Always update dimensions
    updates.width = snapToGridCoord(Math.max(20, Math.min(newWidth, width - (updates.x || field.x))));
    updates.height = snapToGridCoord(Math.max(20, Math.min(newHeight, height - (updates.y || field.y))));

    updateField(fieldId, updates);
  }, [width, height, snapToGridCoord, updateField, template.fields]);

  // Clear alignment guides when not dragging
  useEffect(() => {
    if (!draggedField) {
      setAlignmentGuides([]);
    }
  }, [draggedField]);

  // Debug background image
  useEffect(() => {
    // console.log('🖼️ TemplateCanvas: Background image debug:', {
//       hasBackgroundImage: !!template.backgroundImage,
//       backgroundImageUrl: template.backgroundImage,
//       canvasWidth: width,
//       canvasHeight: height
//     });
  }, [template.backgroundImage, width, height]);

  // Combine refs
  useEffect(() => {
    if (ref) {
      ref.current = canvasRef.current;
    }
  }, [ref]);

  drop(canvasRef);

  return (
    <div
      className="template-canvas-container"
      style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
    >
      <div
        ref={canvasRef}
        className={`template-canvas ${isOver ? 'drop-target' : ''}`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : 'none',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundColor: template.backgroundImage ? 'transparent' : 'white'
        }}
        onClick={onClick}
      >
        {/* Grid overlay */}
        {showGrid && (
          <div
            className="grid-overlay"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e0e0e0 1px, transparent 1px),
                linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
            }}
          />
        )}

        {/* Alignment guides */}
        <AlignmentGuides guides={alignmentGuides} />

        {/* Render fields */}
        {(template.fields || []).map(field => (
          <FieldComponent
            key={field.id}
            field={field}
            isSelected={selectedField?.id === field.id}
            onSelect={() => onFieldSelect(field)}
            onMove={handleFieldMove}
            onResize={handleFieldResize}
            onDragStart={() => setDraggedField(field)}
            onDragEnd={() => setDraggedField(null)}
          />
        ))}

        {/* Drop zone indicator */}
        {isOver && (
          <div className="drop-indicator">
            Drop field here
          </div>
        )}
      </div>
    </div>
  );
});

TemplateCanvas.displayName = 'TemplateCanvas';

export default TemplateCanvas;
