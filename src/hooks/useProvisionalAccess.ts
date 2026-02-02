import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PROVISIONAL_ACCESS_MINUTES = 60;

interface ProvisionalAccessState {
  isEmailConfirmed: boolean;
  isExpired: boolean;
  minutesRemaining: number;
  secondsRemaining: number;
  isLoading: boolean;
}

export const useProvisionalAccess = (user: User | null) => {
  const { toast } = useToast();
  const [state, setState] = useState<ProvisionalAccessState>({
    isEmailConfirmed: true,
    isExpired: false,
    minutesRemaining: PROVISIONAL_ACCESS_MINUTES,
    secondsRemaining: 0,
    isLoading: true,
  });
  const [isResending, setIsResending] = useState(false);

  const calculateTimeRemaining = useCallback((createdAt: string) => {
    const createdDate = new Date(createdAt);
    const expirationDate = new Date(createdDate.getTime() + PROVISIONAL_ACCESS_MINUTES * 60 * 1000);
    const now = new Date();
    const diffMs = expirationDate.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return { minutes: 0, seconds: 0, isExpired: true };
    }
    
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return { minutes, seconds, isExpired: false };
  }, []);

  const checkEmailConfirmation = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false, isEmailConfirmed: true }));
      return;
    }

    // Check if email is confirmed from user metadata
    const emailConfirmedAt = user.email_confirmed_at;
    const isConfirmed = !!emailConfirmedAt;

    if (isConfirmed) {
      setState({
        isEmailConfirmed: true,
        isExpired: false,
        minutesRemaining: PROVISIONAL_ACCESS_MINUTES,
        secondsRemaining: 0,
        isLoading: false,
      });
      return;
    }

    // Email not confirmed - calculate time remaining
    const { minutes, seconds, isExpired } = calculateTimeRemaining(user.created_at);
    
    setState({
      isEmailConfirmed: false,
      isExpired,
      minutesRemaining: minutes,
      secondsRemaining: seconds,
      isLoading: false,
    });
  }, [user, calculateTimeRemaining]);

  // Initial check and setup interval for countdown
  useEffect(() => {
    checkEmailConfirmation();

    // Update countdown every second if email not confirmed
    const interval = setInterval(() => {
      if (user && !user.email_confirmed_at) {
        const { minutes, seconds, isExpired } = calculateTimeRemaining(user.created_at);
        setState(prev => ({
          ...prev,
          minutesRemaining: minutes,
          secondsRemaining: seconds,
          isExpired,
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, checkEmailConfirmation, calculateTimeRemaining]);

  // Listen for auth state changes (when user confirms email in another tab)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (session?.user?.email_confirmed_at) {
          setState(prev => ({
            ...prev,
            isEmailConfirmed: true,
            isExpired: false,
          }));
          toast({
            title: "E-mail confirmado!",
            description: "Seu acesso completo foi liberado.",
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const resendConfirmationEmail = async () => {
    if (!user?.email) return;

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

      toast({
        title: "E-mail reenviado!",
        description: "Verifique sua caixa de entrada e spam.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao reenviar",
        description: error.message || "Tente novamente em alguns minutos.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      if (data.session?.user?.email_confirmed_at) {
        setState(prev => ({
          ...prev,
          isEmailConfirmed: true,
          isExpired: false,
        }));
        toast({
          title: "E-mail confirmado!",
          description: "Seu acesso completo foi liberado.",
        });
      } else {
        toast({
          title: "E-mail ainda não confirmado",
          description: "Clique no link enviado para seu e-mail.",
          variant: "destructive",
        });
      }
    } catch (error) {
      window.location.reload();
    }
  };

  return {
    ...state,
    isResending,
    resendConfirmationEmail,
    refreshSession,
  };
};
