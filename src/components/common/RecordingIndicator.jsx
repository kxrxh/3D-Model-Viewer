import React from 'react';

const RecordingIndicator = ({ isRecording, isProcessing }) => {
  if (!isRecording && !isProcessing) return null;

  const isOnlyProcessing = !isRecording && isProcessing;

  return (
    <div className={`fixed top-0 left-0 w-full h-12 z-50 flex items-center justify-center text-white gap-3 shadow-lg animate-pulse ${
      isOnlyProcessing ? 'bg-yellow-600 bg-opacity-90' : 'bg-red-600 bg-opacity-90'
    }`}>
      <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
      <span className="font-medium">
        {isOnlyProcessing ? 'Обработка записи...' : 'Запись голоса...'}
      </span>
    </div>
  );
};

export default RecordingIndicator; 