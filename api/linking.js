// api/linking.js (Versión para Vercel con depuración de HTML)

const { createClient } = require('@supabase/supabase-js');
const { DOMParser } = require('linkedom');

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
    let pagesCrawled = 0;
    const CRAWL_LIMIT = 50;

    const normalizedKeyUrls = new Set(keyUrls.map(u => new URL(u, startUrl).href));

    while (queue.length > 0 && pagesCrawled < CRAWL_LIMIT) {
      const { url, depth } = queue.shift();
      pagesCrawled++;
      
      if (normalizedKeyUrls.has(url)) {
        results.set(url, depth);
        normalizedKeyUrls.delete(url);
      }
      
      if (normalizedKeyUrls.size === 0) break;

      const scraperUrl = `http://api.scraperapi.com?api_key=${USER_SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
      console.log(`[DEBUG] Intentando scrapear: ${url}`);
      const fetchResponse = await fetch(scraperUrl);
      console.log(`[DEBUG] Respuesta de ScraperAPI para ${url}: Status ${fetchResponse.status}`);

      if (!fetchResponse.ok) {
        console.error(`[ERROR] Falló el scrapeo de ${url} con status ${fetchResponse.status}. Saltando a la siguiente URL.`);
        continue;
      }
      
      const html = await fetchResponse.text();
      
      // --- NUEVO MICRÓFONO: ¿QUÉ HTML ESTAMOS RECIBIENDO? ---
      console.log(`[DEBUG] Primeros 500 caracteres del HTML recibido: ${html.substring(0, 500)}`);
      // --- FIN DEL MICRÓFONO ---

      const { document } = new DOMParser().parseFromString(html, "text/html");
      if (!document) {
          console.error('[ERROR] El DOMParser no pudo analizar el HTML.');
          continue;
      }

      const links = document.querySelectorAll('a');
      console.log(`[DEBUG] Se encontraron ${links.length} enlaces en ${url}.`);

      for (const link of links) {
        const href = link.getAttribute('href');
        if (href) {
          try {
            const nextUrl = new URL(href, url).href;
            if (nextUrl.startsWith(startUrl) && !visited.has(nextUrl)) {
              visited.add(nextUrl);
              queue.push({ url: nextUrl, depth: depth + 1 });
            }
          } catch (_) {}
        }
      }
    }

    const finalResults = keyUrls.map(originalUrl => {
      const normalizedUrl = new URL(originalUrl, startUrl).href;
      const depth = results.has(normalizedUrl) ? results.get(normalizedUrl) : 'No encontrado';
      return {
        url: originalUrl,
        depth: depth,
        isProblematic: typeof depth === 'number' && depth > 3
      };
    });
    
    response.status(200).json(finalResults);

  } catch (err) {
    response.status(401).json({ error: err.message });
  }
}
