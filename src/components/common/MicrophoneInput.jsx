import React, { useEffect, useState } from 'react';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import RecordingIndicator from './RecordingIndicator';

const MicrophoneInput = ({ onTranscriptComplete, placeholder, initialText = '' }) => {
  const [text, setText] = useState(initialText);
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState('');
  const { 
    isListening, 
    transcript, 
    interimTranscript,
    error, 
    startListening, 
    stopListening, 
    isSupported,
    isProcessing
  } = useSpeechRecognition();
  
  // Update component text when transcript changes
  useEffect(() => {
    // Only process if we have a transcript and it's different from the last one we processed
    if (transcript && transcript !== lastProcessedTranscript) {
      setLastProcessedTranscript(transcript);
      
      const prevText = text.trim();
      
      // If text is empty or we're just starting, set the text directly
      if (prevText === '') {
        setText(transcript);
      } else {
        // Append the new transcript part, avoiding duplication
        setText(prevText => prevText + ' ' + transcript);
      }
    }
  }, [transcript]); // Remove 'text' from the dependency array
  
  // Handle manual text changes
  const handleTextChange = (e) => {
    setText(e.target.value);
  };
  
  // Toggle microphone
  const toggleListening = () => {
    if (isListening) {
      stopListening();
      // Don't call onTranscriptComplete here, wait for possible processing
    } else {
      // Store the current text before starting new recording
      setLastProcessedTranscript(''); // Reset so we process the next transcript
      startListening();
    }
  };
  
  // When processing is done, call the callback
  useEffect(() => {
    if (!isListening && !isProcessing && transcript) {
      if (onTranscriptComplete) {
        onTranscriptComplete(text.trim());
      }
    }
  }, [isListening, isProcessing, transcript, text, onTranscriptComplete]);
  
  // Call the callback when user is done editing
  const handleBlur = () => {
    if (onTranscriptComplete) {
      onTranscriptComplete(text.trim());
    }
  };
  
  return (
    <>
      <RecordingIndicator isRecording={isListening} isProcessing={isProcessing} />
      
      <div className="relative w-full">
        <div className="flex items-center">
          <textarea
            value={text}
            onChange={handleTextChange}
            onBlur={handleBlur}
            placeholder={placeholder || 'Введите текст или нажмите на микрофон для записи голоса...'}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-y min-h-[100px]"
          />
          {isSupported && (
            <button
              onClick={toggleListening}
              disabled={isProcessing}
              className={`absolute right-3 top-3 p-2 rounded-full transition-all ${
                isListening 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : isProcessing
                    ? 'bg-yellow-500 text-white animate-pulse'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title={
                isListening 
                  ? 'Остановить запись' 
                  : isProcessing
                    ? 'Обработка записи...'
                    : 'Начать запись голоса'
              }
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                {isProcessing ? (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                ) : (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d={isListening 
                      ? "M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" 
                      : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"} 
                  />
                )}
              </svg>
            </button>
          )}
        </div>
        
        {error && (
          <p className="text-red-500 text-sm mt-1">
            {error === 'not-allowed' 
              ? 'Пожалуйста, разрешите доступ к микрофону' 
              : `Ошибка: ${error}`}
          </p>
        )}
        
        {isListening && (
          <div className="text-sm text-gray-500 mt-1 flex items-center">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
            Запись... 
            {interimTranscript && (
              <span className="ml-1 font-medium text-red-600">{interimTranscript}</span>
            )}
          </div>
        )}
        
        {isProcessing && (
          <div className="text-sm text-yellow-600 mt-1 flex items-center">
            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
            Обработка записи...
          </div>
        )}
      </div>
    </>
  );
};

export default MicrophoneInput; 