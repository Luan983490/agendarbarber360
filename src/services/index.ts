// Services Layer - Centralized business logic
// Each service encapsulates all business logic with:
// - Standardized response types { data, error, success }
// - Input validation with Zod
// - Centralized error handling
// - Structured logging

// Types and utilities
export * from './types';
export * from './logger';

// Service instances
export { authService, AuthService } from './auth.service';
export type { SignUpDTO, SignInDTO, AuthUser, AuthSession } from './auth.service';

export { bookingService, BookingService } from './booking.service';
export type { 
  CreateBookingDTO, 
  CancelBookingDTO, 
  Booking, 
  TimeSlot, 
  AvailableSlotsDTO 
} from './booking.service';

export { barberService, BarberService } from './barber.service';
export type { 
  CreateBarberDTO, 
  UpdateBarberDTO, 
  Barber, 
  BarberWorkingHours, 
  CreateBlockDTO,
  CreateBlockPeriodDTO 
} from './barber.service';

export { barbershopService, BarbershopService } from './barbershop.service';
export type { 
  CreateBarbershopDTO, 
  UpdateBarbershopDTO, 
  Barbershop, 
  BarbershopStats 
} from './barbershop.service';

export { userService, UserService } from './user.service';
export type { 
  UpdateProfileDTO, 
  UserProfile, 
  UserRole 
} from './user.service';

export { rateLimiterService, RATE_LIMIT_CONFIG } from './rate-limiter.service';
export type { RateLimitAction } from './rate-limiter.service';
