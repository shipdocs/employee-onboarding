import React, { useState } from 'react';
import PDFTemplateEditor from '../components/PDFTemplateEditor';

// Sample data source for testing
const SAMPLE_DATA_SOURCE = {
  name: 'Test Data Source',
  fields: [
    { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter first name' },
    { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter last name' },
    { name: 'email', label: 'Email Address', type: 'text', placeholder: 'Enter email' },
    { name: 'position', label: 'Position', type: 'text', placeholder: 'Job position' },
    { name: 'startDate', label: 'Start Date', type: 'date' },
    { name: 'completionDate', label: 'Completion Date', type: 'date' },
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'score', label: 'Score', type: 'number' },
    { name: 'approved', label: 'Approved', type: 'boolean' }
  ]
};

const TestPDFEditor = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const handleSave = async (templateData) => {
    // console.log('Save template:', templateData);
    setIsSaving(true);

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      alert('Template saved successfully! (Check console for data)');
    } catch (error) {
      alert('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async (templateData) => {
    // console.log('Preview template:', templateData);
    setIsPreviewing(true);

    try {
      // Create sample data for preview
      const sampleData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        position: 'Software Engineer',
        startDate: '2024-01-15',
        completionDate: new Date().toISOString().split('T')[0],
        certificateNumber: 'CERT-2024-001',
        score: 95,
        approved: true
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Preview generated! (Check console for template data)');
    } catch (error) {
      alert('Failed to generate preview');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleClose = () => {
    if (window.confirm('Close editor? Any unsaved changes will be lost.')) {
      window.history.back();
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <PDFTemplateEditor
        templateId={null}
        dataSource={SAMPLE_DATA_SOURCE}
        onSave={handleSave}
        onPreview={handlePreview}
        onClose={handleClose}
        isSaving={isSaving}
        isPreviewing={isPreviewing}
      />
    </div>
  );
};

export default TestPDFEditor;
