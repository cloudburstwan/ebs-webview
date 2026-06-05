export const StreamStatus = {
    /**
     * The stream is offline.
     */
    Offline: 0,
    /**
     * The stream is starting and will transition to Live in about a minute or so.
     */
    Starting: 1,
    /**
     * The stream is live and being served to viewers.
     */
    Live: 2,
} as const;
export type StreamStatus = (typeof StreamStatus)[keyof typeof StreamStatus];

export const WithholdStatus = {
    None: 0,
    Legal: 1,
    Policy: 2,
    Issues: 3,
} as const;
export type WithholdStatus = (typeof WithholdStatus)[keyof typeof WithholdStatus];

/**
 * Playback URLs returned by the API when a stream is live and CDN nodes are available.
 * Null when the stream is offline or no CDN nodes are in ready state.
 */
export interface StreamUrls {
    /** LL-HLS playlist URL for video playback */
    llhls: string;
    /** WebRTC WebSocket URL for low-latency playback */
    webrtc: string;
    /** Which CDN tier is serving: "edge" (preferred) or "origin" (fallback) */
    source: string;
}

export interface StreamEntry {
    id: string;
    name: string;
    humanName: string;
    status: StreamStatus;
    statusLabel?: string;
    witholdStatus: WithholdStatus; // API typo support
    viewers?: number;
    dates?: {
        startAt: string | null;
        endAt: string | null;
    };
    /** Playback URLs — only present when stream is live AND CDN nodes are available */
    urls?: StreamUrls | null;
}

export interface EBSStatus {
    version: string;
    uptime: number;
    connections: number;
}

import { DEFAULT_BASE_URL, API_VERSION } from './env';

/** Raw API response shape (superset of StreamEntry with possible alternate field names) */
type RawStreamResponse = Partial<StreamEntry> & { withhold?: number };

/** Normalize a raw API stream object into a typed StreamEntry */
function normalizeStream(s: RawStreamResponse): StreamEntry {
    return {
        id: s.id || '',
        name: s.name || 'Unknown',
        humanName: s.humanName || s.name || 'Unknown',
        status: s.status ?? StreamStatus.Offline,
        statusLabel: s.statusLabel,
        viewers: s.viewers || 0,
        witholdStatus: s.witholdStatus !== undefined
            ? s.witholdStatus
            : (s.withhold !== undefined ? (s.withhold as WithholdStatus) : WithholdStatus.None),
        dates: s.dates,
        urls: s.urls ?? null,
    };
}

export class EBSApi {
    private baseUrl: string;

    constructor(baseUrl: string = DEFAULT_BASE_URL) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    }

    private get apiUrl() {
        let base = this.baseUrl;
        if (base.endsWith('/s')) base = base.slice(0, -2);
        if (base.endsWith('/s/')) base = base.slice(0, -3);
        return `${base}/${API_VERSION}`;
    }

    /**
     * List all streams. The list endpoint does NOT include playback URLs
     * (lightweight). Use getStream() for full detail with URLs.
     */
    async getStreams(signal?: AbortSignal): Promise<StreamEntry[]> {
        try {
            const response = await fetch(`${this.apiUrl}/streams`, { signal });
            if (!response.ok) {
                throw new Error(`Failed to fetch streams: ${response.statusText}`);
            }
            const json = await response.json();
            console.log('[EBSApi] available streams:', json);

            // API returns { data: [...] } envelope or a raw array
            const items: RawStreamResponse[] = Array.isArray(json) ? json : (json.data ?? []);
            return items.map(normalizeStream);
        } catch (error) {
            const err = error as Error;
            if (err.name === 'AbortError') return [];
            console.error('[EBSApi] getStreams error:', err);
            return [];
        }
    }

    async getStatus(signal?: AbortSignal): Promise<EBSStatus | null> {
        try {
            const response = await fetch(`${this.apiUrl}/status`, { signal });
            if (!response.ok) {
                throw new Error(`Failed to fetch status: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            const err = error as Error;
            if (err.name === 'AbortError') return null;
            console.error('[EBSApi] getStatus error:', err);
            return null;
        }
    }

    /**
     * Get a single stream by name or ID.
     * Returns full detail including embedded playback URLs when live.
     */
    async getStream(nameOrId: string, signal?: AbortSignal): Promise<StreamEntry | null> {
        try {
            const response = await fetch(`${this.apiUrl}/streams/${encodeURIComponent(nameOrId)}`, { signal });
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`Failed to fetch stream ${nameOrId}: ${response.statusText}`);
            }
            const s = await response.json() as RawStreamResponse;
            console.log(`[EBSApi] stream ${nameOrId}:`, s);
            return normalizeStream(s);
        } catch (error) {
            const err = error as Error;
            if (err.name === 'AbortError') return null;
            console.error(`[EBSApi] getStream(${nameOrId}) error:`, err);
            return null;
        }
    }

    /**
     * Helper to filter only live streams
     */
    async getLiveStreams(signal?: AbortSignal): Promise<StreamEntry[]> {
        const all = await this.getStreams(signal);
        return all.filter(s => s.status === StreamStatus.Live);
    }
}

export const ebsApi = new EBSApi();
