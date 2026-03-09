import { useState, useEffect } from 'react';
import Player from './components/Player';
import Header from './components/Header';
import Footer from './components/Footer';
import StationDropdown from './components/StationDropdown';
import StatusDropdown from './components/StatusDropdown';
import { useEbsData } from './hooks/useEbsData';
import { StreamStatus, WithholdStatus } from './utils/ebs';

function App() {
  const [isDark, setIsDark] = useState(true);
  const [isTheater, setIsTheater] = useState(false);

  const [station, setStation] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('station') || 'test';
  });

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isStreamSelectionOpen, setIsStreamSelectionOpen] = useState(false);
  const [expandedStationId, setExpandedStationId] = useState<string | null>(null);
  const [region, setRegion] = useState('Default');
  const [isRegionOpen, setIsRegionOpen] = useState(false);

  const {
    isLoading,
    availableStreams,
    currentStream,
    sources,
    isValidatingSources
  } = useEbsData(station, setStation);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleStationChange = (newStation: string) => {
    setStation(newStation);
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('station', newStation);
    window.history.pushState({}, '', `?${newParams.toString()}`);
    setIsStreamSelectionOpen(false);
  };

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
      >
        <StationDropdown
          isOpen={isStreamSelectionOpen}
          onToggle={() => {
            setIsStreamSelectionOpen(!isStreamSelectionOpen);
            setIsStatusOpen(false);
          }}
          availableStreams={availableStreams}
          currentStation={station}
          onStationChange={handleStationChange}
          expandedStationId={expandedStationId}
          onToggleExpanded={(id) => setExpandedStationId(expandedStationId === id ? null : id)}
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
            station={station}
            isValidating={isLoading || isValidatingSources}
            status={currentStream?.status ?? StreamStatus.Offline}
            witholdStatus={currentStream?.witholdStatus ?? WithholdStatus.None}
            sources={sources}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
