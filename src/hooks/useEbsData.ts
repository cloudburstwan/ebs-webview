import { useState, useEffect } from 'react';
import { ebsApi, STREAM_BASE_URL } from '../utils/ebs';
import type { StreamEntry } from '../utils/ebs';

export function useEbsData(station: string, setStation: (s: string) => void) {
  const [isLoading, setIsLoading] = useState(true);
  const [availableStreams, setAvailableStreams] = useState<StreamEntry[]>([]);
  const [currentStream, setCurrentStream] = useState<StreamEntry | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [isValidatingSources, setIsValidatingSources] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchStreams = async () => {
      setIsLoading(true);
      const streams = await ebsApi.getStreams(abortController.signal);
      setAvailableStreams(streams);

      // Find stream matching station or default to first one if station not found
      const match = streams.find((s: StreamEntry) => s.station.toLowerCase() === station.toLowerCase());
      if (match) {
        setCurrentStream(match);
      } else if (streams.length > 0 && station === 'test') {
        setCurrentStream(streams[0]);
        setStation(streams[0].station);
      } else {
        setCurrentStream(null);
      }

      setIsLoading(false);
    };

    fetchStreams();
    const interval = setInterval(fetchStreams, 30000);
    
    return () => {
      abortController.abort();
      clearInterval(interval);
    };
  }, [station, setStation]);

  useEffect(() => {
    const abortController = new AbortController();

    const validateSources = async () => {
      if (currentStream?.sources && currentStream.sources.length > 0) {
        setSources(currentStream.sources);
        setIsValidatingSources(false);
        return;
      }

      setIsValidatingSources(true);

      const baseUrl = STREAM_BASE_URL.endsWith('/') ? STREAM_BASE_URL : `${STREAM_BASE_URL}/`;
      const potentialSources = [
        { label: '1080p', file: `${baseUrl}${station}-1080p.m3u8` },
        { label: '720p', file: `${baseUrl}${station}-720p.m3u8` },
        { label: '360p', file: `${baseUrl}${station}-360p.m3u8` },
        { label: 'Direct', file: `${baseUrl}${station}.m3u8`, default: true }
      ];

      const validationPromises = potentialSources.map(async (src) => {
        try {
          const response = await fetch(src.file, { 
            method: 'HEAD', 
            signal: abortController.signal 
          });
          if (response.ok) {
            return {
              label: src.label,
              type: 'hls' as const,
              file: src.file,
              default: src.default
            };
          }
        } catch (error: any) {
          if (error.name === 'AbortError') return null;
          
          try {
            const fallback = await fetch(src.file, { 
              method: 'HEAD', 
              mode: 'no-cors',
              signal: abortController.signal 
            });
            if (fallback.type === 'opaque') {
              return {
                label: src.label,
                type: 'hls' as const,
                file: src.file,
                default: src.default
              };
            }
          } catch (fallbackError) {
            return null;
          }
        }
        return null;
      });

      const results = await Promise.all(validationPromises);
      const validated = results.filter((r): r is NonNullable<typeof r> => r !== null);

      if (!abortController.signal.aborted) {
        setSources(validated);
        setIsValidatingSources(false);
      }
    };

    validateSources();
    return () => abortController.abort();
  }, [station, currentStream]);

  return {
    isLoading,
    availableStreams,
    currentStream,
    sources,
    isValidatingSources
  };
}
