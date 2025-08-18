import React, { useState, useEffect } from 'react';
import { GripVertical, Check } from 'lucide-react';

/**
 * DragOrderQuestion Component
 * Renders a drag-and-drop ordering question
 */
const DragOrderQuestion = ({ question, answer, onAnswerChange, isOffline }) => {
  const [items, setItems] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedOverItem, setDraggedOverItem] = useState(null);

  // Initialize items from answer or randomized options
  useEffect(() => {
    if (Array.isArray(answer) && answer.length > 0) {
      setItems(answer);
    } else if (question.items) {
      // Randomize initial order
      const shuffled = [...question.items].sort(() => Math.random() - 0.5);
      setItems(shuffled);
    }
  }, [question.items, answer]);

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    // Add dragging class
    e.target.classList.add('opacity-50');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('opacity-50');
    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === null) return;

    if (draggedOverItem !== index) {
      setDraggedOverItem(index);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === dropIndex) return;

    const draggedContent = items[draggedItem];
    const newItems = [...items];

    // Remove dragged item
    newItems.splice(draggedItem, 1);

    // Insert at new position
    const adjustedDropIndex = draggedItem < dropIndex ? dropIndex - 1 : dropIndex;
    newItems.splice(adjustedDropIndex, 0, draggedContent);

    setItems(newItems);
    onAnswerChange(question.id, newItems);
    setDraggedOverItem(null);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e, index) => {
    setDraggedItem(index);
    const touch = e.touches[0];
    e.target.dataset.startY = touch.clientY;
  };

  const handleTouchMove = (e, index) => {
    if (draggedItem === null) return;
    e.preventDefault();

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (element && element.dataset.itemIndex) {
      const overIndex = parseInt(element.dataset.itemIndex);
      if (overIndex !== draggedOverItem) {
        setDraggedOverItem(overIndex);
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (draggedItem === null || draggedOverItem === null) {
      setDraggedItem(null);
      setDraggedOverItem(null);
      return;
    }

    handleDrop(e, draggedOverItem);
    setDraggedItem(null);
  };

  const isComplete = items.length === question.items?.length;

  return (
    <div className="space-y-6">
      {/* Question Text */}
      <h2 className="text-xl font-semibold text-gray-900">
        {question.question}
      </h2>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-blue-800">
          {question.instructions || 'Drag and drop the items to arrange them in the correct order.'}
        </p>
      </div>

      {/* Draggable Items */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onTouchStart={(e) => handleTouchStart(e, index)}
            onTouchMove={(e) => handleTouchMove(e, index)}
            onTouchEnd={handleTouchEnd}
            data-item-index={index}
            className={`
              flex items-center p-4 bg-white rounded-lg border-2
              cursor-move select-none touch-manipulation
              transition-all duration-200
              ${draggedItem === index ? 'opacity-50' : ''}
              ${draggedOverItem === index ? 'border-blue-500 shadow-lg' : 'border-gray-200'}
              hover:shadow-md hover:border-gray-300
            `}
            style={{ touchAction: 'none' }}
          >
            <GripVertical className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
            <span className="flex-1 text-gray-700">{item}</span>
            <span className="text-sm font-medium text-gray-500 ml-3">
              {index + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Completion Status */}
      {isComplete && (
        <div className="flex items-center justify-center text-sm text-green-600">
          <Check className="h-5 w-5 mr-2" />
          <span>Order set - make sure it's correct before proceeding</span>
        </div>
      )}

      {/* Correct Order Hint */}
      {question.hint && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>Hint:</strong> {question.hint}
          </p>
        </div>
      )}

      {/* Offline Indicator */}
      {isOffline && isComplete && (
        <div className="text-center text-sm text-gray-600 flex items-center justify-center">
          <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
          Order saved locally
        </div>
      )}

      {/* Mobile Instructions */}
      <div className="sm:hidden text-center text-xs text-gray-500">
        Touch and hold an item, then drag to reorder
      </div>
    </div>
  );
};

export default DragOrderQuestion;
