
-- Fix search_path on all remaining functions (correct signatures)

ALTER FUNCTION public.advanced_rate_limiting() SET search_path = public;
ALTER FUNCTION public.audit_barbershops_changes() SET search_path = public;
ALTER FUNCTION public.audit_favorites_changes() SET search_path = public;
ALTER FUNCTION public.calculate_booking_end_time() SET search_path = public;
ALTER FUNCTION public.check_blocked_ip() SET search_path = public;
ALTER FUNCTION public.check_booking_rate_limit() SET search_path = public;
ALTER FUNCTION public.check_mfa_rate_limit(uuid) SET search_path = public;
ALTER FUNCTION public.check_mfa_requirement(uuid) SET search_path = public;
ALTER FUNCTION public.comprehensive_audit() SET search_path = public;
ALTER FUNCTION public.current_user_verified() SET search_path = public;
ALTER FUNCTION public.debug_slots(uuid, date, integer) SET search_path = public;
ALTER FUNCTION public.decrypt_phone(text) SET search_path = public;
ALTER FUNCTION public.decrypt_sensitive(text) SET search_path = public;
ALTER FUNCTION public.detect_attack_patterns() SET search_path = public;
ALTER FUNCTION public.detect_behavioral_anomalies() SET search_path = public;
ALTER FUNCTION public.encrypt_sensitive(text) SET search_path = public;
ALTER FUNCTION public.enforce_mfa_for_sensitive_operations() SET search_path = public;
ALTER FUNCTION public.get_barbershop_favorites_count(uuid) SET search_path = public;
ALTER FUNCTION public.get_decrypted_phone(uuid) SET search_path = public;
ALTER FUNCTION public.get_encryption_key() SET search_path = public;
ALTER FUNCTION public.is_admin_with_mfa() SET search_path = public;
ALTER FUNCTION public.is_email_verified() SET search_path = public;
ALTER FUNCTION public.is_user_in_grace_period() SET search_path = public;
ALTER FUNCTION public.log_mfa_attempt(uuid, text, boolean, text) SET search_path = public;
ALTER FUNCTION public.prevent_sql_injection_bookings() SET search_path = public;
ALTER FUNCTION public.sanitize_input(text) SET search_path = public;
ALTER FUNCTION public.save_recovery_codes(uuid, text[]) SET search_path = public;
ALTER FUNCTION public.update_mfa_on_role_change() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.validate_booking_advanced() SET search_path = public;
ALTER FUNCTION public.validate_favorite() SET search_path = public;
ALTER FUNCTION public.verify_recovery_code(uuid, text) SET search_path = public;
