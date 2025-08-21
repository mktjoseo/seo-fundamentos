// api/structuredData.js (Versión para Vercel)

const { createClient } = require('@supabase/supabase-js');
const { DOMParser } = require('linkedom');

export default async function handler(request, response) {
  // Manejo de CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
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
    
    const { data: profile, error: profileError } = await supabase.from('profiles').select('scraper_api_key, serper_api_key, gemini_api_key').single();
    if (profileError) throw new Error('No se pudo encontrar el perfil del usuario.');
    if (!profile.scraper_api_key || !profile.serper_api_key || !profile.gemini_api_key) {
        throw new Error('El usuario debe configurar sus claves de Scraper, Serper y Gemini.');
    }
    
    const USER_SCRAPER_API_KEY = profile.scraper_api_key;
    const USER_SERPER_API_KEY = profile.serper_api_key;
    const USER_GEMINI_API_KEY = profile.gemini_api_key;
    // ---- FIN DE LA LÓGICA ----

    const { url } = request.body;
    if (!url) throw new Error('La URL es requerida.');

    const scraperUrl = `http://api.scraperapi.com?api_key=${USER_SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
    const fetchResponse = await fetch(scraperUrl);
    if (!fetchResponse.ok) throw new Error('No se pudo obtener el HTML de la URL.');
    
    const html = await fetchResponse.text();
    const { document } = new DOMParser().parseFromString(html, "text/html");
    if (!document) throw new Error('No se pudo analizar el HTML.');

    const pageTitle = document.querySelector('title')?.textContent || 'Página sin título';
    const schemaScript = document.querySelector('script[type="application/ld+json"]');
    
    if (!schemaScript) {
      return response.status(200).json({
        validation: { status: 'No Encontrado', issues: [{ type: 'Error', message: 'No se encontró ningún script de datos estructurados (JSON-LD) en esta página.' }] },
        competitors: []
      });
    }

    const schemaContent = schemaScript.textContent;
    
    const validateSchemaPromise = async () => {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${USER_GEMINI_API_KEY}`;
      const prompt = `Valida este JSON-LD. Responde ÚNICAMENTE con un objeto JSON con el formato: {"status": "<Válido|Válido con advertencias|Error>", "issues": [{"type": "<Advertencia|Error>", "message": "<descripción del problema>"}]}. Schema a analizar: ${schemaContent}`;
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!geminiResponse.ok) throw new Error('Error al llamar a Gemini para validar el schema.');
      const geminiData = await geminiResponse.json();
      const jsonText = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonText);
    };

    const findCompetitorSchemasPromise = async () => {
      const serperResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': USER_SERPER_API_KEY, 'Content-Type': 'application/json' },
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
    
    const finalResult = {
      validation: validationResult,
      competitors: competitorSchemas.map(schema => ({ type: schema }))
    };

    response.status(200).json(finalResult);

  } catch (err) {
    response.status(401).json({ error: err.message });
  }
}
