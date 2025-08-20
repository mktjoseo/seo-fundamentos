// netlify/functions/structure.js (VERSIÓN FINAL Y COMPLETA)

const { createClient } = require('@supabase/supabase-js');

const USER_SERPER_API_KEY = process.env.SERPER_API_KEY;
const USER_GEMINI_API_KEY = process.env.GEMINI_API_KEY;

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    };
  }

  try {
    const { user } = context.clientContext;
    if (!user) throw new Error('Debes estar autenticado para usar esta herramienta.');
    if (!USER_SERPER_API_KEY || !USER_GEMINI_API_KEY) throw new Error('Las claves de Serper y Gemini deben estar configuradas en el servidor.');

    // Recibimos el projectId desde el frontend
    const { keyword, articleText, projectId } = JSON.parse(event.body);
    if (!keyword || !articleText) throw new Error('La palabra clave y el texto del artículo son requeridos.');
    if (!projectId) throw new Error('No se ha proporcionado un ID de proyecto.');

    // --- Lógica del Análisis ---
    const serperResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': USER_SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: keyword })
    });

    if (!serperResponse.ok) throw new Error('Error al llamar a la API de Serper.');
    const serperData = await serperResponse.json();
    const searchContext = serperData.organic?.slice(0, 5).map(r => `Título: ${r.title}\nDescripción: ${r.snippet}`).join('\n---\n');

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${USER_GEMINI_API_KEY}`;
    const prompt = `Analiza si el siguiente texto de un artículo cubre de forma relevante los temas principales extraídos de los primeros resultados de búsqueda de Google. Contexto de Búsqueda de Google: --- ${searchContext} --- Texto del Artículo a Analizar: --- ${articleText} --- Basado en el análisis, devuelve ÚNICAMENTE un objeto JSON válido con el siguiente formato y nada más: { "coverage": <un número de 0 a 100>, "unansweredQuestions": [ "<pregunta 1>", "<pregunta 2>", "<pregunta 3>" ] }`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    if (!geminiResponse.ok) throw new Error('Error al llamar a la API de Gemini.');
    const geminiData = await geminiResponse.json();
    const jsonResponseText = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    const analysisResult = JSON.parse(jsonResponseText);
    
    // --- NUEVO: Lógica para Guardar el Resultado ---
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { error: insertError } = await supabaseAdmin.from('analysis_results').insert({
      project_id: projectId,
      module_key: 'structure',
      results_data: analysisResult
    });

    if (insertError) {
      console.error('Error al guardar el resultado en Supabase:', insertError);
    }
    // --- FIN DE LA LÓGICA DE GUARDADO ---

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(analysisResult),
    };

  } catch (err) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};