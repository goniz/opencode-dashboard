import { describe, it, expect } from 'vitest';
import { parseModelString, cn } from '../utils';

describe('Utils', () => {
  describe('parseModelString', () => {
    it('should parse model string with provider', () => {
      const result = parseModelString('anthropic/claude-3-5-sonnet-20241022');
      expect(result).toEqual({
        providerID: 'anthropic',
        modelID: 'claude-3-5-sonnet-20241022',
      });
    });

    it('should throw error for model string without provider', () => {
      expect(() => parseModelString('claude-3-5-sonnet-20241022')).toThrow(
        'Invalid model format: claude-3-5-sonnet-20241022. Expected format: provider/model'
      );
    });

    it('should throw error for empty string', () => {
      expect(() => parseModelString('')).toThrow(
        'Invalid model format: . Expected format: provider/model'
      );
    });

    it('should handle model string with multiple slashes', () => {
      const result = parseModelString('provider/model/version');
      expect(result).toEqual({
        providerID: 'provider',
        modelID: 'model/version',
      });
    });
  });

  describe('cn', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'hidden');
      expect(result).toBe('base conditional');
    });

    it('should merge tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toBe('py-1 px-4');
    });
  });
});