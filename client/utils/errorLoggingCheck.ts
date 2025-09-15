/**
 * Production Error Logging Verification Utility
 * 
 * This utility helps verify that error logging is working correctly
 * and won't produce [object Object] errors in production.
 */

import { logError, createUserFriendlyMessage } from './errorLogger';

export interface ErrorCheckResult {
  passed: boolean;
  issues: string[];
  summary: string;
}

/**
 * Run comprehensive error logging checks
 */
export function runErrorLoggingChecks(): ErrorCheckResult {
  const issues: string[] = [];
  
  console.log('🔍 Running error logging verification checks...');
  
  try {
    // Test 1: Standard Error objects
    testStandardErrors(issues);
    
    // Test 2: Object errors
    testObjectErrors(issues);
    
    // Test 3: String errors
    testStringErrors(issues);
    
    // Test 4: Edge cases
    testEdgeCases(issues);
    
    // Test 5: User-friendly message generation
    testUserFriendlyMessages(issues);
    
  } catch (error) {
    issues.push(`Unexpected error during testing: ${error instanceof Error ? error.message : String(error)}`);
  }

  const passed = issues.length === 0;
  const summary = passed 
    ? '✅ All error logging checks passed successfully!'
    : `❌ Found ${issues.length} issue(s) with error logging`;

  console.log(summary);
  if (!passed) {
    console.log('Issues found:');
    issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }

  return { passed, issues, summary };
}

function testStandardErrors(issues: string[]) {
  const testError = new Error('Test standard error');
  const originalConsoleError = console.error;
  let capturedOutput = '';

  console.error = (...args: any[]) => {
    capturedOutput = JSON.stringify(args);
    originalConsoleError(...args);
  };

  try {
    logError('Test standard error', testError, { test: 'context' });
    
    if (capturedOutput.includes('[object Object]')) {
      issues.push('Standard Error objects are producing [object Object] in logs');
    }
    if (capturedOutput.includes('[object Error]')) {
      issues.push('Standard Error objects are producing [object Error] in logs');
    }
  } finally {
    console.error = originalConsoleError;
  }
}

function testObjectErrors(issues: string[]) {
  const testError = { message: 'Test object error', code: 500, nested: { data: 'value' } };
  const originalConsoleError = console.error;
  let capturedOutput = '';

  console.error = (...args: any[]) => {
    capturedOutput = JSON.stringify(args);
    originalConsoleError(...args);
  };

  try {
    logError('Test object error', testError);
    
    if (capturedOutput.includes('[object Object]')) {
      issues.push('Object errors are producing [object Object] in logs');
    }
  } finally {
    console.error = originalConsoleError;
  }
}

function testStringErrors(issues: string[]) {
  const testError = 'Test string error message';
  const originalConsoleError = console.error;
  let capturedOutput = '';

  console.error = (...args: any[]) => {
    capturedOutput = JSON.stringify(args);
    originalConsoleError(...args);
  };

  try {
    logError('Test string error', testError);
    
    if (capturedOutput.includes('[object Object]')) {
      issues.push('String errors are producing [object Object] in logs');
    }
  } finally {
    console.error = originalConsoleError;
  }
}

function testEdgeCases(issues: string[]) {
  const testCases = [null, undefined, 0, false, [], {}];
  const originalConsoleError = console.error;
  
  testCases.forEach((testCase, index) => {
    let capturedOutput = '';
    
    console.error = (...args: any[]) => {
      capturedOutput = JSON.stringify(args);
      originalConsoleError(...args);
    };

    try {
      logError(`Test edge case ${index}`, testCase);
      
      if (capturedOutput.includes('[object Object]') && testCase !== null && typeof testCase === 'object') {
        issues.push(`Edge case ${index} (${typeof testCase}) is producing [object Object] in logs`);
      }
    } finally {
      console.error = originalConsoleError;
    }
  });
}

function testUserFriendlyMessages(issues: string[]) {
  const testCases = [
    { error: new Error('Network connection failed'), expected: 'user-friendly' },
    { error: { message: 'Complex object error' }, expected: 'fallback' },
    { error: 'Simple string error', expected: 'direct' }
  ];

  testCases.forEach((testCase, index) => {
    try {
      const message = createUserFriendlyMessage(testCase.error);
      
      if (message.includes('[object Object]')) {
        issues.push(`User-friendly message ${index} contains [object Object]`);
      }
      
      if (message.includes('undefined') && testCase.expected !== 'fallback') {
        issues.push(`User-friendly message ${index} contains 'undefined'`);
      }
    } catch (error) {
      issues.push(`User-friendly message test ${index} threw error: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/**
 * Quick test that can be run in browser console
 */
export function quickErrorTest() {
  console.log('🚀 Quick error logging test...');
  
  // Test different error types
  const errors = [
    new Error('Sample error'),
    { message: 'Object error', code: 500 },
    'String error',
    null
  ];

  errors.forEach((error, index) => {
    console.log(`\n--- Test ${index + 1} ---`);
    logError(`Quick test ${index + 1}`, error, { quickTest: true });
    
    const userMessage = createUserFriendlyMessage(error);
    console.log(`User message: "${userMessage}"`);
  });

  console.log('\n✅ Quick test completed. Check logs above for any [object Object] issues.');
}

/**
 * Simulate the specific errors that were occurring
 */
export function simulateProductionErrors() {
  console.log('🎭 Simulating production errors that were occurring...');

  // Simulate contract processing workflow error
  try {
    throw new Error('Contract processing failed: AI service unavailable');
  } catch (error) {
    logError('❌ Contract processing workflow failed', error, {
      userId: 'test-user-123',
      reviewType: 'compliance_score',
      contractTitle: 'test-contract.pdf'
    });
  }

  // Simulate tracking error
  try {
    throw new Error('Database connection timeout');
  } catch (error) {
    logError('Failed to track processing error', error, {
      originalError: 'Contract processing failed',
      userId: 'test-user-123',
      reviewType: 'risk_assessment'
    });
  }

  // Simulate upload error
  try {
    throw new Error('File processing error: Invalid PDF structure');
  } catch (error) {
    logError('❌ Contract processing error', error, {
      fileName: 'test.pdf',
      fileSize: 1024000,
      userId: 'test-user-123'
    });
  }

  console.log('✅ Production error simulation completed.');
}
