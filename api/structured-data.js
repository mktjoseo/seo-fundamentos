// api/structured-data.js (Versión Final con Log de Actividad)

const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');

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
    const { url, projectId } = request.body;
    if (!url) throw new Error('La URL es requerida.');

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

    activityLog.push(`Iniciando auditoría de datos estructurados para: ${url}`);
    
    // Paso 1: Obtener HTML
    activityLog.push("Paso 1/3: Obteniendo HTML de la página (vía ScraperAPI)...");
    const scraperUrl = `http://api.scraperapi.com?api_key=${scraper_api_key}&url=${encodeURIComponent(url)}`;
    const fetchResponse = await fetch(scraperUrl);
    if (!fetchResponse.ok) throw new Error('No se pudo obtener el HTML de la URL.');
    
    const html = await fetchResponse.text();
    const dom = new JSDOM(html);
    const { document } = dom.window;

    const pageTitle = document.querySelector('title')?.textContent || 'Página sin título';
    const schemaScript = document.querySelector('script[type="application/ld+json"]');
    
    if (!schemaScript) {
      activityLog.push("Resultado: No se encontró ningún script JSON-LD en la página.");
      const noSchemaResult = {
        validation: { status: 'No Encontrado', issues: [{ type: 'Error', message: 'No se encontró ningún script de datos estructurados (JSON-LD) en esta página.' }] },
        competitors: [],
        activityLog
      };
      if (projectId) {
        await supabase.from('analisis_resultados').insert({ project_id: projectId, module_type: 'structured-data', results_data: noSchemaResult });
      }
      return response.status(200).json(noSchemaResult);
    }
    
    activityLog.push("Script JSON-LD encontrado. Procediendo con el análisis...");
    const schemaContent = schemaScript.textContent;
    
    // Pasos 2 y 3 en paralelo
    activityLog.push("Paso 2/3: Validando el schema con IA (vía Gemini)...");
    activityLog.push("Paso 3/3: Buscando schemas de la competencia (vía Serper)...");
    
    const validateSchemaPromise = async () => {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${gemini_api_key}`;
      const prompt = `Valida este JSON-LD. Responde ÚNICAMENTE con un objeto JSON con el formato: {"status": "<Válido|Válido con advertencias|Error>", "issues": [{"type": "<Advertencia|Error>", "message": "<descripción del problema>"}]}. Schema a analizar: ${schemaContent}`;
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!geminiResponse.ok) throw new Error('Error al llamar a Gemini para validar el schema.');
      const geminiData = await geminiResponse.json();
      const jsonText = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonText);
    };

    const findCompetitorSchemasPromise = async () => {
      const serperResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST', headers: { 'X-API-KEY': serper_api_key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: pageTitle })
      });
      if (!serperResponse.ok) return [];
      const serperData = await serperResponse.json();
      try {
        const richSnippets = serperData.organic?.flatMap(r => r.richSnippet?.top?.detected_extensions?.map(ext => Object.keys(ext)[0]) || []) || [];
        return [...new Set(richSnippets)];
      } catch (processingError) {
        return [];
      }
    };
      
    const [validationResult, competitorSchemas] = await Promise.all([
      validateSchemaPromise(),
      findCompetitorSchemasPromise()
    ]);
    
    activityLog.push("¡Análisis completado con éxito!");
    
    const finalResult = {
      validation: validationResult,
      competitors: competitorSchemas.map(schema => ({ type: schema })),
      activityLog
    };

    if (projectId) {
        await supabase.from('analisis_resultados').insert({
            project_id: projectId,
            module_type: 'structured-data',
            results_data: finalResult
        });
    }

    response.status(200).json(finalResult);

  } catch (err) {
    response.status(401).json({ error: err.message, activityLog });
  }
}