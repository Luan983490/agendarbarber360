type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  method: string;
  message: string;
  data?: Record<string, unknown>;
  error?: unknown;
  duration?: number;
}

const isDev = import.meta.env.DEV;

function formatLog(entry: LogEntry): string {
  const { timestamp, level, service, method, message, data, error, duration } = entry;
  const durationStr = duration !== undefined ? ` [${duration}ms]` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${service}.${method}]${durationStr} ${message}`;
}

function log(level: LogLevel, entry: Omit<LogEntry, 'timestamp' | 'level'>): void {
  const fullEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    level,
  };

  const formattedMessage = formatLog(fullEntry);

  if (isDev) {
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, entry.data || '', entry.error || '');
        break;
      case 'info':
        console.info(formattedMessage, entry.data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, entry.data || '', entry.error || '');
        break;
      case 'error':
        console.error(formattedMessage, entry.data || '', entry.error || '');
        break;
    }
  } else {
    // In production, we could send to a logging service
    // For now, we still console log but with less detail
    if (level === 'error' || level === 'warn') {
      console[level](formattedMessage);
    }
  }
}

export class Logger {
  private service: string;

  constructor(service: string) {
    this.service = service;
  }

  debug(method: string, message: string, data?: Record<string, unknown>): void {
    log('debug', { service: this.service, method, message, data });
  }

  info(method: string, message: string, data?: Record<string, unknown>): void {
    log('info', { service: this.service, method, message, data });
  }

  warn(method: string, message: string, data?: Record<string, unknown>, error?: unknown): void {
    log('warn', { service: this.service, method, message, data, error });
  }

  error(method: string, message: string, error?: unknown, data?: Record<string, unknown>): void {
    log('error', { service: this.service, method, message, data, error });
  }

  startTimer(): () => number {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
  }

  logWithDuration(
    level: LogLevel,
    method: string,
    message: string,
    duration: number,
    data?: Record<string, unknown>
  ): void {
    log(level, { service: this.service, method, message, data, duration });
  }
}

export function createLogger(service: string): Logger {
  return new Logger(service);
}
