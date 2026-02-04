/**
 * Utility functions for MFA recovery codes
 */

/**
 * Generate 8 unique recovery codes in format XXXX-XXXX-XXXX
 */
export const generateRecoveryCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = Array.from({ length: 3 }, () =>
      Math.random().toString(36).substring(2, 6).toUpperCase()
    ).join('-');
    codes.push(code);
  }
  return codes;
};

/**
 * Format recovery code for display (add dashes if not present)
 */
export const formatRecoveryCode = (code: string): string => {
  const cleaned = code.replace(/-/g, '').toUpperCase();
  if (cleaned.length === 12) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`;
  }
  return code.toUpperCase();
};

/**
 * Validate recovery code format
 */
export const isValidRecoveryCodeFormat = (code: string): boolean => {
  const cleaned = code.replace(/-/g, '').toUpperCase();
  return /^[A-Z0-9]{12}$/.test(cleaned);
};

/**
 * Download recovery codes as text file
 */
export const downloadRecoveryCodes = (codes: string[]): void => {
  const content = `=== CÓDIGOS DE RECUPERAÇÃO MFA ===
Gerados em: ${new Date().toLocaleString('pt-BR')}

IMPORTANTE: Guarde esses códigos em local seguro!
Cada código só pode ser usado UMA vez.

${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

===============================
Se você perder acesso ao app autenticador,
use um desses códigos para fazer login.
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'codigos-recuperacao-mfa.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
