import { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import Player from './components/Player';
import Header from './components/Header';
import Footer from './components/Footer';
import StreamDropdown from './components/StreamDropdown';
import StatusDropdown from './components/StatusDropdown';
import { useEbsData } from './hooks/useEbsData';
import { StreamStatus, WithholdStatus } from './utils/ebs';
import { DEFAULT_STREAM, DEFAULT_QUALITY } from './utils/env';

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
  const [region, setRegion] = useState('Default');
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(DEFAULT_QUALITY);

  const {
    isLoading,
    availableStreams,
    currentStream,
    sources,
    isValidatingSources
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
    setSelectedQuality(DEFAULT_QUALITY); // Reset quality on stream change
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('stream', newStream);
    window.history.pushState({}, '', `?${newParams.toString()}`);
    setIsStreamSelectionOpen(false);
  };

  const handleHomeClick = () => {
    setStream(DEFAULT_STREAM);
    setSelectedQuality(DEFAULT_QUALITY);
    const newParams = new URLSearchParams(window.location.search);
    newParams.delete('stream');
    const newUrl = newParams.toString() ? `?${newParams.toString()}` : window.location.pathname;
    window.history.pushState({}, '', newUrl);
    setExpandedStreamId(null);
  };

  // UI Sources: Preserve original order for the dropdown menu
  const uiSources = useMemo(() => {
    return sources.map(source => ({
      ...source,
      default: selectedQuality ? source.label === selectedQuality : source.default
    }));
  }, [sources, selectedQuality]);

  // Player Sources: Reorder to put selected quality first for OvenPlayer priority 
  const playerSources = useMemo(() => {
    const sorted = [...uiSources];
    if (selectedQuality) {
      const selectedIndex = sorted.findIndex(s => s.label === selectedQuality);
      if (selectedIndex !== -1) {
        const [selected] = sorted.splice(selectedIndex, 1);
        return [selected, ...sorted];
      }
    }
    return sorted;
  }, [uiSources, selectedQuality]);

  return (
    <div className={`app-root ${isTheater ? 'theater-mode' : ''}`}>
      <title>{currentStream ? `${currentStream.name} - EBS` : 'Equestrian Broadcast Service'}</title>
      <meta name="description" content={currentStream ? `Watching ${currentStream.name} on EBS` : 'Equestrian Broadcast Service - Streaming Platform'} />

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
            setIsRegionOpen(false);
          }}
          currentStream={currentStream}
          region={region}
          isRegionOpen={isRegionOpen}
          onRegionToggle={(e) => {
            e.stopPropagation();
            setIsRegionOpen(!isRegionOpen);
          }}
          onRegionSelect={(r) => {
            setRegion(r);
            setIsRegionOpen(false);
          }}
        />
      </Header>

      <main className={`flex-1 flex items-center justify-center min-h-0 ${isTheater ? 'w-full' : ''}`}>
        <div className={isTheater ? 'w-full' : 'max-w-5xl w-full'}>
          <Player
            stream={stream}
            isValidating={isLoading || isValidatingSources}
            status={currentStream?.status ?? StreamStatus.Offline}
            witholdStatus={currentStream?.witholdStatus ?? WithholdStatus.None}
            sources={playerSources}
            selectedQuality={selectedQuality}
            volume={volume}
            onVolumeChange={setVolume}
            isMuted={isMuted}
            onMuteChange={setIsMuted}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
