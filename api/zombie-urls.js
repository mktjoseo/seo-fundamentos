// api/zombie-urls.js (Versión Final con Log de Actividad)

const { createClient } = require('@supabase/supabase-js');

const SITEMAP_URL_REGEX = /<loc>(.*?)<\/loc>/g;

export default async function handler(request, response) {
  // Manejo de CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }
  
  const activityLog = [];

  try {
    const { domain, projectId } = request.body;
    if (!domain || !projectId) throw new Error('Faltan datos requeridos (domain o projectId).');

    // --- Autenticación ---
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('Se requiere un token de autenticación válido.');
    const token = authHeader.split(' ')[1];
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Autenticación fallida.');
    const { data: profile, error: profileError } = await supabase.from('profiles').select('serper_api_key').single();
    if (profileError) throw new Error('No se pudo encontrar el perfil del usuario.');
    if (!profile.serper_api_key) throw new Error('El usuario no ha configurado su Serper API Key.');
    const USER_SERPER_API_KEY = profile.serper_api_key;
    // --- Fin Autenticación ---
    
    activityLog.push(`Iniciando análisis para el dominio: ${domain}`);
    const sitemapUrl = `https://${domain}/sitemap.xml`;
    activityLog.push(`Buscando sitemap en: ${sitemapUrl}`);
    
    const sitemapResponse = await fetch(sitemapUrl);
    
    if (!sitemapResponse.ok) {
        const sitemapErrorResult = [{
            url: sitemapUrl, status: 'Sitemap no encontrado',
            suggestion: 'Un sitemap es crucial para que Google entienda tu sitio. Créalo y súbelo a la raíz de tu dominio.', type: 'error'
        }];
        activityLog.push("¡Error Crítico! No se encontró el sitemap.");
        const dataToReturn = { results: sitemapErrorResult, activityLog };
        await supabase.from('analisis_resultados').insert({ project_id: projectId, module_type: 'zombie-urls', results_data: dataToReturn });
        return response.status(200).json(dataToReturn);
    }
    
    const sitemapText = await sitemapResponse.text();
    const urls = [...sitemapText.matchAll(SITEMAP_URL_REGEX)].map(match => match[1]);
    activityLog.push(`Sitemap encontrado. Se analizarán ${urls.length} URLs (limitado a las primeras 20).`);

    const checkPromises = urls.slice(0, 20).map(async (url) => {
      const serperQuery = `site:${url}`;
      const fetchResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST', headers: { 'X-API-KEY': USER_SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: serperQuery })
      });
      const results = await fetchResponse.json();
      if (results.organic && results.organic.length === 0) {
        if (url.endsWith('.xml')) {
            return { url, status: 'Sitemap (Correcto)', suggestion: 'Este tipo de archivo no debe ser indexado.', type: 'info' };
        }
        return { url, status: 'No Indexada', suggestion: 'Verificar en Google Search Console.', type: 'warning' };
      }
      return null;
    });

    const results = await Promise.all(checkPromises);
    const zombieUrls = results.filter(result => result !== null);
    activityLog.push(`Análisis completado. Se encontraron ${zombieUrls.length} URLs con posibles problemas de indexación.`);

    const dataToReturn = { results: zombieUrls, activityLog };

    await supabase.from('analisis_resultados').insert({
        project_id: projectId,
        module_type: 'zombie-urls',
        results_data: dataToReturn
    });

    response.status(200).json(dataToReturn);

  } catch (err) {
    response.status(401).json({ error: err.message, activityLog });
  }
}