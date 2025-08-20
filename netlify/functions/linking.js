// netlify/functions/linking.js

const { createClient } = require('@supabase/supabase-js');
const { DOMParser } = require('linkedom'); // Usamos una librería más robusta para parsear HTML

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    };
  }

  try {
    // ---- LÓGICA DE AUTENTICACIÓN (Garantía de Clave de Usuario) ----
    const { user } = context.clientContext;
    if (!user) throw new Error('Debes estar autenticado para realizar esta acción.');
    const token = context.clientContext.token.access_token;

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    
    const { data: profile, error: profileError } = await supabase.from('profiles').select('scraper_api_key').single();
    if (profileError) throw new Error('No se pudo encontrar el perfil del usuario.');
    if (!profile.scraper_api_key) throw new Error('El usuario no ha configurado su ScraperAPI Key.');
    
    const USER_SCRAPER_API_KEY = profile.scraper_api_key;
    // ---- FIN DE LA LÓGICA ----

    const { startUrl, keyUrls } = JSON.parse(event.body);
    if (!startUrl || !keyUrls || keyUrls.length === 0) {
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
      const response = await fetch(scraperUrl);
      if (!response.ok) continue;
      
      const html = await response.text();
      const { document } = new DOMParser().parseFromString(html, "text/html");
      if (!document) continue;

      const links = document.querySelectorAll('a');
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
        // --- MEJORA B: Dato extra para el resaltado visual ---
        isProblematic: typeof depth === 'number' && depth > 3
      };
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(finalResults),
    };

  } catch (err) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};