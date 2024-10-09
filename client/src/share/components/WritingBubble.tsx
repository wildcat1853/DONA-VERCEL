import React from 'react';

const WritingBubble: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 bg-white rounded-3xl py-3 px-4" style={{ maxWidth: "70%" }}>
      <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
      <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
  );
};

export default WritingBubble;
