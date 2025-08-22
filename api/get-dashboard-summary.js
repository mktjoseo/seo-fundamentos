// api/get-dashboard-summary.js (La función "cerebro" del Dashboard)

const { createClient } = require('@supabase/supabase-js');

// --- Lógica de Cálculo del Dashboard ---
// Esta sección contiene las "reglas de negocio" para interpretar los resultados de cada herramienta.

// Calcula la salud y los problemas para el módulo 'linking'
function processLinkingResults(data) {
    const issues = data.results.filter(r => r.isProblematic);
    const health = Math.max(0, 100 - (issues.length * 20)); // -20% por cada URL profunda
    return {
        health,
        issuesCount: issues.length,
        issuesList: issues.map(i => ({
            text: `La URL clave ${i.url} está a ${i.depth} clics de profundidad.`,
            severity: 'high'
        }))
    };
}

// Calcula la salud y los problemas para el módulo 'zombie-urls'
function processZombieResults(data) {
    const issues = data.zombies || [];
    const health = Math.max(0, 100 - (issues.length * 5)); // -5% por cada URL zombie
    return {
        health,
        issuesCount: issues.length,
        issuesList: issues.map(i => ({
            text: `La URL ${i.url} no está indexada en Google.`,
            severity: 'medium'
        }))
    };
}

// Calcula la salud y los problemas para el módulo 'structure'
function processStructureResults(data) {
    const health = data.coverage;
    const issues = data.unansweredQuestions || [];
    return {
        health,
        issuesCount: issues.length,
        issuesList: issues.map(i => ({
            text: `Pregunta sin responder: "${i}"`,
            severity: 'low'
        }))
    };
}

// Calcula la salud y los problemas para el módulo 'structured-data'
function processStructuredDataResults(data) {
    let health = 100;
    if (data.validation.status.includes('Error')) health = 25;
    else if (data.validation.status.includes('advertencias')) health = 75;
    
    const issues = data.validation.issues || [];
    return {
        health,
        issuesCount: issues.length,
        issuesList: issues.map(i => ({
            text: `${i.type}: ${i.message}`,
            severity: i.type.toLowerCase() === 'error' ? 'high' : 'medium'
        }))
    };
}

// --- Función Principal de Vercel ---

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
    // ---- FIN DE LA LÓGICA ----

    const { projectId } = request.body;
    if (!projectId) {
      throw new Error('Se requiere un ID de proyecto.');
    }

    // ---- OBTENER LOS ÚLTIMOS ANÁLISIS DE LA BASE DE DATOS ----
    // Esta consulta SQL usa una ventana para obtener solo la fila más reciente para cada tipo de módulo.
    const { data: latestAnalysis, error: dbError } = await supabase.rpc('get_latest_analysis_for_project', {
        p_project_id: projectId
    });
    
    if (dbError) {
      throw new Error(`Error en la base de datos: ${dbError.message}`);
    }

    // ---- PROCESAR LOS DATOS Y CONSTRUIR EL RESUMEN ----
    const dashboardData = {
        healthScore: 100,
        issuesBySeverity: { high: 0, medium: 0, low: 0 },
        modules: {
            'structure': { name: "Estructura y Relevancia", health: 100, status: "secondary", issuesCount: 0, issuesList: [] },
            'linking': { name: "Profundidad de Enlazado", health: 100, status: "secondary", issuesCount: 0, issuesList: [] },
            'zombie-urls': { name: "URLs Zombie", health: 100, status: "secondary", issuesCount: 0, issuesList: [] },
            'structured-data': { name: "Datos Estructurados", health: 100, status: "secondary", issuesCount: 0, issuesList: [] },
            'content-strategy': { name: "Estrategia de Contenido", health: 100, status: "secondary", issuesCount: 0, issuesList: [] }
        }
    };

    const processingMap = {
        'linking': processLinkingResults,
        'zombie-urls': processZombieResults,
        'structure': processStructureResults,
        'structured-data': processStructuredDataResults,
    };

    let totalHealth = 0;
    let moduleCount = 0;

    latestAnalysis.forEach(analysis => {
        const processFunction = processingMap[analysis.module_type];
        if (processFunction) {
            const processedModule = processFunction(analysis.results_data);
            
            // Actualizamos los datos del módulo
            dashboardData.modules[analysis.module_type].health = processedModule.health;
            dashboardData.modules[analysis.module_type].issuesCount = processedModule.issuesCount;
            dashboardData.modules[analysis.module_type].issuesList = processedModule.issuesList;

            // Asignamos un color de estado basado en la salud
            if (processedModule.health < 70) dashboardData.modules[analysis.module_type].status = 'destructive';
            else if (processedModule.health < 90) dashboardData.modules[analysis.module_type].status = 'accent';
            else dashboardData.modules[analysis.module_type].status = 'secondary';

            // Sumamos los problemas al contador general
            processedModule.issuesList.forEach(issue => {
                if (dashboardData.issuesBySeverity[issue.severity] !== undefined) {
                    dashboardData.issuesBySeverity[issue.severity]++;
                }
            });

            totalHealth += processedModule.health;
            moduleCount++;
        }
    });

    if (moduleCount > 0) {
        dashboardData.healthScore = Math.round(totalHealth / moduleCount);
    }

    response.status(200).json(dashboardData);

  } catch (err) {
    response.status(500).json({ error: err.message });
  }
}
