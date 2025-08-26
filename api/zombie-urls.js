// --- api/zombie-urls.js VERSIÓN INTERACTIVA MEJORADA ---

const { createClient } = require('@supabase/supabase-js');

// --- CONSTANTE FÁCIL DE EDITAR ---
// Cambia este número si quieres que el límite de análisis sea mayor o menor.
const URL_SCAN_LIMIT = 20;

// Pequeña función para extraer datos de un sitemap con expresiones regulares
function parseSitemap(xmlText) {
    const locRegex = /<loc>(.*?)<\/loc>/g;
    const lastmodRegex = /<lastmod>(.*?)<\/lastmod>/g;
    
    const locMatches = [...xmlText.matchAll(locRegex)].map(m => m[1]);
    const lastmodMatches = [...xmlText.matchAll(lastmodRegex)].map(m => new Date(m[1]).toLocaleDateString('es-ES'));

    return locMatches.map((url, index) => ({
        url,
        lastMod: lastmodMatches[index] || null
    }));
}

export default async function handler(request, response) {
  // Manejo de CORS (sin cambios)
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }
  
  const activityLog = [];

  try {
    const { sitemapUrl, domain, projectId, sample } = request.body;
    if (!sitemapUrl || !domain || !projectId) throw new Error('Faltan datos requeridos.');

    // --- Autenticación (sin cambios) ---
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
    
    activityLog.push(`Iniciando auditoría para: ${sitemapUrl}`);
    
    const sitemapResponse = await fetch(sitemapUrl);
    if (!sitemapResponse.ok) {
        const errorResult = {
            results: [{
                url: sitemapUrl, status: 'Sitemap no encontrado',
                suggestion: 'La URL del sitemap no es accesible. Revisa que la ruta sea correcta y que el archivo exista.', type: 'error'
            }],
            activityLog
        };
        activityLog.push("¡Error Crítico! No se encontró el sitemap.");
        await supabase.from('analisis_resultados').insert({ project_id: projectId, module_type: 'zombie-urls', results_data: errorResult });
        return response.status(200).json(errorResult);
    }
    const sitemapText = await sitemapResponse.text();

    // --- NUEVA LÓGICA DE PROCESAMIENTO EN VARIOS PASOS ---

    // PASO 1: Detectar si es un sitemap de tipo ÍNDICE
    if (sitemapText.includes('<sitemapindex')) {
        activityLog.push("Sitemap de tipo 'Índice' detectado. Devolviendo lista para selección.");
        const sitemapList = parseSitemap(sitemapText);

        // Devolvemos una respuesta especial para que el frontend muestre la lista
        const dataToReturn = { sitemapList, activityLog };
        return response.status(200).json(dataToReturn);
    }

    // Si no es un índice, es una lista de URLs de páginas.
    activityLog.push("Sitemap de tipo 'Páginas' detectado.");
    const pageUrls = parseSitemap(sitemapText).map(item => item.url);
    const urlCount = pageUrls.length;
    activityLog.push(`Se encontraron ${urlCount} URLs de páginas.`);

    // PASO 2: Contar URLs y comprobar el límite (a menos que el usuario ya haya aceptado el muestreo)
    if (urlCount > URL_SCAN_LIMIT && !sample) {
        activityLog.push(`El número de URLs supera el límite de ${URL_SCAN_LIMIT}. Pidiendo confirmación al usuario.`);
        
        // Devolvemos una respuesta especial para que el frontend pregunte al usuario
        const dataToReturn = {
            urlCount,
            isTooLarge: true,
            sitemapUrl: sitemapUrl, // Devolvemos la URL para el siguiente paso
            activityLog
        };
        return response.status(200).json(dataToReturn);
    }
    
    // PASO 3: Analizar las URLs (ya sea la lista completa o una muestra)
    let urlsToTest = pageUrls;
    if (sample) {
        // Barajamos y tomamos una muestra
        for (let i = pageUrls.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pageUrls[i], pageUrls[j]] = [pageUrls[j], pageUrls[i]];
        }
        urlsToTest = pageUrls.slice(0, 10);
        activityLog.push(`Analizando una muestra aleatoria de ${urlsToTest.length} URLs.`);
    } else {
        activityLog.push(`Analizando las ${urlsToTest.length} URLs.`);
    }

    const checkPromises = urlsToTest.map(async (url) => {
      const serperQuery = `site:${url}`;
      const fetchResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST', headers: { 'X-API-KEY': USER_SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: serperQuery })
      });
      const results = await fetchResponse.json();
      if (results.organic && results.organic.length === 0) {
        if (url.endsWith('.xml')) {
            return { url, status: 'Sitemap Anidado', suggestion: 'Este archivo no debe ser indexado.', type: 'info' };
        }
        return { url, status: 'No Indexada', suggestion: 'Verificar en Google Search Console.', type: 'warning' };
      }
      return null;
    });

    const results = (await Promise.all(checkPromises)).filter(result => result !== null);
    const issues = results.filter(r => r.type === 'warning');
    activityLog.push(`Análisis completado. Se encontraron ${issues.length} URLs con posibles problemas de indexación.`);

    const dataToReturn = { results, activityLog };
    await supabase.from('analisis_resultados').insert({
        project_id: projectId,
        module_type: 'zombie-urls',
        results_data: dataToReturn
    });
    return response.status(200).json(dataToReturn);

  } catch (err) {
    response.status(500).json({ error: err.message, activityLog });
  }
}