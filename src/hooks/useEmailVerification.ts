import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface EmailVerificationState {
  isVerified: boolean;
  isInGracePeriod: boolean;
  isExpired: boolean;
  loading: boolean;
  remainingMinutes: number;
  resendEmail: () => Promise<void>;
  isResending: boolean;
}

const GRACE_PERIOD_MS = 60 * 60 * 1000; // 60 minutes

export const useEmailVerification = (): EmailVerificationState => {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(true);
  const [loading, setLoading] = useState(true);
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const checkVerification = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check email_confirmed_at from user metadata
      const emailConfirmedAt = user.email_confirmed_at;
      const createdAt = new Date(user.created_at).getTime();
      const now = Date.now();
      const elapsed = now - createdAt;

      if (emailConfirmedAt) {
        setIsVerified(true);
      } else {
        setIsVerified(false);
        const remaining = Math.max(0, Math.ceil((GRACE_PERIOD_MS - elapsed) / 60000));
        setRemainingMinutes(remaining);
      }
    } catch (err) {
      console.error('[EmailVerification] Error:', err);
      // Default to verified on error to not block users
      setIsVerified(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkVerification();

    // Re-check every 30 seconds during grace period
    if (user && !user.email_confirmed_at) {
      const interval = setInterval(async () => {
        // Refresh session to get updated email_confirmed_at
        const { data } = await supabase.auth.getUser();
        if (data?.user?.email_confirmed_at) {
          setIsVerified(true);
          clearInterval(interval);
        } else {
          const createdAt = new Date(user.created_at).getTime();
          const elapsed = Date.now() - createdAt;
          const remaining = Math.max(0, Math.ceil((GRACE_PERIOD_MS - elapsed) / 60000));
          setRemainingMinutes(remaining);
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [checkVerification, user]);

  const resendEmail = useCallback(async () => {
    if (!user?.email || isResending) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('[EmailVerification] Resend error:', err);
      throw err;
    } finally {
      setIsResending(false);
    }
  }, [user, isResending]);

  const createdAt = user ? new Date(user.created_at).getTime() : 0;
  const elapsed = Date.now() - createdAt;
  const isInGracePeriod = !isVerified && elapsed < GRACE_PERIOD_MS;
  const isExpired = !isVerified && elapsed >= GRACE_PERIOD_MS;

  return {
    isVerified,
    isInGracePeriod,
    isExpired,
    loading,
    remainingMinutes,
    resendEmail,
    isResending,
  };
};
