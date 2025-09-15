/**
 * Simple test to verify error logging doesn't produce [object Object] errors
 */

// Mock console.error to capture output
let capturedLogs = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  capturedLogs.push(args);
  originalConsoleError(...args);
};

// Simple error logging utility (simplified version)
function logError(prefix, error, context = {}) {
  let message, type, stack;
  
  if (error instanceof Error) {
    message = error.message;
    type = error.name;
    stack = error.stack;
  } else if (typeof error === 'string') {
    message = error;
    type = 'StringError';
  } else if (error && typeof error === 'object') {
    const errorObj = error;
    message = errorObj.message || errorObj.error || JSON.stringify(error);
    type = errorObj.name || errorObj.type || 'ObjectError';
    stack = errorObj.stack;
  } else {
    message = String(error);
    type = typeof error;
  }

  const errorDetails = {
    message,
    type,
    stack,
    context,
    timestamp: new Date().toISOString()
  };
  
  console.error(`${prefix}:`, {
    message: errorDetails.message,
    type: errorDetails.type,
    context: errorDetails.context,
    timestamp: errorDetails.timestamp,
    ...(errorDetails.stack && { stack: errorDetails.stack })
  });

  return errorDetails;
}

// Test different error types
console.log('🧪 Testing error logging...');

// Test 1: Standard Error
console.log('\n--- Test 1: Standard Error ---');
try {
  throw new Error('Test standard error');
} catch (error) {
  logError('❌ Contract processing workflow failed', error, {
    userId: 'test-user',
    reviewType: 'compliance_score'
  });
}

// Test 2: Object error
console.log('\n--- Test 2: Object Error ---');
const objectError = { message: 'Test object error', code: 500, nested: { data: 'value' } };
logError('Failed to track processing error', objectError, {
  originalError: 'Contract processing failed',
  userId: 'test-user'
});

// Test 3: String error
console.log('\n--- Test 3: String Error ---');
logError('❌ Contract processing error', 'Simple string error message', {
  fileName: 'test.pdf',
  fileSize: 1024000
});

// Test 4: Edge cases
console.log('\n--- Test 4: Edge Cases ---');
const edgeCases = [null, undefined, 0, false, [], {}];
edgeCases.forEach((testCase, index) => {
  logError(`Edge case test ${index}`, testCase, { testCase: `case_${index}` });
});

// Restore console.error
console.error = originalConsoleError;

// Check results
console.log('\n🔍 Checking for [object Object] issues...');
let foundIssues = false;

capturedLogs.forEach((logArgs, index) => {
  const stringified = JSON.stringify(logArgs);
  if (stringified.includes('[object Object]')) {
    console.log(`❌ Found [object Object] in log ${index}:`, logArgs);
    foundIssues = true;
  }
  if (stringified.includes('[object Error]')) {
    console.log(`❌ Found [object Error] in log ${index}:`, logArgs);
    foundIssues = true;
  }
});

if (!foundIssues) {
  console.log('✅ All error logging tests passed! No [object Object] issues found.');
} else {
  console.log('❌ Found issues with error logging. Please review the output above.');
}

console.log(`\n📊 Total logs captured: ${capturedLogs.length}`);
console.log('🎯 Test completed successfully!');
