import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthMFAGetAuthenticatorAssuranceLevelResponse } from '@supabase/supabase-js';

export type MFAStatus = 'disabled' | 'enabled' | 'verified';
export type AAL = 'aal1' | 'aal2';

interface MFAState {
  status: MFAStatus;
  currentLevel: AAL | null;
  nextLevel: AAL | null;
  factorId: string | null;
  isLoading: boolean;
  needsChallenge: boolean; // true if MFA is enabled but session is aal1
  error: string | null;
}

interface EnrollmentData {
  factorId: string;
  qrCode: string; // SVG string
  secret: string; // For manual entry
  uri: string;
}

export const useMFA = () => {
  const [state, setState] = useState<MFAState>({
    status: 'disabled',
    currentLevel: null,
    nextLevel: null,
    factorId: null,
    isLoading: true,
    needsChallenge: false,
    error: null,
  });

  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);

  // Check MFA status
  const checkMFAStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (error) {
        throw error;
      }

      const { currentLevel, nextLevel, currentAuthenticationMethods } = data;
      
      // Check if user has TOTP factor enrolled
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        throw factorsError;
      }

      const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');
      const hasMFAEnabled = !!totpFactor;
      const needsChallenge = hasMFAEnabled && currentLevel === 'aal1' && nextLevel === 'aal2';

      setState({
        status: hasMFAEnabled ? 'enabled' : 'disabled',
        currentLevel: currentLevel as AAL,
        nextLevel: nextLevel as AAL | null,
        factorId: totpFactor?.id || null,
        isLoading: false,
        needsChallenge,
        error: null,
      });

      return { hasMFAEnabled, needsChallenge, currentLevel, nextLevel };
    } catch (error: any) {
      console.error('[MFA] Error checking status:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao verificar status do MFA',
      }));
      return null;
    }
  }, []);

  // Enroll in MFA (generate QR code)
  const enroll = useCallback(async (): Promise<EnrollmentData | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Barber360 App',
      });

      if (error) {
        throw error;
      }

      const enrollmentInfo: EnrollmentData = {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      };

      setEnrollmentData(enrollmentInfo);
      setState(prev => ({ ...prev, isLoading: false }));

      return enrollmentInfo;
    } catch (error: any) {
      console.error('[MFA] Error enrolling:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao configurar MFA',
      }));
      return null;
    }
  }, []);

  // Verify enrollment with TOTP code
  const verifyEnrollment = useCallback(async (code: string): Promise<boolean> => {
    if (!enrollmentData?.factorId) {
      setState(prev => ({ ...prev, error: 'Nenhum fator MFA para verificar' }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.factorId,
      });

      if (challengeError) {
        throw challengeError;
      }

      // Verify the challenge with the code
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.factorId,
        challengeId: challengeData.id,
        code,
      });

      if (error) {
        throw error;
      }

      // Clear enrollment data and refresh status
      setEnrollmentData(null);
      await checkMFAStatus();

      setState(prev => ({
        ...prev,
        status: 'verified',
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      console.error('[MFA] Error verifying enrollment:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Código inválido. Tente novamente.',
      }));
      return false;
    }
  }, [enrollmentData, checkMFAStatus]);

  // Challenge existing MFA (for session elevation aal1 -> aal2)
  const challenge = useCallback(async (code: string): Promise<boolean> => {
    if (!state.factorId) {
      setState(prev => ({ ...prev, error: 'Nenhum fator MFA configurado' }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: state.factorId,
      });

      if (challengeError) {
        throw challengeError;
      }

      // Verify the challenge
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: state.factorId,
        challengeId: challengeData.id,
        code,
      });

      if (error) {
        throw error;
      }

      // Refresh status after successful verification
      await checkMFAStatus();

      return true;
    } catch (error: any) {
      console.error('[MFA] Error in challenge:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Código inválido. Tente novamente.',
      }));
      return false;
    }
  }, [state.factorId, checkMFAStatus]);

  // Unenroll MFA
  const unenroll = useCallback(async (): Promise<boolean> => {
    if (!state.factorId) {
      setState(prev => ({ ...prev, error: 'Nenhum fator MFA para remover' }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: state.factorId,
      });

      if (error) {
        throw error;
      }

      await checkMFAStatus();
      return true;
    } catch (error: any) {
      console.error('[MFA] Error unenrolling:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao desativar MFA',
      }));
      return false;
    }
  }, [state.factorId, checkMFAStatus]);

  // Cancel enrollment
  const cancelEnrollment = useCallback(() => {
    setEnrollmentData(null);
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Check status on mount
  useEffect(() => {
    checkMFAStatus();
  }, [checkMFAStatus]);

  return {
    ...state,
    enrollmentData,
    enroll,
    verifyEnrollment,
    challenge,
    unenroll,
    cancelEnrollment,
    clearError,
    refreshStatus: checkMFAStatus,
  };
};
