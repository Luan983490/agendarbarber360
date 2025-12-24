import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
