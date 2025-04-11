// File: /functions/check-code.js

/**
 * Handles POST requests to validate access codes.
 * Expects a JSON body: { level: "see" | "basic" | "ktm", code: "USER_ENTERED_CODE" }
 * Reads correct codes from Cloudflare Environment Variables.
 */
export async function onRequestPost(context) {
  // context contains request, env (environment variables), etc.

  try {
    // 1. Get data from the request body
    const requestData = await context.request.json();
    const { level, code } = requestData;

    // 2. Basic Input Validation
    if (!level || !code || typeof level !== 'string' || typeof code !== 'string') {
      return new Response(JSON.stringify({ success: false, message: 'Missing or invalid level or code.' }), {
        status: 400, // Bad Request
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalizedLevel = level.toLowerCase();

    // 3. Get the correct code from Environment Variables (Secrets)
    // YOU MUST SET THESE IN YOUR CLOUDFLARE PAGES PROJECT SETTINGS
    const validCodes = {
      see: context.env.SECRET_CODE_SEE,     // e.g., ILSSMTICDAFH
      basic: context.env.SECRET_CODE_BASIC, // e.g., EISDLMIWALH
      ktm: context.env.SECRET_CODE_KTM      // e.g., ITWWEIWBWS
    };

    const expectedCode = validCodes[normalizedLevel];

    // 4. Check if level is valid and code exists in environment variables
     if (!expectedCode) {
       console.error(`Validation Error: No secret/environment variable found for level '${normalizedLevel}'. Check Cloudflare Pages settings.`);
       return new Response(JSON.stringify({ success: false, message: 'Configuration error for this level.' }), {
         status: 500, // Internal Server Error (config issue)
         headers: { 'Content-Type': 'application/json' },
       });
     }

    // 5. Compare the entered code with the expected code
    if (expectedCode === code) {
      // SUCCESS
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // FAILURE - Invalid Code
      return new Response(JSON.stringify({ success: false, message: 'Invalid code provided for this level.' }), {
        status: 401, // Unauthorized
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    // Handle potential errors like invalid JSON parsing
    console.error("Error in /check-code function:", error);
    return new Response(JSON.stringify({ success: false, message: 'An internal error occurred.' }), {
      status: 500, // Internal Server Error
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Optional: Handle other methods if needed, or Cloudflare will return 405 Method Not Allowed automatically
export async function onRequest(context) {
  if (context.request.method === "POST") {
    return await onRequestPost(context);
  }
  // For other methods like GET, OPTIONS etc.
  return new Response(null, { status: 405 }); // Method Not Allowed
}
