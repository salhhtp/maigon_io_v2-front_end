#!/usr/bin/env node

/**
 * Test script to validate the analyze-contract Edge Function
 *
 * This script tests:
 * 1. Edge Function connectivity
 * 2. Fallback analysis (when OpenAI key is not set)
 * 3. PDF text extraction
 * 4. Score generation
 *
 * Usage: node test-edge-function.js
 */

import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env before running this script.",
  );
  process.exit(1);
}
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/analyze-contract`;

// Test contract content
const TEST_CONTRACT = `
NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement (the "Agreement") is entered into as of January 1, 2025
between Company A ("Disclosing Party") and Company B ("Receiving Party").

1. CONFIDENTIAL INFORMATION
The Disclosing Party agrees to disclose certain confidential and proprietary information
to the Receiving Party for the purpose of evaluating a potential business relationship.

2. OBLIGATIONS
The Receiving Party agrees to:
a) Keep all Confidential Information strictly confidential
b) Use the information solely for the agreed purpose
c) Not disclose the information to any third parties without prior written consent

3. TERM
This Agreement shall remain in effect for a period of two (2) years from the date
of execution.

4. GOVERNING LAW
This Agreement shall be governed by the laws of the State of California.
`.trim();

async function testEdgeFunction() {
  console.log("🧪 Testing analyze-contract Edge Function...\n");

  const testCases = [
    {
      name: "Full Summary Analysis",
      payload: {
        content: TEST_CONTRACT,
        reviewType: "full_summary",
        model: "openai-gpt-4",
        contractType: "nda",
        fileName: "test-nda.txt",
      },
    },
    {
      name: "Risk Assessment",
      payload: {
        content: TEST_CONTRACT,
        reviewType: "risk_assessment",
        model: "openai-gpt-4",
        contractType: "nda",
        fileName: "test-nda.txt",
      },
    },
    {
      name: "Compliance Score",
      payload: {
        content: TEST_CONTRACT,
        reviewType: "compliance_score",
        model: "openai-gpt-4",
        contractType: "nda",
        fileName: "test-nda.txt",
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log("─".repeat(60));

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(testCase.payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
        console.error("Response:", responseText);
        continue;
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Failed to parse JSON response");
        console.error("Raw response:", responseText.substring(0, 500));
        continue;
      }

      // Validate response structure
      const validationErrors = [];

      if (typeof result.score !== "number") {
        validationErrors.push(
          `Invalid score: ${result.score} (expected number)`,
        );
      } else if (result.score === 0) {
        validationErrors.push(
          "❌ Score is 0% - fallback may not be working correctly",
        );
      } else if (result.score >= 60 && result.score <= 100) {
        console.log(`✅ Score: ${result.score}% (valid range)`);
      }

      if (
        typeof result.confidence !== "number" ||
        result.confidence < 0 ||
        result.confidence > 1
      ) {
        validationErrors.push(
          `Invalid confidence: ${result.confidence} (expected 0-1)`,
        );
      } else {
        console.log(`✅ Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      }

      if (!result.recommendations || !Array.isArray(result.recommendations)) {
        validationErrors.push("Missing or invalid recommendations array");
      } else {
        console.log(
          `✅ Recommendations: ${result.recommendations.length} items`,
        );
      }

      if (result.fallback_used) {
        console.log(`⚠️  Using fallback: ${result.fallback_reason}`);
      }

      if (result.model_used) {
        console.log(`🤖 Model: ${result.model_used}`);
      }

      // Check for XMP metadata in summary (bug indicator)
      const summaryText = result.summary || result.executive_summary || "";
      if (
        summaryText.includes("<?xpacket") ||
        summaryText.includes("xmpmeta") ||
        summaryText.includes("<rdf:")
      ) {
        validationErrors.push(
          "❌ Summary contains XML/XMP metadata - PDF parser needs fixing",
        );
        console.error("Sample:", summaryText.substring(0, 200));
      }

      if (validationErrors.length > 0) {
        console.error("\n❌ Validation Errors:");
        validationErrors.forEach((err) => console.error(`   - ${err}`));
      } else {
        console.log("\n✅ All validations passed!");
      }

      // Show sample output
      if (result.summary) {
        console.log(`\n📝 Summary: ${result.summary.substring(0, 150)}...`);
      }
      if (result.recommendations && result.recommendations.length > 0) {
        console.log(`\n💡 First recommendation: ${result.recommendations[0]}`);
      }
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      if (error.cause) {
        console.error("Cause:", error.cause);
      }
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("🏁 Test Suite Complete\n");
  console.log("📋 Next Steps:");
  console.log(
    "   1. If scores are 0%, set OPENAI_API_KEY in Supabase Edge Function secrets",
  );
  console.log(
    "   2. If XMP metadata appears, redeploy Edge Function with updated PDF parser",
  );
  console.log(
    "   3. Redeploy Edge Function: supabase functions deploy analyze-contract",
  );
}

// Run tests
testEdgeFunction().catch(console.error);
