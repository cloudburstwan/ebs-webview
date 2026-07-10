import { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import Player from './components/Player';
import Header from './components/Header';
import Footer from './components/Footer';
import StreamDropdown from './components/StreamDropdown';
import StatusDropdown from './components/StatusDropdown';
import CreditsModal from './components/CreditsModal';
import { useEbsData } from './hooks/useEbsData';
import { StreamStatus, WithholdStatus } from './utils/ebs';
import { DEFAULT_STREAM, APP_NAME } from './utils/env';

function App() {
  const [isDark, setIsDark] = useLocalStorage('ebs-theme-dark', true);
  const [isTheater, setIsTheater] = useLocalStorage('ebs-theater-mode', false);
  const [volume, setVolume] = useLocalStorage('ebs-player-volume', 100);
  const [isMuted, setIsMuted] = useLocalStorage('ebs-player-muted', false);

  const [stream, setStream] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('stream') || DEFAULT_STREAM;
  });

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isStreamSelectionOpen, setIsStreamSelectionOpen] = useState(false);
  const [expandedStreamId, setExpandedStreamId] = useState<string | null>(null);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

  const {
    isLoading,
    availableStreams,
    currentStream,
    sources,
    noStreamsAvailable,
    refetch
  } = useEbsData(stream, setStream);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleStreamChange = (newStream: string) => {
    setStream(newStream);
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('stream', newStream);
    window.history.pushState({}, '', `?${newParams.toString()}`);
    setIsStreamSelectionOpen(false);
  };

  const handleHomeClick = () => {
    setStream(DEFAULT_STREAM);
    const newParams = new URLSearchParams(window.location.search);
    newParams.delete('stream');
    const newUrl = newParams.toString() ? `?${newParams.toString()}` : window.location.pathname;
    window.history.pushState({}, '', newUrl);
    setExpandedStreamId(null);
  };

  // CDN unavailable: stream is live but API returned no playback URLs
  const cdnUnavailable = !isLoading
    && currentStream?.status === StreamStatus.Live
    && currentStream?.witholdStatus === WithholdStatus.None
    && sources.length === 0;

  return (
    <div className={`app-root ${isTheater ? 'theater-mode' : ''}`}>
      <title>{currentStream ? `${currentStream.humanName} - ${APP_NAME}` : APP_NAME}</title>
      <meta name="description" content={currentStream ? `Watching ${currentStream.humanName} on ${APP_NAME}` : `${APP_NAME} - Streaming Platform`} />

      <Header
        currentStream={currentStream}
        isTheater={isTheater}
        onTheaterToggle={() => setIsTheater(!isTheater)}
        isDark={isDark}
        onDarkToggle={() => setIsDark(!isDark)}
        onHomeClick={handleHomeClick}
      >
        <StreamDropdown
          isOpen={isStreamSelectionOpen}
          onToggle={() => {
            setIsStreamSelectionOpen(!isStreamSelectionOpen);
            setIsStatusOpen(false);
          }}
          availableStreams={availableStreams}
          currentStream={stream}
          onStreamChange={handleStreamChange}
          expandedStreamId={expandedStreamId}
          onToggleExpanded={(id) => setExpandedStreamId(expandedStreamId === id ? null : id)}
        />
        <StatusDropdown
          isOpen={isStatusOpen}
          onToggle={() => {
            setIsStatusOpen(!isStatusOpen);
            setIsStreamSelectionOpen(false);
          }}
          currentStream={currentStream}
        />
      </Header>

      <main className={`flex-1 flex items-start sm:items-center justify-center min-h-0 ${isTheater ? 'w-full' : ''}`}>
        <div className={isTheater ? 'w-full' : 'max-w-5xl w-full'}>
          <Player
            stream={stream}
            isLoading={isLoading}
            status={currentStream?.status ?? StreamStatus.Offline}
            witholdStatus={currentStream?.witholdStatus ?? WithholdStatus.None}
            sources={sources}
            cdnUnavailable={cdnUnavailable}
            noStreamsAvailable={noStreamsAvailable}
            volume={volume}
            onVolumeChange={setVolume}
            isMuted={isMuted}
            onMuteChange={setIsMuted}
            refetch={refetch}
          />
        </div>
      </main>

      <Footer onOpenCredits={() => setIsCreditsOpen(true)} />

      <CreditsModal isOpen={isCreditsOpen} onClose={() => setIsCreditsOpen(false)} />
    </div>
  );
}

export default App;

