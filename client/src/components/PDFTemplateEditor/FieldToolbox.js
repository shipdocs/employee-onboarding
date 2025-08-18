import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import {
  Type,
  Hash,
  Calendar,
  CheckSquare,
  PenTool,
  Image,
  Table,
  QrCode,
  BarChart3,
  Database,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { FIELD_TYPES } from './TemplateContext';
import './FieldToolbox.css';

const FIELD_DEFINITIONS = {
  [FIELD_TYPES.TEXT]: {
    label: 'Text Field',
    icon: Type,
    description: 'Single or multi-line text input',
    defaultWidth: 150,
    defaultHeight: 30,
    category: 'basic'
  },
  [FIELD_TYPES.NUMBER]: {
    label: 'Number Field',
    icon: Hash,
    description: 'Numeric input with validation',
    defaultWidth: 100,
    defaultHeight: 30,
    category: 'basic'
  },
  [FIELD_TYPES.DATE]: {
    label: 'Date Field',
    icon: Calendar,
    description: 'Date picker with formatting',
    defaultWidth: 120,
    defaultHeight: 30,
    category: 'basic'
  },
  [FIELD_TYPES.CHECKBOX]: {
    label: 'Checkbox',
    icon: CheckSquare,
    description: 'Boolean checkbox input',
    defaultWidth: 20,
    defaultHeight: 20,
    category: 'basic'
  },
  [FIELD_TYPES.SIGNATURE]: {
    label: 'Signature',
    icon: PenTool,
    description: 'Digital signature capture',
    defaultWidth: 200,
    defaultHeight: 60,
    category: 'advanced'
  },
  [FIELD_TYPES.IMAGE]: {
    label: 'Image',
    icon: Image,
    description: 'Image placeholder or upload',
    defaultWidth: 100,
    defaultHeight: 100,
    category: 'advanced'
  },
  [FIELD_TYPES.TABLE]: {
    label: 'Table',
    icon: Table,
    description: 'Dynamic data table',
    defaultWidth: 300,
    defaultHeight: 150,
    category: 'advanced'
  },
  [FIELD_TYPES.QR_CODE]: {
    label: 'QR Code',
    icon: QrCode,
    description: 'QR code generator',
    defaultWidth: 80,
    defaultHeight: 80,
    category: 'advanced'
  },
  [FIELD_TYPES.BARCODE]: {
    label: 'Barcode',
    icon: BarChart3,
    description: 'Barcode generator',
    defaultWidth: 150,
    defaultHeight: 40,
    category: 'advanced'
  }
};

const DraggableField = ({ fieldType, definition }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'FIELD_TYPE',
    item: () => ({
      fieldType,
      defaultWidth: definition.defaultWidth,
      defaultHeight: definition.defaultHeight,
      defaultProperties: definition.defaultProperties || {}
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const Icon = definition.icon;

  return (
    <div
      ref={drag}
      className={`field-item ${isDragging ? 'dragging' : ''}`}
      title={definition.description}
    >
      <div className="field-icon">
        <Icon size={18} />
      </div>
      <div className="field-info">
        <div className="field-label">{definition.label}</div>
        <div className="field-description">{definition.description}</div>
      </div>
    </div>
  );
};

const DataSourceFields = ({ dataSource }) => {
  const [expanded, setExpanded] = useState(false);

  if (!dataSource || !dataSource.fields) {
    return null;
  }

  return (
    <div className="toolbox-section">
      <div
        className="section-header clickable"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Database size={16} />
        <span>Data Fields</span>
      </div>

      {expanded && (
        <div className="section-content">
          <div className="data-fields-hint">
            Drag these fields to automatically bind to your data source
          </div>
          {dataSource.fields.map(field => (
            <DraggableField
              key={`data-${field.name}`}
              fieldType={field.type || FIELD_TYPES.TEXT}
              definition={{
                label: field.label || field.name,
                icon: getFieldIcon(field.type),
                description: `Auto-bind to ${field.name}`,
                defaultWidth: getFieldWidth(field.type),
                defaultHeight: getFieldHeight(field.type),
                defaultProperties: {
                  dataBinding: field.name,
                  placeholder: field.placeholder || field.label
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const getFieldIcon = (type) => {
  switch (type) {
    case 'number': return Hash;
    case 'date': return Calendar;
    case 'boolean': return CheckSquare;
    case 'image': return Image;
    default: return Type;
  }
};

const getFieldWidth = (type) => {
  switch (type) {
    case 'number': return 100;
    case 'date': return 120;
    case 'boolean': return 20;
    case 'image': return 100;
    default: return 150;
  }
};

const getFieldHeight = (type) => {
  switch (type) {
    case 'boolean': return 20;
    case 'image': return 100;
    default: return 30;
  }
};

const FieldToolbox = ({ dataSource }) => {
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    advanced: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const basicFields = Object.entries(FIELD_DEFINITIONS).filter(
    ([_, def]) => def.category === 'basic'
  );

  const advancedFields = Object.entries(FIELD_DEFINITIONS).filter(
    ([_, def]) => def.category === 'advanced'
  );

  return (
    <div className="field-toolbox">
      <div className="toolbox-header">
        <h3>Field Toolbox</h3>
        <p>Drag fields onto the canvas</p>
      </div>

      {/* Data source fields */}
      <DataSourceFields dataSource={dataSource} />

      {/* Basic fields */}
      <div className="toolbox-section">
        <div
          className="section-header clickable"
          onClick={() => toggleSection('basic')}
        >
          {expandedSections.basic ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Basic Fields</span>
        </div>

        {expandedSections.basic && (
          <div className="section-content">
            {basicFields.map(([fieldType, definition]) => (
              <DraggableField
                key={fieldType}
                fieldType={fieldType}
                definition={definition}
              />
            ))}
          </div>
        )}
      </div>

      {/* Advanced fields */}
      <div className="toolbox-section">
        <div
          className="section-header clickable"
          onClick={() => toggleSection('advanced')}
        >
          {expandedSections.advanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Advanced Fields</span>
        </div>

        {expandedSections.advanced && (
          <div className="section-content">
            {advancedFields.map(([fieldType, definition]) => (
              <DraggableField
                key={fieldType}
                fieldType={fieldType}
                definition={definition}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick tips */}
      <div className="toolbox-tips">
        <h4>Tips:</h4>
        <ul>
          <li>Drag fields from here to the canvas</li>
          <li>Use grid snap for perfect alignment</li>
          <li>Select fields to edit properties</li>
          <li>Import PDF as background template</li>
        </ul>
      </div>
    </div>
  );
};

export default FieldToolbox;
