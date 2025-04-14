// Test script for Sync.so API
// Run with: node test-sync-api.js

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env.local
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  }
});

// Get API key from environment
const SYNC_API_KEY = envVars.SYNC_API_KEY;

if (!SYNC_API_KEY) {
  console.error('SYNC_API_KEY not found in .env.local file');
  process.exit(1);
}

// Video URL for testing
const referenceVideoUrl = "https://synchlabs-public.s3.us-west-2.amazonaws.com/david_demo_shortvid-03a10044-7741-4cfc-816a-5bccd392d1ee.mp4";

// Test text for lipsync
const testText = "This is a test of the Sync.so API integration";

// Different payload variations to test
const payloads = [
  // Variation 1: Using text with provider inside input array
  {
    name: "text-with-provider-in-input",
    payload: {
      model: "lipsync-1.9.0-beta",
      options: { output_format: "json" },
      input: [
        { type: "video", url: referenceVideoUrl },
        { 
          type: "text", 
          text: testText,
          provider: {
            name: "elevenlabs",
            voiceId: "EXAVITQu4vr4xnSDxMaL"
          }
        }
      ]
    }
  },
  
  // Variation 2: With text at root level
  {
    name: "text-at-root",
    payload: {
      model: "lipsync-1.9.0-beta",
      options: { output_format: "json" },
      text: testText,
      input: [
        { type: "video", url: referenceVideoUrl }
      ],
      provider: {
        name: "elevenlabs",
        voiceId: "EXAVITQu4vr4xnSDxMaL"
      }
    }
  },
  
  // Variation 3: Using elevenlabs as direct type
  {
    name: "elevenlabs-direct-type",
    payload: {
      model: "lipsync-1.9.0-beta",
      options: { output_format: "json" },
      input: [
        { type: "video", url: referenceVideoUrl },
        { 
          type: "elevenlabs", 
          text: testText,
          voice_id: "EXAVITQu4vr4xnSDxMaL"
        }
      ]
    }
  },
  
  // Variation 4: Based directly on documentation example
  {
    name: "doc-example-based",
    payload: {
      model: "lipsync-1.9.0-beta",
      input: [
        { type: "video", url: referenceVideoUrl },
        {
          type: "text",
          text: testText,
          provider: {
            name: "elevenlabs",
            voiceId: "EXAVITQu4vr4xnSDxMaL"
          }
        }
      ]
    }
  }
];

// Function to make API request
function testPayload(variation) {
  return new Promise((resolve, reject) => {
    console.log(`\n\nTesting variation: ${variation.name}`);
    console.log(`Payload: ${JSON.stringify(variation.payload, null, 2)}`);
    
    const data = JSON.stringify(variation.payload);
    
    const options = {
      hostname: 'api.sync.so',
      port: 443,
      path: '/v2/generate',
      method: 'POST',
      headers: {
        'x-api-key': SYNC_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        
        try {
          // Try to parse as JSON
          const jsonResponse = JSON.parse(responseData);
          console.log(`Response: ${JSON.stringify(jsonResponse, null, 2)}`);
        } catch (e) {
          // If not JSON, just show the raw response
          console.log(`Response: ${responseData}`);
        }
        
        resolve({
          statusCode: res.statusCode,
          response: responseData,
          variation: variation.name
        });
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error: ${error.message}`);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Run all tests sequentially
async function runTests() {
  console.log('Starting Sync.so API tests...');
  
  for (const variation of payloads) {
    try {
      await testPayload(variation);
    } catch (error) {
      console.error(`Test failed for ${variation.name}:`, error);
    }
  }
  
  console.log('\nAll tests completed');
}

runTests(); 