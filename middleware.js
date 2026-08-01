import { geolocation } from '@vercel/functions';

export const config = {
  matcher: '/metrics/:path*',
};

const CONTAINER_ID = 'GTM-MJ7WBQH2';
const FPS_ORIGIN = 'gtm-mj7wbqh2.fps.goog';

export default async function middleware(request) {
  const url = new URL(request.url);
  const destination = new URL(
    url.pathname + url.search,
    `https://${FPS_ORIGIN}`
  );

  const { country, countryRegion } = geolocation(request);
  const headers = new Headers(request.headers);

  headers.set('Host', FPS_ORIGIN);

  if (country && countryRegion) {
    headers.set('X-Forwarded-CountryRegion', `${country}-${countryRegion}`);
  } else if (country) {
    headers.set('X-Forwarded-Country', country);
  }

  headers.set('X-Gtg-Developer-Id', 'dZjdhNm');
  headers.set('X-Gtg-Tag-Id', CONTAINER_ID);

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
