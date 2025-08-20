// netlify/functions/linking.js (VERSIÓN FINAL Y COMPLETA)

const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');
const USER_SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

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
    if (userError || !user) {
      throw new Error('Autenticación fallida.');
    }

    if (!USER_SCRAPER_API_KEY) {
      throw new Error('La ScraperAPI Key no está configurada en el servidor.');
    }
    
    const { startUrl, keyUrls, projectId } = JSON.parse(event.body);
    if (!startUrl || !keyUrls || !keyUrls.length) {
      throw new Error('La URL de inicio y la lista de URLs clave son requeridas.');
    }
    if (!projectId) {
      throw new Error('No se ha proporcionado un ID de proyecto.');
    }

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

      if (!response.ok) {
        console.error(`[ERROR] Falló el scrapeo de ${url} con status ${response.status}.`);
        continue; 
      }
      
      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

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

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    await supabaseAdmin.from('analysis_results').insert({
      project_id: projectId,
      module_key: 'linking',
      results_data: finalResults
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(finalResults),
    };

  } catch (err) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};