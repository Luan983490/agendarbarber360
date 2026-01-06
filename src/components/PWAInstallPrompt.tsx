import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

export const PWAInstallPrompt = () => {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hasDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (hasDismissed) {
      setDismissed(true);
      return;
    }

    const timer = setTimeout(() => {
      // Mostra o prompt se for instalável OU se for iOS OU se estiver em mobile
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if ((isInstallable || isIOS || isMobile) && !isInstalled) {
        setShowPrompt(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isIOS]);

  const handleInstall = async () => {
    // Para Android com suporte nativo
    if (isInstallable) {
      const success = await installApp();
      if (success) {
        toast.success('App instalado com sucesso!');
        setShowPrompt(false);
      } else {
        toast.info('Instalação cancelada');
      }
      return;
    }

    // Para iOS
    if (isIOS) {
      toast.info(
        'Para instalar: toque no botão compartilhar (⬆️) do Safari e selecione "Adicionar à Tela de Início"',
        { duration: 8000 }
      );
      setShowPrompt(false);
      return;
    }

    // Para outros casos (desktop ou navegador sem suporte)
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isAndroid && !isChrome) {
      toast.info(
        'Para instalar, abra este site no Chrome e toque no menu (⋮) → "Adicionar à tela inicial"',
        { duration: 8000 }
      );
    } else if (isAndroid) {
      toast.info(
        'Toque no menu (⋮) do Chrome e selecione "Adicionar à tela inicial"',
        { duration: 8000 }
      );
    } else {
      toast.info(
        'Para instalar como app, acesse este site pelo celular',
        { duration: 5000 }
      );
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (isInstalled || dismissed || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-card border border-border rounded-xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
          <Smartphone className="h-6 w-6 text-primary-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">
            Instalar Barber360
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adicione à tela inicial para acesso rápido
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-8 w-8"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Button
        className="w-full mt-3"
        onClick={handleInstall}
      >
        <Download className="h-4 w-4 mr-2" />
        {isInstallable ? 'Instalar agora' : 'Como instalar'}
      </Button>
    </div>
  );
};
