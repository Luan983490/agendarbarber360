import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Configurar servidor MSW para testes Node.js
export const server = setupServer(...handlers);
