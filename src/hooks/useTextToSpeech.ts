import { useState } from 'react';

export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const speak = async (text: string) => {
    try {
      if (isPlaying) {
        currentAudio?.pause();
      }

      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Play the base64 audio
      const audio = new Audio(`data:${data.mimeType};base64,${data.audioBase64}`);
      setCurrentAudio(audio);
      setIsPlaying(true);

      audio.onended = () => setIsPlaying(false);
      audio.play();

    } catch (error) {
      console.error("TTS Playback Error:", error);
      setIsPlaying(false);
    }
  };

  const stop = () => {
    currentAudio?.pause();
    setIsPlaying(false);
  };

  return { speak, stop, isPlaying };
};