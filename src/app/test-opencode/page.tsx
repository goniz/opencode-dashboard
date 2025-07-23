'use client';

import { useState } from 'react';
import { demoOpenCodeOperations, testClientConfiguration } from '@/lib/opencode-demo';

export default function TestOpenCodePage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setLoading(true);
    setError(null);
    setTestResults(null);

    try {
      // Test client configuration first
      console.log('Testing client configuration...');
      testClientConfiguration();
      
      // Run demo operations
      console.log('Running demo operations...');
      const results = await demoOpenCodeOperations();
      
      setTestResults(results);
    } catch (err) {
      console.error('Test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">OpenCode SDK Test Page</h1>
      
      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Running Tests...' : 'Test OpenCode Client'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {testResults && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <h3 className="font-bold mb-2">Test Results:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Health Check: {testResults.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}</li>
            <li>Existing Sessions: {testResults.sessionCount}</li>
            <li>New Session Created: {testResults.newSessionId}</li>
            <li>Messages in New Session: {testResults.messageCount}</li>
          </ul>
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-bold mb-2">What this test does:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Verifies OpenCode SDK client is properly configured</li>
          <li>Tests connection to OpenCode API</li>
          <li>Lists existing sessions</li>
          <li>Creates a new session</li>
          <li>Retrieves messages from the new session</li>
        </ul>
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p>Check the browser console for detailed logs during testing.</p>
      </div>
    </div>
  );
}