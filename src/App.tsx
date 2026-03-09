import { useState, useEffect, useMemo } from 'react';
import Player from './components/Player';
import Header from './components/Header';
import Footer from './components/Footer';
import StationDropdown from './components/StationDropdown';
import StatusDropdown from './components/StatusDropdown';
import { useEbsData } from './hooks/useEbsData';
import { StreamStatus, WithholdStatus } from './utils/ebs';
import { DEFAULT_STATION, DEFAULT_QUALITY } from './utils/env';

function App() {
  const [isDark, setIsDark] = useState(true);
  const [isTheater, setIsTheater] = useState(false);

  const [station, setStation] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('station') || DEFAULT_STATION;
  });

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isStreamSelectionOpen, setIsStreamSelectionOpen] = useState(false);
  const [expandedStationId, setExpandedStationId] = useState<string | null>(null);
  const [region, setRegion] = useState('Default');
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(DEFAULT_QUALITY);

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
    setSelectedQuality(DEFAULT_QUALITY); // Reset quality on station change
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('station', newStation);
    window.history.pushState({}, '', `?${newParams.toString()}`);
    setIsStreamSelectionOpen(false);
  };

  const handleSourceSelect = (label: string) => {
    console.log(`[App] Switching stream to ${label}`);
    setSelectedQuality(label);
  };

  const handleHomeClick = () => {
    setStation(DEFAULT_STATION);
    setSelectedQuality(DEFAULT_QUALITY);
    const newParams = new URLSearchParams(window.location.search);
    newParams.delete('station');
    const newUrl = newParams.toString() ? `?${newParams.toString()}` : window.location.pathname;
    window.history.pushState({}, '', newUrl);
    setExpandedStationId(null);
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
            sources={uiSources}
            onSourceSelect={handleSourceSelect}
          />
        </Header>

        <main className={`flex-1 flex items-center justify-center min-h-0 ${isTheater ? 'w-full' : ''}`}>
          <div className={isTheater ? 'w-full' : 'max-w-5xl w-full'}>
            <Player
              station={station}
              isValidating={isLoading || isValidatingSources}
              status={currentStream?.status ?? StreamStatus.Offline}
              witholdStatus={currentStream?.witholdStatus ?? WithholdStatus.None}
              sources={playerSources}
              selectedQuality={selectedQuality}
            />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
