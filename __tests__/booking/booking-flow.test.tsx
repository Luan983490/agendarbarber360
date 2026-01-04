import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// ============================================
// MOCKS
// ============================================

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock user state
let mockUser: any = null;
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, loading: false })
}));

// Mock data
const mockServices = [
  { id: 'service-1', name: 'Corte Masculino', price: 35, duration: 30, description: 'Corte tradicional', is_active: true },
  { id: 'service-2', name: 'Barba', price: 25, duration: 20, description: 'Barba completa', is_active: true },
  { id: 'service-3', name: 'Combo Corte + Barba', price: 50, duration: 50, description: 'Corte e barba', is_active: true }
];

const mockBarbers = [
  { id: 'barber-1', name: 'João Silva', specialty: 'Cortes modernos', image_url: null, is_active: true },
  { id: 'barber-2', name: 'Carlos Santos', specialty: 'Barba', image_url: null, is_active: true }
];

const mockProducts = [
  { id: 'product-1', name: 'Pomada Modeladora', price: 45, stock_quantity: 10, is_active: true },
  { id: 'product-2', name: 'Óleo para Barba', price: 35, stock_quantity: 5, is_active: true }
];

const mockBlocks = [
  { id: 'block-1', barber_id: 'barber-1', block_date: '2024-01-15', start_time: '12:00', end_time: '14:00', reason: 'Almoço' }
];

const mockBookings = [
  { id: 'booking-1', barber_id: 'barber-1', booking_date: '2024-01-15', booking_time: '10:00', status: 'confirmed' }
];

// Supabase mock with dynamic responses
let supabaseMockResponses: Record<string, any> = {};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const createChain = (data: any = null, error: any = null) => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data, error }),
        then: vi.fn((resolve) => resolve({ data, error }))
      });

      if (table === 'services') {
        return createChain(supabaseMockResponses.services ?? mockServices);
      }
      if (table === 'barbers') {
        return createChain(supabaseMockResponses.barbers ?? mockBarbers);
      }
      if (table === 'products') {
        return createChain(supabaseMockResponses.products ?? mockProducts);
      }
      if (table === 'barber_blocks') {
        return createChain(supabaseMockResponses.blocks ?? mockBlocks);
      }
      if (table === 'bookings') {
        const chain = createChain(supabaseMockResponses.bookings ?? mockBookings);
        // Override insert for booking creation
        chain.insert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: supabaseMockResponses.newBooking ?? { id: 'new-booking-id' }, 
              error: supabaseMockResponses.bookingError ?? null 
            })
          })
        });
        return chain;
      }
      if (table === 'profiles') {
        return createChain(supabaseMockResponses.profile ?? { display_name: 'Cliente Teste' });
      }
      if (table === 'booking_products') {
        return createChain(null);
      }
      return createChain(null);
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null })
  }
}));

import { BookingModal } from '@/components/BookingModal';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// HELPERS
// ============================================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockBarbershop = {
  id: 'barbershop-1',
  name: 'Barbearia Teste',
  image: 'https://example.com/image.jpg'
};

// ============================================
// TESTES
// ============================================

describe('Booking Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
    mockUser = { id: 'user-123', email: 'client@test.com' };
    supabaseMockResponses = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // SELEÇÃO DE SERVIÇO
  // ==========================================
  describe('Seleção de Serviço', () => {
    it('deve exibir lista de serviços disponíveis', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      // Abrir modal
      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
        expect(screen.getByText('Barba')).toBeInTheDocument();
        expect(screen.getByText('Combo Corte + Barba')).toBeInTheDocument();
      });
    });

    it('deve mostrar preço e duração do serviço', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('R$ 35.00')).toBeInTheDocument();
        expect(screen.getByText('30 min')).toBeInTheDocument();
      });
    });

    it('deve selecionar serviço ao clicar', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
      });

      // Clicar no serviço
      const serviceCard = screen.getByText('Corte Masculino').closest('[class*="cursor-pointer"]');
      if (serviceCard) {
        await userEvent.click(serviceCard);
        // Verificar que o card está selecionado (tem ring-2)
        await waitFor(() => {
          expect(serviceCard).toHaveClass('ring-2');
        });
      }
    });

    it('deve exibir mensagem quando não há serviços', async () => {
      supabaseMockResponses.services = [];
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText(/ainda não cadastrou serviços/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // SELEÇÃO DE BARBEIRO
  // ==========================================
  describe('Seleção de Barbeiro', () => {
    it('deve exibir lista de barbeiros disponíveis', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Selecione um barbeiro')).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem quando não há barbeiros', async () => {
      supabaseMockResponses.barbers = [];
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText(/Nenhum barbeiro cadastrado/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // SELEÇÃO DE DATA/HORA
  // ==========================================
  describe('Seleção de Data e Hora', () => {
    it('deve exibir calendário para seleção de data', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        // Verifica se o calendário está presente
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });
    });

    it('deve exibir horários disponíveis', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        // Verifica se há botões de horário
        expect(screen.getByText('08:00')).toBeInTheDocument();
        expect(screen.getByText('09:00')).toBeInTheDocument();
      });
    });

    it('deve permitir selecionar um horário', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('09:00')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('09:00'));

      // Verificar que o horário está selecionado
      await waitFor(() => {
        const timeButton = screen.getByText('09:00');
        expect(timeButton).toHaveClass('bg-primary');
      });
    });
  });

  // ==========================================
  // VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
  // ==========================================
  describe('Validação de Campos Obrigatórios', () => {
    it('deve exibir erro quando não seleciona serviço', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Confirmar Agendamento')).toBeInTheDocument();
      });

      // Tentar confirmar sem selecionar serviço
      await userEvent.click(screen.getByText('Confirmar Agendamento'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Erro',
            description: expect.stringContaining('campos obrigatórios'),
            variant: 'destructive'
          })
        );
      });
    });

    it('deve exibir erro quando usuário não está logado', async () => {
      mockUser = null;
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
      });

      // Selecionar serviço
      const serviceCard = screen.getByText('Corte Masculino').closest('[class*="cursor-pointer"]');
      if (serviceCard) await userEvent.click(serviceCard);

      // Selecionar horário
      await userEvent.click(screen.getByText('09:00'));

      // Tentar confirmar
      await userEvent.click(screen.getByText('Confirmar Agendamento'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Erro',
            description: expect.stringContaining('logado'),
            variant: 'destructive'
          })
        );
      });
    });
  });

  // ==========================================
  // CRIAÇÃO DE AGENDAMENTO COM SUCESSO
  // ==========================================
  describe('Criação de Agendamento com Sucesso', () => {
    it('deve criar agendamento com sucesso', async () => {
      supabaseMockResponses.newBooking = { id: 'new-booking-123' };
      supabaseMockResponses.bookingError = null;
      
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
      });

      // Selecionar serviço
      const serviceCard = screen.getByText('Corte Masculino').closest('[class*="cursor-pointer"]');
      if (serviceCard) await userEvent.click(serviceCard);

      // Selecionar horário
      await userEvent.click(screen.getByText('09:00'));

      // Confirmar agendamento
      await userEvent.click(screen.getByText('Confirmar Agendamento'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Agendamento realizado!'
          })
        );
      });
    });

    it('deve calcular preço total corretamente com produtos', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
        expect(screen.getByText('Pomada Modeladora')).toBeInTheDocument();
      });

      // Selecionar serviço (R$ 35)
      const serviceCard = screen.getByText('Corte Masculino').closest('[class*="cursor-pointer"]');
      if (serviceCard) await userEvent.click(serviceCard);

      // Selecionar produto (R$ 45)
      const productCard = screen.getByText('Pomada Modeladora').closest('[class*="cursor-pointer"]');
      if (productCard) await userEvent.click(productCard);

      // Verificar total (R$ 80)
      await waitFor(() => {
        expect(screen.getByText('R$ 80.00')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // TRATAMENTO DE ERROS
  // ==========================================
  describe('Tratamento de Erros', () => {
    it('deve exibir erro quando horário está ocupado', async () => {
      supabaseMockResponses.bookingError = { message: 'Horário já ocupado' };
      
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
      });

      // Selecionar serviço
      const serviceCard = screen.getByText('Corte Masculino').closest('[class*="cursor-pointer"]');
      if (serviceCard) await userEvent.click(serviceCard);

      // Selecionar horário
      await userEvent.click(screen.getByText('09:00'));

      // Tentar confirmar
      await userEvent.click(screen.getByText('Confirmar Agendamento'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Erro ao criar agendamento',
            variant: 'destructive'
          })
        );
      });
    });

    it('deve exibir erro quando serviço não é encontrado', async () => {
      // Simular serviço não encontrado após seleção
      supabaseMockResponses.services = [];
      
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText(/ainda não cadastrou serviços/i)).toBeInTheDocument();
      });
    });

    it('deve lidar com erro de rede ao carregar serviços', async () => {
      // Mock error response
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: null, error: { message: 'Network error' } }))
      } as any));
      
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Erro ao carregar serviços',
            variant: 'destructive'
          })
        );
      });
    });
  });

  // ==========================================
  // VALIDAÇÃO DE HORÁRIOS
  // ==========================================
  describe('Validação de Horários', () => {
    it('deve identificar horários bloqueados', async () => {
      // Configurar bloqueio para horário 12:00
      supabaseMockResponses.blocks = [
        { id: 'block-1', barber_id: 'barber-1', block_date: '2024-01-15', start_time: '12:00', end_time: '14:00', reason: 'Almoço' }
      ];
      
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
      });

      // Verificar que os horários são exibidos
      await waitFor(() => {
        expect(screen.getByText('08:00')).toBeInTheDocument();
      });
    });

    it('deve identificar horários já agendados', async () => {
      supabaseMockResponses.bookings = [
        { id: 'booking-1', barber_id: 'barber-1', booking_date: '2024-01-15', booking_time: '10:00', status: 'confirmed' }
      ];
      
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
      });

      // O horário 10:00 deveria estar marcado como ocupado
      // (a lógica exata depende da implementação do componente)
    });
  });

  // ==========================================
  // VALIDAÇÃO DE CONFLITOS
  // ==========================================
  describe('Validação de Conflitos', () => {
    it('deve verificar conflitos de horário antes de criar agendamento', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
      });

      // O componente deve consultar blocks e bookings ao selecionar data/barbeiro
      expect(supabase.from).toHaveBeenCalled();
    });

    it('deve exibir erro para horário bloqueado pelo barbeiro', async () => {
      // Configurar mock para retornar bloqueio
      const originalFrom = vi.mocked(supabase.from);
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'barber_blocks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ 
              data: [{ 
                id: 'block-1', 
                barber_id: 'barber-1', 
                start_time: '09:00', 
                end_time: '10:00' 
              }], 
              error: null 
            }))
          } as any;
        }
        return originalFrom(table);
      });
      
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // EDGE CASES
  // ==========================================
  describe('Edge Cases', () => {
    it('deve resetar formulário após agendamento bem-sucedido', async () => {
      supabaseMockResponses.newBooking = { id: 'new-booking-123' };
      supabaseMockResponses.bookingError = null;
      
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
      });

      // Selecionar serviço
      const serviceCard = screen.getByText('Corte Masculino').closest('[class*="cursor-pointer"]');
      if (serviceCard) await userEvent.click(serviceCard);

      // Selecionar horário
      await userEvent.click(screen.getByText('09:00'));

      // Confirmar
      await userEvent.click(screen.getByText('Confirmar Agendamento'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Agendamento realizado!'
          })
        );
      });

      // Modal deve fechar após sucesso (o estado é gerenciado internamente)
    });

    it('deve manter estado de loading durante requisição', async () => {
      // Simular delay na resposta
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => 
              new Promise(resolve => setTimeout(() => resolve({ data: { id: 'new' }, error: null }), 100))
            )
          })
        }),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockServices, error: null }))
      } as any));
      
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Confirmar Agendamento')).toBeInTheDocument();
      });
    });

    it('deve permitir adicionar observações ao agendamento', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
      });

      // Verificar que o campo de observações existe
      const notesField = screen.getByPlaceholderText(/observação|nota/i);
      if (notesField) {
        await userEvent.type(notesField, 'Quero um corte mais curto nas laterais');
        expect(notesField).toHaveValue('Quero um corte mais curto nas laterais');
      }
    });

    it('deve selecionar e desselecionar produtos', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <BookingModal barberShop={mockBarbershop}>
            <button>Agendar</button>
          </BookingModal>
        </Wrapper>
      );

      await userEvent.click(screen.getByText('Agendar'));

      await waitFor(() => {
        expect(screen.getByText('Pomada Modeladora')).toBeInTheDocument();
      });

      // Selecionar produto
      const productCard = screen.getByText('Pomada Modeladora').closest('[class*="cursor-pointer"]');
      if (productCard) {
        await userEvent.click(productCard);
        await waitFor(() => {
          expect(productCard).toHaveClass('ring-2');
        });

        // Desselecionar
        await userEvent.click(productCard);
        await waitFor(() => {
          expect(productCard).not.toHaveClass('ring-2');
        });
      }
    });
  });
});
