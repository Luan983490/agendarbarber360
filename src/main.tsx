import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { setupGlobalErrorCapture } from "./services/logger";

// Inicializa o Sentry antes de renderizar a aplicação
initSentry();

// Configura captura global de erros para Supabase
setupGlobalErrorCapture();

/**
 * Registra o Service Worker com atualização automática.
 * Verifica atualizações a cada 60 segundos e aplica imediatamente.
 */
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Quando há uma nova versão disponível, atualiza automaticamente
        console.log('🔄 Nova versão disponível, atualizando...');
        updateSW(true);
      },
      onOfflineReady() {
        console.log('✅ App pronto para uso offline');
      },
      onRegisteredSW(swUrl, registration) {
        console.log('✅ Service Worker registrado:', swUrl);
        
        // Verifica atualizações a cada 60 segundos
        if (registration) {
          setInterval(() => {
            registration.update();
          }, 60 * 1000);
        }
      },
      onRegisterError(error) {
        console.error('❌ Erro ao registrar Service Worker:', error);
      },
    });
  }
};

// Registra o SW após o carregamento da página
if (document.readyState === 'complete') {
  registerServiceWorker();
} else {
  window.addEventListener('load', registerServiceWorker);
}

/**
 * Em alguns ambientes (preview/produção), scripts externos podem injetar o Tailwind CDN
 * (https://cdn.tailwindcss.com). Isso gera CSS em runtime e pode travar o desktop.
 * Como este projeto já usa Tailwind via PostCSS (build-time), removemos qualquer
 * injeção do CDN para evitar duplicidade e gargalos de performance.
 */
const removeTailwindCdnArtifacts = () => {
  // Remove script do Tailwind CDN (se tiver sido injetado)
  document
    .querySelectorAll<HTMLScriptElement>('script[src*="cdn.tailwindcss.com"]')
    .forEach((el) => el.remove());

  // Remove estilos gerados pelo CDN (não afeta nosso CSS compilado)
  document
    .querySelectorAll<HTMLStyleElement>(
      'style#tailwindcss, style[data-tailwindcss], style[type="text/tailwindcss"]'
    )
    .forEach((el) => el.remove());
};

removeTailwindCdnArtifacts();

// Observa apenas o <head> (custo baixo) para remover se for injetado após o carregamento
if (typeof MutationObserver !== 'undefined' && document.head) {
  const headObserver = new MutationObserver(() => {
    removeTailwindCdnArtifacts();
  });
  headObserver.observe(document.head, { childList: true });
}

createRoot(document.getElementById("root")!).render(<App />);
