import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

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
      if ((isInstallable || isIOS) && !isInstalled) {
        setShowPrompt(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isIOS]);

  const handleInstall = async () => {
    if (isIOS) {
      // Para iOS, abre o menu de compartilhamento nativo se possível
      // Caso contrário, mostra uma mensagem simples
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Barber360',
            text: 'Instale o Barber360 na sua tela inicial',
            url: window.location.href,
          });
        } catch {
          // Usuário cancelou ou erro - mostra dica rápida
          alert('Toque em "Adicionar à Tela de Início" no menu que abriu para instalar o app.');
        }
      } else {
        alert('Para instalar: toque no botão de compartilhar (⬆️) do Safari e selecione "Adicionar à Tela de Início"');
      }
      setShowPrompt(false);
    } else {
      const success = await installApp();
      if (success) {
        setShowPrompt(false);
      }
    }
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
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 bg-card border border-border rounded-xl p-3 shadow-2xl z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
          <Download className="h-5 w-5 text-primary-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm">
            Instalar Barber360
          </p>
          <p className="text-xs text-muted-foreground">
            Acesso rápido na tela inicial
          </p>
        </div>
        
        <Button
          size="sm"
          className="flex-shrink-0"
          onClick={handleInstall}
        >
          Instalar
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-7 w-7"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};