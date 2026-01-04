import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn (classnames merger)', () => {
    it('deve combinar classes simples', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('deve ignorar valores falsy', () => {
      const result = cn('class1', null, undefined, false, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('deve lidar com classes condicionais', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      expect(result).toBe('base active');
    });

    it('deve mesclar classes Tailwind corretamente', () => {
      const result = cn('px-4 py-2', 'px-6');
      expect(result).toBe('py-2 px-6');
    });

    it('deve lidar com arrays de classes', () => {
      const result = cn(['class1', 'class2']);
      expect(result).toBe('class1 class2');
    });

    it('deve lidar com objetos de classes', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true
      });
      expect(result).toBe('class1 class3');
    });
  });
});

describe('Validation Helpers', () => {
  describe('Email Validation', () => {
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    it('deve validar email correto', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.com.br')).toBe(true);
    });

    it('deve rejeitar email inválido', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
    });
  });

  describe('Phone Validation', () => {
    const isValidPhone = (phone: string): boolean => {
      const cleaned = phone.replace(/\D/g, '');
      return cleaned.length >= 10 && cleaned.length <= 11;
    };

    it('deve validar telefone brasileiro', () => {
      expect(isValidPhone('11999999999')).toBe(true);
      expect(isValidPhone('(11) 99999-9999')).toBe(true);
      expect(isValidPhone('11 9999-9999')).toBe(true);
    });

    it('deve rejeitar telefone inválido', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('123456789012')).toBe(false);
    });
  });

  describe('Duration Validation (15 min intervals)', () => {
    const isValidDuration = (duration: number): boolean => {
      return duration >= 15 && duration <= 360 && duration % 15 === 0;
    };

    it('deve validar durações em intervalos de 15 minutos', () => {
      expect(isValidDuration(15)).toBe(true);
      expect(isValidDuration(30)).toBe(true);
      expect(isValidDuration(45)).toBe(true);
      expect(isValidDuration(60)).toBe(true);
      expect(isValidDuration(360)).toBe(true);
    });

    it('deve rejeitar durações inválidas', () => {
      expect(isValidDuration(0)).toBe(false);
      expect(isValidDuration(10)).toBe(false);
      expect(isValidDuration(25)).toBe(false);
      expect(isValidDuration(361)).toBe(false);
      expect(isValidDuration(400)).toBe(false);
    });
  });

  describe('Price Validation', () => {
    const isValidPrice = (price: number): boolean => {
      return price > 0 && Number.isFinite(price);
    };

    it('deve validar preços positivos', () => {
      expect(isValidPrice(1)).toBe(true);
      expect(isValidPrice(35.50)).toBe(true);
      expect(isValidPrice(100)).toBe(true);
    });

    it('deve rejeitar preços inválidos', () => {
      expect(isValidPrice(0)).toBe(false);
      expect(isValidPrice(-10)).toBe(false);
      expect(isValidPrice(Infinity)).toBe(false);
      expect(isValidPrice(NaN)).toBe(false);
    });
  });
});
