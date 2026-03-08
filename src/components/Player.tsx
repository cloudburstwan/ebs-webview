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
  isValidating: boolean;
  isLive: boolean;
  sources: any[];
  currentQualityIndex: number;
}

const Player: React.FC<PlayerProps> = ({ station, baseUrl, isValidating, isLive, sources, currentQualityIndex }) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstance = useRef<ReturnType<typeof OvenPlayer.create> | null>(null);
  const [hasError, setHasError] = React.useState(false);

  // Reset error state when sources or station change
  useEffect(() => {
    setHasError(false);
  }, [sources, station]);

  useEffect(() => {
    if (!isValidating && isLive && sources.length > 0 && playerRef.current) {
      if (playerInstance.current) {
        playerInstance.current.remove();
      }

      const displayStation = station.charAt(0).toUpperCase() + station.slice(1);
      const qualityLabel = sources[currentQualityIndex]?.label;
      const displayTitle = qualityLabel && qualityLabel !== 'Direct' 
        ? `EBS - ${displayStation} (${qualityLabel})`
        : `EBS - ${displayStation}`;

      playerInstance.current = OvenPlayer.create('oven-player-container', {
        title: displayTitle,
        autoStart: true,
        playbackRates: [],
        sources: sources,
        hlsConfig: {
          liveSyncDuration: 12,
          liveMaxLatencyDuration: 24,
          maxLiveSyncPlaybackRate: 1.5
        }
      });

      playerInstance.current.on('error', (error: any) => {
        console.error('OvenPlayer error:', error);
        setHasError(true);
      });

      // Set initial quality if it's not the first one
      if (currentQualityIndex > 0) {
        playerInstance.current.setCurrentSource(currentQualityIndex);
      }
    }

    return () => {
      if (playerInstance.current) {
        playerInstance.current.remove();
        playerInstance.current = null;
      }
    };
  }, [isValidating, isLive, sources, station, baseUrl]);

  useEffect(() => {
    if (playerInstance.current && sources.length > currentQualityIndex) {
      playerInstance.current.setCurrentSource(currentQualityIndex);
      
      // Update title as well
      const displayStation = station.charAt(0).toUpperCase() + station.slice(1);
      const qualityLabel = sources[currentQualityIndex]?.label;
      const displayTitle = qualityLabel && qualityLabel !== 'Direct' 
        ? `EBS - ${displayStation} (${qualityLabel})`
        : `EBS - ${displayStation}`;
      
      // OvenPlayer setTitle might not be reactive or exist in all versions, 
      // but we can try the public API if available or re-trigger title through config.
      // Most OvenPlayer versions allow access to the UI component or config.
      try {
        (playerInstance.current as any).getConfig().title = displayTitle;
        // Force UI update if possible
        const titleEl = playerRef.current?.querySelector('.op-title-text');
        if (titleEl) titleEl.textContent = displayTitle;
      } catch (e) {
        console.warn("Failed to update OvenPlayer title via API", e);
      }
    }
  }, [currentQualityIndex, sources, station]);

  return (
    <div className="player-frame group relative">
      {/* Status Badge */}
      {!isValidating && (
        <div className={`status-badge ${isLive && !hasError ? 'badge-live' : 'badge-offline'}`}>
          <span className={`status-dot ${isLive && !hasError ? 'animate-pulse-glow' : ''}`}></span>
          {isLive && !hasError ? 'Live' : 'Offline'}
        </div>
      )}
      
      {isValidating ? (
        <div className="w-full h-full flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/10 border-t-white/60 rounded-full animate-spin"></div>
            <p className="text-white/60 font-medium animate-pulse">Checking Stream...</p>
          </div>
        </div>
      ) : (!isLive || hasError) ? (
        <div className="w-full h-full flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
          <div className="text-center px-6">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
              <svg className="w-10 h-10 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{hasError ? 'Connection Error' : 'Stream Offline'}</h3>
            <p className="text-white/60">
              {hasError 
                ? 'We encountered a network error while trying to play this stream.' 
                : "We couldn't find any active video feeds for this station."}
            </p>
          </div>
        </div>
      ) : (
        <div id="oven-player-container" ref={playerRef} className="w-full h-full" />
      )}
    </div>
  );
};

export default Player;
