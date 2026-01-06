import { useState, useEffect } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const PWAInstallPrompt = () => {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the prompt before
    const hasDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (hasDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt after a short delay if installable or on iOS
    const timer = setTimeout(() => {
      if ((isInstallable || isIOS) && !isInstalled) {
        setShowPrompt(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isIOS]);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      const success = await installApp();
      if (success) {
        setShowPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (isInstalled || dismissed || (!showPrompt && !showIOSInstructions)) {
    return null;
  }

  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Instalar Barber360
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1 -mr-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para instalar o app no seu iPhone/iPad:
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Share className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground">
                  Toque no botão <strong>Compartilhar</strong> na barra do Safari
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground">
                  Selecione <strong>"Adicionar à Tela de Início"</strong>
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Download className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground">
                  Toque em <strong>"Adicionar"</strong> para confirmar
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full mt-6"
            onClick={handleDismiss}
          >
            Entendi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-card border border-border rounded-xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-4">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
          <Download className="h-6 w-6 text-primary-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm">
            Instalar Barber360
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adicione à tela inicial para acesso rápido
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-8 w-8 -mt-1 -mr-1"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleDismiss}
        >
          Agora não
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={handleInstall}
        >
          Instalar
        </Button>
      </div>
    </div>
  );
};
