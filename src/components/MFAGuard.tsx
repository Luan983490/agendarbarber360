import { useEffect, useState } from 'react';
import { useMFA } from '@/hooks/useMFA';
import { MFARequiredModal } from './MFARequiredModal';
import { MFAVerificationModal } from './MFAVerificationModal';

interface MFAGuardProps {
  children: React.ReactNode;
}

/**
 * Componente que protege a aplicação com MFA.
 * - Mostra modal de enrollment se MFA é obrigatório mas não está configurado
 * - Mostra modal de verificação se MFA está configurado mas sessão é AAL1
 */
export function MFAGuard({ children }: MFAGuardProps) {
  const {
    isLoading,
    isMFARequired,
    isMFAEnabled,
    currentAAL,
    factors,
    canDismiss,
  } = useMFA();

  const [showRequiredModal, setShowRequiredModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCompleted, setVerificationCompleted] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Se MFA é obrigatório mas não está habilitado
    if (isMFARequired && !isMFAEnabled) {
      setShowRequiredModal(true);
      return;
    }

    // Se MFA está habilitado mas sessão é AAL1 (precisa verificar)
    if (isMFAEnabled && currentAAL === 'aal1' && factors.length > 0 && !verificationCompleted) {
      setShowVerificationModal(true);
      return;
    }
  }, [isLoading, isMFARequired, isMFAEnabled, currentAAL, factors, verificationCompleted]);

  const handleVerificationSuccess = () => {
    setVerificationCompleted(true);
    setShowVerificationModal(false);
  };

  const handleVerificationCancel = () => {
    // Usuário cancelou - pode fazer logout ou deixar em estado limitado
    setShowVerificationModal(false);
  };

  const handleRequiredModalClose = (open: boolean) => {
    // Só fecha se pode dispensar ou se MFA foi configurado
    if (!open && (canDismiss || isMFAEnabled)) {
      setShowRequiredModal(false);
    }
  };

  return (
    <>
      {children}

      <MFARequiredModal
        open={showRequiredModal}
        onOpenChange={handleRequiredModalClose}
      />

      <MFAVerificationModal
        open={showVerificationModal}
        onOpenChange={setShowVerificationModal}
        onSuccess={handleVerificationSuccess}
        onCancel={handleVerificationCancel}
      />
    </>
  );
}
