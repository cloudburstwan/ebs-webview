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

export interface StreamEntry {
    id: string;
    name: string;
    status: StreamStatus;
    withhold: WithholdStatus;
    witholdStatus?: WithholdStatus; // API typo support
    viewers?: number;
    thumbnail?: string;
    station: string;
    qualities?: string[];
    sources: {
        label: string;
        file: string;
        type: 'hls' | 'webrtc' | 'dash';
        default?: boolean;
    }[];
    dates?: {
        startAt: string;
        endAt: string;
    };
}

export interface EBSStatus {
    version: string;
    uptime: number;
    connections: number;
}

const DEFAULT_BASE_URL = import.meta.env.VITE_STREAM_BASE_URL || 'https://stream.equestria.horse';
const API_VERSION = 'api/v1';

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

    async getStreams(): Promise<StreamEntry[]> {
        try {
            const response = await fetch(`${this.apiUrl}/streams`);
            if (!response.ok) {
                throw new Error(`Failed to fetch streams: ${response.statusText}`);
            }
            const data = await response.json();
            console.log('[EBSApi] available streams:', data);

            // Normalize data
            return data.map((s: any) => ({
                ...s,
                name: s.name || 'Unknown',
                station: s.station || s.name || 'Unknown',
                withhold: s.witholdStatus !== undefined ? s.witholdStatus : (s.withhold !== undefined ? s.withhold : WithholdStatus.None),
                sources: s.sources || []
            }));
        } catch (error) {
            console.error('[EBSApi] getStreams error:', error);
            return [];
        }
    }

    async getStatus(): Promise<EBSStatus | null> {
        try {
            const response = await fetch(`${this.apiUrl}/status`);
            if (!response.ok) {
                throw new Error(`Failed to fetch status: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('[EBSApi] getStatus error:', error);
            return null;
        }
    }

    /**
     * Helper to filter only live streams
     */
    async getLiveStreams(): Promise<StreamEntry[]> {
        const all = await this.getStreams();
        return all.filter(s => s.status === StreamStatus.Live);
    }
}

export const ebsApi = new EBSApi();
