import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import PDFTemplateEditor from '../components/PDFTemplateEditor';
import LoadingSpinner from '../components/LoadingSpinner';
import MobileWarning from '../components/MobileWarning';
import { templateService } from '../services/api'; // templateService not yet migrated

// Sample data source for onboarding flow
const ONBOARDING_DATA_SOURCE = {
  name: 'Onboarding Flow',
  fields: [
    { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter first name' },
    { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter last name' },
    { name: 'email', label: 'Email Address', type: 'text', placeholder: 'Enter email' },
    { name: 'position', label: 'Position', type: 'text', placeholder: 'Job position' },
    { name: 'vesselAssignment', label: 'Vessel Assignment', type: 'text', placeholder: 'Vessel name' },
    { name: 'startDate', label: 'Start Date', type: 'date' },
    { name: 'completionDate', label: 'Completion Date', type: 'date' },
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'trainingScore', label: 'Training Score', type: 'number' },
    { name: 'managerSignature', label: 'Manager Signature', type: 'signature' },
    { name: 'crewSignature', label: 'Crew Signature', type: 'signature' },
    { name: 'companyLogo', label: 'Company Logo', type: 'image' },
    { name: 'qrCode', label: 'Verification QR Code', type: 'qr_code' }
  ]
};

const PDFTemplateEditorPage = () => {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  const { templateId } = useParams();
  const queryClient = useQueryClient();
  const [isNewTemplate, setIsNewTemplate] = useState(!templateId);

  // Load existing template if editing
  const { data: template, isLoading } = useQuery(
    ['template', templateId],
    async () => {
      const templateData = await templateService.getTemplate(templateId);
      // console.log('Loaded template:', templateData);
      // console.log('Background image exists:', !!templateData.backgroundImage);
      // console.log('Number of fields:', templateData.fields?.length || 0);
      return templateData;
    },
    {
      enabled: !!templateId,
      onError: (error) => {
        // console.error('Template loading error:', error);
        toast.error(t('common:pdf_template.failed_load'));
        navigate('/templates');
      }
    }
  );

  // Save template mutation
  const saveTemplateMutation = useMutation(
    (templateData) => {
      if (isNewTemplate) {
        return templateService.createTemplate(templateData);
      } else {
        return templateService.updateTemplate(templateId, templateData);
      }
    },
    {
      onSuccess: (data) => {
        toast.success(isNewTemplate ? t('common:pdf_template.created') : t('common:pdf_template.saved'));
        queryClient.invalidateQueries('templates');
        if (isNewTemplate) {
          setIsNewTemplate(false);
          navigate(`/templates/edit/${data.id}`, { replace: true });
        }
      },
      onError: (error) => {
        toast.error(t('common:pdf_template.failed_save'));
        // console.error('Save error:', error);
      }
    }
  );

  // Preview template mutation
  const previewTemplateMutation = useMutation(
    (templateData) => templateService.previewTemplate(templateData),
    {
      onSuccess: (pdfBlob) => {
        // Open PDF in new tab
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      onError: (error) => {
        toast.error(t('common:pdf_template.failed_preview'));
        // console.error('Preview error:', error);
      }
    }
  );

  const handleSave = (templateData) => {
    // console.log('Saving template:', templateData);
    // console.log('Background image exists:', !!templateData.backgroundImage);
    // console.log('Background image type:', typeof templateData.backgroundImage);
    // console.log('Background image preview:', templateData.backgroundImage?.substring(0, 100) + '...');
    // console.log('Number of fields:', templateData.fields?.length || 0);

    // Template data formatting is now handled in TemplateContext
    saveTemplateMutation.mutate(templateData);
  };

  const handlePreview = (templateData) => {
    // Add sample data for preview
    const previewData = {
      ...templateData,
      sampleData: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        position: 'Deck Officer',
        vesselAssignment: 'MV Ocean Explorer',
        startDate: '2024-01-15',
        completionDate: new Date().toISOString().split('T')[0],
        certificateNumber: 'CERT-2024-001',
        trainingScore: 95,
        companyLogo: '/logo.png'
      }
    };
    previewTemplateMutation.mutate(previewData);
  };

  const handleClose = () => {
    if (window.confirm(t('common:pdf_template.close_confirm'))) {
      navigate('/templates');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="pdf-template-editor-page">
      <MobileWarning
        pageName="pdf-template-editor"
        requiresDesktop={true}
        minWidth={1200}
      />
      <PDFTemplateEditor
        templateId={templateId}
        initialTemplate={template}
        dataSource={ONBOARDING_DATA_SOURCE}
        onSave={handleSave}
        onPreview={handlePreview}
        onClose={handleClose}
        isSaving={saveTemplateMutation.isLoading}
        isPreviewing={previewTemplateMutation.isLoading}
      />
    </div>
  );
};

export default PDFTemplateEditorPage;
