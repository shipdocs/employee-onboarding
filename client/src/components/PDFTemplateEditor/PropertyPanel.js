import React from 'react';
import { Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import { useTemplate, FIELD_TYPES } from './TemplateContext';
import './PropertyPanel.css';

const PropertyPanel = ({ selectedField, onFieldUpdate }) => {
  const { updateField, deleteField, duplicateField } = useTemplate();

  if (!selectedField) {
    return (
      <div className="property-panel">
        <div className="panel-header">
          <h3>Properties</h3>
        </div>
        <div className="no-selection">
          <p>Select a field to edit its properties</p>
        </div>
      </div>
    );
  }

  const handlePropertyChange = (property, value) => {
    updateField(selectedField.id, {
      properties: {
        ...selectedField.properties,
        [property]: value
      }
    });
  };

  const handlePositionChange = (property, value) => {
    updateField(selectedField.id, { [property]: parseFloat(value) || 0 });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this field?')) {
      deleteField(selectedField.id);
      // Clear selection after deleting
      if (onFieldUpdate) {
        onFieldUpdate(null);
      }
    }
  };

  const handleDuplicate = () => {
    duplicateField(selectedField.id);
    // Select the duplicated field (it will be the last one added)
    // We'll handle this in a future update if needed
  };

  const renderFieldSpecificProperties = () => {
    const { properties } = selectedField;

    switch (selectedField.type) {
      case FIELD_TYPES.TEXT:
        return (
          <>
            <div className="property-group">
              <label>Font Size</label>
              <input
                type="number"
                value={properties.fontSize || 12}
                onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
                min="8"
                max="72"
              />
            </div>

            <div className="property-group">
              <label>Font Family</label>
              <select
                value={properties.fontFamily || 'Arial'}
                onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
              </select>
            </div>

            <div className="property-group">
              <label>Text Align</label>
              <select
                value={properties.textAlign || 'left'}
                onChange={(e) => handlePropertyChange('textAlign', e.target.value)}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div className="property-group">
              <label>Placeholder</label>
              <input
                type="text"
                value={properties.placeholder || ''}
                onChange={(e) => handlePropertyChange('placeholder', e.target.value)}
                placeholder="Enter placeholder text"
              />
            </div>
          </>
        );

      case FIELD_TYPES.NUMBER:
        return (
          <>
            <div className="property-group">
              <label>Font Size</label>
              <input
                type="number"
                value={properties.fontSize || 12}
                onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
                min="8"
                max="72"
              />
            </div>

            <div className="property-group">
              <label>Decimal Places</label>
              <input
                type="number"
                value={properties.decimalPlaces || 0}
                onChange={(e) => handlePropertyChange('decimalPlaces', parseInt(e.target.value))}
                min="0"
                max="10"
              />
            </div>

            <div className="property-group">
              <label>Min Value</label>
              <input
                type="number"
                value={properties.min || ''}
                onChange={(e) => handlePropertyChange('min', e.target.value)}
                placeholder="No minimum"
              />
            </div>

            <div className="property-group">
              <label>Max Value</label>
              <input
                type="number"
                value={properties.max || ''}
                onChange={(e) => handlePropertyChange('max', e.target.value)}
                placeholder="No maximum"
              />
            </div>
          </>
        );

      case FIELD_TYPES.DATE:
        return (
          <>
            <div className="property-group">
              <label>Date Format</label>
              <select
                value={properties.format || 'MM/DD/YYYY'}
                onChange={(e) => handlePropertyChange('format', e.target.value)}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD MMM YYYY">DD MMM YYYY</option>
              </select>
            </div>
          </>
        );

      case FIELD_TYPES.CHECKBOX:
        return (
          <>
            <div className="property-group">
              <label>Size</label>
              <input
                type="number"
                value={properties.size || 16}
                onChange={(e) => handlePropertyChange('size', parseInt(e.target.value))}
                min="10"
                max="50"
              />
            </div>

            <div className="property-group">
              <label>Default Checked</label>
              <input
                type="checkbox"
                checked={properties.defaultChecked || false}
                onChange={(e) => handlePropertyChange('defaultChecked', e.target.checked)}
              />
            </div>
          </>
        );

      case FIELD_TYPES.SIGNATURE:
        return (
          <>
            <div className="property-group">
              <label>Signature Type</label>
              <select
                value={properties.signatureType || 'draw'}
                onChange={(e) => handlePropertyChange('signatureType', e.target.value)}
              >
                <option value="draw">Draw</option>
                <option value="type">Type</option>
                <option value="upload">Upload</option>
              </select>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="property-panel">
      <div className="panel-header">
        <h3>Properties</h3>
        <div className="field-actions">
          <button
            className="action-btn"
            onClick={handleDuplicate}
            title="Duplicate Field"
          >
            <Copy size={14} />
          </button>
          <button
            className="action-btn delete"
            onClick={handleDelete}
            title="Delete Field"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="panel-content">
        {/* Field Info */}
        <div className="property-section">
          <h4>Field Info</h4>
          <div className="property-group">
            <label>Field Type</label>
            <input
              type="text"
              value={selectedField.type}
              readOnly
              className="readonly"
            />
          </div>

          <div className="property-group">
            <label>Field ID</label>
            <input
              type="text"
              value={selectedField.id}
              readOnly
              className="readonly"
            />
          </div>
        </div>

        {/* Position & Size */}
        <div className="property-section">
          <h4>Position & Size</h4>
          <div className="property-row">
            <div className="property-group half">
              <label>X Position</label>
              <input
                type="number"
                value={selectedField.x}
                onChange={(e) => handlePositionChange('x', e.target.value)}
                step="1"
              />
            </div>
            <div className="property-group half">
              <label>Y Position</label>
              <input
                type="number"
                value={selectedField.y}
                onChange={(e) => handlePositionChange('y', e.target.value)}
                step="1"
              />
            </div>
          </div>

          <div className="property-row">
            <div className="property-group half">
              <label>Width</label>
              <input
                type="number"
                value={selectedField.width}
                onChange={(e) => handlePositionChange('width', e.target.value)}
                min="10"
                step="1"
              />
            </div>
            <div className="property-group half">
              <label>Height</label>
              <input
                type="number"
                value={selectedField.height}
                onChange={(e) => handlePositionChange('height', e.target.value)}
                min="10"
                step="1"
              />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="property-section">
          <h4>Appearance</h4>
          <div className="property-group">
            <label>Background Color</label>
            <div className="color-input">
              <input
                type="color"
                value={selectedField.properties.backgroundColor === 'transparent' || !selectedField.properties.backgroundColor
                  ? '#ffffff'
                  : selectedField.properties.backgroundColor}
                onChange={(e) => handlePropertyChange('backgroundColor', e.target.value)}
              />
              <input
                type="text"
                value={selectedField.properties.backgroundColor || 'transparent'}
                onChange={(e) => handlePropertyChange('backgroundColor', e.target.value)}
                placeholder="transparent"
              />
            </div>
          </div>

          <div className="property-group">
            <label>Text Color</label>
            <div className="color-input">
              <input
                type="color"
                value={selectedField.properties.color || '#000000'}
                onChange={(e) => handlePropertyChange('color', e.target.value)}
              />
              <input
                type="text"
                value={selectedField.properties.color || '#000000'}
                onChange={(e) => handlePropertyChange('color', e.target.value)}
              />
            </div>
          </div>

          <div className="property-group">
            <label>Border</label>
            <input
              type="text"
              value={selectedField.properties.border || 'none'}
              onChange={(e) => handlePropertyChange('border', e.target.value)}
              placeholder="1px solid #000"
            />
          </div>
        </div>

        {/* Data Binding */}
        <div className="property-section">
          <h4>Data Binding</h4>
          <div className="property-group">
            <label>Data Source</label>
            <input
              type="text"
              value={selectedField.dataBinding || ''}
              onChange={(e) => updateField(selectedField.id, { dataBinding: e.target.value })}
              placeholder="e.g., user.firstName"
            />
          </div>
        </div>

        {/* Field-specific properties */}
        <div className="property-section">
          <h4>Field Properties</h4>
          {renderFieldSpecificProperties()}
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;
