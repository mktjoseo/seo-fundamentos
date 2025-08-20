// netlify/functions/zombieUrls.js (CORREGIDO)

const { createClient } = require('@supabase/supabase-js');

const SITEMAP_URL_REGEX = /<loc>(.*?)<\/loc>/g;

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    };
  }

  try {
    // ---- LÓGICA DE AUTENTICACIÓN CORREGIDA ----
    // 1. Obtenemos el token (la "pulsera") que nos envía el frontend
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Se requiere un token de autenticación válido.');
    }
    const token = authHeader.split(' ')[1];

    // 2. Creamos un cliente de Supabase que actúa en nombre del usuario
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    
    // 3. Verificamos la validez del token obteniendo los datos del usuario.
    // Si el token es inválido, esta línea fallará y nos protegerá.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Autenticación fallida: no se pudo verificar al usuario.');
    
    // 4. Obtenemos las claves del perfil del usuario
    const { data: profile, error: profileError } = await supabase.from('profiles').select('serper_api_key').single();
    if (profileError) throw new Error('No se pudo encontrar el perfil del usuario.');
    if (!profile.serper_api_key) throw new Error('El usuario no ha configurado su Serper API Key.');
    
    const USER_SERPER_API_KEY = profile.serper_api_key;
    // ---- FIN DE LA LÓGICA CORREGIDA ----

    const { domain } = JSON.parse(event.body);
    if (!domain) throw new Error('El dominio es requerido.');

    const sitemapUrl = `https://${domain}/sitemap.xml`;
    const sitemapResponse = await fetch(sitemapUrl);
    if (!sitemapResponse.ok) throw new Error(`No se pudo encontrar el sitemap en ${sitemapUrl}`);
    const sitemapText = await sitemapResponse.text();

    const urls = [...sitemapText.matchAll(SITEMAP_URL_REGEX)].map(match => match[1]);

    const checkPromises = urls.slice(0, 20).map(async (url) => {
      const serperQuery = `site:${url}`;
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': USER_SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: serperQuery })
      });
      const results = await response.json();
      if (results.organic && results.organic.length === 0) {
        return { url, status: 'No Indexada', suggestion: 'Verificar en Google Search Console.' };
      }
      return null;
    });

    const results = await Promise.all(checkPromises);
    const zombieUrls = results.filter(result => result !== null);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(zombieUrls),
    };

  } catch (err) {
    return {
      statusCode: 401, // Cambiamos a 401 para errores de autenticación
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};