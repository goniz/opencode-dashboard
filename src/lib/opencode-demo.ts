/**
 * Demo file to test OpenCode client setup
 * This file can be used to verify the client configuration works correctly
 */

import { 
  opencodeClient, 
  sessionOperations, 
  checkOpenCodeHealth,
  OpenCodeError 
} from './opencode-client';

/**
 * Demo function to test basic OpenCode operations
 * This is for development/testing purposes only
 */
export async function demoOpenCodeOperations() {
  console.log('🚀 Testing OpenCode client setup...');
  
  try {
    // Test health check
    console.log('📡 Checking OpenCode API health...');
    const isHealthy = await checkOpenCodeHealth();
    console.log(`Health check result: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    if (!isHealthy) {
      console.log('⚠️ OpenCode API is not available. Skipping further tests.');
      return;
    }
    
    // Test session listing
    console.log('📋 Listing existing sessions...');
    const sessions = await sessionOperations.list();
    console.log(`Found ${sessions.length} existing sessions`);
    
    // Test session creation
    console.log('➕ Creating a new session...');
    const newSession = await sessionOperations.create();
    console.log(`Created session: ${newSession.id}`);
    
    // Test getting messages (should be empty for new session)
    console.log('💬 Getting session messages...');
    const messages = await sessionOperations.getMessages(newSession.id);
    console.log(`Session has ${messages.length} messages`);
    
    console.log('✅ All OpenCode operations completed successfully!');
    
    return {
      isHealthy,
      sessionCount: sessions.length,
      newSessionId: newSession.id,
      messageCount: messages.length
    };
    
  } catch (error) {
    if (error instanceof OpenCodeError) {
      console.error('❌ OpenCode Error:', error.message);
      if (error.context) {
        console.error('Context:', error.context);
      }
    } else {
      console.error('❌ Unexpected Error:', error);
    }
    throw error;
  }
}

/**
 * Simple function to test client configuration
 */
export function testClientConfiguration() {
  console.log('🔧 Testing client configuration...');
  
  // Test that client is properly instantiated
  if (!opencodeClient) {
    throw new Error('OpenCode client is not properly instantiated');
  }
  
  console.log('✅ OpenCode client is properly configured');
  return true;
}

// Export for potential use in development
export { opencodeClient, sessionOperations, checkOpenCodeHealth };