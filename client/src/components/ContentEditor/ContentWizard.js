import React, { useState } from 'react';
import { MARITIME_TEMPLATES, TEMPLATE_CATEGORIES } from './MaritimeTemplates';
import './ContentWizard.css';

const ContentWizard = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [selections, setSelections] = useState({
    type: '', // 'template' or 'blank'
    category: '',
    template: '',
    title: '',
    description: '',
    timeLimit: 24
  });

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleComplete = () => {
    if (selections.type === 'template' && selections.template) {
      const template = MARITIME_TEMPLATES[selections.template];
      onComplete({
        ...template,
        title: selections.title || template.title,
        description: selections.description || template.description,
        timeLimit: selections.timeLimit || template.timeLimit
      });
    } else {
      // Create blank phase
      onComplete({
        title: selections.title,
        description: selections.description,
        timeLimit: selections.timeLimit,
        items: []
      });
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return selections.type !== '';
      case 2:
        if (selections.type === 'template') {
          return selections.category !== '';
        }
        return true;
      case 3:
        if (selections.type === 'template') {
          return selections.template !== '';
        }
        return selections.title.trim() !== '';
      case 4:
        return selections.title.trim() !== '';
      default:
        return false;
    }
  };

  const getStepCount = () => {
    return selections.type === 'template' ? 4 : 3;
  };

  return (
    <div className="content-wizard-overlay">
      <div className="content-wizard-modal">
        <div className="wizard-header">
          <h2>Create New Training Phase</h2>
          <p>Let's create training content that your crew will actually use</p>

          <div className="wizard-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(step / getStepCount()) * 100}%` }}
              />
            </div>
            <span className="progress-text">
              Step {step} of {getStepCount()}
            </span>
          </div>
        </div>

        <div className="wizard-content">
          {step === 1 && (
            <div className="wizard-step">
              <h3>How would you like to start?</h3>
              <p>Choose the best approach for your training content</p>

              <div className="option-cards">
                <div
                  className={`option-card ${selections.type === 'template' ? 'selected' : ''}`}
                  onClick={() => setSelections(prev => ({ ...prev, type: 'template' }))}
                >
                  <div className="option-icon">📋</div>
                  <h4>Use a Template</h4>
                  <p>Start with proven maritime training templates that follow industry standards</p>
                  <div className="option-benefits">
                    <span>✓ Faster to create</span>
                    <span>✓ Industry standard</span>
                    <span>✓ Complete content</span>
                  </div>
                </div>

                <div
                  className={`option-card ${selections.type === 'blank' ? 'selected' : ''}`}
                  onClick={() => setSelections(prev => ({ ...prev, type: 'blank' }))}
                >
                  <div className="option-icon">✏️</div>
                  <h4>Start from Scratch</h4>
                  <p>Create completely custom training content tailored to your specific needs</p>
                  <div className="option-benefits">
                    <span>✓ Fully customizable</span>
                    <span>✓ Your specific procedures</span>
                    <span>✓ Complete control</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && selections.type === 'template' && (
            <div className="wizard-step">
              <h3>What type of training do you need?</h3>
              <p>Select the category that best fits your training goals</p>

              <div className="category-grid">
                {TEMPLATE_CATEGORIES.map(category => (
                  <div
                    key={category.id}
                    className={`category-card ${selections.category === category.id ? 'selected' : ''}`}
                    onClick={() => setSelections(prev => ({ ...prev, category: category.id }))}
                    style={{ '--category-color': category.color }}
                  >
                    <div className="category-icon">{category.icon}</div>
                    <h4>{category.name}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && selections.type === 'template' && (
            <div className="wizard-step">
              <h3>Choose a template</h3>
              <p>Select the template that best matches your training needs</p>

              <div className="template-list">
                {Object.entries(MARITIME_TEMPLATES)
                  .filter(([_, template]) => template.category === selections.category)
                  .map(([key, template]) => (
                    <div
                      key={key}
                      className={`template-card ${selections.template === key ? 'selected' : ''}`}
                      onClick={() => setSelections(prev => ({ ...prev, template: key }))}
                    >
                      <div className="template-header">
                        <h4>{template.title}</h4>
                        <span className="template-duration">⏱️ {template.timeLimit}h</span>
                      </div>
                      <p>{template.description}</p>
                      <div className="template-stats">
                        <span>📚 {template.items.length} modules</span>
                        <span>🎯 {template.category}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {((step === 3 && selections.type === 'blank') || (step === 4 && selections.type === 'template')) && (
            <div className="wizard-step">
              <h3>Customize your training phase</h3>
              <p>Add the details that make this training relevant to your crew</p>

              <div className="form-section">
                <label>Training Title *</label>
                <input
                  type="text"
                  value={selections.title}
                  onChange={(e) => setSelections(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={selections.type === 'template' && selections.template
                    ? MARITIME_TEMPLATES[selections.template]?.title
                    : 'e.g., Emergency Response Training'}
                  className="wizard-input"
                />
              </div>

              <div className="form-section">
                <label>Description</label>
                <textarea
                  value={selections.description}
                  onChange={(e) => setSelections(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={selections.type === 'template' && selections.template
                    ? MARITIME_TEMPLATES[selections.template]?.description
                    : 'Describe what your crew will learn in this training phase...'}
                  rows={3}
                  className="wizard-textarea"
                />
              </div>

              <div className="form-section">
                <label>Time Limit (hours)</label>
                <div className="time-limit-options">
                  {[12, 24, 48, 72].map(hours => (
                    <button
                      key={hours}
                      type="button"
                      className={`time-option ${selections.timeLimit === hours ? 'selected' : ''}`}
                      onClick={() => setSelections(prev => ({ ...prev, timeLimit: hours }))}
                    >
                      {hours}h
                    </button>
                  ))}
                  <input
                    type="number"
                    value={selections.timeLimit}
                    onChange={(e) => setSelections(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 24 }))}
                    min="1"
                    max="168"
                    className="custom-time-input"
                  />
                </div>
                <p className="help-text">
                  How long should crew members have to complete this training?
                </p>
              </div>

              {selections.type === 'template' && selections.template && (
                <div className="template-preview">
                  <h4>This template includes:</h4>
                  <ul>
                    {MARITIME_TEMPLATES[selections.template].items.map((item, index) => (
                      <li key={index}>
                        <strong>{item.title}</strong> - {item.description}
                      </li>
                    ))}
                  </ul>
                  <p className="template-note">
                    💡 You can customize all content after creating the training phase
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="wizard-footer">
          <div className="footer-left">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-secondary"
              >
                ← Back
              </button>
            )}
          </div>

          <div className="footer-right">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-text"
            >
              Cancel
            </button>

            {step < getStepCount() ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isStepValid()}
                className="btn btn-primary"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={!isStepValid()}
                className="btn btn-success"
              >
                Create Training Phase
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentWizard;
