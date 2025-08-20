// netlify/functions/structuredData.js (VERSIÓN FINAL Y COMPLETA)

const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');
const USER_SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const USER_SERPER_API_KEY = process.env.SERPER_API_KEY;
const USER_GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

    if (!USER_SCRAPER_API_KEY || !USER_SERPER_API_KEY || !USER_GEMINI_API_KEY) {
      throw new Error('Todas las claves de API deben estar configuradas en el servidor.');
    }
    
    const { url } = JSON.parse(event.body);
    if (!url) {
      throw new Error('La URL es requerida.');
    }
    
    const scraperUrl = `http://api.scraperapi.com?api_key=${USER_SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
    const response = await fetch(scraperUrl);
    if (!response.ok) {
      throw new Error('No se pudo obtener el HTML de la URL.');
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const pageTitle = document.querySelector('title')?.textContent || 'Página sin título';
    const schemaScript = document.querySelector('script[type="application/ld+json"]');
    
    if (!schemaScript) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          validation: { status: 'No Encontrado', issues: [{ type: 'Error', message: 'No se encontró ningún script de datos estructurados (JSON-LD) en esta página.' }] },
          competitors: []
        }),
      };
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
    
    // NOTA: Esta herramienta no depende de un proyecto, por lo que no guardamos el resultado.
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(finalResult),
    };

  } catch (err) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};