/**
 * Utility Functions Unit Tests
 * Tests helper functions and utility modules
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

describe('Utility Functions', () => {
  describe('URL Utilities', () => {
    const buildUrl = (base: string, path: string, params?: Record<string, string>): string => {
      let url = base.endsWith('/') ? base.slice(0, -1) : base;
      url += path.startsWith('/') ? path : '/' + path;
      
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url += '?' + searchParams.toString();
      }
      
      return url;
    };

    const parseUrl = (url: string): { base: string; path: string; params: Record<string, string> } => {
      const urlObj = new URL(url);
      const params: Record<string, string> = {};
      
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      return {
        base: `${urlObj.protocol}//${urlObj.host}`,
        path: urlObj.pathname,
        params
      };
    };

    test('should build URLs correctly', () => {
      expect(buildUrl('https://api.example.com', '/users')).toBe('https://api.example.com/users');
      expect(buildUrl('https://api.example.com/', 'users')).toBe('https://api.example.com/users');
      expect(buildUrl('https://api.example.com', 'users')).toBe('https://api.example.com/users');
    });

    test('should build URLs with parameters', () => {
      const url = buildUrl('https://api.example.com', '/users', { page: '1', limit: '10' });
      expect(url).toBe('https://api.example.com/users?page=1&limit=10');
    });

    test('should parse URLs correctly', () => {
      const parsed = parseUrl('https://api.example.com/users?page=1&limit=10');
      expect(parsed.base).toBe('https://api.example.com');
      expect(parsed.path).toBe('/users');
      expect(parsed.params).toEqual({ page: '1', limit: '10' });
    });
  });

  describe('Date Utilities', () => {
    const formatDate = (date: Date, format: string = 'YYYY-MM-DD'): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      switch (format) {
        case 'YYYY-MM-DD':
          return `${year}-${month}-${day}`;
        case 'DD/MM/YYYY':
          return `${day}/${month}/${year}`;
        case 'MM/DD/YYYY':
          return `${month}/${day}/${year}`;
        default:
          return `${year}-${month}-${day}`;
      }
    };

    const isValidDate = (dateString: string): boolean => {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    };

    const addDays = (date: Date, days: number): Date => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    test('should format dates correctly', () => {
      const date = new Date('2024-06-10');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-06-10');
      expect(formatDate(date, 'DD/MM/YYYY')).toBe('10/06/2024');
      expect(formatDate(date, 'MM/DD/YYYY')).toBe('06/10/2024');
    });

    test('should validate date strings', () => {
      expect(isValidDate('2024-06-10')).toBe(true);
      expect(isValidDate('2024-02-29')).toBe(true); // Leap year
      expect(isValidDate('2024-13-01')).toBe(false); // Invalid month
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate('')).toBe(false);
    });

    test('should add days to dates', () => {
      const date = new Date('2024-06-10');
      const futureDate = addDays(date, 5);
      expect(formatDate(futureDate)).toBe('2024-06-15');
      
      const pastDate = addDays(date, -5);
      expect(formatDate(pastDate)).toBe('2024-06-05');
    });
  });

  describe('String Utilities', () => {
    const capitalize = (str: string): string => {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const slugify = (str: string): string => {
      return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const truncate = (str: string, length: number, suffix: string = '...'): string => {
      if (str.length <= length) return str;
      return str.substring(0, length - suffix.length) + suffix;
    };

    const isEmptyOrWhitespace = (str: string | null | undefined): boolean => {
      return !str || str.trim().length === 0;
    };

    test('should capitalize strings', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('WORLD')).toBe('World');
      expect(capitalize('hELLo WoRLD')).toBe('Hello world');
      expect(capitalize('')).toBe('');
    });

    test('should create slugs from strings', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Test String with Special Characters!')).toBe('test-string-with-special-characters');
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(slugify('under_score-dash')).toBe('under-score-dash');
    });

    test('should truncate strings', () => {
      expect(truncate('Hello World', 10)).toBe('Hello W...');
      expect(truncate('Short', 10)).toBe('Short');
      expect(truncate('Hello World', 10, '***')).toBe('Hello W***');
      expect(truncate('', 10)).toBe('');
    });

    test('should check for empty or whitespace strings', () => {
      expect(isEmptyOrWhitespace('')).toBe(true);
      expect(isEmptyOrWhitespace('   ')).toBe(true);
      expect(isEmptyOrWhitespace('\t\n')).toBe(true);
      expect(isEmptyOrWhitespace(null)).toBe(true);
      expect(isEmptyOrWhitespace(undefined)).toBe(true);
      expect(isEmptyOrWhitespace('hello')).toBe(false);
      expect(isEmptyOrWhitespace(' hello ')).toBe(false);
    });
  });

  describe('Array Utilities', () => {
    const chunk = <T>(array: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    };

    const unique = <T>(array: T[]): T[] => {
      return [...new Set(array)];
    };

    const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
      return array.reduce((groups, item) => {
        const groupKey = String(item[key]);
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
      }, {} as Record<string, T[]>);
    };

    test('should chunk arrays', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
      expect(chunk([], 2)).toEqual([]);
      expect(chunk([1], 2)).toEqual([[1]]);
    });

    test('should get unique values', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
      expect(unique([])).toEqual([]);
      expect(unique([1])).toEqual([1]);
    });

    test('should group arrays by key', () => {
      const users = [
        { name: 'John', role: 'admin' },
        { name: 'Jane', role: 'user' },
        { name: 'Bob', role: 'admin' }
      ];
      
      const grouped = groupBy(users, 'role');
      expect(grouped.admin).toHaveLength(2);
      expect(grouped.user).toHaveLength(1);
      expect(grouped.admin[0].name).toBe('John');
      expect(grouped.admin[1].name).toBe('Bob');
    });
  });

  describe('Validation Utilities', () => {
    const isValidEmail = (email: string): boolean => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const isValidUUID = (uuid: string): boolean => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
    };

    const isValidPhoneNumber = (phone: string): boolean => {
      // Simple phone validation - adjust based on requirements
      return /^\+?[\d\s\-\(\)]{10,}$/.test(phone);
    };

    const sanitizeInput = (input: string): string => {
      return input
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/['"]/g, '') // Remove quotes
        .replace(/script/gi, 'script') // Keep script text but remove tags
        .substring(0, 1000); // Limit length
    };

    test('should validate email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@company.co.uk')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });

    test('should validate UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });

    test('should validate phone numbers', () => {
      expect(isValidPhoneNumber('+1234567890')).toBe(true);
      expect(isValidPhoneNumber('(123) 456-7890')).toBe(true);
      expect(isValidPhoneNumber('123-456-7890')).toBe(true);
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('abc')).toBe(false);
    });

    test('should sanitize input strings', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
      expect(sanitizeInput('test "quoted" text')).toBe('test quoted text');
      expect(sanitizeInput('a'.repeat(2000))).toHaveLength(1000);
    });
  });

  describe('Object Utilities', () => {
    const deepClone = <T>(obj: T): T => {
      return JSON.parse(JSON.stringify(obj));
    };

    const omit = <T extends Record<string, any>, K extends keyof T>(
      obj: T,
      keys: K[]
    ): Omit<T, K> => {
      const result = { ...obj };
      keys.forEach(key => delete result[key]);
      return result;
    };

    const pick = <T extends Record<string, any>, K extends keyof T>(
      obj: T,
      keys: K[]
    ): Pick<T, K> => {
      const result = {} as Pick<T, K>;
      keys.forEach(key => {
        if (key in obj) {
          result[key] = obj[key];
        }
      });
      return result;
    };

    test('should deep clone objects', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });

    test('should omit keys from objects', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b', 'c']);
      
      expect(result).toEqual({ a: 1 });
      expect(result).not.toHaveProperty('b');
      expect(result).not.toHaveProperty('c');
    });

    test('should pick keys from objects', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'c']);
      
      expect(result).toEqual({ a: 1, c: 3 });
      expect(result).not.toHaveProperty('b');
    });
  });
});
