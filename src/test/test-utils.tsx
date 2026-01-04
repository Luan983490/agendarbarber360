import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';

// ============================================
// PROVIDERS PARA TESTES
// ============================================

// Query Client para testes (sem retry e cache desabilitado)
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0
      },
      mutations: {
        retry: false
      }
    }
  });

interface TestProviderProps {
  children: React.ReactNode;
}

// Provider que engloba todos os contextos necessários
export const TestProviders: React.FC<TestProviderProps> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// ============================================
// CUSTOM RENDER COM PROVIDERS
// ============================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  queryClient?: QueryClient;
}

/**
 * Custom render que inclui todos os providers necessários
 * @param ui - Componente a ser renderizado
 * @param options - Opções de renderização
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...renderOptions }: CustomRenderOptions = {}
) {
  // Configurar rota inicial
  window.history.pushState({}, 'Test page', route);

  return {
    ...render(ui, { wrapper: TestProviders, ...renderOptions })
  };
}

// ============================================
// HELPERS PARA TESTES
// ============================================

/**
 * Aguarda um tempo específico (útil para animações)
 * Renomeado para não conflitar com waitFor do testing-library
 */
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Cria um mock de usuário autenticado
 */
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  ...overrides
});

/**
 * Cria um mock de sessão
 */
export const createMockSession = (user = createMockUser()) => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user
});

/**
 * Cria um mock de barbearia
 */
export const createMockBarbershop = (overrides = {}) => ({
  id: 'test-barbershop-id',
  name: 'Barbearia Teste',
  address: 'Rua Teste, 123',
  owner_id: 'test-owner-id',
  phone: '11999999999',
  email: 'barbearia@teste.com',
  description: 'Uma barbearia de teste',
  image_url: null,
  rating: 4.5,
  total_reviews: 10,
  amenities: ['wifi', 'estacionamento'],
  opening_hours: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

/**
 * Cria um mock de barbeiro
 */
export const createMockBarber = (overrides = {}) => ({
  id: 'test-barber-id',
  name: 'João Barbeiro',
  barbershop_id: 'test-barbershop-id',
  specialty: 'Corte masculino',
  phone: '11988888888',
  image_url: null,
  is_active: true,
  user_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

/**
 * Cria um mock de serviço
 */
export const createMockService = (overrides = {}) => ({
  id: 'test-service-id',
  name: 'Corte Tradicional',
  description: 'Corte masculino tradicional',
  price: 35.0,
  duration: 30,
  barbershop_id: 'test-barbershop-id',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

/**
 * Cria um mock de agendamento
 */
export const createMockBooking = (overrides = {}) => ({
  id: 'test-booking-id',
  barbershop_id: 'test-barbershop-id',
  barber_id: 'test-barber-id',
  service_id: 'test-service-id',
  client_id: 'test-client-id',
  client_name: 'Cliente Teste',
  booking_date: new Date().toISOString().split('T')[0],
  booking_time: '10:00',
  booking_end_time: '10:30',
  status: 'confirmed',
  total_price: 35.0,
  notes: null,
  is_external_booking: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

// Re-exportar tudo do testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
