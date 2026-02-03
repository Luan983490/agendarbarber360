import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Factor } from '@supabase/supabase-js';

export interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
}

export interface EnrollmentData {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

export const useMFA = () => {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [currentChallengeId, setCurrentChallengeId] = useState<string | null>(null);
  const { toast } = useToast();

  const isMFAEnabled = factors.some(f => f.status === 'verified');

  const fetchFactors = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) throw error;
      
      // Map to our interface
      const mappedFactors: MFAFactor[] = (data.totp || []).map((f: Factor) => ({
        id: f.id,
        friendly_name: f.friendly_name,
        factor_type: f.factor_type,
        status: f.status,
        created_at: f.created_at,
        updated_at: f.updated_at
      }));
      
      setFactors(mappedFactors);
    } catch (error: any) {
      console.error('Error fetching MFA factors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFactors();
  }, [fetchFactors]);

  const startEnrollment = async (): Promise<EnrollmentData | null> => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      if (error) throw error;

      const enrollment: EnrollmentData = {
        id: data.id,
        type: data.type as 'totp',
        totp: {
          qr_code: data.totp.qr_code,
          secret: data.totp.secret,
          uri: data.totp.uri
        }
      };

      setEnrollmentData(enrollment);
      return enrollment;
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar configuração',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  const verifyEnrollment = async (factorId: string, code: string): Promise<boolean> => {
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });

      if (verifyError) throw verifyError;

      await fetchFactors();
      setEnrollmentData(null);
      
      toast({
        title: 'MFA ativado!',
        description: 'Autenticação de dois fatores configurada com sucesso.'
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Código inválido',
        description: 'Verifique o código e tente novamente.',
        variant: 'destructive'
      });
      return false;
    }
  };

  const cancelEnrollment = async () => {
    if (enrollmentData) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: enrollmentData.id });
      } catch (error) {
        // Ignore error if factor was not yet created
      }
      setEnrollmentData(null);
    }
  };

  const unenroll = async (factorId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      
      if (error) throw error;

      await fetchFactors();
      
      toast({
        title: 'MFA desativado',
        description: 'Autenticação de dois fatores foi removida.'
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao desativar MFA',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const createChallenge = async (factorId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.auth.mfa.challenge({ factorId });
      
      if (error) throw error;

      setCurrentChallengeId(data.id);
      return data.id;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar desafio',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  const verifyChallenge = async (factorId: string, challengeId: string, code: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code
      });

      if (error) throw error;

      setCurrentChallengeId(null);
      return true;
    } catch (error: any) {
      toast({
        title: 'Código inválido',
        description: 'Verifique o código e tente novamente.',
        variant: 'destructive'
      });
      return false;
    }
  };

  const getAssuranceLevel = async (): Promise<'aal1' | 'aal2' | null> => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (error) throw error;

      return data.currentLevel;
    } catch (error) {
      return null;
    }
  };

  const checkMFARequired = async (): Promise<{ required: boolean; factorId?: string }> => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (error) throw error;

      if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactor = factorsData?.totp?.find(f => f.status === 'verified');
        
        if (verifiedFactor) {
          return { required: true, factorId: verifiedFactor.id };
        }
      }

      return { required: false };
    } catch (error) {
      return { required: false };
    }
  };

  return {
    factors,
    loading,
    isMFAEnabled,
    enrollmentData,
    currentChallengeId,
    fetchFactors,
    startEnrollment,
    verifyEnrollment,
    cancelEnrollment,
    unenroll,
    createChallenge,
    verifyChallenge,
    getAssuranceLevel,
    checkMFARequired
  };
};
