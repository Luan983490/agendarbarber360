/**
 * Centralized React Query configuration for performance optimization
 * 
 * Cache Strategy:
 * - STATIC: Data that rarely changes (services, barbers, working hours) → 30min stale, 1h cache
 * - SEMI_STATIC: Data that changes occasionally (barbershop info, profiles) → 10min stale, 30min cache
 * - DYNAMIC: Data that changes frequently (bookings, available slots) → 5min stale, 15min cache
 * - REALTIME: Data that needs to be fresh (active bookings) → 1min stale, 5min cache
 */

// Time constants in milliseconds
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Query configuration presets based on data volatility
 */
export const queryConfig = {
  /**
   * For data that rarely changes: services, barbers list, working hours
   * staleTime: 30 minutes
   * gcTime: 1 hour
   */
  static: {
    staleTime: 30 * MINUTE,
    gcTime: 1 * HOUR,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  },

  /**
   * For data that changes occasionally: barbershop info, user profiles
   * staleTime: 10 minutes
   * gcTime: 30 minutes
   */
  semiStatic: {
    staleTime: 10 * MINUTE,
    gcTime: 30 * MINUTE,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always' as const,
  },

  /**
   * For data that changes frequently: bookings, available slots
   * staleTime: 5 minutes
   * gcTime: 15 minutes
   */
  dynamic: {
    staleTime: 5 * MINUTE,
    gcTime: 15 * MINUTE,
    refetchOnWindowFocus: false,
  },

  /**
   * For real-time sensitive data: active booking sessions
   * staleTime: 1 minute
   * gcTime: 5 minutes
   */
  realtime: {
    staleTime: 1 * MINUTE,
    gcTime: 5 * MINUTE,
    refetchOnWindowFocus: true,
  },

  /**
   * For data that should always be fresh
   */
  fresh: {
    staleTime: 0,
    gcTime: 5 * MINUTE,
    refetchOnWindowFocus: true,
  },
} as const;

/**
 * Default query client options with performance optimizations
 */
export const defaultQueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * MINUTE,
      gcTime: 15 * MINUTE,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
};

/**
 * Specific query configurations for different data types
 */
export const specificQueryConfig = {
  // Barbershop data - changes rarely
  barbershop: queryConfig.semiStatic,
  
  // Services - almost never change during a session
  services: queryConfig.static,
  
  // Barbers list - rarely changes
  barbers: queryConfig.static,
  
  // Working hours - almost never change
  workingHours: queryConfig.static,
  
  // User profile - changes occasionally
  profile: queryConfig.semiStatic,
  
  // User roles - changes very rarely
  roles: queryConfig.static,
  
  // Available slots - must always be fresh to reflect blocks/bookings
  availableSlots: {
    ...queryConfig.fresh,
    staleTime: 0,
    gcTime: 2 * MINUTE,
  },
  
  // Bookings - frequently updated
  bookings: queryConfig.dynamic,
  
  // Stats/Reports - can be cached longer
  stats: queryConfig.semiStatic,
  
  // Search results - cache for quick re-searches
  search: {
    staleTime: 2 * MINUTE,
    gcTime: 10 * MINUTE,
    refetchOnWindowFocus: false,
  },
} as const;
