import { useState, useEffect, useCallback, useRef } from 'react';

const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Refs to maintain instances
  const recorder = useRef(null);
  const audioStream = useRef(null);
  
  // Check if browser supports audio recording
  useEffect(() => {
    // Check for required browser APIs
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setIsSupported(true);
    } else {
      setError('Ваш браузер не поддерживает запись аудио');
    }
    
    // Try Web Speech API as fallback for Chrome/Edge
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
    }
    
    return () => {
      if (audioStream.current) {
        audioStream.current.getTracks().forEach(track => track.stop());
      }
      if (recorder.current) {
        recorder.current = null;
      }
    };
  }, []);
  
  // Start recording audio
  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Запись аудио не поддерживается');
      return;
    }
    
    try {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      
      // First try native Web Speech API (works in Chrome/Edge)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ru-RU';
        
        recognition.onresult = (event) => {
          // Get the most recent result
          const current = event.resultIndex;
          const result = event.results[current];
          
          if (result.isFinal) {
            // Set final result
            setTranscript(result[0].transcript.trim());
            setInterimTranscript(''); // Clear interim results when we get a final result
          } else {
            // Update interim results for real-time display
            setInterimTranscript(result[0].transcript.trim());
          }
        };
        
        recognition.onerror = (event) => {
          // If not-allowed, we'll try another approach
          if (event.error !== 'not-allowed') {
            setError(event.error);
            setIsListening(false);
          }
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        try {
          recognition.start();
          recorder.current = { webSpeech: recognition };
          setIsListening(true);
          return; // If successful, don't try other methods
        } catch (e) {
          console.log('Web Speech API failed, trying fallback');
          // Continue to fallback
        }
      }
      
      // Fallback: Manual audio recording
      audioStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // Use the MediaRecorder API
      const mediaRecorder = new MediaRecorder(audioStream.current);
      const audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          
          // Send the audio to our API endpoint for speech recognition
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.wav');
          formData.append('language', 'ru-RU');
          
          try {
            const response = await fetch('/api/speech-to-text', {
              method: 'POST',
              body: formData
            });
            
            if (response.ok) {
              const result = await response.json();
              if (result.text) {
                setTranscript(result.text);
              } else {
                throw new Error('Не удалось распознать текст');
              }
            } else {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || 'Ошибка сервера при распознавании речи');
            }
          } catch (apiError) {
            console.error('API error:', apiError);
            setError(`Ошибка API: ${apiError.message}`);
            
            // As a fallback for development, still show that audio was recorded
            console.log(`Recorded audio size: ${audioBlob.size} bytes`);
            if (!transcript) {
              setTranscript('Аудио записано, но сервис распознавания недоступен');
            }
          }
        } catch (err) {
          setError(`Ошибка распознавания: ${err.message}`);
        } finally {
          setIsProcessing(false);
        }
      };
      
      mediaRecorder.start();
      recorder.current = { mediaRecorder, audioChunks };
      setIsListening(true);
      
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Пожалуйста, разрешите доступ к микрофону');
      } else {
        setError(`Ошибка: ${err.message}`);
      }
      setIsListening(false);
    }
  }, [isSupported]);
  
  // Stop recording audio
  const stopListening = useCallback(() => {
    setIsListening(false);
    
    if (recorder.current) {
      if (recorder.current.webSpeech) {
        // If using Web Speech API
        recorder.current.webSpeech.stop();
      } else if (recorder.current.mediaRecorder) {
        // If using MediaRecorder
        recorder.current.mediaRecorder.stop();
      }
    }
    
    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
      audioStream.current = null;
    }
  }, []);
  
  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    isSupported,
    isProcessing
  };
};

export default useSpeechRecognition; 