/**
 * Test file to verify error logging utility works correctly
 * Run with: npm test errorLogger.test.ts
 */

import { extractErrorDetails, logError, createUserFriendlyMessage, formatErrorForResponse } from './errorLogger';

// Mock console methods for testing
const originalConsoleError = console.error;
let mockConsoleOutput: any[] = [];

beforeEach(() => {
  mockConsoleOutput = [];
  console.error = (...args: any[]) => {
    mockConsoleOutput.push(args);
  };
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('Error Logger Utility', () => {
  
  describe('extractErrorDetails', () => {
    it('should handle Error objects correctly', () => {
      const error = new Error('Test error message');
      const details = extractErrorDetails(error);
      
      expect(details.message).toBe('Test error message');
      expect(details.type).toBe('Error');
      expect(details.stack).toBeDefined();
      expect(details.timestamp).toBeDefined();
    });

    it('should handle string errors', () => {
      const error = 'String error message';
      const details = extractErrorDetails(error);
      
      expect(details.message).toBe('String error message');
      expect(details.type).toBe('StringError');
      expect(details.stack).toBeUndefined();
    });

    it('should handle object errors', () => {
      const error = { message: 'Object error', code: 500 };
      const details = extractErrorDetails(error);
      
      expect(details.message).toBe('Object error');
      expect(details.type).toBe('ObjectError');
    });

    it('should handle null/undefined errors', () => {
      const details1 = extractErrorDetails(null);
      const details2 = extractErrorDetails(undefined);
      
      expect(details1.message).toBe('null');
      expect(details1.type).toBe('object');
      expect(details2.message).toBe('undefined');
      expect(details2.type).toBe('undefined');
    });
  });

  describe('logError', () => {
    it('should log errors without [object Object] issues', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };
      
      logError('Test prefix', error, context);
      
      expect(mockConsoleOutput).toHaveLength(1);
      const loggedData = mockConsoleOutput[0][1];
      
      expect(loggedData.message).toBe('Test error');
      expect(loggedData.type).toBe('Error');
      expect(loggedData.context).toEqual(context);
      expect(typeof loggedData.timestamp).toBe('string');
    });

    it('should handle complex objects without serialization errors', () => {
      const complexError = {
        message: 'Complex error',
        nested: { data: 'value', array: [1, 2, 3] },
        circular: {} as any
      };
      complexError.circular.self = complexError; // Create circular reference
      
      logError('Complex error test', complexError);
      
      expect(mockConsoleOutput).toHaveLength(1);
      const loggedData = mockConsoleOutput[0][1];
      
      expect(loggedData.message).toContain('Complex error');
      expect(loggedData.type).toBe('ObjectError');
    });
  });

  describe('createUserFriendlyMessage', () => {
    it('should create user-friendly messages from errors', () => {
      const error = new Error('Network timeout occurred');
      const message = createUserFriendlyMessage(error);
      
      expect(message).toBe('Network timeout occurred');
    });

    it('should use default message for unclear errors', () => {
      const error = new Error('Internal server error: undefined property access at line 42');
      const message = createUserFriendlyMessage(error, 'Something went wrong');
      
      expect(message).toBe('Something went wrong');
    });

    it('should handle non-Error objects', () => {
      const error = { code: 500, details: 'Internal error' };
      const message = createUserFriendlyMessage(error);
      
      expect(message).toBe('An unexpected error occurred');
    });
  });

  describe('formatErrorForResponse', () => {
    it('should format errors for API responses', () => {
      const error = new Error('API error');
      const formatted = formatErrorForResponse(error);
      
      expect(formatted).toHaveProperty('error', 'API error');
      expect(formatted).toHaveProperty('type', 'Error');
      expect(formatted).toHaveProperty('timestamp');
      expect(typeof formatted.timestamp).toBe('string');
    });
  });

  describe('No [object Object] Issues', () => {
    it('should never produce [object Object] in logged output', () => {
      const testCases = [
        new Error('Standard error'),
        { message: 'Object error' },
        'String error',
        null,
        undefined,
        42,
        true,
        [],
        {}
      ];

      testCases.forEach((testCase, index) => {
        logError(`Test case ${index}`, testCase);
        
        const loggedOutput = mockConsoleOutput[index];
        const stringified = JSON.stringify(loggedOutput);
        
        expect(stringified).not.toContain('[object Object]');
        expect(stringified).not.toContain('[object Error]');
      });
    });
  });
});

// Manual test function that can be called in browser console
export function testErrorLogging() {
  console.log('🧪 Testing error logging utility...');
  
  const testErrors = [
    new Error('Test Error object'),
    { message: 'Test object error', code: 500 },
    'Test string error',
    null,
    undefined,
    { complex: { nested: { data: 'value' } } }
  ];

  testErrors.forEach((error, index) => {
    console.log(`\n--- Test ${index + 1} ---`);
    logError(`Test error ${index + 1}`, error, { testIndex: index });
  });

  console.log('\n✅ Error logging test completed. Check output above for any [object Object] issues.');
}
