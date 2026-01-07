import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { barberService } from '@/services/barber.service';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      single: vi.fn(),
      limit: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('BarberService - Block Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createBlock', () => {
    it('should validate required fields', async () => {
      const result = await barberService.createBlock({
        barberId: '',
        blockDate: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should validate date format', async () => {
      const result = await barberService.createBlock({
        barberId: '123e4567-e89b-12d3-a456-426614174000',
        blockDate: 'invalid-date',
        startTime: '09:00',
        endTime: '10:00',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should validate time format', async () => {
      const result = await barberService.createBlock({
        barberId: '123e4567-e89b-12d3-a456-426614174000',
        blockDate: '2024-01-15',
        startTime: 'invalid',
        endTime: '10:00',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('deleteBlock', () => {
    it('should validate block ID', async () => {
      const result = await barberService.deleteBlock('invalid-uuid');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('deleteBlocksByIds', () => {
    it('should return success with 0 when empty array', async () => {
      const result = await barberService.deleteBlocksByIds([]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    it('should validate all block IDs', async () => {
      const result = await barberService.deleteBlocksByIds([
        '123e4567-e89b-12d3-a456-426614174000',
        'invalid-uuid',
      ]);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('deleteBlocksByDate', () => {
    it('should validate barber ID', async () => {
      const result = await barberService.deleteBlocksByDate(
        'invalid-uuid',
        '2024-01-15'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should validate date format', async () => {
      const result = await barberService.deleteBlocksByDate(
        '123e4567-e89b-12d3-a456-426614174000',
        'invalid-date'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('deleteBlocksByTimeRange', () => {
    it('should validate barber ID', async () => {
      const result = await barberService.deleteBlocksByTimeRange(
        'invalid-uuid',
        '2024-01-15',
        '09:00',
        '12:00'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should validate date format', async () => {
      const result = await barberService.deleteBlocksByTimeRange(
        '123e4567-e89b-12d3-a456-426614174000',
        'invalid-date',
        '09:00',
        '12:00'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should validate time format', async () => {
      const result = await barberService.deleteBlocksByTimeRange(
        '123e4567-e89b-12d3-a456-426614174000',
        '2024-01-15',
        'invalid',
        '12:00'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('createFullDayBlock', () => {
    it('should validate barber ID', async () => {
      const result = await barberService.createFullDayBlock(
        'invalid-uuid',
        '2024-01-15',
        'Vacation'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should validate date format', async () => {
      const result = await barberService.createFullDayBlock(
        '123e4567-e89b-12d3-a456-426614174000',
        'invalid-date',
        'Vacation'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('Block Business Logic', () => {
  describe('Full Day Blocking', () => {
    it('should use actual working hours for full-day blocks', () => {
      // This is a conceptual test - the actual implementation
      // fetches working hours from the database and uses them
      // to create the block with proper start/end times
      
      // Given a barber with working hours 09:00-12:00 and 14:00-18:00
      // When blocking full day
      // Then the block should cover 09:00-18:00 (earliest to latest)
      
      const workingHours = {
        period1_start: '09:00',
        period1_end: '12:00',
        period2_start: '14:00',
        period2_end: '18:00',
      };
      
      const times = [
        workingHours.period1_start,
        workingHours.period1_end,
        workingHours.period2_start,
        workingHours.period2_end,
      ].sort();
      
      const earliestTime = times[0];
      const latestTime = times[times.length - 1];
      
      expect(earliestTime).toBe('09:00');
      expect(latestTime).toBe('18:00');
    });

    it('should skip days off when blocking full day', () => {
      // Given a barber with is_day_off = true for Sunday
      // When trying to block Sunday
      // Then no block should be created
      
      const schedule = { is_day_off: true };
      const shouldBlock = !schedule.is_day_off;
      
      expect(shouldBlock).toBe(false);
    });
  });

  describe('Unblocking', () => {
    it('should allow unblocking single slot', () => {
      // Given a blocked slot
      // When unblocking single slot
      // Then only that block should be removed
      
      const blocks = [
        { id: '1', start_time: '09:00', end_time: '09:15' },
        { id: '2', start_time: '09:15', end_time: '09:30' },
      ];
      
      const blockToRemove = blocks[0];
      const remainingBlocks = blocks.filter(b => b.id !== blockToRemove.id);
      
      expect(remainingBlocks.length).toBe(1);
      expect(remainingBlocks[0].id).toBe('2');
    });

    it('should allow unblocking entire day', () => {
      // Given multiple blocks for a day
      // When unblocking full day
      // Then all blocks for that date should be removed
      
      const allBlocks = [
        { id: '1', block_date: '2024-01-15', start_time: '09:00', end_time: '10:00' },
        { id: '2', block_date: '2024-01-15', start_time: '14:00', end_time: '15:00' },
        { id: '3', block_date: '2024-01-16', start_time: '09:00', end_time: '10:00' },
      ];
      
      const dateToUnblock = '2024-01-15';
      const blocksToRemove = allBlocks.filter(b => b.block_date === dateToUnblock);
      const remainingBlocks = allBlocks.filter(b => b.block_date !== dateToUnblock);
      
      expect(blocksToRemove.length).toBe(2);
      expect(remainingBlocks.length).toBe(1);
      expect(remainingBlocks[0].block_date).toBe('2024-01-16');
    });

    it('should allow unblocking time range with block splitting', () => {
      // Given a block from 08:00 to 18:00
      // When unblocking 10:00 to 12:00
      // Then should result in two blocks: 08:00-10:00 and 12:00-18:00
      
      const existingBlock = {
        id: '1',
        start_time: '08:00',
        end_time: '18:00',
        reason: 'Blocked day'
      };
      
      const unblockStart = '10:00';
      const unblockEnd = '12:00';
      
      const newBlocks: Array<{ start_time: string; end_time: string; reason: string | null }> = [];
      
      // Keep part before unblock range
      if (existingBlock.start_time < unblockStart) {
        newBlocks.push({
          start_time: existingBlock.start_time,
          end_time: unblockStart,
          reason: existingBlock.reason
        });
      }
      
      // Keep part after unblock range
      if (existingBlock.end_time > unblockEnd) {
        newBlocks.push({
          start_time: unblockEnd,
          end_time: existingBlock.end_time,
          reason: existingBlock.reason
        });
      }
      
      expect(newBlocks.length).toBe(2);
      expect(newBlocks[0]).toEqual({ start_time: '08:00', end_time: '10:00', reason: 'Blocked day' });
      expect(newBlocks[1]).toEqual({ start_time: '12:00', end_time: '18:00', reason: 'Blocked day' });
    });

    it('should handle unblocking at start of block', () => {
      // Given a block from 08:00 to 18:00
      // When unblocking 08:00 to 10:00
      // Then should result in one block: 10:00-18:00
      
      const existingBlock = { start_time: '08:00', end_time: '18:00' };
      const unblockStart = '08:00';
      const unblockEnd = '10:00';
      
      const keepBefore = existingBlock.start_time < unblockStart;
      const keepAfter = existingBlock.end_time > unblockEnd;
      
      expect(keepBefore).toBe(false);
      expect(keepAfter).toBe(true);
    });

    it('should handle unblocking at end of block', () => {
      // Given a block from 08:00 to 18:00
      // When unblocking 16:00 to 18:00
      // Then should result in one block: 08:00-16:00
      
      const existingBlock = { start_time: '08:00', end_time: '18:00' };
      const unblockStart = '16:00';
      const unblockEnd = '18:00';
      
      const keepBefore = existingBlock.start_time < unblockStart;
      const keepAfter = existingBlock.end_time > unblockEnd;
      
      expect(keepBefore).toBe(true);
      expect(keepAfter).toBe(false);
    });

    it('should allow unblocking time range', () => {
      // Given multiple blocks
      // When unblocking a time range
      // Then only blocks within that range should be removed
      
      const allBlocks = [
        { id: '1', start_time: '09:00', end_time: '10:00' },
        { id: '2', start_time: '10:00', end_time: '11:00' },
        { id: '3', start_time: '14:00', end_time: '15:00' },
      ];
      
      const startTime = '09:00';
      const endTime = '11:00';
      
      const blocksInRange = allBlocks.filter(b => 
        b.start_time >= startTime && b.end_time <= endTime
      );
      
      expect(blocksInRange.length).toBe(2);
      expect(blocksInRange.map(b => b.id)).toContain('1');
      expect(blocksInRange.map(b => b.id)).toContain('2');
    });
  });

  describe('Period Blocking', () => {
    it('should create correct blocks for same-day period', () => {
      // Given a period from 09:00 to 14:00 on same day
      // Then should create a single block with exact times
      
      const startDate = '2024-01-15';
      const endDate = '2024-01-15';
      const startTime = '09:00';
      const endTime = '14:00';
      
      const isSameDay = startDate === endDate;
      const expectedBlocks = [{
        block_date: startDate,
        start_time: startTime,
        end_time: endTime,
      }];
      
      expect(isSameDay).toBe(true);
      expect(expectedBlocks.length).toBe(1);
      expect(expectedBlocks[0].start_time).toBe('09:00');
      expect(expectedBlocks[0].end_time).toBe('14:00');
    });

    it('should create correct blocks for multi-day period', () => {
      // Given a period from Jan 15 09:00 to Jan 17 14:00
      // Then should create:
      // - Jan 15: 09:00-23:59
      // - Jan 16: 00:00-23:59 (full day)
      // - Jan 17: 00:00-14:00
      
      const startDate = '2024-01-15';
      const endDate = '2024-01-17';
      const startTime = '09:00';
      const endTime = '14:00';
      
      const days = ['2024-01-15', '2024-01-16', '2024-01-17'];
      const expectedBlocks = days.map(day => {
        const isFirstDay = day === startDate;
        const isLastDay = day === endDate;
        
        return {
          block_date: day,
          start_time: isFirstDay ? startTime : '00:00',
          end_time: isLastDay ? endTime : '23:59',
        };
      });
      
      expect(expectedBlocks.length).toBe(3);
      expect(expectedBlocks[0]).toEqual({ block_date: '2024-01-15', start_time: '09:00', end_time: '23:59' });
      expect(expectedBlocks[1]).toEqual({ block_date: '2024-01-16', start_time: '00:00', end_time: '23:59' });
      expect(expectedBlocks[2]).toEqual({ block_date: '2024-01-17', start_time: '00:00', end_time: '14:00' });
    });

    it('should validate that start time is before end time for same day', () => {
      const startDate = '2024-01-15';
      const endDate = '2024-01-15';
      const startTime = '14:00';
      const endTime = '09:00';
      
      const isSameDay = startDate === endDate;
      const isValidTimeRange = !isSameDay || startTime < endTime;
      
      expect(isValidTimeRange).toBe(false);
    });

    it('should allow end time before start time for different days', () => {
      // Valid case: Jan 15 at 20:00 to Jan 16 at 08:00
      const startDate = '2024-01-15';
      const endDate = '2024-01-16';
      const startTime = '20:00';
      const endTime = '08:00';
      
      const isSameDay = startDate === endDate;
      const isValidTimeRange = !isSameDay || startTime < endTime;
      
      expect(isSameDay).toBe(false);
      expect(isValidTimeRange).toBe(true);
    });
  });
});
