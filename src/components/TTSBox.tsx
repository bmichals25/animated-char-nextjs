'use client';

import { useState, useRef } from 'react';
import axios from 'axios';

// Create an environment variable file for production
const API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';

export default function TTSBox() {
  const [text, setText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = async () => {
    if (!text.trim() || isPlaying) return;
    
    setIsPlaying(true);
    
    try {
      // Default voice - Rachel
      const voiceId = "21m00Tcm4TlvDq8ikWAM";
      
      // Use the Eleven Labs API directly
      const response = await axios({
        method: 'POST',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        data: {
          text: text.trim(),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        },
        responseType: 'arraybuffer'
      });

      // Convert the audio data to a Blob URL
      const blob = new Blob([response.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => {
          setIsPlaying(false);
        };
      }
      
      // Set the source and play
      audioRef.current.src = url;
      await audioRef.current.play();
      
    } catch (error) {
      console.error('Failed to play text:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-50 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg w-80">
      <div className="flex flex-col space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to speak..."
          className="p-2 border rounded-md dark:bg-gray-700 dark:text-white"
          rows={3}
        />
        <button
          onClick={handlePlay}
          disabled={isPlaying || !text.trim()}
          className={`flex items-center justify-center p-2 rounded-md transition-colors ${
            isPlaying 
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isPlaying ? 'Speaking...' : 'Play'}
        </button>
      </div>
    </div>
  );
} 