import React, { useRef, useCallback, useState } from 'react';
import { useDrag } from 'react-dnd';
import { FIELD_TYPES } from './TemplateContext';
import './FieldComponent.css';

const FieldComponent = ({
  field,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onDragStart,
  onDragEnd
}) => {
  const fieldRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);

  // Drag functionality for moving fields
  const [{ isDragging }, drag] = useDrag({
    type: 'FIELD_MOVE',
    item: () => ({
      id: field.id,
      type: 'field'
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    end: () => {
      onDragEnd?.();
    }
  });

  // Handle drag start through effect
  React.useEffect(() => {
    if (isDragging) {
      onDragStart?.();
    }
  }, [isDragging, onDragStart]);

  // Handle field movement
  const handleMouseDown = useCallback((e) => {
    if (e.target.classList.contains('resize-handle')) return;

    e.preventDefault();
    e.stopPropagation();
    onSelect();

    const startX = e.clientX;
    const startY = e.clientY;
    const startFieldX = field.x;
    const startFieldY = field.y;
    let hasMoved = false;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Only consider it dragging if moved more than 1 pixel
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        hasMoved = true;

        // Use absolute position update instead of delta
        const newX = startFieldX + deltaX;
        const newY = startFieldY + deltaY;

        onMove(field.id, newX, newY, true); // Pass absolute flag
      }
    };

    const handleMouseUp = () => {
      if (hasMoved) {
        onDragEnd?.();
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [field.id, field.x, field.y, onSelect, onMove, onDragEnd]);

  // Handle field resizing
  const handleResizeStart = useCallback((e, handle) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setResizeHandle(handle);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = field.width;
    const startHeight = field.height;
    const startFieldX = field.x;
    const startFieldY = field.y;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startFieldX;
      let newY = startFieldY;

      switch (handle) {
        case 'se': // Southeast
          newWidth = startWidth + deltaX;
          newHeight = startHeight + deltaY;
          break;
        case 'sw': // Southwest
          newWidth = startWidth - deltaX;
          newHeight = startHeight + deltaY;
          newX = startFieldX + deltaX;
          break;
        case 'ne': // Northeast
          newWidth = startWidth + deltaX;
          newHeight = startHeight - deltaY;
          newY = startFieldY + deltaY;
          break;
        case 'nw': // Northwest
          newWidth = startWidth - deltaX;
          newHeight = startHeight - deltaY;
          newX = startFieldX + deltaX;
          newY = startFieldY + deltaY;
          break;
        case 'e': // East
          newWidth = startWidth + deltaX;
          break;
        case 'w': // West
          newWidth = startWidth - deltaX;
          newX = startFieldX + deltaX;
          break;
        case 'n': // North
          newHeight = startHeight - deltaY;
          newY = startFieldY + deltaY;
          break;
        case 's': // South
          newHeight = startHeight + deltaY;
          break;
      }

      onResize(field.id, Math.max(20, newWidth), Math.max(20, newHeight), newX, newY);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [field.id, field.width, field.height, field.x, field.y, onResize]);

  // Render field content based on type
  const renderFieldContent = () => {
    const { properties } = field;

    switch (field.type) {
      case FIELD_TYPES.TEXT:
        return (
          <input
            type="text"
            placeholder={properties.placeholder || 'Text field'}
            style={{
              fontSize: `${properties.fontSize}px`,
              fontFamily: properties.fontFamily,
              color: properties.color,
              backgroundColor: properties.backgroundColor,
              border: properties.border,
              textAlign: properties.textAlign,
              width: '100%',
              height: '100%',
              padding: '2px 4px',
              outline: 'none'
            }}
            readOnly
          />
        );

      case FIELD_TYPES.NUMBER:
        return (
          <input
            type="number"
            placeholder={properties.placeholder || '0'}
            style={{
              fontSize: `${properties.fontSize}px`,
              fontFamily: properties.fontFamily,
              color: properties.color,
              backgroundColor: properties.backgroundColor,
              border: properties.border,
              textAlign: properties.textAlign,
              width: '100%',
              height: '100%',
              padding: '2px 4px',
              outline: 'none'
            }}
            readOnly
          />
        );

      case FIELD_TYPES.DATE:
        return (
          <input
            type="date"
            style={{
              fontSize: `${properties.fontSize}px`,
              fontFamily: properties.fontFamily,
              color: properties.color,
              backgroundColor: properties.backgroundColor,
              border: properties.border,
              width: '100%',
              height: '100%',
              padding: '2px 4px',
              outline: 'none'
            }}
            readOnly
          />
        );

      case FIELD_TYPES.CHECKBOX:
        return (
          <input
            type="checkbox"
            style={{
              width: `${properties.size}px`,
              height: `${properties.size}px`,
              margin: 'auto'
            }}
            readOnly
          />
        );

      case FIELD_TYPES.SIGNATURE:
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              border: properties.border,
              backgroundColor: properties.backgroundColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#666'
            }}
          >
            Signature
          </div>
        );

      case FIELD_TYPES.IMAGE:
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              border: '1px dashed #ccc',
              backgroundColor: '#f9f9f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#666'
            }}
          >
            Image
          </div>
        );

      default:
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              border: '1px solid #ccc',
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#666'
            }}
          >
            {field.type}
          </div>
        );
    }
  };

  // Combine drag ref with field ref
  drag(fieldRef);

  return (
    <div
      ref={fieldRef}
      className={`field-component ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'absolute',
        left: `${field.x}px`,
        top: `${field.y}px`,
        width: `${field.width}px`,
        height: `${field.height}px`,
        cursor: isResizing ? 'nw-resize' : 'move'
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        if (!isResizing) {
          onSelect();
        }
      }}
    >
      {/* Field content */}
      <div className="field-content">
        {renderFieldContent()}
      </div>

      {/* Data binding indicator */}
      {field.dataBinding && (
        <div className="data-binding-indicator" title={`Bound to: ${field.dataBinding}`}>
          {field.dataBinding}
        </div>
      )}

      {/* Selection handles */}
      {isSelected && (
        <>
          {/* Corner handles */}
          <div
            className="resize-handle nw"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          <div
            className="resize-handle ne"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div
            className="resize-handle sw"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div
            className="resize-handle se"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />

          {/* Edge handles */}
          <div
            className="resize-handle n"
            onMouseDown={(e) => handleResizeStart(e, 'n')}
          />
          <div
            className="resize-handle s"
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          <div
            className="resize-handle w"
            onMouseDown={(e) => handleResizeStart(e, 'w')}
          />
          <div
            className="resize-handle e"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
        </>
      )}
    </div>
  );
};

export default FieldComponent;
