// netlify/functions/zombieUrls.js (VERSIÓN SIMPLIFICADA)

const { createClient } = require('@supabase/supabase-js');

// La clave ahora se lee directamente del entorno de Netlify
const USER_SERPER_API_KEY = process.env.SERPER_API_KEY;

const SITEMAP_URL_REGEX = /<loc>(.*?)<\/loc>/g;

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    };
  }

  try {
    // Verificamos que el usuario esté autenticado para evitar abuso
    const { user } = context.clientContext;
    if (!user) throw new Error('Debes estar autenticado para usar esta herramienta.');
    if (!USER_SERPER_API_KEY) throw new Error('La Serper API Key no está configurada en el servidor.');

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
        headers: {
          'X-API-KEY': USER_SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
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
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};