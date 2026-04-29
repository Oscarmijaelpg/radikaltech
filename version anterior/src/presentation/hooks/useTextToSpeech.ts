import { useState, useCallback } from 'react';

export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(null);
  }, []);

  const speak = useCallback((text: string, id: string) => {
    // If already playing this message, stop it
    if (isPlaying === id) {
      stop();
      return;
    }

    // Stop any other playback
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES'; // Default to Spanish as requested in Spanish
    
    utterance.onend = () => {
      setIsPlaying(null);
    };

    utterance.onerror = () => {
      setIsPlaying(null);
    };

    setIsPlaying(id);
    window.speechSynthesis.speak(utterance);
  }, [isPlaying, stop]);

  return { speak, stop, isPlaying };
};
