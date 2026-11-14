import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface TimeSeriesPoint {
  date: string;       // YYYY-MM or YYYY-MM-DD
  year: number;
  month: number;
  day?: number;
  decimalYear: number;
  value: number;
}

interface CacheEntry {
  timestamp: number;
  payload: unknown;
}

const CACHE_TTL_MS = 1000 * 60 * 30;
const responseCache = new Map<string, CacheEntry>();

const NASA_POWER_PARAMS = new Set([
  'T2M',
  'TS',
  'GWETPROF',
  'RH2M',
  'WS10M',
  'PRECTOTCORR',
  'ALLSKY_SFC_SW_DWN',
  'CLOUD_AMT',
  'SRF_ALB',
]);

