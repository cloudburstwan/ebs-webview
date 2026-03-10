import { useEffect, useRef, useState } from 'react';
import OvenPlayer from 'ovenplayer';
import Hls from 'hls.js';

// Ensure Hls is available globally for OvenPlayer
if (typeof window !== 'undefined') {
  (window as any).Hls = Hls;
}

import { StreamStatus, WithholdStatus } from '../utils/ebs';
import { PLAYER_MAX_LIVE_SYNC_PLAYBACK_RATE, PLAYER_LIVE_SYNC_DURATION } from '../utils/env';

interface PlayerProps {
  stream: string;
  isValidating: boolean;
  status: StreamStatus;
  witholdStatus: WithholdStatus;
  sources: {
    label: string;
    file: string;
    type: 'hls' | 'webrtc' | 'dash';
    default?: boolean;
  }[];
  selectedQuality?: string | null;
  volume: number;
  onVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onMuteChange: (isMuted: boolean) => void;
  refetch: () => void;
}

const PlayerState = {
  NEW: 'NEW',
  SETUP: 'SETUP',
  READY: 'READY',
  VALIDATING_SOURCES: 'VALIDATING_SOURCES',
  CONTENT_AVAILABLE: 'CONTENT_AVAILABLE',
  PLAYING: 'PLAYING',
  ERROR: 'ERROR',
  RECONNECTING: 'RECONNECTING'
} as const;
type PlayerState = typeof PlayerState[keyof typeof PlayerState];

const Player = ({ stream, isValidating, status, witholdStatus, sources, selectedQuality: _selectedQuality, volume, onVolumeChange, isMuted, onMuteChange, refetch }: PlayerProps) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstance = useRef<any>(null);
  const onVolumeChangeRef = useRef(onVolumeChange);
  const onMuteChangeRef = useRef(onMuteChange);
  const lastStreamRef = useRef(stream);
  const lastLoadedSourcesRef = useRef<string>('');
  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.NEW);
  const [retryCount, setRetryCount] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Keep callback ref up to date
  useEffect(() => {
    onVolumeChangeRef.current = onVolumeChange;
    onMuteChangeRef.current = onMuteChange;
  }, [onVolumeChange, onMuteChange]);

  const isLive = status === StreamStatus.Live;
  const isStarting = status === StreamStatus.Starting;
  const isWithheld = witholdStatus !== WithholdStatus.None;

  // Initial State, Stream Switching, and Status Transitions
  useEffect(() => {
    const isReadyForPlayback = isLive && !isWithheld;

    // 1. Reset on stream change
    if (lastStreamRef.current !== stream) {
      console.log(`[Player] State: Stream changed from ${lastStreamRef.current} to ${stream}. Resetting to READY.`);
      lastStreamRef.current = stream;
      destroyPlayer(); // Immediately stop old stream
      setPlayerState(PlayerState.READY);
      setRetryCount(0);
      setErrorDetails(null);
    }
    // 2. Initial setup
    else if (playerState === PlayerState.NEW) {
      setPlayerState(PlayerState.READY);
    }
    // 3. Reset if status becomes non-live or withheld while in an active state
    else if (!isReadyForPlayback &&
      playerState !== PlayerState.READY) {
      console.log(`[Player] State: Status transition: isLive=${isLive}, isWithheld=${isWithheld}. Resetting to READY.`);
      destroyPlayer();
      setPlayerState(PlayerState.READY);
      setRetryCount(0);
    }
  }, [stream, playerState, isLive, isWithheld]);

  const destroyPlayer = () => {
    if (playerInstance.current) {
      console.log('[Player] Destroying instance');
      playerInstance.current.remove();
      playerInstance.current = null;
      if (typeof window !== 'undefined') {
        (window as any).OvenPlayerInstance = null;
      }
    }
  };

  const validateSources = async (): Promise<boolean> => {
    console.log(`[Player] Validating ${sources.length} sources...`);

    // We try to validate at least the first source (usually the default)
    // or any source marked as default.
    const sourcesToValidate = sources.filter(s => s.default).length > 0
      ? sources.filter(s => s.default)
      : [sources[0]];

    for (const source of sourcesToValidate) {
      try {
        const response = await fetch(source.file, {
          method: 'HEAD',
          cache: 'no-cache',
          redirect: 'follow'
        });

        if (response.ok) {
          console.log(`[Player] Source ${source.label} is reachable (${response.status})`);
          return true;
        } else {
          console.warn(`[Player] Source ${source.label} validation failed: ${response.status} ${response.statusText}`);
          if (response.status === 404) {
            setErrorDetails(`Source not found (404)`);
          } else {
            setErrorDetails(`Source unreachable (${response.status})`);
          }
        }
      } catch (err) {
        console.error(`[Player] Source ${source.label} fetch error:`, err);
        setErrorDetails('Network error validating source');
      }
    }

    return false;
  };

  const createPlayer = () => {
    if (!playerRef.current || sources.length === 0 || !isLive || isWithheld) {
      setPlayerState(PlayerState.READY);
      return;
    }

    setPlayerState(PlayerState.SETUP);
    destroyPlayer();

    const displayStream = stream.charAt(0).toUpperCase() + stream.slice(1);
    console.log(`[Player] State: SETUP -> Creating OvenPlayer for ${stream} with ${sources.length} sources`);

    const instance = OvenPlayer.create('oven-player-container', {
      title: `EBS - ${displayStream}`,
      autoStart: true,
      playbackRates: [],
      sources: sources,
      preload: 'auto',
      hlsConfig: {
        liveSyncDuration: PLAYER_LIVE_SYNC_DURATION,
        liveMaxLatencyDuration: PLAYER_LIVE_SYNC_DURATION * 2,
        maxLiveSyncPlaybackRate: PLAYER_MAX_LIVE_SYNC_PLAYBACK_RATE,
        enableWorker: true,
        lowLatencyMode: true
      }
    });

    playerInstance.current = instance;
    lastLoadedSourcesRef.current = JSON.stringify(sources);

    if (typeof window !== 'undefined') {
      (window as any).OvenPlayerInstance = instance;
    }

    instance.on('ready', () => {
      console.log('[Player] State: OvenPlayer READY -> CONTENT_AVAILABLE');
      setPlayerState(PlayerState.CONTENT_AVAILABLE);
      setRetryCount(0);
      setErrorDetails(null);

      // Add "Go Live" button
      const container = instance.getContainerElement();
      if (container) {
        const rightControls = container.querySelector('.op-right-controls');
        if (rightControls && !container.querySelector('.live-holder')) {
          const liveHolder = document.createElement('div');
          liveHolder.className = 'live-holder op-navigators op-clear';
          const button = document.createElement('button');
          button.className = 'op-button op-live-button';
          button.title = 'Go Live';
          button.setAttribute('aria-label', 'Go Live');
          button.innerHTML = `<span class="op-live-text">Go Live</span>`;
          button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const duration = instance.getDuration();
            instance.seek(duration);
          };
          liveHolder.appendChild(button);
          rightControls.insertBefore(liveHolder, rightControls.firstChild);
        }
      }

      instance.setVolume(volume);
      instance.setMute(isMuted);
    });

    instance.on('play', () => {
      console.log('[Player] State: -> PLAYING');
      setPlayerState(PlayerState.PLAYING);
    });

    instance.on('volumeChanged', (data: any) => {
      console.log('[Player] Volume Changed:', data.volume);
      if (typeof data.volume === 'number' && onVolumeChangeRef.current) {
        onVolumeChangeRef.current(data.volume);
      }
    });

    instance.on('mute', (data: any) => {
      console.log('[Player] Mute:', data.mute);
      if (typeof data.mute === 'boolean' && onMuteChangeRef.current) {
        onMuteChangeRef.current(data.mute);
      }
    });

    instance.on('error', (error: any) => {
      console.error('[Player] OvenPlayer ERROR:', error);
      setErrorDetails(error?.message || 'Unknown player error');
      setPlayerState(PlayerState.ERROR);
    });

    instance.on('buffer', (info: any) => {
      if (info.type === 'stale') {
        console.warn('[Player] State: Stale buffer detected, attempting reset');
        setPlayerState(PlayerState.READY);
      }
    });
  };

  // State Handler Effect
  useEffect(() => {
    let timeoutId: any;

    const handleState = async () => {
      switch (playerState) {
        case PlayerState.READY:
          if (isLive && !isWithheld && sources.length > 0) {
            console.log('[Player] State: READY -> VALIDATING_SOURCES');
            setPlayerState(PlayerState.VALIDATING_SOURCES);
          }
          break;

        case PlayerState.VALIDATING_SOURCES:
          const isValid = await validateSources();
          if (isValid) {
            console.log('[Player] State: VALIDATING_SOURCES Passed -> SETUP');
            createPlayer();
          } else {
            console.error('[Player] State: VALIDATING_SOURCES Failed -> ERROR');
            setPlayerState(PlayerState.ERROR);
          }
          break;

        case PlayerState.ERROR:
          if (retryCount < 3) {
            console.log(`[Player] State: ERROR -> Waiting to Reconnect (Count: ${retryCount + 1}/3)`);
            timeoutId = setTimeout(() => {
              setRetryCount(prev => prev + 1);
              setPlayerState(PlayerState.RECONNECTING);
            }, 3000);
          } else {
            console.log('[Player] State: ERROR (Persistent) -> Waiting 30s to Refresh');
            timeoutId = setTimeout(() => {
              console.log('[Player] State: 30s timeout reached. Resetting retry count and attempting READY.');
              refetch(); // Ensure fresh stream data before retry
              setRetryCount(0);
              setPlayerState(PlayerState.READY);
            }, 30000);
          }
          break;

        case PlayerState.RECONNECTING:
          console.log('[Player] State: RECONNECTING -> READY');
          setPlayerState(PlayerState.READY);
          break;

        default:
          break;
      }
    };

    handleState();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [playerState, isLive, isWithheld, sources.length, retryCount]);

  // Handle source updates without full destroy if possible
  useEffect(() => {
    if (playerInstance.current && playerState === PlayerState.PLAYING) {
      const sourcesString = JSON.stringify(sources);
      if (lastLoadedSourcesRef.current !== sourcesString) {
        console.log('[Player] Updating sources on active instance');
        playerInstance.current.load(sources);
        lastLoadedSourcesRef.current = sourcesString;
      }
    }
  }, [sources, playerState]);

  // Sync volume/mute
  useEffect(() => {
    if (playerInstance.current) {
      if (playerInstance.current.getVolume && playerInstance.current.getVolume() !== volume) {
        playerInstance.current.setVolume(volume);
      }
      if (playerInstance.current.getMute && playerInstance.current.getMute() !== isMuted) {
        playerInstance.current.setMute(isMuted);
      }
    }
  }, [volume, isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => destroyPlayer();
  }, []);

  const getStatusLabel = () => {
    if (playerState === PlayerState.ERROR) return 'Error';
    if (playerState === PlayerState.RECONNECTING || playerState === PlayerState.VALIDATING_SOURCES) return 'Connecting...';
    if (isWithheld) return 'Withheld';
    if (isLive) return 'Live';
    if (isStarting) return 'Starting';
    return 'Offline';
  };

  const getErrorMessage = () => {
    if (isWithheld) {
      switch (witholdStatus) {
        case WithholdStatus.Legal: return "This stream has been withheld for legal reasons.";
        case WithholdStatus.Policy: return "This stream is withheld due to policy restrictions.";
        case WithholdStatus.Issues: return "This stream is temporarily withheld due to technical issues.";
        default: return "This stream is currently withheld.";
      }
    }
    if (isStarting) return "The stream is starting and will be live in about a minute.";
    if (playerState === PlayerState.ERROR) {
      if (retryCount >= 3) return "Failed to connect after multiple attempts. Retrying in 30 seconds...";
      return `The connection was lost. Reconnecting... (Attempt ${retryCount + 1}/3)`;
    }
    if (playerState === PlayerState.VALIDATING_SOURCES) return "Checking source availability...";
    if (playerState === PlayerState.READY || playerState === PlayerState.SETUP) return "Preparing the player...";
    return "This stream is currently offline or does not exist.";
  };

  const showOverlay = !isLive || isWithheld || playerState === PlayerState.ERROR || playerState === PlayerState.READY || playerState === PlayerState.SETUP || playerState === PlayerState.VALIDATING_SOURCES || isValidating;
  const showPlayer = (playerState === PlayerState.CONTENT_AVAILABLE || playerState === PlayerState.PLAYING) && !isValidating && !isWithheld && isLive;

  return (
    <div className="player-frame group relative overflow-hidden" role="application" aria-label={`Video player for ${stream}`}>
      {/* Layer 1: The Player Instance (Background) */}
      <div id="player-container" className={`${!showPlayer ? 'player-hidden' : ''} absolute inset-px z-0 bg-transparent`}>
        <div
          id="oven-player-container"
          ref={playerRef}
          className={`w-full h-full transition-opacity duration-500 ${showPlayer ? 'opacity-100 flex' : 'opacity-0'}`}
        />
      </div>

      {/* Layer 2: UI Overlay Layer (Foreground) */}
      <div className={`absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center transition-colors duration-300 ${showOverlay ? 'bg-slate-200/20 dark:bg-black/40' : ''}`}>

        {/* Status Badge (Stays in top-right) */}
        {!isValidating && (
          <div
            className={`absolute top-4 right-4 z-50 pointer-events-auto status-badge cursor-pointer ${(isLive && playerState !== PlayerState.ERROR) ? 'badge-live active:scale-95 transition-transform' : ((isStarting && playerState !== PlayerState.ERROR) ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 border-amber-500/20 dark:border-amber-500/30' : 'badge-offline')}`}
            onClick={(e) => {
              e.stopPropagation();
              if (isLive && playerState === PlayerState.PLAYING && playerInstance.current) {
                const duration = playerInstance.current.getDuration();
                playerInstance.current.seek(duration);
              }
            }}
            title={isLive ? "Click to sync to live edge" : undefined}
          >
            <span className={`status-dot ${(isLive && playerState !== PlayerState.ERROR) ? 'animate-pulse-glow' : ((isStarting || playerState === PlayerState.RECONNECTING) ? 'bg-amber-500 animate-pulse' : '')}`}></span>
            {getStatusLabel()}
          </div>
        )}

        {isValidating ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-slate-400/20 border-t-teal-500 rounded-full animate-spin"></div>
            <p className="text-slate-600 dark:text-white/60 font-medium animate-pulse">Initializing Stream...</p>
          </div>
        ) : (showOverlay && playerState !== PlayerState.PLAYING && playerState !== PlayerState.CONTENT_AVAILABLE) ? (
          <div className="text-center px-6 pointer-events-auto">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border ${isStarting || playerState === PlayerState.RECONNECTING ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
              {playerState === PlayerState.ERROR || playerState === PlayerState.RECONNECTING ? (
                <div className={`w-10 h-10 border-4 border-rose-500/20 ${playerState === PlayerState.RECONNECTING ? 'border-t-amber-500' : 'border-t-rose-500'} rounded-full animate-spin`}></div>
              ) : (
                <svg className={`w-10 h-10 ${isStarting ? 'text-amber-500' : 'text-rose-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {playerState === PlayerState.ERROR ? 'Connection Lost' : (playerState === PlayerState.RECONNECTING ? 'Reconnecting' : (isWithheld ? 'Stream Withheld' : (isStarting ? 'Starting Soon' : ((playerState === PlayerState.READY || playerState === PlayerState.SETUP || playerState === PlayerState.VALIDATING_SOURCES) ? 'Player Loading' : 'Stream Unavailable'))))}
            </h3>
            <p className="text-slate-500 dark:text-white/60 max-w-sm mx-auto">
              {getErrorMessage()}
            </p>
            {playerState === PlayerState.ERROR && errorDetails && (
              <p className="text-xs text-rose-500/60 mt-2 font-mono max-w-[250px] mx-auto truncate" title={errorDetails}>
                {errorDetails}
              </p>
            )}
            {playerState === PlayerState.ERROR && retryCount >= 3 && (
              <button
                onClick={() => {
                  refetch(); // Ensure fresh stream data on manual retry
                  setRetryCount(0);
                  setPlayerState(PlayerState.READY);
                }}
                className="mt-6 px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors font-semibold shadow-lg shadow-rose-500/20"
              >
                Retry Now
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Player;
