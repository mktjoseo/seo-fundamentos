// api/zombie-urls.js (Versión que maneja la ausencia de sitemap como un resultado)

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

  const { domain, projectId } = request.body;
  
  // La autenticación es necesaria para todas las rutas, la movemos al principio
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Se requiere un token de autenticación válido.' });
  }
  const token = authHeader.split(' ')[1];
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Autenticación fallida.');
    
    const { data: profile, error: profileError } = await supabase.from('profiles').select('serper_api_key').single();
    if (profileError) throw new Error('No se pudo encontrar el perfil del usuario.');
    if (!profile.serper_api_key) throw new Error('El usuario no ha configurado su Serper API Key.');
    
    const USER_SERPER_API_KEY = profile.serper_api_key;

    if (!domain || !projectId) {
        throw new Error('Faltan datos requeridos (domain o projectId).');
    }

    const sitemapUrl = `https://${domain}/sitemap.xml`;
    const sitemapResponse = await fetch(sitemapUrl);
    
    // --- LÓGICA MEJORADA ---
    // Si el sitemap no se encuentra...
    if (!sitemapResponse.ok) {
        // ...creamos un resultado de error SEO para mostrar al usuario.
        const sitemapErrorResult = [{
            url: sitemapUrl,
            status: 'Sitemap no encontrado',
            suggestion: 'Un sitemap es crucial para que Google entienda tu sitio. Créalo y súbelo a la raíz de tu dominio.',
            type: 'error' // Nuevo tipo de error
        }];

        // Guardamos este hallazgo en la base de datos
        await supabase.from('analisis_resultados').insert({
            project_id: projectId,
            module_type: 'zombie-urls',
            results_data: { zombies: sitemapErrorResult }
        });

        // Y devolvemos el resultado al frontend para que lo muestre
        return response.status(200).json(sitemapErrorResult);
    }
    
    // Si el sitemap SÍ se encuentra, continuamos como antes
    const sitemapText = await sitemapResponse.text();
    const urls = [...sitemapText.matchAll(SITEMAP_URL_REGEX)].map(match => match[1]);
    const checkPromises = urls.slice(0, 20).map(async (url) => {
      const serperQuery = `site:${url}`;
      const fetchResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': USER_SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: serperQuery })
      });
      const results = await fetchResponse.json();
      if (results.organic && results.organic.length === 0) {
        if (url.endsWith('.xml')) {
            return { url, status: 'Sitemap (Correcto)', suggestion: 'Este tipo de archivo no debe ser indexado.', type: 'info' };
        }
        return { url, status: 'No Indexada', suggestion: 'Verificar en Google Search Console si debería estar indexada.', type: 'warning' };
      }
      return null;
    });

    const results = await Promise.all(checkPromises);
    const zombieUrls = results.filter(result => result !== null);
    
    const dataToSave = { zombies: zombieUrls };
    
    await supabase.from('analisis_resultados').insert({
        project_id: projectId,
        module_type: 'zombie-urls',
        results_data: dataToSave
    });

    response.status(200).json(zombieUrls);

  } catch (err) {
    response.status(401).json({ error: err.message });
  }
}
