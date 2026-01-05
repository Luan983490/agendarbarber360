-- =====================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =====================================================
-- These indexes are designed to optimize the most common queries
-- in the barbershop booking system

-- =====================================================
-- BOOKINGS TABLE INDEXES
-- =====================================================

-- Primary composite index for schedule queries (most common query pattern)
-- Used by: getAvailableSlots, schedule calendar, conflict checks
CREATE INDEX IF NOT EXISTS idx_bookings_barbershop_barber_date 
ON public.bookings (barbershop_id, barber_id, booking_date);

-- Index for client booking history
CREATE INDEX IF NOT EXISTS idx_bookings_client_id 
ON public.bookings (client_id) 
WHERE client_id IS NOT NULL;

-- Index for status filtering (completed, pending, cancelled)
CREATE INDEX IF NOT EXISTS idx_bookings_status 
ON public.bookings (status);

-- Composite index for date range queries with status
CREATE INDEX IF NOT EXISTS idx_bookings_date_status 
ON public.bookings (booking_date, status);

-- Index for time-based conflict detection
CREATE INDEX IF NOT EXISTS idx_bookings_barber_date_time 
ON public.bookings (barber_id, booking_date, booking_time);

-- =====================================================
-- BARBERS TABLE INDEXES
-- =====================================================

-- Index for barbershop staff lookup
CREATE INDEX IF NOT EXISTS idx_barbers_barbershop_id 
ON public.barbers (barbershop_id);

-- Index for active barbers only (common filter)
CREATE INDEX IF NOT EXISTS idx_barbers_barbershop_active 
ON public.barbers (barbershop_id, is_active) 
WHERE is_active = true;

-- Index for user-linked barbers
CREATE INDEX IF NOT EXISTS idx_barbers_user_id 
ON public.barbers (user_id) 
WHERE user_id IS NOT NULL;

-- =====================================================
-- SERVICES TABLE INDEXES
-- =====================================================

-- Index for barbershop services lookup
CREATE INDEX IF NOT EXISTS idx_services_barbershop_id 
ON public.services (barbershop_id);

-- Index for active services only
CREATE INDEX IF NOT EXISTS idx_services_barbershop_active 
ON public.services (barbershop_id, is_active) 
WHERE is_active = true;

-- =====================================================
-- BARBER WORKING HOURS INDEXES
-- =====================================================

-- Composite index for working hours lookup
CREATE INDEX IF NOT EXISTS idx_barber_working_hours_barber_day 
ON public.barber_working_hours (barber_id, day_of_week);

-- =====================================================
-- BARBER BLOCKS INDEXES
-- =====================================================

-- Index for block date lookup
CREATE INDEX IF NOT EXISTS idx_barber_blocks_barber_date 
ON public.barber_blocks (barber_id, block_date);

-- =====================================================
-- BARBER SCHEDULE OVERRIDES INDEXES
-- =====================================================

-- Index for override lookup by barber and date range
CREATE INDEX IF NOT EXISTS idx_barber_schedule_overrides_barber_dates 
ON public.barber_schedule_overrides (barber_id, start_date, end_date);

-- =====================================================
-- PRODUCTS TABLE INDEXES
-- =====================================================

-- Index for barbershop products lookup
CREATE INDEX IF NOT EXISTS idx_products_barbershop_id 
ON public.products (barbershop_id);

-- Index for active products only
CREATE INDEX IF NOT EXISTS idx_products_barbershop_active 
ON public.products (barbershop_id, is_active) 
WHERE is_active = true;

-- =====================================================
-- USER ROLES TABLE INDEXES
-- =====================================================

-- Index for user role lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_user_barbershop 
ON public.user_roles (user_id, barbershop_id);

-- =====================================================
-- FAVORITES TABLE INDEXES
-- =====================================================

-- Index for client favorites lookup
CREATE INDEX IF NOT EXISTS idx_favorites_client_id 
ON public.favorites (client_id);

-- =====================================================
-- REVIEWS TABLE INDEXES
-- =====================================================

-- Index for barbershop reviews
CREATE INDEX IF NOT EXISTS idx_reviews_barbershop_id 
ON public.reviews (barbershop_id);

-- =====================================================
-- BOOKING AUDIT LOGS INDEXES
-- =====================================================

-- Index for audit log lookup by booking
CREATE INDEX IF NOT EXISTS idx_booking_audit_logs_booking_id 
ON public.booking_audit_logs (booking_id);

-- Index for audit log date filtering
CREATE INDEX IF NOT EXISTS idx_booking_audit_logs_created_at 
ON public.booking_audit_logs (created_at DESC);

-- =====================================================
-- APP LOGS INDEXES (for monitoring queries)
-- =====================================================

-- Index for error log filtering
CREATE INDEX IF NOT EXISTS idx_app_logs_level_created 
ON public.app_logs (level, created_at DESC);

-- Index for barbershop-specific logs
CREATE INDEX IF NOT EXISTS idx_app_logs_barbershop_created 
ON public.app_logs (barbershop_id, created_at DESC) 
WHERE barbershop_id IS NOT NULL;

-- =====================================================
-- CLIENT LOYALTY POINTS INDEXES
-- =====================================================

-- Index for loyalty points lookup
CREATE INDEX IF NOT EXISTS idx_client_loyalty_points_client_barbershop 
ON public.client_loyalty_points (client_id, barbershop_id);

-- =====================================================
-- CLIENT PACKAGES INDEXES
-- =====================================================

-- Index for active packages lookup
CREATE INDEX IF NOT EXISTS idx_client_packages_client_status 
ON public.client_packages (client_id, status) 
WHERE status = 'active';

-- =====================================================
-- CLIENT SUBSCRIPTIONS INDEXES
-- =====================================================

-- Index for active subscriptions lookup
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_client_status 
ON public.client_subscriptions (client_id, status) 
WHERE status = 'active';

-- =====================================================
-- ANALYZE TABLES (update statistics for query planner)
-- =====================================================

ANALYZE public.bookings;
ANALYZE public.barbers;
ANALYZE public.services;
ANALYZE public.barber_working_hours;
ANALYZE public.barber_blocks;
ANALYZE public.products;
ANALYZE public.user_roles;