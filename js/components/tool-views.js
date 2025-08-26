// js/components/tool-views.js (Versión con diseño de Consola de Proceso unificado)

// --- NUEVO: Componente reutilizable para la Consola de Proceso ---
function renderProcessConsole(logMessages) {
    if (!logMessages || logMessages.length === 0) return '';
    return `
    <div class="bg-card border border-border rounded-lg mt-8">
        <div class="flex items-center gap-2 px-4 py-2 border-b border-border">
            <div class="flex gap-1.5">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <h4 class="text-sm font-semibold text-foreground">Consola de Proceso</h4>
        </div>
        <div class="p-4 font-mono text-xs text-muted-foreground max-h-48 overflow-y-auto">
            ${logMessages.map(log => `<div><span class="text-secondary mr-2">&gt;</span>${log}</div>`).join('')}
        </div>
    </div>`;
};

function renderStructureView(appState) {
    // --- LÓGICA DEL BOTÓN MODIFICADA ---
    const buttonHTML = appState.isLoading
        ? `<button disabled class="bg-muted text-muted-foreground font-semibold px-8 py-3 rounded-md flex items-center gap-2 inline-flex cursor-not-allowed">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-muted-foreground"></div>
            Analizando...
           </button>`
        : `<button data-module="structure" class="btn-primary">
                <ion-icon name="analytics-outline"></ion-icon>
                Analizar Contenido
            </button>`;
    // --- FIN DE LA LÓGICA MODIFICADA ---

     // --- BLOQUE inputHTML MODIFICADO CON TOOLTIP Y MEJOR DESCRIPCIÓN ---
    const inputHTML = `
        <div class="flex items-center gap-2">
            <h3 class="text-2xl font-bold text-foreground">Estructura y Relevancia</h3>
            <div class="tooltip">
                <ion-icon name="information-circle-outline" class="text-muted-foreground text-xl cursor-pointer"></ion-icon>
                <span class="tooltip-text">
                    <b>¿Cómo funciona?</b><br>
                    1. Busca en Google con tu keyword (vía <b>Serper</b>).<br>
                    2. Extrae los temas clave de los 5 primeros resultados.<br>
                    3. Compara tu artículo contra esos temas usando la IA de <b>Gemini</b> para calcular una puntuación de relevancia.
                </span>
            </div>
        </div>
        <p class="text-muted-foreground mt-2">
            Asegurarse de que tu contenido responde a la "intención de búsqueda" es crucial para un buen posicionamiento. Esta herramienta te dice qué tan bien alineado está tu artículo con lo que Google considera relevante para una keyword, y te muestra qué temas te faltan por cubrir.
        </p>
        <div class="space-y-6 mt-6">
            <div>
                <label for="structure-keyword-input" class="block text-sm font-bold text-muted-foreground mb-2">Palabra Clave Objetivo</label>
                <div class="relative">
                    <ion-icon name="key-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></ion-icon>
                    <input id="structure-keyword-input" type="text"
                           class="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                           placeholder="ej: mejores lavadoras calidad-precio">
                </div>
            </div>
            <div>
                <label for="structure-text-input" class="block text-sm font-bold text-muted-foreground mb-2">Texto del Artículo</label>
                <textarea id="structure-text-input"
                          class="w-full bg-background border border-border rounded-md px-3 py-2 h-40 focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Pega aquí el texto completo de tu artículo..."></textarea>
            </div>
        </div>
        <div class="text-right mt-6">
            ${buttonHTML}
        </div>
    `;

    const resultsRenderer = (results) => `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="results-card text-center p-6">
                <h4 class="text-lg font-semibold text-foreground">Puntuación de Cobertura</h4>
                <p class="text-sm text-muted-foreground mt-1">Porcentaje de temas relevantes cubiertos.</p>
                <div class="flex justify-center items-center py-6">
                    <div class="coverage-score-circle">
                        <span>${results.coverage}%</span>
                    </div>
                </div>
            </div>
            <div class="results-card p-6">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h4 class="text-lg font-semibold text-foreground">Preguntas sin Responder</h4>
                        <p class="text-sm text-muted-foreground mt-1">Añade estas preguntas a tu contenido.</p>
                    </div>
                    ${results.unansweredQuestions.length > 0 ? `
                    <button id="copy-questions-btn" class="text-sm bg-secondary hover:opacity-90 text-secondary-foreground font-semibold px-4 py-2 rounded-md flex items-center gap-2 inline-flex">
                        <ion-icon name="copy-outline"></ion-icon>
                        Copiar
                    </button>
                    ` : ''}
                </div>
                <ul class="space-y-3">
                    ${results.unansweredQuestions.length > 0
                        ? results.unansweredQuestions.map(q => `<li class="flex items-start gap-3"><ion-icon name="add-circle-outline" class="text-secondary text-xl mt-px"></ion-icon><span class="text-foreground">${q}</span></li>`).join('')
                        : `<li class="text-muted-foreground text-sm">¡No se encontraron preguntas sin responder! Buen trabajo.</li>`
                    }
                </ul>
            </div>
        </div>
    `;

    // --- LÓGICA DE RENDERIZADO DE RESULTADOS MODIFICADA ---
    let resultsHTML = '';
    if (appState.isLoading) {
        // Durante la carga, muestra la consola de proceso si hay logs
        const logs = appState.moduleResults['structure']?.activityLog || ['Iniciando análisis...'];
        resultsHTML = renderProcessConsole(logs);
    } else if (appState.moduleResults['structure']) {
        // Cuando hay resultados, muéstralos
        resultsHTML = resultsRenderer(appState.moduleResults['structure']);
    } else {
        // Estado inicial, antes de cualquier análisis
        resultsHTML = `<div class="text-center py-12 bg-card rounded-lg border border-dashed border-border"><p class="text-muted-foreground">Los resultados de tu análisis aparecerán aquí.</p></div>`;
    }
    // --- FIN DE LA LÓGICA MODIFICADA ---

    return `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="bg-card p-6 rounded-lg border border-border">${inputHTML}</div>
            <div id="results-container">${resultsHTML}</div>
        </div>
    `;
}

function renderLinkingView(appState) {
    const currentProject = appState.projects.find(p => p.id === appState.currentProjectId);
    // --- LÓGICA PARA ELIMINAR LA BARRA FINAL ---
    let startUrl = currentProject ? (currentProject.url.startsWith('http') ? currentProject.url : `https://${currentProject.url}`) : '';
    // Si la URL termina con /, la eliminamos para la visualización
    if (startUrl.endsWith('/')) {
        startUrl = startUrl.slice(0, -1);
    }

    // --- LÓGICA DEL BOTÓN AÑADIDA ---
    const buttonHTML = appState.isLoading
        ? `<button disabled class="bg-muted text-muted-foreground font-semibold px-8 py-3 rounded-md flex items-center gap-2 inline-flex cursor-not-allowed">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-muted-foreground"></div>
            Calculando...
           </button>`
        : `<button data-module="linking" class="btn-primary">Calcular Profundidad</button>`;
    

    // --- BLOQUE inputHTML MODIFICADO CON TOOLTIP Y MEJOR DESCRIPCIÓN ---
    const inputHTML = `
        <div class="flex items-center gap-2">
            <h3 class="text-2xl font-bold text-foreground">Profundidad de Enlazado</h3>
            <div class="tooltip">
                <ion-icon name="information-circle-outline" class="text-muted-foreground text-xl cursor-pointer"></ion-icon>
                <span class="tooltip-text">
                    <b>¿Cómo funciona?</b><br>
                    1. Inicia un rastreo desde tu página de inicio.<br>
                    2. Sigue todos los enlaces internos usando <b>ScraperAPI</b> para mapear tu sitio.<br>
                    3. Calcula la ruta de clics más corta hasta las URLs clave que especificaste.
                </span>
            </div>
        </div>
        <p class="text-muted-foreground mt-2">
            Las páginas más importantes de tu sitio deben ser fácilmente accesibles para los usuarios y los motores de búsqueda. Una "profundidad" alta (muchos clics) puede indicar a Google que una página es menos importante, afectando su rastreo y posicionamiento. Lo ideal es que tus páginas clave no estén a más de 3 clics de la home.
        </p>
        <div class="mt-6 space-y-4">
            <div>
                <label class="block text-sm font-bold text-muted-foreground mb-2">Página de Inicio (Punto de Partida)</label>
                <input type="text" class="w-full bg-muted border border-border rounded-md px-3 py-2" value="${startUrl}" disabled>
            </div>
            <div>
                <label for="linking-key-urls-input" class="block text-sm font-bold text-muted-foreground mb-2">Lista de URLs Clave a Encontrar (una por línea)</label>
                <textarea id="linking-key-urls-input" class="w-full bg-background border border-border rounded-md px-3 py-2 h-32 focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm" placeholder="/productos/zapato-rojo\n/sobre-nosotros\n/contacto"></textarea>
            </div>
        </div>
        <div class="text-right mt-6">
            ${buttonHTML}
        </div>`;

    const resultsRenderer = (data) => {
        const results = data.results || [];
        const crawlLog = data.crawlLog || [];

        const exportButtonHTML = `
            <div class="text-right mb-4">
                <button id="export-linking-csv" class="text-sm bg-secondary hover:opacity-90 text-secondary-foreground font-semibold px-4 py-2 rounded-md flex items-center gap-2 inline-flex">
                    <ion-icon name="download-outline"></ion-icon>
                    Exportar a CSV
                </button>
            </div>`;
        
        const crawlLogHTML = `
            <div class="results-card mt-6">
                <h4 class="text-lg font-semibold text-foreground">Mapa de Rastreo Completo</h4>
                <p class="text-sm text-muted-foreground mt-1">${crawlLog.length} URLs encontradas. Este es el camino que siguió el crawler.</p>
                <div class="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                    ${crawlLog.map(log => `
                        <div class="grid grid-cols-3 items-center gap-4 bg-background px-4 py-2 rounded-md text-sm">
                            <span class="font-mono text-foreground col-span-2 truncate" ... >${log.url}</span>
                            <span class="font-semibold text-right text-muted-foreground">${log.depth} clics</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;

        return `
        <div class="results-card">
            ${results.length > 0 ? exportButtonHTML : ''}
            <div>
                <h4 class="text-lg font-semibold text-foreground">Resultados de Búsqueda</h4>
                <p class="text-sm text-muted-foreground mt-1">Distancia en clics desde la página de inicio para tus URLs clave.</p>
            </div>
            <div class="space-y-2 mt-4">
                ${results.map(r => `
                    <div class="grid grid-cols-3 items-center gap-4 bg-background px-4 py-3 rounded-md text-sm">
                        <span class="font-mono text-foreground col-span-2 truncate" ... >${r.url}</span>
                        <span class="font-semibold text-right ${r.isProblematic ? 'text-destructive' : 'text-foreground'}">
                            ${typeof r.depth === 'number' ? `${r.depth} clics` : r.depth}
                        </span>
                    </div>
                `).join('')}
            </div>
        </div>
        ${crawlLog.length > 0 ? crawlLogHTML : ''}
        `;
    };

    // --- LÓGICA DE RENDERIZADO DE RESULTADOS MODIFICADA ---
    const data = appState.moduleResults['linking'];
    let resultsHTML = '';
    if (appState.isLoading) {
        // Durante la carga, muestra la consola de proceso
        const logs = data?.activityLog || ['Iniciando rastreo del sitio... Esto puede tardar unos minutos.'];
        resultsHTML = renderProcessConsole(logs);
    } else if (data) {
        // Cuando hay resultados, muéstralos
        resultsHTML = resultsRenderer(data);
    } else {
        // Estado inicial, antes de cualquier análisis
        resultsHTML = `<div class="text-center py-12 bg-card rounded-lg border border-dashed border-border"><p class="text-muted-foreground">Los resultados de tu análisis aparecerán aquí.</p></div>`;
    }
    // --- FIN DE LA LÓGICA MODIFICADA ---

    return `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="bg-card p-6 rounded-lg border border-border">${inputHTML}</div>
            <div id="results-container">${resultsHTML}</div>
        </div>`;
}

function renderZombiesView(appState) {
    const currentProject = appState.projects.find(p => p.id === appState.currentProjectId);

    if (!currentProject) {
        return `<div class="text-center py-12 bg-card rounded-lg border border-dashed border-border"><ion-icon name="briefcase-outline" class="text-5xl text-muted-foreground"></ion-icon><h3 class="text-xl font-bold mt-4">No hay un proyecto seleccionado</h3><p class="text-muted-foreground mt-2">Por favor, crea o selecciona un proyecto para poder analizar sus URLs.</p><button data-view="projects" class="mt-6 bg-primary hover:opacity-90 text-primary-foreground font-semibold px-6 py-2.5 rounded-md">Ir a Proyectos</button></div>`;
    }

    // --- LÓGICA DEL BOTÓN AÑADIDA ---
    const buttonHTML = appState.isLoading
        ? `<button disabled class="bg-muted text-muted-foreground font-semibold px-8 py-3 rounded-md flex items-center gap-2 inline-flex cursor-not-allowed">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-muted-foreground"></div>
            Buscando...
           </button>`
        : `<button data-module="zombie-urls" class="btn-primary">Buscar URLs Zombie</button>`;

    // --- BLOQUE inputHTML MODIFICADO CON TOOLTIP Y MEJOR DESCRIPCIÓN ---
    const inputHTML = `
        <div class="flex items-center gap-2">
            <h3 class="text-2xl font-bold text-foreground">Análisis de URLs Zombie</h3>
            <div class="tooltip">
                <ion-icon name="information-circle-outline" class="text-muted-foreground text-xl cursor-pointer"></ion-icon>
                <span class="tooltip-text">
                    <b>¿Cómo funciona?</b><br>
                    1. Lee la lista completa de URLs de tu <b>sitemap.xml</b>.<br>
                    2. Para cada URL, realiza una búsqueda "site:tu-url" en Google vía <b>Serper</b>.<br>
                    3. Si Google no devuelve ningún resultado, la página se marca como posible "zombie".
                </span>
            </div>
        </div>
        <p class="text-muted-foreground mt-2">
            Las "URLs Zombie" son páginas que existen en tu sitio pero que Google no ha indexado. Estas páginas consumen tu presupuesto de rastreo sin aportar ningún valor SEO. Identificarlas y corregirlas (mejorándolas, redireccionándolas o eliminándolas) ayuda a Google a centrarse en el contenido que realmente importa.
        </p>
        <div class="mt-6 space-y-4">
            <div>
                <label class="block text-sm font-bold text-muted-foreground mb-2">Dominio a Analizar</label>
                <input type="text" class="w-full bg-muted border border-border rounded-md px-3 py-2" value="${currentProject.url}" disabled>
            </div>
        </div>
        <div class="text-right mt-6">
            ${buttonHTML}
        </div>`;
    
    const resultsRenderer = (data) => {
        const results = data.results || [];
        const errors = results.filter(r => r.type === 'error');
        const warnings = results.filter(r => r.type === 'warning');
        const infos = results.filter(r => r.type === 'info');

        if (errors.length > 0) {
            const error = errors[0];
            return `<div class="bg-destructive/10 border border-destructive/30 text-destructive p-6 rounded-lg"><h4 class="font-bold text-lg flex items-center gap-2"><ion-icon name="close-circle-outline"></ion-icon> Problema Crítico Encontrado</h4><p class="mt-2 font-semibold">${error.status} en la URL:</p><p class="font-mono text-sm bg-destructive/20 p-2 rounded-md mt-1">${error.url}</p><p class="mt-4 font-semibold">Recomendación:</p><p>${error.suggestion}</p></div>`;
        }
        
        const renderRow = (r) => {
            const isWarning = r.type === 'warning';
            const icon = isWarning ? 'warning-outline' : 'checkmark-circle-outline';
            const textColor = isWarning ? 'text-destructive' : 'text-secondary';
            return `<div class="grid grid-cols-1 md:grid-cols-3 items-center gap-4 bg-background p-3 rounded-md">
                        <span class="font-mono text-sm text-foreground col-span-1">${r.url}</span>
                        <div class="${textColor} font-semibold text-sm flex items-center gap-2">
                            <ion-icon name="${icon}"></ion-icon>${r.status}
                        </div>
                        <div class="text-muted-foreground text-sm">${r.suggestion}</div>
                    </div>`;
        };
        
        return `<div class="bg-card p-6 rounded-lg border border-border space-y-6"><div><h4 class="text-lg font-semibold">Diagnóstico de Indexación</h4><p class="text-sm text-muted-foreground mt-1">Se encontraron <span class="font-bold text-destructive">${warnings.length} URLs</span> con posibles problemas y <span class="font-bold text-secondary">${infos.length} archivos</span> correctamente no indexados.</p></div>${warnings.length > 0 ? `<div class="bg-muted p-4 rounded-lg"><h5 class="font-semibold text-foreground mb-2 text-destructive flex items-center gap-2"><ion-icon name="warning-outline"></ion-icon>Posibles Problemas a Revisar</h5><div class="space-y-3 mt-3">${warnings.map(renderRow).join('')}</div></div>` : ''}${infos.length > 0 ? `<div class="bg-muted p-4 rounded-lg"><h5 class="font-semibold text-foreground mb-2 text-secondary flex items-center gap-2"><ion-icon name="checkmark-done-outline"></ion-icon>Archivos de Sistema (Correcto)</h5><div class="space-y-3 mt-3">${infos.map(renderRow).join('')}</div></div>` : ''}</div>`;
    }

    // --- LÓGICA DE RENDERIZADO DE RESULTADOS MODIFICADA ---
    const data = appState.moduleResults['zombie-urls'];
    let resultsContainerHTML = '';
    
    if (appState.isLoading) {
        const logs = data?.activityLog || ['Iniciando análisis...'];
        resultsContainerHTML = renderProcessConsole(logs);
    } else if (data) {
        const consoleHTML = renderProcessConsole(data.activityLog);
        const resultsHTML = resultsRenderer(data);
        resultsContainerHTML = `${consoleHTML}<div class="mt-8">${resultsHTML}</div>`;
    } else {
        resultsContainerHTML = `<div class="text-center py-12 bg-card rounded-lg border border-dashed border-border"><p class="text-muted-foreground">Los resultados de tu análisis aparecerán aquí.</p></div>`;
    }
    // --- FIN DE LA LÓGICA MODIFICADA ---

    return `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="bg-card p-6 rounded-lg border border-border">${inputHTML}</div>
            <div id="results-container">
                ${resultsContainerHTML}
            </div>
        </div>
    `;
}

function renderSchemaView(appState) {
    
    const currentProject = appState.projects.find(p => p.id === appState.currentProjectId);
    const domainPrefix = currentProject ? `https://${currentProject.url}` : 'https://selecciona-un-proyecto';
    
    const buttonHTML = appState.isLoading
        ? `<button disabled class="bg-muted text-muted-foreground font-semibold px-8 py-3 rounded-md flex items-center gap-2 inline-flex cursor-not-allowed">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-muted-foreground"></div>
            Auditando...
           </button>`
        : `<button data-module="structured-data" class="btn-primary">Auditar Schema</button>`;

        const inputHTML = `
        <div class="flex items-center gap-2">
            <h3 class="text-2xl font-bold text-foreground">Auditor de Datos Estructurados</h3>
             <div class="tooltip">
                <ion-icon name="information-circle-outline" class="text-muted-foreground text-xl cursor-pointer"></ion-icon>
                <span class="tooltip-text">
                    <b>¿Cómo funciona?</b><br>
                    1. Extrae el código de tu URL con <b>ScraperAPI</b>.<br>
                    2. Busca y aísla el script de Schema (JSON-LD).<br>
                    3. La IA de <b>Gemini</b> valida el código en busca de errores y da recomendaciones.<br>
                    4. Revisa la competencia con <b>Serper</b> para sugerir tipos de Schema que podrías añadir.
                </span>
            </div>
        </div>
        <p class="text-muted-foreground mt-2">
            Los datos estructurados (Schema) son un código que ayuda a Google a entender de qué trata tu contenido a un nivel más profundo (ej. "esto es una receta", "esto es un producto"). Implementarlo correctamente puede hacer que tus páginas aparezcan con "fragmentos enriquecidos" (estrellas, precios, etc.) en los resultados de búsqueda, mejorando la visibilidad y el CTR.
        </p>
        <div class="mt-6 space-y-4">
            <div>
                <label for="schema-path-input" class="block text-sm font-bold text-muted-foreground mb-2">URL de la Página a Analizar</label>
                <div class="flex items-center">
                    <span class="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 border-border bg-muted text-muted-foreground text-sm">
                        ${domainPrefix}
                    </span>
                    <input id="schema-path-input" type="text"
                           class="w-full h-10 bg-background border border-border rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                           placeholder="/ruta/de/tu/pagina"
                           ${!currentProject ? 'disabled' : ''}>
                </div>
            </div>
        </div>
        <div class="text-right mt-6">
            ${buttonHTML}
        </div>`;

    const resultsRenderer = (results) => `
         <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="results-card p-6">
                <h4 class="text-lg font-semibold text-foreground mb-4">Informe de Validación</h4>
                <div class="${results.validation.status.includes('Error') ? 'bg-destructive/10 text-destructive border-destructive/30' : results.validation.status.includes('advertencias') ? 'bg-accent/10 text-accent border-accent/30' : 'bg-secondary/10 text-secondary border-secondary/30'} p-4 rounded-md border">
                    <p class="font-bold flex items-center gap-2">
                        <ion-icon name="${results.validation.status.includes('Error') ? 'close-circle-outline' : 'checkmark-circle-outline'}"></ion-icon>
                        ${results.validation.status}
                    </p>
                    
                    <ul class="list-disc list-outside ml-4 mt-2 text-sm space-y-1">
                        ${results.validation.issues.map(i => `<li><strong>${i.type}:</strong> ${i.message}</li>`).join('')}
                    </ul>
                </div>
            </div>
            <div class="results-card p-6">
                <h4 class="text-lg font-semibold text-foreground mb-4">Oportunidades vs. Competencia</h4>
                 <p class="text-sm text-muted-foreground mb-3">Tus competidores en la SERP están usando estos tipos de Schema:</p>
                    <div class="flex flex-wrap gap-2">
                    ${results.competitors.length > 0
                        ? results.competitors.map(c => `<div class="bg-secondary/20 text-secondary px-3 py-1 rounded-full text-sm font-medium">${c.type}</div>`).join('')
                        : '<p class="text-sm text-muted-foreground">No se detectaron schemas de competidores.</p>'
                    }
                    </div>
            </div>
        </div>`;

    // --- LÓGICA DE RENDERIZADO DE RESULTADOS MODIFICADA ---
    let resultsHTML = '';
    if (appState.isLoading) {
        const logs = appState.moduleResults['structured-data']?.activityLog || ['Iniciando auditoría...'];
        resultsHTML = renderProcessConsole(logs);
    } else if (appState.moduleResults['structured-data']) {
        resultsHTML = resultsRenderer(appState.moduleResults['structured-data']);
    } else {
        resultsHTML = `<div class="text-center py-12 bg-card rounded-lg border border-dashed border-border"><p class="text-muted-foreground">Los resultados de tu análisis aparecerán aquí.</p></div>`;
    }
    // --- FIN DE LA LÓGICA MODIFICADA ---

    return `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="bg-card p-6 rounded-lg border border-border">${inputHTML}</div>
            <div id="results-container">${resultsHTML}</div>
        </div>
    `;
}

function renderContentStrategyView(appState) {
    // --- LÓGICA DEL BOTÓN AÑADIDA ---
    const buttonHTML = appState.isLoading
        ? `<button disabled class="bg-muted text-muted-foreground font-semibold px-8 py-3 rounded-md flex items-center gap-2 inline-flex cursor-not-allowed">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-muted-foreground"></div>
            Analizando...
           </button>`
        : `<button data-module="content-strategy" class="btn-primary">Analizar Estrategia</button>`;

// --- BLOQUE inputHTML MODIFICADO CON TOOLTIP Y MEJOR DESCRIPCIÓN ---
    const inputHTML = `
        <div class="flex items-center gap-2">
            <h3 class="text-2xl font-bold text-foreground">Generador de Estrategia de Contenido</h3>
             <div class="tooltip">
                <ion-icon name="information-circle-outline" class="text-muted-foreground text-xl cursor-pointer"></ion-icon>
                <span class="tooltip-text">
                    <b>¿Cómo funciona?</b><br>
                    1. Identifica a tus 3 principales competidores en Google para tu keyword (vía <b>Serper</b>).<br>
                    2. Extrae el contenido relevante de sus páginas mejor posicionadas (vía <b>ScraperAPI</b>).<br>
                    3. La IA de <b>Gemini</b> analiza toda la información para definir su pilar de contenido y, lo más importante, encontrar un ángulo o nicho de oportunidad que ellos no cubren.
                </span>
            </div>
        </div>
        <p class="text-muted-foreground mt-2">
            En lugar de adivinar sobre qué escribir, esta herramienta analiza qué contenidos ya están funcionando y posicionando bien para tu keyword. Luego, usa la IA para realizar ingeniería inversa de su estrategia y encontrar "huecos" o ángulos únicos que puedes aprovechar para crear contenido superior y con mayores probabilidades de éxito.
        </p>
        <div class="mt-6">
            <label for="content-strategy-keyword-input" class="block text-sm font-bold text-muted-foreground mb-2">Palabra Clave Principal del Nicho</label>
            <div class="relative">
                <ion-icon name="search-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></ion-icon>
                <input id="content-strategy-keyword-input" type="text"
                       class="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                       placeholder="ej: guitarra eléctrica para principiantes">
            </div>
        </div>
        <div class="text-right mt-6">
            ${buttonHTML}
        </div>`;

    const resultsRenderer = (data) => {
        const results = data.competitors || [];
        
        return `
        <div>
            <div class="flex justify-between items-center mb-6">
                <h4 class="text-xl font-bold text-foreground">Análisis Estratégico de Competidores</h4>
                ${results.length > 0 ? `
                <button id="export-strategy-btn" class="text-sm bg-secondary hover:opacity-90 text-secondary-foreground font-semibold px-4 py-2 rounded-md flex items-center gap-2 inline-flex">
                    <ion-icon name="download-outline"></ion-icon>
                    Exportar
                </button>` : ''}
            </div>
            <div class="space-y-6">
            ${results.map(c => `
                <div class="results-card strategy-card overflow-hidden">
                    <div class="p-5">
                        <h5 class="font-bold text-lg text-primary">${c.domain}</h5>
                        <p class="text-sm text-muted-foreground mt-2">
                            <strong class="flex items-center gap-2">
                                <ion-icon name="trail-sign-outline"></ion-icon>
                                Pilar de Contenido Principal:
                            </strong>
                            <span class="block mt-1 pl-6">${c.contentPillar}</span>
                        </p>
                    </div>
                    <div class="p-5 border-t border-b border-border bg-muted/50">
                        <h6 class="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                            <ion-icon name="pricetags-outline"></ion-icon>
                            Subtemas Cubiertos
                        </h6>
                        <div class="flex flex-wrap gap-2">
                            ${c.subTopics.map(topic => `<span class="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">${topic}</span>`).join('')}
                        </div>
                    </div>
                    <div class="p-5 bg-secondary/10">
                         <p class="text-sm">
                            <strong class="flex items-center gap-2 mb-1 text-secondary-foreground">
                                <ion-icon name="bulb-outline" class="text-secondary text-lg"></ion-icon>
                                Oportunidad de Nicho
                            </strong>
                            <span class="block text-muted-foreground">${c.opportunity}</span>
                        </p>
                    </div>
                </div>
            `).join('')}
            </div>
        </div>`;
    }

    // --- LÓGICA DE RENDERIZADO DE RESULTADOS MODIFICADA ---
    const data = appState.moduleResults['content-strategy'];
    let resultsContainerHTML = '';
    
    if (appState.isLoading) {
        const logs = data?.activityLog || ['Iniciando análisis estratégico...'];
        resultsContainerHTML = renderProcessConsole(logs);
    } else if (data) {
        const consoleHTML = renderProcessConsole(data.activityLog);
        const resultsHTML = resultsRenderer(data);
        resultsContainerHTML = `${consoleHTML}<div class="mt-8">${resultsHTML}</div>`;
    } else {
        resultsContainerHTML = `<div class="text-center py-12 bg-card rounded-lg border border-dashed border-border"><p class="text-muted-foreground">Los resultados de tu análisis aparecerán aquí.</p></div>`;
    }
    // --- FIN DE LA LÓGICA MODIFICADA ---

    return `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="bg-card p-6 rounded-lg border border-border">${inputHTML}</div>
            <div id="results-container">
                ${resultsContainerHTML}
            </div>
        </div>`;
}

export {
    renderStructureView,
    renderLinkingView,
    renderZombiesView,
    renderSchemaView,
    renderContentStrategyView
};
