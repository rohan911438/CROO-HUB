import { NextFunction, Request, Response } from 'express';

/**
 * In-memory ring buffer of recent API requests, powering the Developer Console's request log
 * panel. Deliberately in-memory (resets on server restart) rather than persisted to MongoDB -
 * this is a diagnostics/demo aid, not an audit trail; the audit trail for anything trust-relevant
 * already lives in AgentOrder.events or on-chain, both of which are durable.
 */

export interface RequestLogEntry {
  id: number;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  timestamp: string;
  userId?: string;
}

const MAX_ENTRIES = 200;
const buffer: RequestLogEntry[] = [];
let nextId = 1;

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    buffer.push({
      id: nextId++,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      timestamp: new Date().toISOString(),
      userId: req.user?.sub,
    });
    if (buffer.length > MAX_ENTRIES) buffer.shift();
  });

  next();
}

export function getRequestLog(): RequestLogEntry[] {
  return [...buffer].reverse();
}

export function getLatencyStats(): { count: number; avgMs: number; p95Ms: number } {
  if (buffer.length === 0) return { count: 0, avgMs: 0, p95Ms: 0 };
  const durations = buffer.map((e) => e.durationMs).sort((a, b) => a - b);
  const avgMs = Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10;
  const p95Index = Math.min(durations.length - 1, Math.floor(durations.length * 0.95));
  return { count: durations.length, avgMs, p95Ms: durations[p95Index] };
}
