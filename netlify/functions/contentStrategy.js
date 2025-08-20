// netlify/functions/contentStrategy.js (VERSIÓN FINAL, COMPLETA Y VERIFICADA)

const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');
const USER_SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const USER_SERPER_API_KEY = process.env.SERPER_API_KEY;
const USER_GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const getHostname = (urlString) => {
  try { return new URL(urlString).hostname; } catch (e) { return null; }
};

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
    
    const { keyword } = JSON.parse(event.body);
    if (!keyword) {
      throw new Error('La palabra clave es requerida.');
    }
    
    const serperResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': USER_SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: keyword, num: 5 })
    });

    if (!serperResponse.ok) {
      throw new Error('Error al obtener competidores de Serper.');
    }
    const serperData = await serperResponse.json();
    
    const competitorDomains = [...new Set(
      serperData.organic?.map(r => getHostname(r.link)).filter(Boolean)
    )].slice(0, 3);
    
    if (competitorDomains.length === 0) {
      throw new Error('No se encontraron competidores para analizar.');
    }

    const competitorContentPromises = competitorDomains.map(async (domain) => {
      const siteSearchResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': USER_SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: `site:${domain} "${keyword}"`, num: 2 })
      });
      if (!siteSearchResponse.ok) return { domain, content: "" };

      const siteSearchData = await siteSearchResponse.json();
      const relevantUrls = siteSearchData.organic?.map(r => r.link) || [];
      let combinedText = "";

      for (const url of relevantUrls) {
        const scraperUrl = `http://api.scraperapi.com?api_key=${USER_SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
        const scrapeResponse = await fetch(scraperUrl);
        if (scrapeResponse.ok) {
          let html = await scrapeResponse.text();
          
          // Elimina todo el contenido de las etiquetas <style> y <script> para evitar errores de parseo.
          html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

          const dom = new JSDOM(html);
          const document = dom.window.document;
          combinedText += `Título: ${document?.querySelector('h1')?.textContent || ''}\nContenido: ${document?.body?.textContent.slice(0, 1500) || ''}\n\n`;
        }
      }
      return { domain, content: combinedText };
    });

    const competitorsTextData = await Promise.all(competitorContentPromises);
    const contextForGemini = competitorsTextData.map(c => `Competidor: ${c.domain}\nContenido Relevante:\n${c.content}`).join('\n---\n');
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${USER_GEMINI_API_KEY}`;
    const prompt = `Actúa como un estratega de contenido SEO experto. Basado en el siguiente contenido extraído de los principales competidores para la palabra clave "${keyword}", realiza un análisis para cada uno. Contenido de la Competencia: --- ${contextForGemini} --- Devuelve ÚNICAMENTE un objeto JSON válido con una clave "competitors" que contenga un array. Cada objeto en el array debe tener este formato y nada más: { "domain": "<nombre del dominio competidor>", "contentPillar": "<El pilar de contenido principal que identificas>", "subTopics": ["<lista de 3 a 5 subtemas que cubren>"], "opportunity": "<Una sugerencia concreta de un nicho o ángulo de contenido que no están explotando>" }`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!geminiResponse.ok) {
      throw new Error('Error al llamar a la API de Gemini para el análisis estratégico.');
    }
    
    const geminiData = await geminiResponse.json();
    const jsonResponseText = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    const analysisResult = JSON.parse(jsonResponseText);
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(analysisResult),
    };

  } catch (err) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};