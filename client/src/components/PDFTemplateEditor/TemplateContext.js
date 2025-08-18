import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const TemplateContext = createContext();

// Field types available in the editor
export const FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  CHECKBOX: 'checkbox',
  SIGNATURE: 'signature',
  IMAGE: 'image',
  TABLE: 'table',
  BARCODE: 'barcode',
  QR_CODE: 'qr_code'
};

// Default field properties
const DEFAULT_FIELD_PROPS = {
  [FIELD_TYPES.TEXT]: {
    fontSize: 12,
    fontFamily: 'Arial',
    color: '#000000',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    placeholder: 'Enter text...'
  },
  [FIELD_TYPES.NUMBER]: {
    fontSize: 12,
    fontFamily: 'Arial',
    color: '#000000',
    backgroundColor: 'transparent',
    border: '1px solid #ccc',
    textAlign: 'right',
    placeholder: '0'
  },
  [FIELD_TYPES.DATE]: {
    fontSize: 12,
    fontFamily: 'Arial',
    color: '#000000',
    backgroundColor: 'transparent',
    border: '1px solid #ccc',
    format: 'MM/DD/YYYY'
  },
  [FIELD_TYPES.CHECKBOX]: {
    size: 16,
    color: '#000000',
    backgroundColor: 'transparent',
    border: '1px solid #000'
  },
  [FIELD_TYPES.SIGNATURE]: {
    width: 200,
    height: 60,
    border: '1px solid #000',
    backgroundColor: 'transparent'
  }
};

const initialState = {
  template: {
    id: null,
    name: 'Untitled Template',
    description: '',
    pageSize: 'A4',
    orientation: 'portrait',
    backgroundImage: null,
    fields: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    }
  },
  history: [],
  historyIndex: -1,
  isDirty: false
};

function templateReducer(state, action) {
  switch (action.type) {
    case 'LOAD_TEMPLATE':
      return {
        ...state,
        template: action.payload,
        history: [action.payload],
        historyIndex: 0,
        isDirty: false
      };

    case 'IMPORT_TEMPLATE':
      const importedTemplate = {
        ...action.payload,
        id: state.template.id, // Keep current ID
        metadata: {
          ...action.payload.metadata,
          importedAt: new Date().toISOString(),
          originalVersion: action.payload.metadata?.version || 1,
          version: (state.template.metadata?.version || 0) + 1
        }
      };

      return {
        ...state,
        template: importedTemplate,
        history: [...state.history.slice(0, state.historyIndex + 1), importedTemplate],
        historyIndex: state.historyIndex + 1,
        isDirty: true
      };

    case 'ADD_FIELD':
      const newField = {
        id: uuidv4(),
        type: action.payload.type,
        x: action.payload.x || 50,
        y: action.payload.y || 50,
        width: action.payload.width || 100,
        height: action.payload.height || 30,
        properties: {
          ...DEFAULT_FIELD_PROPS[action.payload.type],
          ...action.payload.properties
        },
        dataBinding: action.payload.dataBinding || null
      };

      const newTemplate = {
        ...state.template,
        fields: [...state.template.fields, newField],
        metadata: {
          ...state.template.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      return {
        ...state,
        template: newTemplate,
        history: [...state.history.slice(0, state.historyIndex + 1), newTemplate],
        historyIndex: state.historyIndex + 1,
        isDirty: true
      };

    case 'UPDATE_FIELD':
      const updatedTemplate = {
        ...state.template,
        fields: state.template.fields.map(field =>
          field.id === action.payload.id
            ? { ...field, ...action.payload.updates }
            : field
        ),
        metadata: {
          ...state.template.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      return {
        ...state,
        template: updatedTemplate,
        history: [...state.history.slice(0, state.historyIndex + 1), updatedTemplate],
        historyIndex: state.historyIndex + 1,
        isDirty: true
      };

    case 'DELETE_FIELD':
      const deletedTemplate = {
        ...state.template,
        fields: state.template.fields.filter(field => field.id !== action.payload.id),
        metadata: {
          ...state.template.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      return {
        ...state,
        template: deletedTemplate,
        history: [...state.history.slice(0, state.historyIndex + 1), deletedTemplate],
        historyIndex: state.historyIndex + 1,
        isDirty: true
      };

    case 'DUPLICATE_FIELD':
      const fieldToDuplicate = state.template.fields.find(f => f.id === action.payload.id);
      if (!fieldToDuplicate) return state;

      const duplicatedField = {
        ...fieldToDuplicate,
        id: uuidv4(),
        x: fieldToDuplicate.x + 20, // Offset to make it visible
        y: fieldToDuplicate.y + 20,
        properties: { ...fieldToDuplicate.properties }
      };

      const duplicatedTemplate = {
        ...state.template,
        fields: [...state.template.fields, duplicatedField],
        metadata: {
          ...state.template.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      return {
        ...state,
        template: duplicatedTemplate,
        history: [...state.history.slice(0, state.historyIndex + 1), duplicatedTemplate],
        historyIndex: state.historyIndex + 1,
        isDirty: true
      };

    case 'SET_BACKGROUND_IMAGE':
      const bgTemplate = {
        ...state.template,
        backgroundImage: action.payload,
        metadata: {
          ...state.template.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      return {
        ...state,
        template: bgTemplate,
        history: [...state.history.slice(0, state.historyIndex + 1), bgTemplate],
        historyIndex: state.historyIndex + 1,
        isDirty: true
      };

    case 'UPDATE_TEMPLATE_NAME':
      const nameTemplate = {
        ...state.template,
        name: action.payload,
        metadata: {
          ...state.template.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      return {
        ...state,
        template: nameTemplate,
        history: [...state.history.slice(0, state.historyIndex + 1), nameTemplate],
        historyIndex: state.historyIndex + 1,
        isDirty: true
      };

    case 'UNDO':
      if (state.historyIndex > 0) {
        return {
          ...state,
          template: state.history[state.historyIndex - 1],
          historyIndex: state.historyIndex - 1,
          isDirty: true
        };
      }
      return state;

    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        return {
          ...state,
          template: state.history[state.historyIndex + 1],
          historyIndex: state.historyIndex + 1,
          isDirty: true
        };
      }
      return state;

    case 'SAVE_TEMPLATE':
      return {
        ...state,
        isDirty: false,
        template: {
          ...state.template,
          metadata: {
            ...state.template.metadata,
            updatedAt: new Date().toISOString()
          }
        }
      };

    default:
      return state;
  }
}

export const TemplateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(templateReducer, initialState);

  const addField = useCallback((fieldData) => {
    dispatch({ type: 'ADD_FIELD', payload: fieldData });
  }, []);

  const updateField = useCallback((id, updates) => {
    dispatch({ type: 'UPDATE_FIELD', payload: { id, updates } });
  }, []);

  const deleteField = useCallback((id) => {
    dispatch({ type: 'DELETE_FIELD', payload: { id } });
  }, []);

  const duplicateField = useCallback((id) => {
    dispatch({ type: 'DUPLICATE_FIELD', payload: { id } });
  }, []);

  const setBackgroundImage = useCallback((imageData) => {
    // Handle different types of image data
    if (imageData && typeof imageData === 'string') {
      // If it's already a data URL or HTTP URL, keep it as is
      if (imageData.startsWith('data:') || imageData.startsWith('http://') || imageData.startsWith('https://')) {
        // Already properly formatted
      } else {
        // If it's raw base64, add the proper prefix
        imageData = `data:application/pdf;base64,${imageData}`;
      }
    }
    dispatch({ type: 'SET_BACKGROUND_IMAGE', payload: imageData });
  }, []);

  const updateTemplateName = useCallback((name) => {
    if (typeof name === 'string' && name.trim().length > 0) {
      dispatch({ type: 'UPDATE_TEMPLATE_NAME', payload: name.trim() });
    }
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const saveTemplate = useCallback((onSave) => {
    // Create a copy of the template with properly formatted data
    const templateToSave = {
      ...state.template,
      metadata: {
        ...state.template.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    // Ensure backgroundImage is properly formatted for storage
    if (templateToSave.backgroundImage && typeof templateToSave.backgroundImage === 'string') {
      // If it's a data URL or HTTP URL, keep it as is
      if (templateToSave.backgroundImage.startsWith('data:') ||
          templateToSave.backgroundImage.startsWith('http://') ||
          templateToSave.backgroundImage.startsWith('https://')) {
        // Keep it as is, it's already properly formatted
      } else {
        // Add proper prefix if it's raw base64
        templateToSave.backgroundImage = `data:application/pdf;base64,${templateToSave.backgroundImage}`;
      }
    }

    // Ensure fields is properly formatted
    if (!Array.isArray(templateToSave.fields)) {
      templateToSave.fields = [];
    }

    // Call the external save function if provided
    if (onSave) {
      // console.log('Saving template with background image:', !!templateToSave.backgroundImage);
      // console.log('Number of fields:', templateToSave.fields.length);
      onSave(templateToSave);
    }

    dispatch({ type: 'SAVE_TEMPLATE' });
    return templateToSave;
  }, [state.template]);

  const loadTemplate = useCallback((template) => {
    // Ensure template data is properly formatted
    if (template) {
      // Handle backgroundImage properly - could be URL or base64
      if (template.backgroundImage && typeof template.backgroundImage === 'string') {
        // If it's already a data URL or HTTP URL, keep it as is
        if (!template.backgroundImage.startsWith('data:') &&
            !template.backgroundImage.startsWith('http://') &&
            !template.backgroundImage.startsWith('https://')) {
          // Only add prefix if it's raw base64
          template.backgroundImage = `data:application/pdf;base64,${template.backgroundImage}`;
        }
      }

      // Ensure fields is an array
      if (!Array.isArray(template.fields)) {
        template.fields = [];
      }
    }

    dispatch({ type: 'LOAD_TEMPLATE', payload: template });
  }, []);

  const importTemplate = useCallback((template) => {
    dispatch({ type: 'IMPORT_TEMPLATE', payload: template });
  }, []);

  const value = {
    template: state.template,
    isDirty: state.isDirty,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    addField,
    updateField,
    deleteField,
    duplicateField,
    setBackgroundImage,
    updateTemplateName,
    undo,
    redo,
    saveTemplate,
    loadTemplate,
    importTemplate
  };

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
};

export const useTemplate = () => {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error('useTemplate must be used within a TemplateProvider');
  }
  return context;
};
