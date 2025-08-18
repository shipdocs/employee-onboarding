import React from 'react';
import MultipleChoiceQuestion from './questions/MultipleChoiceQuestion';
import YesNoQuestion from './questions/YesNoQuestion';
import FileUploadQuestion from './questions/FileUploadQuestion';
import FillInGapsQuestion from './questions/FillInGapsQuestion';
import ShortAnswerQuestion from './questions/ShortAnswerQuestion';
import ScenarioQuestion from './questions/ScenarioQuestion';
import DragOrderQuestion from './questions/DragOrderQuestion';
import MatchingQuestion from './questions/MatchingQuestion';
import { AlertCircle } from 'lucide-react';

/**
 * QuizQuestion Component
 * Routes to the appropriate question component based on question type
 */
const QuizQuestion = ({
  question,
  answer,
  onAnswerChange,
  uploadedFile,
  onFileUpload,
  isOffline
}) => {
  if (!question) {
    return (
      <div className="flex items-center justify-center p-8 bg-red-50 rounded-lg">
        <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
        <span className="text-red-800">Question data not available</span>
      </div>
    );
  }

  // Common props for all question types
  const commonProps = {
    question,
    answer,
    onAnswerChange,
    isOffline
  };

  // Route to appropriate question component based on type
  switch (question.type) {
    case 'multiple_choice':
      return <MultipleChoiceQuestion {...commonProps} />;

    case 'yes_no':
      return <YesNoQuestion {...commonProps} />;

    case 'file_upload':
      return (
        <FileUploadQuestion
          {...commonProps}
          uploadedFile={uploadedFile}
          onFileUpload={onFileUpload}
        />
      );

    case 'fill_in_gaps':
      return <FillInGapsQuestion {...commonProps} />;

    case 'short_answer':
      return <ShortAnswerQuestion {...commonProps} />;

    case 'scenario':
      return <ScenarioQuestion {...commonProps} />;

    case 'drag_order':
      return <DragOrderQuestion {...commonProps} />;

    case 'matching':
      return <MatchingQuestion {...commonProps} />;

    default:
      return (
        <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-base font-semibold text-yellow-800">
                Unsupported Question Type
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Question type "{question.type}" is not supported yet.
              </p>
              <pre className="mt-3 p-3 bg-yellow-100 rounded text-xs text-yellow-800 overflow-auto">
                {JSON.stringify(question, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      );
  }
};

export default QuizQuestion;
