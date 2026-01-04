/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Ambiente de teste
    environment: 'jsdom',
    
    // Setup global antes dos testes
    setupFiles: ['./src/test/setup-tests.ts'],
    
    // Globals para não precisar importar describe, it, expect
    globals: true,
    
    // Incluir arquivos de teste
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    
    // Excluir node_modules e dist
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/main.tsx',
        'src/vite-env.d.ts',
        'src/integrations/supabase/types.ts'
      ],
      // Thresholds mínimos de cobertura
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50
      }
    },
    
    // Timeout para testes
    testTimeout: 10000,
    
    // Watch mode - não rodar automaticamente ao salvar em CI
    watch: false,
    
    // Reporter para output
    reporters: ['verbose'],
    
    // Pool de threads para paralelização
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    },
    
    // Retry em caso de falha (útil para testes flaky)
    retry: 1,
    
    // Deps inline para resolver problemas de ESM
    deps: {
      inline: [/@radix-ui/, /lucide-react/]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
