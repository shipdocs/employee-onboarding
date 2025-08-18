import React from 'react';

const AlignmentGuides = ({ guides }) => {
  if (!guides || guides.length === 0) {
    return null;
  }

  return (
    <div className="alignment-guides">
      {guides.map((guide, index) => (
        <div
          key={index}
          className={`alignment-guide ${guide.type}`}
          style={{
            [guide.type === 'vertical' ? 'left' : 'top']: `${guide.position}px`,
            [guide.type === 'vertical' ? 'top' : 'left']: `${guide.start}px`,
            [guide.type === 'vertical' ? 'height' : 'width']: `${guide.end - guide.start}px`
          }}
        />
      ))}
    </div>
  );
};

export default AlignmentGuides;
