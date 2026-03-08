import React, { useEffect, useRef } from 'react';
import OvenPlayer from 'ovenplayer';
import Hls from 'hls.js';

// Ensure Hls is available globally for OvenPlayer
if (typeof window !== 'undefined') {
  (window as Window & { Hls?: typeof Hls }).Hls = Hls;
}

interface PlayerProps {
  source: string;
}

const Player: React.FC<PlayerProps> = ({ source }) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstance = useRef<ReturnType<typeof OvenPlayer.create> | null>(null);

  useEffect(() => {
    if (playerRef.current) {
      playerInstance.current = OvenPlayer.create('oven-player-container', {
        autoStart: true,
        sources: [
          {
            label: 'Live Stream',
            type: 'hls',
            file: source,
            default: true
          }
        ],
        hlsConfig: {
          liveSyncDuration: 12,
          liveMaxLatencyDuration: 24,
          maxLiveSyncPlaybackRate: 1.5
        }
      });
    }

    return () => {
      if (playerInstance.current) {
        playerInstance.current.remove();
      }
    };
  }, [source]);

  return (
    <div className="player-frame">
      <div id="oven-player-container" ref={playerRef} className="w-full h-full" />
    </div>
  );
};

export default Player;
