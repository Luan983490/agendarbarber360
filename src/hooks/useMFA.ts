import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: 'totp';
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
}

interface EnrollmentData {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

interface UseMFAReturn {
  // Estado
  isLoading: boolean;
  isMFARequired: boolean;
  isMFAEnabled: boolean;
  factors: MFAFactor[];
  currentAAL: 'aal1' | 'aal2' | null;
  
  // Enrollment
  enrollmentData: EnrollmentData | null;
  startEnrollment: () => Promise<boolean>;
  verifyEnrollment: (factorId: string, code: string) => Promise<{ success: boolean; error?: string }>;
  cancelEnrollment: () => void;
  
  // Challenge/Verify (login flow)
  challengeId: string | null;
  createChallenge: (factorId: string) => Promise<boolean>;
  verifyChallenge: (code: string) => Promise<{ success: boolean; error?: string }>;
  
  // Unenroll
  unenrollFactor: (factorId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Recovery codes
  recoveryCodes: string[];
  
  // Dismiss modal
  dismissCount: number;
  canDismiss: boolean;
  incrementDismiss: () => void;
  
  // Refresh
  refreshMFAStatus: () => Promise<void>;
}

const MFA_DISMISS_KEY = 'mfa_dismiss_count';
const MAX_DISMISS_COUNT = 3;

export function useMFA(): UseMFAReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isMFARequired, setIsMFARequired] = useState(false);
  const [isMFAEnabled, setIsMFAEnabled] = useState(false);
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [currentAAL, setCurrentAAL] = useState<'aal1' | 'aal2' | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [dismissCount, setDismissCount] = useState(0);

  // Carregar dismiss count do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(MFA_DISMISS_KEY);
    if (stored) {
      setDismissCount(parseInt(stored, 10));
    }
  }, []);

  // Verificar status do MFA quando o usuário muda
  const refreshMFAStatus = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // Verificar AAL atual
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData) {
        setCurrentAAL(aalData.currentLevel as 'aal1' | 'aal2');
      }

      // Listar fatores MFA
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      if (factorsData) {
        const verifiedFactors = factorsData.totp.filter(f => f.status === 'verified');
        setFactors(factorsData.totp as MFAFactor[]);
        setIsMFAEnabled(verifiedFactors.length > 0);
      }

      // Verificar se MFA é obrigatório para este usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('mfa_required, user_type')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        // Owners sempre têm MFA obrigatório
        const isOwner = profile.user_type === 'barbershop_owner';
        setIsMFARequired(profile.mfa_required || isOwner);
      }
    } catch (error) {
      console.error('[MFA] Error checking MFA status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshMFAStatus();
  }, [refreshMFAStatus]);

  // Iniciar enrollment
  const startEnrollment = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) {
        console.error('[MFA] Enrollment error:', error);
        return false;
      }

      setEnrollmentData(data as EnrollmentData);
      return true;
    } catch (error) {
      console.error('[MFA] Enrollment error:', error);
      return false;
    }
  }, []);

  // Verificar enrollment com código
  const verifyEnrollment = useCallback(async (factorId: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) {
        return { 
          success: false, 
          error: error.message.includes('invalid') 
            ? 'Código inválido. Verifique e tente novamente.' 
            : error.message 
        };
      }

      // Gerar códigos de recuperação fictícios (em produção, viria do backend)
      const codes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
        Math.random().toString(36).substring(2, 6).toUpperCase()
      );
      setRecoveryCodes(codes);

      // Atualizar status
      setEnrollmentData(null);
      await refreshMFAStatus();

      // Resetar dismiss count
      localStorage.removeItem(MFA_DISMISS_KEY);
      setDismissCount(0);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro ao verificar código' };
    }
  }, [refreshMFAStatus]);

  // Cancelar enrollment
  const cancelEnrollment = useCallback(() => {
    setEnrollmentData(null);
  }, []);

  // Criar challenge para login
  const createChallenge = useCallback(async (factorId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (error) {
        console.error('[MFA] Challenge error:', error);
        return false;
      }

      setChallengeId(data.id);
      return true;
    } catch (error) {
      console.error('[MFA] Challenge error:', error);
      return false;
    }
  }, []);

  // Verificar challenge (login)
  const verifyChallenge = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!challengeId || factors.length === 0) {
      return { success: false, error: 'Nenhum challenge ativo' };
    }

    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: factors[0].id,
        challengeId,
        code,
      });

      if (error) {
        return { 
          success: false, 
          error: error.message.includes('invalid') 
            ? 'Código inválido. Verifique e tente novamente.' 
            : error.message 
        };
      }

      setChallengeId(null);
      await refreshMFAStatus();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro ao verificar código' };
    }
  }, [challengeId, factors, refreshMFAStatus]);

  // Remover fator MFA
  const unenrollFactor = useCallback(async (factorId: string): Promise<{ success: boolean; error?: string }> => {
    // Não permitir desativar se MFA é obrigatório
    if (isMFARequired) {
      return { success: false, error: 'MFA é obrigatório para sua conta' };
    }

    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await refreshMFAStatus();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro ao desativar MFA' };
    }
  }, [isMFARequired, refreshMFAStatus]);

  // Incrementar dismiss count
  const incrementDismiss = useCallback(() => {
    const newCount = dismissCount + 1;
    setDismissCount(newCount);
    localStorage.setItem(MFA_DISMISS_KEY, newCount.toString());
  }, [dismissCount]);

  const canDismiss = dismissCount < MAX_DISMISS_COUNT;

  return {
    isLoading,
    isMFARequired,
    isMFAEnabled,
    factors,
    currentAAL,
    enrollmentData,
    startEnrollment,
    verifyEnrollment,
    cancelEnrollment,
    challengeId,
    createChallenge,
    verifyChallenge,
    unenrollFactor,
    recoveryCodes,
    dismissCount,
    canDismiss,
    incrementDismiss,
    refreshMFAStatus,
  };
}
