import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';
import { StarRating } from '@/components/StarRating';

describe('StarRating', () => {
  describe('Renderização', () => {
    it('deve renderizar 5 estrelas', () => {
      renderWithProviders(<StarRating rating={0} />);
      
      const stars = screen.getAllByRole('button');
      expect(stars).toHaveLength(5);
    });

    it('deve exibir rating corretamente', () => {
      renderWithProviders(<StarRating rating={3} />);
      
      const stars = screen.getAllByRole('button');
      // As primeiras 3 estrelas devem estar preenchidas
      stars.slice(0, 3).forEach((star) => {
        const svg = star.querySelector('svg');
        expect(svg).toHaveClass('fill-yellow-400');
      });
      // As últimas 2 não devem estar preenchidas
      stars.slice(3).forEach((star) => {
        const svg = star.querySelector('svg');
        expect(svg).toHaveClass('fill-none');
      });
    });

    it('deve aplicar tamanho sm corretamente', () => {
      renderWithProviders(<StarRating rating={1} size="sm" />);
      
      const star = screen.getAllByRole('button')[0].querySelector('svg');
      expect(star).toHaveClass('h-4', 'w-4');
    });

    it('deve aplicar tamanho lg corretamente', () => {
      renderWithProviders(<StarRating rating={1} size="lg" />);
      
      const star = screen.getAllByRole('button')[0].querySelector('svg');
      expect(star).toHaveClass('h-6', 'w-6');
    });
  });

  describe('Interatividade', () => {
    it('deve chamar onRatingChange ao clicar em uma estrela', async () => {
      const onRatingChange = vi.fn();
      const user = userEvent.setup();
      
      renderWithProviders(
        <StarRating rating={0} onRatingChange={onRatingChange} />
      );
      
      const stars = screen.getAllByRole('button');
      await user.click(stars[2]); // Clicar na terceira estrela
      
      expect(onRatingChange).toHaveBeenCalledWith(3);
    });

    it('não deve permitir clique quando readonly', async () => {
      const onRatingChange = vi.fn();
      const user = userEvent.setup();
      
      renderWithProviders(
        <StarRating rating={2} onRatingChange={onRatingChange} readonly />
      );
      
      const stars = screen.getAllByRole('button');
      await user.click(stars[4]);
      
      expect(onRatingChange).not.toHaveBeenCalled();
    });

    it('deve ter cursor-pointer quando editável', () => {
      renderWithProviders(
        <StarRating rating={0} onRatingChange={vi.fn()} />
      );
      
      const star = screen.getAllByRole('button')[0];
      expect(star).toHaveClass('cursor-pointer');
    });

    it('deve ter cursor-default quando readonly', () => {
      renderWithProviders(<StarRating rating={3} readonly />);
      
      const star = screen.getAllByRole('button')[0];
      expect(star).toHaveClass('cursor-default');
    });
  });
});
