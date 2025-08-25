// api/content-strategy.js (Versión Final con Log de Actividad)

const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');

function getHostname(url_string) {
  try { return new URL(url_string).hostname; } catch (e) { return null; }
}

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
    const { keyword, projectId } = request.body;
    if (!keyword) throw new Error('La palabra clave es requerida.');
    
    // --- Autenticación ---
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('Se requiere un token de autenticación válido.');
    const token = authHeader.split(' ')[1];
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Autenticación fallida.');
    const { data: profile, error: profileError } = await supabase.from('profiles').select('scraper_api_key, serper_api_key, gemini_api_key').single();
    if (profileError) throw new Error('No se pudo encontrar el perfil del usuario.');
    if (!profile.scraper_api_key || !profile.serper_api_key || !profile.gemini_api_key) throw new Error('El usuario debe configurar sus claves de Scraper, Serper y Gemini.');
    const { scraper_api_key, serper_api_key, gemini_api_key } = profile;
    // --- Fin Autenticación ---

    activityLog.push(`Iniciando análisis para la keyword: "${keyword}"`);

    // Paso 1: Búsqueda en Serper
    activityLog.push("Paso 1/3: Buscando competidores principales en Google (vía Serper)...");
    const serperResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serper_api_key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: keyword, num: 5 })
    });
    if (!serperResponse.ok) throw new Error(`Error al obtener competidores de Serper (Status: ${serperResponse.status}).`);
    const serperData = await serperResponse.json();
    if (!serperData.organic) throw new Error('La respuesta de Serper no contiene resultados de búsqueda.');
    
    const competitorDomains = [...new Set(serperData.organic.map(r => getHostname(r.link)).filter(Boolean))].slice(0, 3);
    if (competitorDomains.length === 0) throw new Error('No se encontraron competidores para analizar.');
    activityLog.push(`Competidores encontrados: ${competitorDomains.join(', ')}`);

    // Paso 2: Scrapeo con ScraperAPI
    activityLog.push(`Paso 2/3: Extrayendo contenido de ${competitorDomains.length} competidores (vía ScraperAPI)...`);
    const competitorContentPromises = competitorDomains.map(async (domain) => {
      const siteSearchResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serper_api_key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: `site:${domain} "${keyword}"`, num: 2 })
      });
      if (!siteSearchResponse.ok) return { domain, content: "" };
      const siteSearchData = await siteSearchResponse.json();
      const relevantUrls = siteSearchData.organic?.map(r => r.link) || [];
      let combinedText = "";
      for (const url of relevantUrls) {
        const scraperUrl = `http://api.scraperapi.com?api_key=${scraper_api_key}&url=${encodeURIComponent(url)}`;
        const scrapeResponse = await fetch(scraperUrl);
        if (scrapeResponse.ok) {
          const html = await scrapeResponse.text();
          const dom = new JSDOM(html, { resources: "usable" });
          const { document } = dom.window;
          const bodyText = document?.body?.innerText || '';
          combinedText += `Título: ${document?.querySelector('h1')?.textContent || ''}\nContenido: ${bodyText.slice(0, 1500)}\n\n`;
        }
      }
      return { domain, content: combinedText };
    });
    const competitorsTextData = await Promise.all(competitorContentPromises);

    // Paso 3: Análisis con Gemini
    activityLog.push("Paso 3/3: Analizando todo el contexto con IA para generar la estrategia (vía Gemini)...");
    const contextForGemini = competitorsTextData.map(c => `Competidor: ${c.domain}\nContenido Relevante:\n${c.content}`).join('\n---\n');
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gemini_api_key}`;
    const prompt = `Actúa como un estratega de contenido SEO experto. Basado en el siguiente contenido extraído de los principales competidores para la palabra clave "${keyword}", realiza un análisis para cada uno. Contenido de la Competencia: --- ${contextForGemini} --- Devuelve ÚNICAMENTE un objeto JSON válido con una clave "competitors" que contenga un array. Cada objeto en el array debe tener este formato y nada más: { "domain": "<nombre del dominio competidor>", "contentPillar": "<El pilar de contenido principal que identificas>", "subTopics": ["<lista de 3 a 5 subtemas que cubren>"], "opportunity": "<Una sugerencia concreta de un nicho o ángulo de contenido que no están explotando>" }`;
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!geminiResponse.ok) throw new Error('Error al llamar a la API de Gemini.');
    const geminiData = await geminiResponse.json();
    const jsonResponseText = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    const analysisResult = JSON.parse(jsonResponseText);
    activityLog.push("¡Análisis completado con éxito!");
    
    const dataToReturn = { 
        keyword: keyword, // <-- Se añade la keyword aquí
        ...analysisResult, 
        activityLog 
    };

    if (projectId) {
        await supabase.from('analisis_resultados').insert({
            project_id: projectId,
            module_type: 'content-strategy',
            results_data: dataToReturn 
        });
    }
    
    response.status(200).json(dataToReturn);

  } catch (err) {
    response.status(500).json({ error: err.message, activityLog });
  }
}