import { supabase } from '@/integrations/supabase/client';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'performance';

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

interface LogContext {
  userId?: string;
  barbershopId?: string;
  url?: string;
  userAgent?: string;
  errorStack?: string;
}

const isDev = import.meta.env.DEV;

// Performance threshold in milliseconds
const PERFORMANCE_THRESHOLD_MS = 1000;

function formatLog(entry: LogEntry): string {
  const { timestamp, level, service, method, message, duration } = entry;
  const durationStr = duration !== undefined ? ` [${duration}ms]` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${service}.${method}]${durationStr} ${message}`;
}

function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  if (typeof error === 'string') {
    return error;
  }
  return JSON.stringify(error);
}

async function sendToSupabase(
  level: LogLevel,
  entry: Omit<LogEntry, 'timestamp' | 'level'>,
  context?: LogContext
): Promise<void> {
  // Only send error, warn, and performance logs to Supabase
  if (!['error', 'warn', 'performance'].includes(level)) {
    return;
  }

  try {
    const logData = {
      level,
      service: entry.service,
      method: entry.method,
      message: entry.message,
      context: (entry.data || {}) as Record<string, unknown>,
      user_id: context?.userId || null,
      barbershop_id: context?.barbershopId || null,
      error_stack: context?.errorStack || (entry.error ? getErrorStack(entry.error) : null),
      url: context?.url || (typeof window !== 'undefined' ? window.location.href : null),
      user_agent: context?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
      duration_ms: entry.duration || null,
    };

    // Use insert directly - RLS allows anyone to insert
    // Cast to any to avoid type issues with the generated types
    await (supabase.from('app_logs') as any).insert(logData);
  } catch (err) {
    // Don't throw - logging should never break the app
    if (isDev) {
      console.error('[Logger] Failed to send log to Supabase:', err);
    }
  }
}

function log(
  level: LogLevel,
  entry: Omit<LogEntry, 'timestamp' | 'level'>,
  context?: LogContext
): void {
  const fullEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    level,
  };

  const formattedMessage = formatLog(fullEntry);

  // Console logging
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
      case 'performance':
        console.warn(`⚡ SLOW: ${formattedMessage}`, entry.data || '');
        break;
    }
  } else {
    // In production, still log errors/warns to console but with less detail
    if (level === 'error' || level === 'warn' || level === 'performance') {
      console[level === 'performance' ? 'warn' : level](formattedMessage);
    }
  }

  // Send to Supabase for error, warn, and performance logs
  sendToSupabase(level, entry, context);
}

export class Logger {
  private service: string;
  private context: LogContext;

  constructor(service: string, context?: LogContext) {
    this.service = service;
    this.context = context || {};
  }

  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  debug(method: string, message: string, data?: Record<string, unknown>): void {
    log('debug', { service: this.service, method, message, data }, this.context);
  }

  info(method: string, message: string, data?: Record<string, unknown>): void {
    log('info', { service: this.service, method, message, data }, this.context);
  }

  warn(method: string, message: string, data?: Record<string, unknown>, error?: unknown): void {
    log('warn', { service: this.service, method, message, data, error }, {
      ...this.context,
      errorStack: error ? getErrorStack(error) : undefined,
    });
  }

  error(method: string, message: string, error?: unknown, data?: Record<string, unknown>): void {
    log('error', { service: this.service, method, message, data, error }, {
      ...this.context,
      errorStack: error ? getErrorStack(error) : undefined,
    });
  }

  performance(method: string, message: string, durationMs: number, data?: Record<string, unknown>): void {
    if (durationMs >= PERFORMANCE_THRESHOLD_MS) {
      log('performance', { service: this.service, method, message, data, duration: durationMs }, this.context);
    }
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
    log(level, { service: this.service, method, message, data, duration }, this.context);
    
    // Auto-log performance issues
    if (duration >= PERFORMANCE_THRESHOLD_MS && level !== 'performance') {
      this.performance(method, `Slow operation: ${message}`, duration, data);
    }
  }
}

export function createLogger(service: string, context?: LogContext): Logger {
  return new Logger(service, context);
}

// Global error capture for unhandled errors
export function setupGlobalErrorCapture(): void {
  if (typeof window === 'undefined') return;

  const globalLogger = createLogger('GlobalErrorHandler');

  // Capture unhandled errors
  window.onerror = (message, source, lineno, colno, error) => {
    globalLogger.error('window.onerror', String(message), error, {
      source,
      lineno,
      colno,
    });
    return false; // Let the default handler run too
  };

  // Capture unhandled promise rejections
  window.onunhandledrejection = (event) => {
    globalLogger.error('unhandledrejection', 'Unhandled Promise Rejection', event.reason, {
      type: 'unhandledrejection',
    });
  };
}

// Helper to log errors from React Query mutations
export function logMutationError(
  service: string,
  method: string,
  error: unknown,
  variables?: Record<string, unknown>
): void {
  const logger = createLogger(service);
  logger.error(method, 'Mutation failed', error, variables);
}

// Helper to log performance of async operations
export async function withPerformanceLogging<T>(
  logger: Logger,
  method: string,
  operation: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  const getElapsed = logger.startTimer();
  try {
    const result = await operation();
    const duration = getElapsed();
    if (duration >= PERFORMANCE_THRESHOLD_MS) {
      logger.performance(method, `Operation completed in ${duration}ms`, duration, context);
    }
    return result;
  } catch (error) {
    const duration = getElapsed();
    logger.error(method, 'Operation failed', error, { ...context, duration });
    throw error;
  }
}
