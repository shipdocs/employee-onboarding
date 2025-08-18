import React, { useState, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RichTextEditor from '../admin/RichTextEditor';
import './QuizEditor.css';

// Question type templates
const questionTypeTemplates = {
  multiple_choice: {
    type: 'multiple_choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    points: 5,
    category: ''
  },
  yes_no: {
    type: 'yes_no',
    question: '',
    correctAnswer: true,
    explanation: '',
    points: 5,
    category: ''
  },
  fill_in_gaps: {
    type: 'fill_in_gaps',
    question: '',
    template: '',
    correctAnswers: [''],
    acceptedVariations: [[]],
    explanation: '',
    points: 5,
    category: ''
  },
  short_answer: {
    type: 'short_answer',
    question: '',
    sampleAnswer: '',
    keyWords: [''],
    explanation: '',
    points: 5,
    maxLength: 200,
    category: ''
  },
  matching: {
    type: 'matching',
    question: '',
    leftColumn: ['', ''],
    rightColumn: ['', ''],
    correctMatches: [0, 1],
    explanation: '',
    points: 8,
    category: ''
  },
  drag_order: {
    type: 'drag_order',
    question: '',
    items: ['', ''],
    correctOrder: [0, 1],
    explanation: '',
    points: 8,
    category: ''
  },
  file_upload: {
    type: 'file_upload',
    question: '',
    instructions: '',
    acceptedFileTypes: ['image/jpeg', 'image/png'],
    maxFileSize: 5,
    validation: {
      requiresApproval: true,
      checklistItems: ['']
    },
    points: 10,
    required: true,
    category: ''
  },
  scenario: {
    type: 'scenario',
    question: '',
    scenario: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    points: 8,
    category: ''
  }
};

// Sortable question component
const SortableQuestionEditor = ({ question, index, onUpdate, onDelete, onImageUpload }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const [localQuestion, setLocalQuestion] = useState(question);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFieldChange = useCallback((field, value) => {
    const updatedQuestion = { ...localQuestion, [field]: value };
    setLocalQuestion(updatedQuestion);
    onUpdate(index, updatedQuestion);
  }, [localQuestion, index, onUpdate]);

  const handleArrayFieldChange = useCallback((field, arrayIndex, value) => {
    const updatedArray = [...(localQuestion[field] || [])];
    updatedArray[arrayIndex] = value;
    handleFieldChange(field, updatedArray);
  }, [localQuestion, handleFieldChange]);

  const addArrayItem = useCallback((field) => {
    const updatedArray = [...(localQuestion[field] || []), ''];
    handleFieldChange(field, updatedArray);
  }, [localQuestion, handleFieldChange]);

  const removeArrayItem = useCallback((field, arrayIndex) => {
    const updatedArray = [...(localQuestion[field] || [])];
    updatedArray.splice(arrayIndex, 1);
    handleFieldChange(field, updatedArray);
  }, [localQuestion, handleFieldChange]);

  const renderQuestionTypeFields = () => {
    switch (localQuestion.type) {
      case 'multiple_choice':
      case 'scenario':
        return (
          <>
            {localQuestion.type === 'scenario' && (
              <div className="question-field">
                <label>Scenario Description</label>
                <RichTextEditor
                  value={localQuestion.scenario || ''}
                  onChange={(value) => handleFieldChange('scenario', value)}
                  placeholder="Describe the scenario..."
                  height="150px"
                  onImageUpload={onImageUpload}
                />
              </div>
            )}
            <div className="question-field">
              <label>Answer Options</label>
              <div className="options-list">
                {(localQuestion.options || []).map((option, idx) => (
                  <div key={idx} className="option-item">
                    <div className="option-input-wrapper">
                      <input
                        type="radio"
                        name={`correct-${localQuestion.id}`}
                        checked={localQuestion.correctAnswer === idx}
                        onChange={() => handleFieldChange('correctAnswer', idx)}
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleArrayFieldChange('options', idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="option-input"
                      />
                    </div>
                    {localQuestion.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('options', idx)}
                        className="remove-option-btn"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('options')}
                  className="add-option-btn"
                >
                  + Add Option
                </button>
              </div>
            </div>
          </>
        );

      case 'yes_no':
        return (
          <div className="question-field">
            <label>Correct Answer</label>
            <div className="yes-no-options">
              <label>
                <input
                  type="radio"
                  name={`yn-${localQuestion.id}`}
                  checked={localQuestion.correctAnswer === true}
                  onChange={() => handleFieldChange('correctAnswer', true)}
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name={`yn-${localQuestion.id}`}
                  checked={localQuestion.correctAnswer === false}
                  onChange={() => handleFieldChange('correctAnswer', false)}
                />
                No
              </label>
            </div>
          </div>
        );

      case 'fill_in_gaps':
        return (
          <>
            <div className="question-field">
              <label>Template (use [BLANK] for gaps)</label>
              <input
                type="text"
                value={localQuestion.template || ''}
                onChange={(e) => handleFieldChange('template', e.target.value)}
                placeholder="The answer is [BLANK] and also [BLANK]."
              />
            </div>
            <div className="question-field">
              <label>Correct Answers</label>
              <div className="array-field">
                {(localQuestion.correctAnswers || []).map((answer, idx) => (
                  <div key={idx} className="array-item">
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => handleArrayFieldChange('correctAnswers', idx, e.target.value)}
                      placeholder={`Answer for blank ${idx + 1}`}
                    />
                    {localQuestion.correctAnswers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('correctAnswers', idx)}
                        className="remove-item-btn"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('correctAnswers')}
                  className="add-item-btn"
                >
                  + Add Answer
                </button>
              </div>
            </div>
          </>
        );

      case 'short_answer':
        return (
          <>
            <div className="question-field">
              <label>Sample Answer</label>
              <textarea
                value={localQuestion.sampleAnswer || ''}
                onChange={(e) => handleFieldChange('sampleAnswer', e.target.value)}
                placeholder="Provide a sample answer..."
                rows={3}
              />
            </div>
            <div className="question-field">
              <label>Key Words (for automatic scoring)</label>
              <div className="array-field">
                {(localQuestion.keyWords || []).map((keyword, idx) => (
                  <div key={idx} className="array-item">
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => handleArrayFieldChange('keyWords', idx, e.target.value)}
                      placeholder={`Keyword ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('keyWords', idx)}
                      className="remove-item-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('keyWords')}
                  className="add-item-btn"
                >
                  + Add Keyword
                </button>
              </div>
            </div>
            <div className="question-field">
              <label>Max Length (characters)</label>
              <input
                type="number"
                value={localQuestion.maxLength || 200}
                onChange={(e) => handleFieldChange('maxLength', parseInt(e.target.value))}
                min="50"
                max="1000"
              />
            </div>
          </>
        );

      case 'matching':
        return (
          <>
            <div className="question-field">
              <label>Left Column Items</label>
              <div className="array-field">
                {(localQuestion.leftColumn || []).map((item, idx) => (
                  <div key={idx} className="array-item">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleArrayFieldChange('leftColumn', idx, e.target.value)}
                      placeholder={`Left item ${idx + 1}`}
                    />
                    {localQuestion.leftColumn.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('leftColumn', idx)}
                        className="remove-item-btn"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('leftColumn')}
                  className="add-item-btn"
                >
                  + Add Left Item
                </button>
              </div>
            </div>
            <div className="question-field">
              <label>Right Column Items</label>
              <div className="array-field">
                {(localQuestion.rightColumn || []).map((item, idx) => (
                  <div key={idx} className="array-item">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleArrayFieldChange('rightColumn', idx, e.target.value)}
                      placeholder={`Right item ${idx + 1}`}
                    />
                    {localQuestion.rightColumn.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('rightColumn', idx)}
                        className="remove-item-btn"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('rightColumn')}
                  className="add-item-btn"
                >
                  + Add Right Item
                </button>
              </div>
            </div>
          </>
        );

      case 'drag_order':
        return (
          <div className="question-field">
            <label>Items to Order</label>
            <div className="array-field">
              {(localQuestion.items || []).map((item, idx) => (
                <div key={idx} className="array-item">
                  <span className="order-number">{idx + 1}.</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleArrayFieldChange('items', idx, e.target.value)}
                    placeholder={`Step ${idx + 1}`}
                  />
                  {localQuestion.items.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('items', idx)}
                      className="remove-item-btn"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('items')}
                className="add-item-btn"
              >
                + Add Item
              </button>
            </div>
          </div>
        );

      case 'file_upload':
        return (
          <>
            <div className="question-field">
              <label>Instructions</label>
              <RichTextEditor
                value={localQuestion.instructions || ''}
                onChange={(value) => handleFieldChange('instructions', value)}
                placeholder="Provide detailed instructions for the file upload..."
                height="150px"
                onImageUpload={onImageUpload}
              />
            </div>
            <div className="question-field">
              <label>Accepted File Types</label>
              <div className="file-types">
                {['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf'].map(type => (
                  <label key={type} className="file-type-option">
                    <input
                      type="checkbox"
                      checked={(localQuestion.acceptedFileTypes || []).includes(type)}
                      onChange={(e) => {
                        const types = localQuestion.acceptedFileTypes || [];
                        if (e.target.checked) {
                          handleFieldChange('acceptedFileTypes', [...types, type]);
                        } else {
                          handleFieldChange('acceptedFileTypes', types.filter(t => t !== type));
                        }
                      }}
                    />
                    {type.split('/')[1].toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
            <div className="question-field">
              <label>Max File Size (MB)</label>
              <input
                type="number"
                value={localQuestion.maxFileSize || 5}
                onChange={(e) => handleFieldChange('maxFileSize', parseInt(e.target.value))}
                min="1"
                max="50"
              />
            </div>
            <div className="question-field">
              <label>Validation Checklist</label>
              <div className="array-field">
                {(localQuestion.validation?.checklistItems || []).map((item, idx) => (
                  <div key={idx} className="array-item">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const validation = { ...localQuestion.validation };
                        validation.checklistItems[idx] = e.target.value;
                        handleFieldChange('validation', validation);
                      }}
                      placeholder={`Checklist item ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const validation = { ...localQuestion.validation };
                        validation.checklistItems.splice(idx, 1);
                        handleFieldChange('validation', validation);
                      }}
                      className="remove-item-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const validation = {
                      ...localQuestion.validation,
                      checklistItems: [...(localQuestion.validation?.checklistItems || []), '']
                    };
                    handleFieldChange('validation', validation);
                  }}
                  className="add-item-btn"
                >
                  + Add Checklist Item
                </button>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={`question-editor ${isDragging ? 'dragging' : ''}`}>
      <div className="question-header">
        <div className="drag-handle" {...attributes} {...listeners}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.5 4.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zM2.5 8a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zM2.5 11.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
          </svg>
        </div>

        <div className="question-info">
          <span className="question-type">{localQuestion.type.replace('_', ' ')}</span>
          <span className="question-preview">
            {localQuestion.question || 'New question'}
          </span>
        </div>

        <div className="question-actions">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(index)}
            className="delete-btn"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/>
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="question-content">
          <div className="question-field">
            <label>Question</label>
            <RichTextEditor
              value={localQuestion.question}
              onChange={(value) => handleFieldChange('question', value)}
              placeholder="Enter your question..."
              minHeight={120}
              maxHeight={200}
              allowImages={true}
            />
          </div>

          <div className="question-field">
            <label>Category</label>
            <select
              value={localQuestion.category || ''}
              onChange={(e) => handleFieldChange('category', e.target.value)}
            >
              <option value="">Select category</option>
              <option value="emergency">Emergency Response</option>
              <option value="safety">Safety Procedures</option>
              <option value="navigation">Navigation</option>
              <option value="cargo">Cargo Operations</option>
              <option value="policies">Policies</option>
              <option value="equipment">Equipment</option>
              <option value="procedures">Procedures</option>
            </select>
          </div>

          {renderQuestionTypeFields()}

          <div className="question-field">
            <label>Explanation</label>
            <RichTextEditor
              value={localQuestion.explanation || ''}
              onChange={(value) => handleFieldChange('explanation', value)}
              placeholder="Explain the correct answer..."
              height="120px"
              onImageUpload={onImageUpload}
            />
          </div>

          <div className="question-field">
            <label>Points</label>
            <input
              type="number"
              value={localQuestion.points || 5}
              onChange={(e) => handleFieldChange('points', parseInt(e.target.value))}
              min="1"
              max="20"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const QuizEditor = ({
  quizData,
  onSave,
  onCancel,
  onImageUpload,
  isSaving = false
}) => {
  const [quiz, setQuiz] = useState(quizData || {
    title: '',
    description: '',
    timeLimit: 30,
    passingScore: 80,
    questions: []
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleQuizFieldChange = useCallback((field, value) => {
    setQuiz(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleQuestionUpdate = useCallback((index, updatedQuestion) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, idx) =>
        idx === index ? updatedQuestion : q
      )
    }));
  }, []);

  const handleQuestionDelete = useCallback((index) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== index)
    }));
  }, []);

  const addNewQuestion = useCallback((type) => {
    const template = questionTypeTemplates[type];
    if (!template) return;

    const newQuestion = {
      ...template,
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setQuiz(prev => {
        const oldIndex = prev.questions.findIndex(q => q.id === active.id);
        const newIndex = prev.questions.findIndex(q => q.id === over.id);

        return {
          ...prev,
          questions: arrayMove(prev.questions, oldIndex, newIndex)
        };
      });
    }
  }, []);

  const handleSave = useCallback(() => {
    // Validate required fields
    if (!quiz.title.trim()) {
      alert('Quiz title is required');
      return;
    }

    if (!quiz.timeLimit || quiz.timeLimit <= 0) {
      alert('Time limit must be greater than 0 minutes');
      return;
    }

    if (!quiz.passingScore || quiz.passingScore <= 0 || quiz.passingScore > 100) {
      alert('Passing score must be between 1 and 100');
      return;
    }

    if (quiz.questions.length === 0) {
      alert('At least one question is required');
      return;
    }

    // Validate each question
    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];
      if (!question.question.trim()) {
        alert(`Question ${i + 1} is missing content`);
        return;
      }
    }

    onSave(quiz);
  }, [quiz, onSave]);

  const questionTypes = useMemo(() => [
    { key: 'multiple_choice', label: 'Multiple Choice', icon: '●' },
    { key: 'yes_no', label: 'Yes/No', icon: '✓' },
    { key: 'short_answer', label: 'Short Answer', icon: '✍' },
    { key: 'fill_in_gaps', label: 'Fill in Gaps', icon: '⬜' },
    { key: 'matching', label: 'Matching', icon: '⟷' },
    { key: 'drag_order', label: 'Order/Sequence', icon: '↕' },
    { key: 'file_upload', label: 'File Upload', icon: '📁' },
    { key: 'scenario', label: 'Scenario', icon: '🎭' }
  ], []);

  return (
    <div className="quiz-editor">
      <div className="editor-header">
        <h2>Edit Quiz</h2>
        <div className="header-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="quiz-settings">
          <div className="setting-group">
            <label>Quiz Title</label>
            <input
              type="text"
              value={quiz.title}
              onChange={(e) => handleQuizFieldChange('title', e.target.value)}
              placeholder="e.g., Phase 1: Basic Safety Assessment"
              className="quiz-title-input"
            />
          </div>

          <div className="setting-group">
            <label>Description</label>
            <textarea
              value={quiz.description}
              onChange={(e) => handleQuizFieldChange('description', e.target.value)}
              placeholder="Describe what this quiz covers..."
              rows={3}
              className="quiz-description-input"
            />
          </div>

          <div className="setting-row">
            <div className="setting-group">
              <label>Time Limit (minutes)</label>
              <input
                type="number"
                value={quiz.timeLimit}
                onChange={(e) => handleQuizFieldChange('timeLimit', parseInt(e.target.value) || 30)}
                min="5"
                max="180"
                className="time-limit-input"
              />
            </div>

            <div className="setting-group">
              <label>Passing Score (%)</label>
              <input
                type="number"
                value={quiz.passingScore}
                onChange={(e) => handleQuizFieldChange('passingScore', parseInt(e.target.value) || 80)}
                min="50"
                max="100"
                className="passing-score-input"
              />
            </div>
          </div>
        </div>

        <div className="questions-section">
          <div className="section-header">
            <h3>Questions ({quiz.questions.length})</h3>
            <div className="question-type-selector">
              <label>Add Question:</label>
              <div className="question-types">
                {questionTypes.map(type => (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => addNewQuestion(type.key)}
                    className="question-type-btn"
                    title={type.label}
                  >
                    <span className="icon">{type.icon}</span>
                    <span className="label">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={quiz.questions.map(q => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="questions-list">
                {quiz.questions.map((question, index) => (
                  <SortableQuestionEditor
                    key={question.id}
                    question={question}
                    index={index}
                    onUpdate={handleQuestionUpdate}
                    onDelete={handleQuestionDelete}
                    onImageUpload={onImageUpload}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {quiz.questions.length === 0 && (
            <div className="empty-state">
              <p>No questions yet. Use the buttons above to add different types of questions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizEditor;
