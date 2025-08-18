import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X, Save, Loader2 } from 'lucide-react';
import { useTemplate } from './TemplateContext';
import { useQueryClient } from 'react-query';
import { templateService } from '../../services/api'; // templateService not yet migrated
import toast from 'react-hot-toast';
import './EditableTemplateName.css';

const EditableTemplateName = ({ onSave, autoSave = false }) => {
  const { template, updateTemplateName, isDirty, saveTemplate } = useTemplate();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(template.name);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previousName, setPreviousName] = useState(template.name);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  // Update edit value when template name changes (e.g., from undo/redo)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(template.name);
    }
  }, [template.name, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(template.name);
    setError('');
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();

    if (!trimmedValue) {
      setError('Template name cannot be empty');
      return;
    }

    if (trimmedValue.length > 100) {
      setError('Template name must be less than 100 characters');
      return;
    }

    // If name hasn't changed, just exit editing mode
    if (trimmedValue === template.name) {
      setIsEditing(false);
      return;
    }

    // Store previous name for rollback
    setPreviousName(template.name);
    setIsSaving(true);

    try {
      // console.log('Renaming template from', template.name, 'to', trimmedValue);

      // Call the dedicated rename API if template has an ID
      if (template.id) {
        await templateService.renameTemplate(template.id, trimmedValue);
        // console.log('Template renamed successfully via API');
      }

      // Update local state
      updateTemplateName(trimmedValue);
      setIsEditing(false);
      setError('');

      // Update template list optimistically
      queryClient.setQueryData('templates', (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(t =>
          t.id === template.id
            ? { ...t, name: trimmedValue, updated_at: new Date().toISOString() }
            : t
        );
      });

      // Refresh template list to ensure consistency
      queryClient.invalidateQueries('templates');

      toast.success('Template name updated successfully!');

    } catch (error) {
      // console.error('Failed to rename template:', error);

      // Rollback optimistic updates
      updateTemplateName(previousName);
      queryClient.setQueryData('templates', (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(t =>
          t.id === template.id
            ? { ...t, name: previousName }
            : t
        );
      });

      const errorMessage = error.response?.data?.error || 'Failed to update template name';
      toast.error(errorMessage);
      setError(errorMessage);
      setIsEditing(true); // Keep editing mode open
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(template.name);
    setIsEditing(false);
    setError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleInputChange = (e) => {
    setEditValue(e.target.value);
    if (error) {
      setError('');
    }
  };

  if (isEditing) {
    return (
      <div className="editable-template-name editing">
        <div className="edit-container">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className={`name-input ${error ? 'error' : ''}`}
            placeholder="Enter template name..."
            maxLength={100}
          />
          <div className="edit-actions">
            <button
              className="edit-btn save-btn"
              onClick={handleSave}
              title="Save name"
              disabled={!editValue.trim()}
            >
              <Check size={14} />
            </button>
            <button
              className="edit-btn cancel-btn"
              onClick={handleCancel}
              title="Cancel editing"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="edit-hint">Press Enter to save, Escape to cancel</div>
      </div>
    );
  }

  return (
    <div className="editable-template-name">
      <h2 className="template-name" onClick={handleStartEdit} title="Click to edit template name">
        {template.name}
        {isDirty && <span className="dirty-indicator" title="Template has unsaved changes">*</span>}
        {isSaving ? (
          <Loader2 size={14} className="edit-icon saving-icon" />
        ) : (
          <Edit2 size={14} className="edit-icon" />
        )}
      </h2>
      {isSaving && (
        <div className="saving-notice">
          <Loader2 size={12} className="saving-spinner" />
          <span>Saving template name...</span>
        </div>
      )}
      {isDirty && !isSaving && (
        <div className="unsaved-notice">
          <span>Unsaved changes</span>
          {onSave && (
            <button
              className="quick-save-btn"
              onClick={() => onSave(saveTemplate())}
              title="Save template now"
              disabled={isSaving}
            >
              <Save size={12} />
              Save now
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EditableTemplateName;
