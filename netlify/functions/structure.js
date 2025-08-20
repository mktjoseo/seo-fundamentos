// netlify/functions/structure.js

const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    };
  }

  try {
    // ---- LÓGICA DE AUTENTICACIÓN ----
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
    if (userError || !user) throw new Error('Autenticación fallida: no se pudo verificar al usuario.');
    
    const { data: profile, error: profileError } = await supabase.from('profiles').select('serper_api_key, gemini_api_key').single();
    if (profileError) throw new Error('No se pudo encontrar el perfil del usuario.');
    if (!profile.serper_api_key || !profile.gemini_api_key) {
        throw new Error('El usuario debe configurar sus claves de Serper y Gemini.');
    }
    
    const USER_SERPER_API_KEY = profile.serper_api_key;
    const USER_GEMINI_API_KEY = profile.gemini_api_key;
    // ---- FIN DE LA LÓGICA ----

    const { keyword, articleText } = JSON.parse(event.body);
    if (!keyword || !articleText) throw new Error('La palabra clave y el texto del artículo son requeridos.');

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