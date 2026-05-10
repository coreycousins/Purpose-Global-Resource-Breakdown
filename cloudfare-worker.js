  export default {
    async fetch(request) {
      const target = new URL(request.url).searchParams.get('url');
      if (!target) return new Response('url param required', { status: 400 });
      const resp = await fetch(target, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      return new Response(await resp.text(), {
        status: resp.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': resp.headers.get('Content-Type') ?? 'application/json',
        },
      });
    },
  };