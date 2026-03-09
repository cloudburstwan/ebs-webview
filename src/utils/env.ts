/**
 * Project-wide environment variables and constants.
 * These can be overridden via Vite environment variables (VITE_*)
 */

export const DEFAULT_STATION = import.meta.env.VITE_DEFAULT_STATION || 'test';

export const SUPPORTED_QUALITIES = import.meta.env.VITE_SUPPORTED_QUALITIES 
  ? import.meta.env.VITE_SUPPORTED_QUALITIES.split(',') 
  : ['360p'];

export const VALIDATE_SOURCES = import.meta.env.VITE_VALIDATE_SOURCES === 'true' || false;

export const DEFAULT_BASE_URL = import.meta.env.VITE_STREAM_BASE_URL || 'https://stream.equestria.horse';

export const STREAM_BASE_URL = DEFAULT_BASE_URL + (import.meta.env.VITE_STREAM_SUFFIX || 's');

export const API_VERSION = import.meta.env.VITE_API_VERSION || 'api/v1';
