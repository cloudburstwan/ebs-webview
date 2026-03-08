import React, { useEffect, useRef } from 'react';
import OvenPlayer from 'ovenplayer';
import Hls from 'hls.js';

// Ensure Hls is available globally for OvenPlayer
if (typeof window !== 'undefined') {
  (window as Window & { Hls?: typeof Hls }).Hls = Hls;
}

interface PlayerProps {
  station: string;
  baseUrl: string;
}

const Player: React.FC<PlayerProps> = ({ station, baseUrl }) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstance = useRef<ReturnType<typeof OvenPlayer.create> | null>(null);

  useEffect(() => {
    if (playerRef.current) {
      playerInstance.current = OvenPlayer.create('oven-player-container', {
        autoStart: true,
        sources: [
          {
            label: '1080p',
            type: 'hls',
            file: `${baseUrl}${station}-1080p.m3u8`
          },
          {
            label: '720p',
            type: 'hls',
            file: `${baseUrl}${station}-720p.m3u8`
          },
          {
            label: '360p',
            type: 'hls',
            file: `${baseUrl}${station}-360p.m3u8`,
          },
          {
            label: 'source',
            type: 'hls',
            file: `${baseUrl}${station}.m3u8`,
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
  }, [station, baseUrl]);

  return (
    <div className="player-frame">
      <div id="oven-player-container" ref={playerRef} className="w-full h-full" />
    </div>
  );
};

export default Player;
