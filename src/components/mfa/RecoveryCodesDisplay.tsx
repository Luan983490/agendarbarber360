import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Download, AlertTriangle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadRecoveryCodes } from '@/lib/recovery-codes';

interface RecoveryCodesDisplayProps {
  codes: string[];
  onConfirm: () => void;
  showConfirmation?: boolean;
}

export const RecoveryCodesDisplay = ({ 
  codes, 
  onConfirm, 
  showConfirmation = true 
}: RecoveryCodesDisplayProps) => {
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyAll = async () => {
    const text = codes.join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: 'Códigos copiados!',
      description: 'Os códigos de recuperação foram copiados para a área de transferência.'
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadRecoveryCodes(codes);
    toast({
      title: 'Download iniciado',
      description: 'O arquivo com os códigos de recuperação foi baixado.'
    });
  };

  return (
    <div className="space-y-4">
      <Alert variant="destructive" className="border-amber-500 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-600 dark:text-amber-400">
          <strong>Importante!</strong> Guarde esses códigos em local seguro. 
          Se você perder acesso ao app autenticador, precisará de um desses códigos para fazer login.
          Cada código só pode ser usado <strong>uma vez</strong>.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
        {codes.map((code, index) => (
          <div 
            key={index} 
            className="p-2 bg-background rounded border text-center"
          >
            {code}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleCopyAll}
        >
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? 'Copiados!' : 'Copiar todos'}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4 mr-2" />
          Baixar .txt
        </Button>
      </div>

      {showConfirmation && (
        <>
          <div className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/50">
            <Checkbox
              id="confirm-saved"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <label
              htmlFor="confirm-saved"
              className="text-sm leading-tight cursor-pointer"
            >
              Eu salvei esses códigos em um local seguro e entendo que cada código só pode ser usado uma vez.
            </label>
          </div>

          <Button
            className="w-full"
            onClick={onConfirm}
            disabled={!confirmed}
          >
            Continuar
          </Button>
        </>
      )}
    </div>
  );
};
