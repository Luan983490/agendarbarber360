import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

export const PWAInlineBanner = () => {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('pwa-inline-dismissed') === 'true';
  });

  const handleInstall = async () => {
    if (isInstallable) {
      const success = await installApp();
      if (success) {
        toast.success('App instalado com sucesso!');
      }
      return;
    }

    if (isIOS) {
      toast.info(
        'Toque no botão compartilhar (⬆️) do Safari e selecione "Adicionar à Tela de Início"',
        { duration: 8000 }
      );
      return;
    }

    const isAndroid = /Android/.test(navigator.userAgent);
    if (isAndroid) {
      toast.info('Toque no menu (⋮) do Chrome e selecione "Adicionar à tela inicial"', { duration: 8000 });
    } else {
      toast.info('Para instalar como app, acesse este site pelo celular', { duration: 5000 });
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-inline-dismissed', 'true');
  };

  if (isInstalled || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-card/60 border border-border/50 rounded-lg px-3 py-2 mb-4">
      <p className="text-xs text-muted-foreground">
        📱 Instale o app para acesso rápido
      </p>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={handleInstall}>
          <Download className="h-3 w-3 mr-1" />
          Baixar
        </Button>
        <button onClick={handleDismiss} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
