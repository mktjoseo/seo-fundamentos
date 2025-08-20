// netlify/functions/linking.js (CORREGIDO)

const { createClient } = require('@supabase/supabase-js');
const { DOMParser } = require('linkedom');

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    };
  }

  try {
    // ---- LÓGICA DE AUTENTICACIÓN CORREGIDA ----
    const authHeader = event.headers.authorization;
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
    if (userError || !user) throw new Error('Autenticación fallida: no se pudo verificar al usuario.');
    
    const { data: profile, error: profileError } = await supabase.from('profiles').select('scraper_api_key').single();
    if (profileError) throw new Error('No se pudo encontrar el perfil del usuario.');
    if (!profile.scraper_api_key) throw new Error('El usuario no ha configurado su ScraperAPI Key.');
    
    const USER_SCRAPER_API_KEY = profile.scraper_api_key;
    // ---- FIN DE LA LÓGICA CORREGIDA ----

    const { startUrl, keyUrls } = JSON.parse(event.body);
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
      console.log(`[DEBUG] Se encontraron ${links.length} enlaces en ${url}.`);

      // --- MICRÓFONOS DE DEPURACIÓN ---
      console.log(`[DEBUG] Intentando scrapear: ${url}`);
      const response = await fetch(scraperUrl);

      // Añadimos un log para ver la respuesta de ScraperAPI
      console.log(`[DEBUG] Respuesta de ScraperAPI para ${url}: Status ${response.status}`);

      if (!response.ok) {
        // Si falla, lo registramos y nos saltamos esta página
        console.error(`[ERROR] Falló el scrapeo de ${url} con status ${response.status}. Saltando a la siguiente URL.`);
        continue; 
      }
      // --- FIN DE LOS MICRÓFONOS ---

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
      statusCode: 401, // Error de autenticación
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};