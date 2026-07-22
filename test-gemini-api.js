// Save as test-gemini-api.js and run: node test-gemini-api.js
require('dotenv').config({ path: '.env.local' });

async function testGeminiAPI() {
  console.log("=== Testing Gemini REST API ===\n");

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found");
    return;
  }

  console.log("✅ API Key found (length:", apiKey.length, ")");
  console.log("First 10 chars:", apiKey.substring(0, 10) + "...\n");

  // Test 1: List available models
  console.log("TEST 1: Listing available models...\n");
  try {
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );
    
    console.log("Status:", listResponse.status);
    
    if (!listResponse.ok) {
      const error = await listResponse.text();
      console.error("❌ Error:", error);
      return;
    }
    
    const models = await listResponse.json();
    console.log("✅ Available models:");
    models.models?.forEach(model => {
      if (model.name.includes('gemini')) {
        console.log(`   - ${model.name}`);
        console.log(`     Supports: ${model.supportedGenerationMethods?.join(', ')}`);
      }
    });
    console.log();
  } catch (error) {
    console.error("❌ Failed to list models:", error.message);
    return;
  }

  // Test 2: Try different model endpoints
  const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-pro'
  ];

  console.log("TEST 2: Testing model endpoints...\n");

  for (const modelName of modelsToTest) {
    console.log(`Testing: ${modelName}`);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Say hello in one word",
                  },
                ],
              },
            ],
          }),
        }
      );

      console.log(`   Status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`   ✅ SUCCESS! Response: "${text}"`);
        console.log(`   🎉 Use this model: "${modelName}"\n`);
        return;
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Failed: ${errorText.substring(0, 100)}...\n`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  console.log("\n❌ No models worked. Please check:");
  console.log("   1. API key is valid: https://aistudio.google.com/app/apikey");
  console.log("   2. Gemini API is enabled in your Google Cloud project");
  console.log("   3. Internet connection is working");
}

testGeminiAPI();