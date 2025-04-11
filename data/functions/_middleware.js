// functions/_middleware.js

/**
 * Cloudflare Pages Middleware to protect specific routes using JWTs in cookies.
 */

import { verify } from 'jsonwebtoken';

// Define protected paths
const protectedPaths = ['/basic_mcq.html', '/see_mcq.html', '/ktm_mcq.html'];

export async function onRequest(context) {
  const { request, next } = context;
  const pathname = new URL(request.url).pathname;

  // 1. If the path is not protected, just continue
  if (!protectedPaths.includes(pathname)) {
    return await next();
  }

  // 2. Helper to get the cookie value
  const getCookie = (name) => {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';').map(c => c.trim().split('=')).reduce((acc, [k, v]) => {
      acc[k] = decodeURIComponent(v);
      return acc;
    }, {});
    return cookies[name] || null;
  };

  // 3. Get the access token from the cookie
  const accessToken = getCookie('access_token');

  // 4. If no token, return unauthorized
  if (!accessToken) {
    return new Response('Unauthorized: No token provided', { status: 403 });
  }

  // 5. Verify the JWT
  try {
    const sharedSecret = context.env.SHARED_JWT_SECRET;
    if (!sharedSecret) {
      console.error('SHARED_JWT_SECRET environment variable not set!');
      return new Response('Internal Server Error', { status: 500 });
    }
    const decodedPayload = verify(accessToken, sharedSecret);

    // 6. Check if the file in the token matches the request
    if (decodedPayload.file !== pathname) {
      console.log(`Token valid but file mismatch: ${decodedPayload.file} !== ${pathname}`);
      return new Response('Forbidden: Invalid token for this resource', { status: 403 });
    }

    // 7. If everything is valid, continue to the next handler
    return await next();

  } catch (err) {
    // 8. Token verification failed
    console.error('JWT Verification Error:', err.message);
    return new Response('Unauthorized: Invalid token', { status: 403 });
  }
}
