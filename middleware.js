import { geolocation } from '@vercel/functions';

export const config = {
  matcher: '/metrics/:path*',
};

const FPS_ORIGIN = 'gtm-mj7wbqh2.fps.goog';

export default async function middleware(request) {
  const url = new URL(request.url);

  // Normalize root measurement path to preserve trailing slash for FPFE
  const upstreamPath = url.pathname === '/metrics' ? '/metrics/' : url.pathname;

  const destination = new URL(
    upstreamPath + url.search,
    `https://${FPS_ORIGIN}`
  );

  const { country, countryRegion } = geolocation(request);
  const headers = new Headers(request.headers);

  // 1. Host header provides the Container ID via subdomain (gtm-mj7wbqh2)
  headers.set('Host', FPS_ORIGIN);

  // 2. Geolocation headers
  if (country && countryRegion) {
    headers.set('X-Forwarded-CountryRegion', `${country}-${countryRegion}`);
  } else if (country) {
    headers.set('X-Forwarded-Country', country);
  }

  // 3. Developer ID header (Tag-Id header omitted to avoid Host collision)
  headers.set('X-Gtg-Developer-Id', 'dZjdhNm');

  const isBodyless = request.method === 'GET' || request.method === 'HEAD';
  const body = isBodyless ? undefined : await request.arrayBuffer();

  try {
    const originResponse = await fetch(destination.toString(), {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    });

    return new Response(originResponse.body, {
      status: originResponse.status,
      headers: originResponse.headers,
    });
  } catch (error) {
    console.error('GTG Edge Proxy Error:', error);
    return new Response('Measurement Gateway Error', { status: 502 });
  }
}
