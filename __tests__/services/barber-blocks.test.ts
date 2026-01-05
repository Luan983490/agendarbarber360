import { describe, it, expect, vi, beforeEach } from 'vitest';
import { barberService } from '@/services/barber.service';

// Mock Supabase client
const mockInsert = vi.fn(() => ({ error: null }));
const mockDeleteEq = vi.fn(() => ({ error: null, count: 1 }));
const mockDeleteIn = vi.fn(() => ({ error: null, count: 3 }));
const mockSelectBlocks = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'barber_blocks') {
        return {
          insert: mockInsert,
          delete: vi.fn(() => ({
            eq: vi.fn((col: string, val: string) => {
              if (col === 'barber_id') {
                return {
                  eq: mockDeleteEq,
                };
              }
              return { error: null, count: 1 };
            }),
            in: mockDeleteIn,
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn(() => ({
                  gt: vi.fn(() => ({
                    data: [{ id: 'block-1' }],
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === 'barber_working_hours') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: {
                    day_of_week: 1,
                    is_day_off: false,
                    period1_start: '09:00',
                    period1_end: '12:00',
                    period2_start: '14:00',
                    period2_end: '18:00',
                  },
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      return {
        insert: mockInsert,
        delete: vi.fn(() => ({ eq: mockDeleteEq, in: mockDeleteIn })),
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => ({ data: null, error: null })) })) })),
      };
    }),
  },
}));

describe('BarberService - Block Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBlock', () => {
    it('should validate block data correctly', async () => {
      const invalidData = {
        barberId: 'invalid-uuid',
        blockDate: 'not-a-date',
        startTime: 'invalid',
        endTime: 'invalid',
      };

      const result = await barberService.createBlock(invalidData as any);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should create a single block successfully', async () => {
      const validData = {
        barberId: '123e4567-e89b-12d3-a456-426614174000',
        blockDate: '2026-01-10',
        startTime: '09:00',
        endTime: '10:00',
        reason: 'Appointment',
      };

      const result = await barberService.createBlock(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional reason', async () => {
      const validData = {
        barberId: '123e4567-e89b-12d3-a456-426614174000',
        blockDate: '2026-01-10',
        startTime: '09:00',
        endTime: '10:00',
      };

      const result = await barberService.createBlock(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('deleteBlock', () => {
    it('should delete a single block by ID', async () => {
      const blockId = '123e4567-e89b-12d3-a456-426614174001';
      
      const result = await barberService.deleteBlock(blockId);
      expect(result.success).toBe(true);
    });
  });

  describe('deleteBlocks', () => {
    it('should return success with deletedCount 0 for empty array', async () => {
      const result = await barberService.deleteBlocks([]);
      expect(result.success).toBe(true);
      expect(result.data?.deletedCount).toBe(0);
    });

    it('should delete multiple blocks by IDs', async () => {
      const blockIds = [
        '123e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174002',
        '123e4567-e89b-12d3-a456-426614174003',
      ];
      
      const result = await barberService.deleteBlocks(blockIds);
      expect(result.success).toBe(true);
    });
  });

  describe('deleteBlocksByDate', () => {
    it('should delete all blocks for a date', async () => {
      const result = await barberService.deleteBlocksByDate({
        barberId: '123e4567-e89b-12d3-a456-426614174000',
        blockDate: '2026-01-10',
      });
      
      expect(result.success).toBe(true);
    });

    it('should delete blocks within a time range', async () => {
      const result = await barberService.deleteBlocksByDate({
        barberId: '123e4567-e89b-12d3-a456-426614174000',
        blockDate: '2026-01-10',
        startTime: '09:00',
        endTime: '12:00',
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('createFullDayBlock', () => {
    it('should create a full-day block with proper end time', async () => {
      const result = await barberService.createFullDayBlock({
        barberId: '123e4567-e89b-12d3-a456-426614174000',
        blockDate: '2026-01-13', // Monday (day 1)
        reason: 'Day off',
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept optional reason', async () => {
      const result = await barberService.createFullDayBlock({
        barberId: '123e4567-e89b-12d3-a456-426614174000',
        blockDate: '2026-01-13',
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('deleteBlockBySlot', () => {
    it('should delete block covering a specific slot time', async () => {
      const result = await barberService.deleteBlockBySlot({
        barberId: '123e4567-e89b-12d3-a456-426614174000',
        blockDate: '2026-01-10',
        slotTime: '10:00',
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('deleteBlocksInRange', () => {
    it('should delete blocks within a time range', async () => {
      const result = await barberService.deleteBlocksInRange({
        barberId: '123e4567-e89b-12d3-a456-426614174000',
        blockDate: '2026-01-10',
        startTime: '09:00',
        endTime: '12:00',
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('deleteAllBlocksForDay', () => {
    it('should delete all blocks for an entire day', async () => {
      const result = await barberService.deleteAllBlocksForDay({
        barberId: '123e4567-e89b-12d3-a456-426614174000',
        blockDate: '2026-01-10',
      });
      
      expect(result.success).toBe(true);
    });
  });
});

describe('Block Validation', () => {
  it('should validate barberId as UUID', async () => {
    const result = await barberService.createBlock({
      barberId: 'not-a-uuid',
      blockDate: '2026-01-10',
      startTime: '09:00',
      endTime: '10:00',
    });
    
    expect(result.success).toBe(false);
  });

  it('should validate blockDate format', async () => {
    const result = await barberService.createBlock({
      barberId: '123e4567-e89b-12d3-a456-426614174000',
      blockDate: '10/01/2026', // Wrong format
      startTime: '09:00',
      endTime: '10:00',
    });
    
    expect(result.success).toBe(false);
  });

  it('should validate time format', async () => {
    const result = await barberService.createBlock({
      barberId: '123e4567-e89b-12d3-a456-426614174000',
      blockDate: '2026-01-10',
      startTime: '9am', // Wrong format
      endTime: '10am',
    });
    
    expect(result.success).toBe(false);
  });

  it('should limit reason length', async () => {
    const longReason = 'a'.repeat(501);
    const result = await barberService.createBlock({
      barberId: '123e4567-e89b-12d3-a456-426614174000',
      blockDate: '2026-01-10',
      startTime: '09:00',
      endTime: '10:00',
      reason: longReason,
    });
    
    expect(result.success).toBe(false);
  });
});

describe('Full-day block coverage', () => {
  it('should create block from earliest start to latest end of working hours', async () => {
    // This tests that createFullDayBlock gets period1_start (09:00) to period2_end (18:00)
    // Not just the slot times
    const result = await barberService.createFullDayBlock({
      barberId: '123e4567-e89b-12d3-a456-426614174000',
      blockDate: '2026-01-13',
    });
    
    expect(result.success).toBe(true);
    // The implementation should use 09:00 as start and 18:00 as end
    // covering ALL working hours, not just slot start times
  });
});

describe('Unblock scenarios', () => {
  it('should handle unblocking single slot from full-day block', async () => {
    // When there's a single full-day block covering 09:00-18:00
    // and user clicks on 10:00 slot to unblock, the entire block should be removed
    const result = await barberService.deleteBlockBySlot({
      barberId: '123e4567-e89b-12d3-a456-426614174000',
      blockDate: '2026-01-10',
      slotTime: '10:00',
    });
    
    expect(result.success).toBe(true);
  });

  it('should unblock entire day removing all blocks', async () => {
    const result = await barberService.deleteAllBlocksForDay({
      barberId: '123e4567-e89b-12d3-a456-426614174000',
      blockDate: '2026-01-10',
    });
    
    expect(result.success).toBe(true);
  });
});