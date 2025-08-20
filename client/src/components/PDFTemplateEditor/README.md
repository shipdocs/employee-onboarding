# PDF Template Editor

A comprehensive PDF template editor for creating professional documents with drag-and-drop field placement.

## Features

### ✨ Core Functionality
- **Visual Drag & Drop Editor**: Intuitive canvas-based editing
- **Perfect Field Alignment**: Grid snap and smart alignment guides
- **Multiple Field Types**: Text, Number, Date, Checkbox, Signature, Image, QR Code, Barcode
- **Real-time Preview**: Live preview with sample data
- **Undo/Redo**: Full history management

### 📄 Import/Export
- **PDF Import**: Import existing PDFs as background templates
- **Image Import**: Use images as template backgrounds
- **Template Export**: Export templates as JSON files
- **Template Import**: Import previously exported templates

### 🎯 Smart Features
- **Data Binding**: Connect fields to data sources
- **Field Suggestions**: Auto-suggest fields from onboarding flow
- **Property Panel**: Comprehensive field customization
- **Responsive Design**: Works on desktop and tablet

## Usage

### Basic Usage
```jsx
import PDFTemplateEditor from './components/PDFTemplateEditor';

const MyComponent = () => {
  const handleSave = (template) => {
    console.log('Save template:', template);
  };

  const handlePreview = (template) => {
    console.log('Preview template:', template);
  };

  return (
    <PDFTemplateEditor
      templateId={null} // null for new template
      dataSource={myDataSource}
      onSave={handleSave}
      onPreview={handlePreview}
      onClose={() => window.history.back()}
    />
  );
};
```

### Data Source Format
```javascript
const dataSource = {
  name: 'My Data Source',
  fields: [
    {
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      placeholder: 'Enter first name'
    },
    {
      name: 'completionDate',
      label: 'Completion Date',
      type: 'date'
    }
    // ... more fields
  ]
};
```

## Components

### Main Components
- **PDFTemplateEditor**: Main editor component
- **TemplateCanvas**: Drag & drop canvas
- **FieldToolbox**: Field palette
- **PropertyPanel**: Field property editor
- **TemplateHeader**: Editor controls and actions

### Field Types
- **Text Field**: Single/multi-line text input
- **Number Field**: Numeric input with validation
- **Date Field**: Date picker with formatting
- **Checkbox**: Boolean checkbox
- **Signature**: Digital signature capture area
- **Image**: Image placeholder/upload
- **QR Code**: QR code generator
- **Barcode**: Barcode generator

## API Integration

### Template Structure
```javascript
{
  id: 'template-id',
  name: 'Template Name',
  description: 'Template description',
  pageSize: 'A4', // A4, Letter, Legal, A3
  orientation: 'portrait', // portrait, landscape
  backgroundImage: 'data:image/...', // Base64 image data
  fields: [
    {
      id: 'field-id',
      type: 'text',
      x: 100,
      y: 200,
      width: 150,
      height: 30,
      properties: {
        fontSize: 12,
        fontFamily: 'Arial',
        color: '#000000',
        textAlign: 'left'
      },
      dataBinding: 'firstName'
    }
  ],
  metadata: {
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
}
```

## Testing

### Test Route
Access the test editor at: `http://localhost:3000/test-pdf-editor`

### Features to Test
1. **Field Creation**: Drag fields from toolbox to canvas
2. **Field Editing**: Select fields and modify properties
3. **PDF Import**: Upload a PDF file as background
4. **Image Import**: Upload an image as background
5. **Template Export**: Export template as JSON
6. **Template Import**: Import a JSON template
7. **Preview**: Generate PDF preview
8. **Undo/Redo**: Test history functionality

## Browser Support

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

## Dependencies

- **react-dnd**: Drag and drop functionality
- **react-pdf**: PDF processing
- **pdfjs-dist**: PDF.js library
- **pdf-lib**: PDF generation
- **uuid**: Unique ID generation
- **lucide-react**: Icons

## Performance Notes

- PDF import is processed client-side for better performance
- Large PDFs may take time to process
- Background images are stored as base64 (consider optimization for production)
- Field rendering is optimized for smooth interactions

## Future Enhancements

- [ ] Multi-page template support
- [ ] Advanced field validation
- [ ] Template marketplace
- [ ] Collaborative editing
- [ ] Advanced PDF features (forms, annotations)
- [ ] Mobile app support
