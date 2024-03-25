// Cloudflare Pages Function to respond to OPTIONS method
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Allows requests from any origin
      'Access-Control-Allow-Headers': '*', // Allows all headers
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // Adjust according to your needs
      'Access-Control-Max-Age': '86400', // Caches preflight request for 86400 seconds
    },
  });
};

// Cloudflare Pages Function to set CORS and additional security headers for all responses
export const onRequest: PagesFunction = async ({ next }) => {
  const response = await next();

  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Max-Age', '86400');

  // Set additional security headers
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

  return response;
};
