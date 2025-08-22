// api/structure.js (Versión Final con Log de Actividad)

const { createClient } = require('@supabase/supabase-js');

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
    const { keyword, articleText, projectId } = request.body;
    if (!keyword || !articleText || !projectId) {
      throw new Error('Faltan datos requeridos (keyword, articleText, o projectId).');
    }

    // --- Autenticación ---
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('Se requiere un token de autenticación válido.');
    const token = authHeader.split(' ')[1];
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Autenticación fallida.');
    const { data: profile, error: profileError } = await supabase.from('profiles').select('serper_api_key, gemini_api_key').single();
    if (profileError) throw new Error('No se pudo encontrar el perfil del usuario.');
    if (!profile.serper_api_key || !profile.gemini_api_key) throw new Error('El usuario debe configurar sus claves de Serper y Gemini.');
    const { serper_api_key, gemini_api_key } = profile;
    // --- Fin Autenticación ---

    activityLog.push(`Iniciando análisis de relevancia para la keyword: "${keyword}"`);

    // Paso 1: Obtener contexto de la SERP
    activityLog.push("Paso 1/2: Obteniendo contexto de la SERP (vía Serper)...");
    const serperResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serper_api_key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: keyword })
    });
    if (!serperResponse.ok) throw new Error('Error al llamar a la API de Serper.');
    const serperData = await serperResponse.json();
    const searchContext = serperData.organic?.slice(0, 5).map(r => `Título: ${r.title}\nDescripción: ${r.snippet}`).join('\n---\n');

    // Paso 2: Analizar con IA
    activityLog.push("Paso 2/2: Analizando el texto con IA (vía Gemini)...");
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gemini_api_key}`;
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
    activityLog.push("¡Análisis completado con éxito!");

    const dataToReturn = { ...analysisResult, activityLog };

    await supabase.from('analisis_resultados').insert({
        project_id: projectId,
        module_type: 'structure',
        results_data: dataToReturn
    });

    response.status(200).json(dataToReturn);

  } catch (err) {
    response.status(401).json({ error: err.message, activityLog });
  }
}