import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import contentService from '../services/contentService';
import { workflowService } from '../services/api'; // workflowService not yet migrated
import MobileWarning from '../components/MobileWarning';
import './ContentManagementPage.css';

// Lazy load heavy content editor components
const RichContentEditor = lazy(() => import('../components/admin/RichContentEditor'));
const QuizEditor = lazy(() => import('../components/ContentEditor/QuizEditor'));
const ContentWizard = lazy(() => import('../components/ContentEditor/ContentWizard'));

const ContentManagementPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation(['common', 'forms', 'api']);

  const [activeTab, setActiveTab] = useState('workflows');
  const [contentData, setContentData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [forceRender, setForceRender] = useState(0);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [phases, setPhases] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Check if user has content editing permissions
  const hasContentEditPermission = useCallback(() => {
    if (!user) return false;
    return user.role === 'admin' || (user.role === 'manager' && user.permissions?.includes('content_edit'));
  }, [user]);

  // Check migration status
  const checkMigration = useCallback(async () => {
    if (user?.role === 'admin') {
      try {
        const data = await contentService.checkMigration();
        setMigrationNeeded(data.migrationNeeded);
      } catch (error) {
        // console.error('Failed to check migration status:', error);
      }
    }
  }, [user]);

  // Load workflows, training phases and quizzes
  const loadContent = useCallback(async () => {
    if (!hasContentEditPermission()) return;

    setIsLoading(true);
    try {
      const [workflowsData, phasesData, quizzesData] = await Promise.all([
        workflowService.getWorkflows(),
        contentService.getTrainingPhases(),
        contentService.getQuizzes()
      ]);

      setWorkflows(workflowsData);
      setPhases(phasesData);
      setQuizzes(quizzesData);
    } catch (error) {
      // console.error('Failed to load content:', error);
      alert('Failed to load content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [hasContentEditPermission]);

  // Handle image upload
  const handleImageUpload = useCallback(async (file) => {
    const result = await contentService.uploadContentImage(file);
    return result.url;
  }, []);

  // Handle video upload
  const handleVideoUpload = useCallback(async (file) => {
    const result = await contentService.uploadContentVideo(file);
    return result.url;
  }, []);

  // Save training phase (enhanced for auto-save)
  const saveTrainingPhase = useCallback(async (phaseData, options = {}) => {
    const { autoSave = false } = options;

    if (!autoSave) {
      setIsSaving(true);
    }

    try {
      let savedPhase;
      if (selectedPhase?.id) {
        savedPhase = await contentService.updateTrainingPhase(selectedPhase.id, phaseData);
        setPhases(prev => prev.map(p => p.id === savedPhase.id ? savedPhase : p));
      } else {
        savedPhase = await contentService.createTrainingPhase(phaseData);
        setPhases(prev => [...prev, savedPhase]);
        // Update selectedPhase with the new ID for future auto-saves
        setSelectedPhase(savedPhase);
      }

      if (!autoSave) {
        setSelectedPhase(null);
        // Show user-friendly success message
        const toast = document.createElement('div');
        toast.textContent = 'Training phase saved successfully! ✓';
        toast.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 1000;
          background: #10b981; color: white; padding: 12px 20px;
          border-radius: 8px; font-weight: 500;
        `;
        document.body.appendChild(toast);
        const timeoutId = setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
      }

      return savedPhase;
    } catch (error) {
      // console.error('Failed to save training phase:', error);
      if (!autoSave) {
        alert('Failed to save training phase. Please try again.');
      }
      throw error;
    } finally {
      if (!autoSave) {
        setIsSaving(false);
      }
    }
  }, [selectedPhase]);

  // Save quiz
  const saveQuiz = useCallback(async (quizData) => {
    setIsSaving(true);
    try {
      let savedQuiz;
      if (selectedQuiz?.id) {
        savedQuiz = await contentService.updateQuiz(selectedQuiz.id, quizData);
        setQuizzes(prev => prev.map(q => q.id === savedQuiz.id ? savedQuiz : q));
      } else {
        savedQuiz = await contentService.createQuiz(quizData);
        setQuizzes(prev => [...prev, savedQuiz]);
      }

      setSelectedQuiz(null);
      alert('Quiz saved successfully!');
    } catch (error) {
      // console.error('Failed to save quiz:', error);
      toast.error(t('common:content_management.quizzes.save_failed'));
    } finally {
      setIsSaving(false);
    }
  }, [selectedQuiz]);

  // Delete training phase
  const deletePhase = useCallback(async (phaseId) => {
    if (!window.confirm(t('common:content_management.training.delete_confirm'))) {
      return;
    }

    try {
      await contentService.deleteTrainingPhase(phaseId);
      setPhases(prev => prev.filter(p => p.id !== phaseId));
      toast.success(t('common:content_management.training.delete_success'));
    } catch (error) {
      // console.error('Failed to delete training phase:', error);
      toast.error(t('common:content_management.training.delete_failed'));
    }
  }, []);

  // Delete quiz
  const deleteQuiz = useCallback(async (quizId) => {
    if (!window.confirm(t('common:content_management.quizzes.delete_confirm'))) {
      return;
    }

    try {
      await contentService.deleteQuiz(quizId);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      toast.success(t('common:content_management.quizzes.delete_success'));
    } catch (error) {
      // console.error('Failed to delete quiz:', error);
      toast.error(t('common:content_management.quizzes.delete_failed'));
    }
  }, []);

  useEffect(() => {
    checkMigration();
    loadContent();
  }, [loadContent, checkMigration]);

  // Show access denied if user doesn't have permission
  if (!hasContentEditPermission()) {
    return (
      <div className="content-management-page">
        <div className="access-denied">
          <h2>{t('common:content_management.access_denied.title')}</h2>
          <p>{t('common:content_management.access_denied.message')}</p>
        </div>
      </div>
    );
  }

  // Show workflow phases if a workflow is selected
  if (selectedWorkflow !== null) {
    return (
      <div className="content-management-page">
        <div className="workflow-phases-view">
          <div className="page-header">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedWorkflow(null);
                setSelectedPhase(null); // Clear any selected phase to prevent stale state
              }}
              style={{ marginBottom: '16px' }}
            >
              ← Back to Training Programs
            </button>
            <h1>Manage Phases: {selectedWorkflow.name}</h1>
            <p>{selectedWorkflow.description || 'No description provided'}</p>
          </div>

          <div className="workflow-phases-section">
            <div className="section-header">
              <h2>Training Phases in this Program</h2>

            </div>

            <div className="content-grid">
              {selectedWorkflow.workflow_phases?.map(phase => (
                <div key={phase.id} className="content-card">
                  <div className="card-header">
                    <h3>Phase {phase.phase_number}: {phase.name}</h3>
                    <div className="card-meta">
                      <span className="phase-type">{phase.type}</span>
                      {phase.required && <span className="required-badge">Required</span>}
                    </div>
                  </div>
                  <div className="card-content">
                    <p>{phase.description || 'No description provided'}</p>
                    {phase.estimated_duration && (
                      <p><strong>Duration:</strong> {phase.estimated_duration} hours</p>
                    )}
                  </div>
                  <div className="card-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        try {
                          // Strategy 1: Look for linked training content via workflow_phase_items
                          if (phase.workflow_phase_items && phase.workflow_phase_items.length > 0) {
                            const linkedItem = phase.workflow_phase_items.find(item =>
                              item.training_phase_id && item.content_source === 'training_reference'
                            );

                            if (linkedItem) {
                              // Find the linked training phase
                              const linkedTrainingPhase = phases.find(p => p.id === linkedItem.training_phase_id);
                              if (linkedTrainingPhase) {
                                console.log('Found linked training phase:', linkedTrainingPhase.title);
                                // Clear selectedWorkflow to ensure content editor renders
                                setSelectedWorkflow(null);
                                setSelectedPhase(linkedTrainingPhase);
                                return;
                              }
                            }
                          }

                          // Strategy 2: Look for training phase by phase number or name
                          const trainingPhase = phases.find(p =>
                            p.phase_number === phase.phase_number ||
                            p.title === phase.name ||
                            p.title.includes(phase.name) ||
                            phase.name.includes(p.title)
                          );

                          if (trainingPhase) {
                            console.log('Found training phase by matching:', trainingPhase.title);
                            console.log('Setting selectedPhase to:', trainingPhase);

                            // Clear selectedWorkflow to ensure content editor renders
                            setSelectedWorkflow(null);

                            // Force component re-render by using functional state update
                            setSelectedPhase(prev => {
                              console.log('State update function called, prev:', prev);
                              console.log('Setting new selectedPhase:', trainingPhase);
                              return trainingPhase;
                            });

                            // Force re-render with additional state change
                            setForceRender(prev => prev + 1);

                            console.log('selectedPhase state should now be set');
                            return;
                          }

                          // Strategy 3: Create new training phase for this workflow phase
                          const shouldCreate = window.confirm(
                            `No training content found for "${phase.name}". Would you like to create new training content for this phase?`
                          );

                          if (shouldCreate) {
                            // Create new training phase
                            const newPhase = {
                              phase_number: phase.phase_number,
                              title: phase.name,
                              description: phase.description || `Training content for ${phase.name}`,
                              time_limit: phase.estimated_duration || 2,
                              items: [],
                              status: 'draft'
                            };

                            console.log('Creating new training phase:', newPhase);
                            const createdPhase = await contentService.createTrainingPhase(newPhase);

                            // Add to local phases list
                            setPhases(prev => [...prev, createdPhase]);
                            // Clear selectedWorkflow to ensure content editor renders
                            setSelectedWorkflow(null);
                            setSelectedPhase(createdPhase);

                            alert(`Created new training content: "${createdPhase.title}"`);
                          }

                        } catch (error) {
                          console.error('Failed to handle Edit Content:', error);
                          alert(`Failed to open training content: ${error.message}`);
                        }
                      }}
                    >
                      Edit Content
                    </button>

                  </div>
                </div>
              )) || []}

              {(!selectedWorkflow.workflow_phases || selectedWorkflow.workflow_phases.length === 0) && (
                <div className="empty-state">
                  <h3>No Phases Found</h3>
                  <p>This training program doesn't have any phases yet. Phases will be managed through the new Content Management system.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show editor if editing a phase or quiz
  console.log('ContentManagementPage render - selectedWorkflow:', selectedWorkflow, 'selectedPhase:', selectedPhase);
  if (selectedPhase !== null) {
    console.log('Rendering RichContentEditor with selectedPhase:', selectedPhase);
    return (
      <div className="content-management-page">
        <MobileWarning
          pageName="content-editor"
          requiresDesktop={true}
          minWidth={1024}
        />
        <RichContentEditor
          key={`${selectedPhase?.id}-${forceRender}`}
          phaseData={selectedPhase}
          onSave={saveTrainingPhase}
          onCancel={() => {
            console.log('Content editor cancelled, clearing selectedPhase');
            setSelectedPhase(null);
          }}
          onImageUpload={handleImageUpload}
          onVideoUpload={handleVideoUpload}
          isSaving={isSaving}
        />
      </div>
    );
  }

  if (selectedQuiz !== null) {
    return (
      <div className="content-management-page">
        <MobileWarning
          pageName="quiz-editor"
          requiresDesktop={true}
          minWidth={1024}
        />
        <QuizEditor
          quizData={selectedQuiz}
          onSave={saveQuiz}
          onCancel={() => setSelectedQuiz(null)}
          onImageUpload={handleImageUpload}
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <div className="content-management-page">
      <MobileWarning
        pageName="content-management"
        requiresDesktop={true}
        minWidth={1024}
      />
      <div className="page-header">
        <h1>{t('common:content_management.title')}</h1>
        <p>{t('common:content_management.description')}</p>
      </div>

      {migrationNeeded && user?.role === 'admin' && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f39c12" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div style={{ flex: 1 }}>
            <strong>{t('common:content_management.migration.title')}</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
              {t('common:content_management.migration.message')}
              <code style={{
                background: '#f8f9fa',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '8px',
                fontFamily: 'monospace',
                fontSize: '13px'
              }}>
                {t('common:content_management.migration.filename')}
              </code>
            </p>
          </div>
        </div>
      )}

      <div className="content-tabs">
        <button
          className={`tab-button ${activeTab === 'workflows' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflows')}
        >
          Training Programs
        </button>
        <button
          className={`tab-button ${activeTab === 'training' ? 'active' : ''}`}
          onClick={() => setActiveTab('training')}
        >
          {t('common:content_management.tabs.training')}
        </button>
        <button
          className={`tab-button ${activeTab === 'quizzes' ? 'active' : ''}`}
          onClick={() => setActiveTab('quizzes')}
        >
          {t('common:content_management.tabs.quizzes')}
        </button>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t('common:loading.content')}</p>
        </div>
      ) : (
        <div className="content-section">
          {activeTab === 'workflows' && (
            <div className="workflows-section">
              <div className="section-header">
                <h2>Training Programs & Workflows</h2>
                <p>Organize training phases into structured programs for different roles and purposes.</p>
              </div>

              <div className="content-grid">
                {workflows.map(workflow => (
                  <div key={workflow.id} className="content-card">
                    <div className="card-header">
                      <h3>{workflow.name}</h3>
                      <div className="card-meta">
                        <span className={`status-badge ${workflow.status}`}>{workflow.status}</span>
                        <span className="workflow-type">{workflow.type}</span>
                      </div>
                    </div>
                    <div className="card-content">
                      <p>{workflow.description || 'No description provided'}</p>
                    </div>
                    <div className="card-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={async () => {
                          try {
                            // Fetch workflow with phases
                            const workflowWithPhases = await workflowService.getWorkflowBySlug(workflow.slug);
                            setSelectedWorkflow(workflowWithPhases);
                          } catch (error) {
                            console.error('Failed to load workflow phases:', error);
                            alert('Failed to load workflow phases. Please try again.');
                          }
                        }}
                      >
                        Manage Phases
                      </button>

                    </div>
                  </div>
                ))}

                {workflows.length === 0 && (
                  <div className="empty-state">
                    <h3>No Training Programs Found</h3>
                    <p>Training programs will be managed through the new Content Management system.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'training' && (
            <div className="training-phases-section">
              <div className="section-header">
                <h2>{t('common:content_management.training.title')}</h2>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowWizard(true)}
                >
                  {t('common:content_management.training.create_button')}
                </button>
              </div>

              <div className="content-grid">
                {phases.map(phase => (
                  <div key={phase.id} className="content-card">
                    <div className="card-header">
                      <h3>{phase.title || t('common:content_management.training.untitled')}</h3>
                      <div className="card-meta">
                        <span className="item-count">{t('common:content_management.training.items_count', { count: phase.items?.length || 0 })}</span>
                        <span className="time-limit">{t('common:content_management.training.time_limit', { limit: phase.timeLimit })}</span>
                      </div>
                    </div>
                    <div className="card-content">
                      <p>{phase.description || t('common:content_management.training.no_description')}</p>
                    </div>
                    <div className="card-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedPhase(phase)}
                      >
                        {t('common:content_management.training.edit')}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => deletePhase(phase.id)}
                      >
                        {t('common:content_management.training.delete')}
                      </button>
                    </div>
                  </div>
                ))}

                {phases.length === 0 && (
                  <div className="empty-state">
                    <h3>{t('common:content_management.training.empty.title')}</h3>
                    <p>{t('common:content_management.training.empty.message')}</p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowWizard(true)}
                      >
                        {t('common:content_management.training.create')}
                      </button>
                      {user.role === 'admin' && (
                        <button
                          className="btn btn-secondary"
                          onClick={async () => {
                            if (window.confirm(t('common:content_management.training.empty.load_confirm'))) {
                              try {
                                const result = await contentService.loadInitialData();
                                toast.success(t('common:content_management.training.empty.load_success', { phases: result.phases, quizzes: result.quizzes }));
                                loadContent();
                              } catch (error) {
                                // console.error('Failed to load initial data:', error);
                                if (error.response?.data?.details) {
                                  toast.error(`${error.response.data.error}\n\n${error.response.data.details}`);
                                } else {
                                  toast.error(error.response?.data?.error || t('common:content_management.training.empty.load_failed'));
                                }
                              }
                            }
                          }}
                        >
                          {t('common:content_management.training.empty.load_default')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'quizzes' && (
            <div className="quizzes-section">
              <div className="section-header">
                <h2>{t('common:content_management.quizzes.title')}</h2>
                <button
                  className="btn btn-primary"
                  onClick={() => setSelectedQuiz({})}
                >
                  {t('common:content_management.quizzes.create_button')}
                </button>
              </div>

              <div className="content-grid">
                {quizzes.map(quiz => (
                  <div key={quiz.id} className="content-card">
                    <div className="card-header">
                      <h3>{quiz.title || t('common:content_management.quizzes.untitled')}</h3>
                      <div className="card-meta">
                        <span className="item-count">{t('common:content_management.quizzes.questions_count', { count: quiz.questions?.length || 0 })}</span>
                        <span className="time-limit">{t('common:content_management.quizzes.time_limit', { limit: quiz.timeLimit })}</span>
                        <span className="passing-score">{t('common:content_management.quizzes.passing_score', { score: quiz.passingScore })}</span>
                      </div>
                    </div>
                    <div className="card-content">
                      <p>{quiz.description || t('common:content_management.quizzes.no_description')}</p>
                    </div>
                    <div className="card-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedQuiz(quiz)}
                      >
                        {t('common:content_management.training.edit')}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => deleteQuiz(quiz.id)}
                      >
                        {t('common:content_management.training.delete')}
                      </button>
                    </div>
                  </div>
                ))}

                {quizzes.length === 0 && (
                  <div className="empty-state">
                    <h3>{t('common:content_management.quizzes.empty.title')}</h3>
                    <p>{t('common:content_management.quizzes.empty.message')}</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setSelectedQuiz({})}
                    >
                      {t('common:content_management.quizzes.create')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Wizard */}
      {showWizard && (
        <ContentWizard
          onComplete={(phaseData) => {
            setShowWizard(false);
            setSelectedPhase(phaseData);
          }}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
};

export default ContentManagementPage;
