addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Parse the URL from the request
  const url = new URL(request.url);

  // Modify the URL hostname to the target domain
  url.hostname = 'cdn.shaneduffy.io';

  // Use the modified URL for the fetch request
  const response = await fetch(url.toString(), request);

  // Make a copy of the response to modify headers
  const newResponse = new Response(response.body, response);

  // Set CORS headers
  newResponse.headers.set('Access-Control-Allow-Origin', '*'); // Allows all domains, adjust as needed
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization');

  // Set additional security headers
  newResponse.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  newResponse.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

  // Returns the response with CORS and additional security headers
  return newResponse;
}
