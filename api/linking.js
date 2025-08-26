// api/linking.js (Versión Final Profesional, con filtros avanzados y Log)

const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');

// Expresión regular para ignorar enlaces a archivos comunes
const FILE_EXTENSION_REGEX = /\.(pdf|jpg|jpeg|png|gif|svg|zip|rar|exe|mp3|mp4|avi)$/i;

export default async function handler(request, response) {
  // Manejo de CORS (sin cambios)
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-control-allow-headers', 'authorization, content-type');
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }
  
  const activityLog = [];

  try {
    const { startUrl, keyUrls, projectId } = request.body;
    if (!startUrl || !keyUrls || !keyUrls.length || !projectId) {
      throw new Error('Faltan datos requeridos (startUrl, keyUrls, o projectId).');
    }

    // --- Autenticación (sin cambios) ---
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('Se requiere un token de autenticación válido.');
    const token = authHeader.split(' ')[1];
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Autenticación fallida.');
    const { data: profile, error: profileError } = await supabase.from('profiles').select('scraper_api_key').single();
    if (profileError) throw new Error('No se pudo encontrar el perfil del usuario.');
    if (!profile.scraper_api_key) throw new Error('El usuario no ha configurado su ScraperAPI Key.');
    const USER_SCRAPER_API_KEY = profile.scraper_api_key;
    // --- Fin Autenticación ---

    activityLog.push(`Iniciando rastreo desde: ${startUrl}`);

    // --- Lógica del Crawler ---
    const queue = [{ url: startUrl, depth: 0 }];
    const visited = new Set([startUrl]);
    const results = new Map();
    const crawlLogData = [{ url: startUrl, depth: 0 }];

    let pagesCrawled = 0;
    const CRAWL_LIMIT = 30;

    const normalizedKeyUrls = new Set(keyUrls.map(u => {
        let urlObj = new URL(u, startUrl);
        urlObj.hash = '';
        urlObj.search = '';
        return urlObj.href.endsWith('/') ? urlObj.href.slice(0, -1) : urlObj.href;
    }));

    activityLog.push(`Buscando ${normalizedKeyUrls.size} URLs clave (profundidad máxima: 2 clics).`);

    // --- BUCLE WHILE MODIFICADO ---
    while (queue.length > 0 && pagesCrawled < CRAWL_LIMIT) {
      const { url, depth } = queue.shift();

      // Si la profundidad actual ya es 2, procesamos la página pero no añadimos más enlaces a la cola.
      if (depth >= 2 && !normalizedKeyUrls.has(url.endsWith('/') ? url.slice(0,-1) : url)) {
        const normalizedUrlForCheck = url.endsWith('/') ? url.slice(0, -1) : url;
        if (normalizedKeyUrls.has(normalizedUrlForCheck)) {
          results.set(normalizedUrlForCheck, depth);
          activityLog.push(`¡URL clave encontrada! "${url}" a ${depth} clics.`);
          normalizedKeyUrls.delete(normalizedUrlForCheck);
        }
        continue; // No rastrear más allá de profundidad 2
      }
      // --- FIN DE LA MODIFICACIÓN ---

      pagesCrawled++;
      
      let normalizedUrlForCheck = url.endsWith('/') ? url.slice(0, -1) : url;
      if (normalizedKeyUrls.has(normalizedUrlForCheck)) {
        results.set(normalizedUrlForCheck, depth);
        activityLog.push(`¡URL clave encontrada! "${url}" a ${depth} clics.`);
        normalizedKeyUrls.delete(normalizedUrlForCheck);
      }
      
      if (normalizedKeyUrls.size === 0) {
        activityLog.push("Todas las URLs clave han sido encontradas.");
        break;
      }

      const scraperUrl = `http://api.scraperapi.com?api_key=${USER_SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
      const fetchResponse = await fetch(scraperUrl);

      if (!fetchResponse.ok) {
        console.error(`[ERROR] Falló el scrapeo de ${url} con status ${fetchResponse.status}.`);
        continue;
      }
      
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

    if (pagesCrawled >= CRAWL_LIMIT) {
        activityLog.push(`Límite de rastreo (${CRAWL_LIMIT} páginas) alcanzado.`);
    }

    // --- LÓGICA DE RESULTADOS MODIFICADA ---
    const finalResults = keyUrls.map(originalUrl => {
        let urlObj = new URL(originalUrl, startUrl);
        urlObj.hash = '';
        urlObj.search = '';
        let normalizedUrl = urlObj.href.endsWith('/') ? urlObj.href.slice(0, -1) : urlObj.href;
      
      const depth = results.get(normalizedUrl);
      const notFoundMessage = "No encontrada a 2 clics de profundidad. Si es importante, acércala a la home.";

      return {
        url: originalUrl,
        depth: typeof depth === 'number' ? depth : notFoundMessage,
        isProblematic: typeof depth !== 'number' || depth > 2
      };
    });
    // --- FIN DE LA MODIFICACIÓN ---
    
    const dataToReturn = {
        results: finalResults,
        activityLog,
        crawlLog: crawlLogData
    };

    await supabase.from('analisis_resultados').insert({
        project_id: projectId,
        module_type: 'linking',
        results_data: dataToReturn 
    });
    
    response.status(200).json(dataToReturn);

  } catch (err) {
    response.status(500).json({ error: err.message, activityLog });
  }
}