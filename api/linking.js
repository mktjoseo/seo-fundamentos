// api/linking.js (Versión que devuelve el log de rastreo)

const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');

const FILE_EXTENSION_REGEX = /\.(pdf|jpg|jpeg|png|gif|svg|zip|rar|exe|mp3|mp4|avi)$/i;

export default async function handler(request, response) {
  // Manejo de CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-control-allow-headers', 'authorization, content-type');
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    // ---- LÓGICA DE AUTENTICACIÓN ----
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Se requiere un token de autenticación válido.');
    }
    const token = authHeader.split(' ')[1];

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Autenticación fallida.');
    
    const { data: profile, error: profileError } = await supabase.from('profiles').select('scraper_api_key').single();
    if (profileError) throw new Error('No se pudo encontrar el perfil del usuario.');
    if (!profile.scraper_api_key) throw new Error('El usuario no ha configurado su ScraperAPI Key.');
    
    const USER_SCRAPER_API_KEY = profile.scraper_api_key;
    // ---- FIN DE LA LÓGICA ----

    const { startUrl, keyUrls } = request.body;
    if (!startUrl || !keyUrls || !keyUrls.length) {
      throw new Error('La URL de inicio y la lista de URLs clave son requeridas.');
    }

    // --- Lógica del Crawler ---
    const queue = [{ url: startUrl, depth: 0 }];
    const visited = new Set([startUrl]);
    const results = new Map();
    const crawlLogData = [{ url: startUrl, depth: 0 }]; // Aquí guardaremos el log

    let pagesCrawled = 0;
    const CRAWL_LIMIT = 30;

    const normalizedKeyUrls = new Set(keyUrls.map(u => {
        let urlObj = new URL(u, startUrl);
        urlObj.hash = '';
        urlObj.search = '';
        return urlObj.href.endsWith('/') ? urlObj.href.slice(0, -1) : urlObj.href;
    }));

    while (queue.length > 0 && pagesCrawled < CRAWL_LIMIT) {
      const { url, depth } = queue.shift();
      pagesCrawled++;
      
      let normalizedUrlForCheck = url.endsWith('/') ? url.slice(0, -1) : url;
      if (normalizedKeyUrls.has(normalizedUrlForCheck)) {
        results.set(normalizedUrlForCheck, depth);
        normalizedKeyUrls.delete(normalizedUrlForCheck);
      }
      
      if (normalizedKeyUrls.size === 0) break;

      const scraperUrl = `http://api.scraperapi.com?api_key=${USER_SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
      const fetchResponse = await fetch(scraperUrl);

      if (!fetchResponse.ok) continue;
      
      const html = await fetchResponse.text();
      const dom = new JSDOM(html);
      const { document } = dom.window;

      const links = document.querySelectorAll('a');

      for (const link of links) {
        const href = link.getAttribute('href');
        if (href) {
          try {
            if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
            if (FILE_EXTENSION_REGEX.test(href)) continue;

            let nextUrlObj = new URL(href, url);
            nextUrlObj.hash = '';
            nextUrlObj.search = '';
            
            let normalizedUrl = nextUrlObj.href;
            if (normalizedUrl.endsWith('/')) {
                normalizedUrl = normalizedUrl.slice(0, -1);
            }

            if (normalizedUrl.startsWith(startUrl) && !visited.has(normalizedUrl)) {
              visited.add(normalizedUrl);
              const newDepth = depth + 1;
              queue.push({ url: normalizedUrl, depth: newDepth });
              crawlLogData.push({ url: normalizedUrl, depth: newDepth });
            }
          } catch (_) {}
        }
      }
    }

    const finalResults = keyUrls.map(originalUrl => {
        let urlObj = new URL(originalUrl, startUrl);
        urlObj.hash = '';
        urlObj.search = '';
        let normalizedUrl = urlObj.href;
        if (normalizedUrl.endsWith('/')) {
            normalizedUrl = normalizedUrl.slice(0, -1);
        }
      
      const depth = results.has(normalizedUrl) ? results.get(normalizedUrl) : 'No encontrado';
      return {
        url: originalUrl,
        depth: depth,
        isProblematic: typeof depth === 'number' && depth > 3
      };
    });
    
    // Devolvemos un objeto con los resultados y el log completo del rastreo
    response.status(200).json({
        results: finalResults,
        crawlLog: crawlLogData
    });

  } catch (err) {
    response.status(401).json({ error: err.message });
  }
}
