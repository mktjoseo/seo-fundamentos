// js/components/tool-views.js (Versión con data-module estandarizado a kebab-case)

function renderStructureView(appState) {
    const inputHTML = `
        <h3 class="text-2xl font-bold text-foreground">Parámetros de Análisis</h3>
        <p class="text-muted-foreground mt-2">Introduce la palabra clave principal que quieres atacar y el texto completo de tu artículo.</p>
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
            <button data-module="structure" class="bg-primary hover:opacity-90 text-primary-foreground font-semibold px-8 py-3 rounded-md flex items-center gap-2 inline-flex">
                <ion-icon name="analytics-outline"></ion-icon>
                Analizar Contenido
            </button>
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
    return `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="bg-card p-6 rounded-lg border border-border">${inputHTML}</div>
            <div id="results-container">
                ${appState.isLoading
                    ? `<div class="results-card flex items-center justify-center h-48"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>`
                    : appState.moduleResults['structure']
                        ? resultsRenderer(appState.moduleResults['structure'])
                        : `<div class="text-center py-12"><p class="text-muted-foreground">Los resultados de tu análisis aparecerán aquí.</p></div>`
                }
            </div>
        </div>
    `;
}

function renderLinkingView(appState) {
    const currentProject = appState.projects.find(p => p.id === appState.currentProjectId);
    const startUrl = currentProject ? (currentProject.url.startsWith('http') ? currentProject.url : `https://${currentProject.url}`) : '';

    const inputHTML = `
        <h3 class="text-2xl font-bold text-foreground">Análisis de Profundidad de Enlazado</h3>
        <p class="text-muted-foreground mt-2">Mide cuántos clics se necesitan para llegar a tus páginas clave desde la página de inicio.</p>
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
            <button data-module="linking" class="bg-primary hover:opacity-90 text-primary-foreground font-semibold px-6 py-2.5 rounded-md">Calcular Profundidad</button>
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
                        <div class="grid grid-cols-3 items-center gap-4 bg-background p-2 rounded-md text-sm">
                            <span class="font-mono text-foreground col-span-2 truncate" title="${log.url}">${log.url}</span>
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
                    <div class="grid grid-cols-3 items-center gap-4 bg-background p-3 rounded-md text-sm">
                        <span class="font-mono text-foreground col-span-2 truncate" title="${r.url}">${r.url}</span>
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

    const data = appState.moduleResults['linking'];
    let resultsHTML = '';
    if (appState.isLoading) {
        resultsHTML = `<div class="results-card text-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div><p class="mt-4 text-muted-foreground">Rastreando el sitio... Esto puede tardar un momento.</p></div>`;
    } else if (data) {
        resultsHTML = resultsRenderer(data);
    }

    return `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="bg-card p-6 rounded-lg border border-border">${inputHTML}</div>
            <div id="results-container">${resultsHTML}</div>
        </div>`;
}

function renderZombiesView(appState) {
    const currentProject = appState.projects.find(p => p.id === appState.currentProjectId);

    if (!currentProject) {
        return `
            <div class="text-center py-12 bg-card rounded-lg border border-dashed border-border">
                <ion-icon name="briefcase-outline" class="text-5xl text-muted-foreground"></ion-icon>
                <h3 class="text-xl font-bold mt-4">No hay un proyecto seleccionado</h3>
                <p class="text-muted-foreground mt-2">Por favor, crea o selecciona un proyecto para poder analizar sus URLs.</p>
                <button data-view="projects" class="mt-6 bg-primary hover:opacity-90 text-primary-foreground font-semibold px-6 py-2.5 rounded-md">
                    Ir a Proyectos
                </button>
            </div>
        `;
    }

    const inputHTML = `
        <h3 class="text-lg font-semibold">Análisis de URLs Zombie</h3>
        <p class="text-sm text-muted-foreground mt-1">Encuentra páginas con problemas de indexación o de bajo valor.</p>
        <div class="mt-4 space-y-4">
            <div>
                <label class="block text-sm font-medium text-muted-foreground mb-1">Dominio a Analizar</label>
                <input type="text" class="w-full bg-muted border border-border rounded-md px-3 py-2" value="${currentProject.url}" disabled>
            </div>
        </div>
        <div class="text-right mt-4">
            <button data-module="zombie-urls" class="bg-primary hover:opacity-90 text-primary-foreground font-semibold px-6 py-2 rounded-md">Buscar URLs Zombie</button>
        </div>`;
    
    const resultsRenderer = (results) => `
        <div class="bg-card p-6 rounded-lg border border-border space-y-6">
            <div>
                <h4 class="text-lg font-semibold">Diagnóstico de Indexación</h4>
                <p class="text-sm text-muted-foreground mt-1">Se encontraron <span class="font-bold text-destructive">${results.length} URLs</span> que podrían no estar aportando valor a tu SEO al no estar indexadas en Google.</p>
            </div>
             <div class="bg-muted p-4 rounded-lg">
                <h5 class="font-semibold text-foreground mb-2">Acciones Recomendadas</h5>
                <div class="space-y-3">
                ${results.map(r => `
                    <div class="grid grid-cols-1 md:grid-cols-3 items-center gap-4 bg-background p-3 rounded-md">
                        <span class="font-mono text-sm text-foreground col-span-1">${r.url}</span>
                        <div class="text-destructive font-semibold text-sm flex items-center gap-2"><ion-icon name="eye-off-outline"></ion-icon>${r.status}</div>
                        <div class="text-muted-foreground text-sm">${r.suggestion}</div>
                    </div>
                `).join('')}
                </div>
            </div>
        </div>
    `;

    return `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="bg-card p-6 rounded-lg border border-border">${inputHTML}</div>
            <div id="results-container">
                ${appState.isLoading
                    ? `<div class="results-card flex items-center justify-center h-48"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>`
                    : appState.moduleResults['zombie-urls']
                        ? resultsRenderer(appState.moduleResults['zombie-urls'])
                        : `<div class="text-center py-12"><p class="text-muted-foreground">Los resultados de tu análisis aparecerán aquí.</p></div>`
                }
            </div>
        </div>
    `;
}

function renderSchemaView(appState) {
    const inputHTML = `
        <h3 class="text-2xl font-bold text-foreground">Auditor de Datos Estructurados (Schema)</h3>
        <p class="text-muted-foreground mt-2">
            Esta herramienta inteligente valida el código Schema (JSON-LD) de una URL.
        </p>
        <div class="mt-6 space-y-4">
            <div>
                <label for="schema-url-input" class="block text-sm font-bold text-muted-foreground mb-2">URL de la Página a Analizar</label>
                <div class="relative">
                    <ion-icon name="link-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></ion-icon>
                    <input id="schema-url-input" type="text"
                           class="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                           placeholder="https://ejemplo.com/pagina-con-schema">
                </div>
            </div>
        </div>
        <div class="text-right mt-6">
            <button data-module="structured-data" class="bg-primary hover:opacity-90 text-primary-foreground font-semibold px-6 py-2.5 rounded-md">Auditar Schema</button>
        </div>`;

    const resultsRenderer = (results) => `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="results-card">
                <h4 class="text-lg font-semibold text-foreground mb-4">Informe de Validación</h4>
                <div class="${results.validation.status.includes('Error') ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-accent/10 text-accent border-accent/30'} p-4 rounded-md border">
                    <p class="font-bold flex items-center gap-2">
                        <ion-icon name="${results.validation.status.includes('Error') ? 'close-circle-outline' : 'checkmark-circle-outline'}"></ion-icon>
                        ${results.validation.status}
                    </p>
                    <ul class="list-disc list-inside mt-2 text-sm space-y-1">
                        ${results.validation.issues.map(i => `<li><strong>${i.type}:</strong> ${i.message}</li>`).join('')}
                    </ul>
                </div>
            </div>
            <div class="results-card">
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

    return `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="bg-card p-6 rounded-lg border border-border">${inputHTML}</div>
            <div id="results-container">
                ${appState.isLoading
                    ? `<div class="results-card flex items-center justify-center h-48"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>`
                    : appState.moduleResults['structured-data']
                        ? resultsRenderer(appState.moduleResults['structured-data'])
                        : `<div class="text-center py-12"><p class="text-muted-foreground">Los resultados de tu análisis aparecerán aquí.</p></div>`
                }
            </div>
        </div>
    `;
}

// js/components/tool-views.js (renderContentStrategyView actualizada para mostrar el log)

function renderContentStrategyView(appState) {
    const inputHTML = `
        <h3 class="text-2xl font-bold text-foreground">Generador de Estrategia de Contenido</h3>
        <div class="text-muted-foreground mt-2 space-y-2 text-sm">
             <p>Actúa como un estratega SEO automatizado para descubrir oportunidades de contenido únicas.</p>
        </div>
        <div class="mt-6">
            <label for="content-strategy-keyword-input" class="block text-sm font-bold text-muted-foreground mb-2">Palabra Clave Principal del Nicho</label>
            <div class="relative">
                <ion-icon name="search-circle-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></ion-icon>
                <input id="content-strategy-keyword-input" type="text"
                       class="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                       placeholder="ej: guitarra eléctrica para principiantes">
            </div>
        </div>
        <div class="text-right mt-6">
            <button data-module="content-strategy" class="bg-primary hover:opacity-90 text-primary-foreground font-semibold px-6 py-2.5 rounded-md">Analizar Estrategia</button>
        </div>`;

    const resultsRenderer = (data) => {
        const results = data.competitors || [];
        const activityLog = data.activityLog || [];

        const activityLogHTML = `
            <div class="mt-6 border-t border-border pt-4">
                <button data-module-key="content-strategy-log" class="text-sm font-semibold text-muted-foreground hover:text-primary flex items-center gap-2">
                    Ver Actividad del Análisis
                    <ion-icon name="chevron-down-outline" class="transition-transform ${appState.dashboardDetailsOpen['content-strategy-log'] ? 'rotate-180' : ''}"></ion-icon>
                </button>
                <div class="collapse-content ${appState.dashboardDetailsOpen['content-strategy-log'] ? 'open' : ''} mt-2">
                    <ul class="space-y-2 text-xs font-mono text-muted-foreground">
                        ${activityLog.map(log => `<li class="flex items-start gap-2"><ion-icon name="checkmark-done-outline" class="text-secondary flex-shrink-0 mt-px"></ion-icon><span>${log}</span></li>`).join('')}
                    </ul>
                </div>
            </div>`;

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
            ${activityLog.length > 0 ? activityLogHTML : ''}
        </div>`;
    }

    const data = appState.moduleResults['content-strategy'];
    let resultsHTML = '';
    if (appState.isLoading) {
        resultsHTML = `<div class="results-card text-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div><p class="mt-4 text-muted-foreground">Realizando análisis multi-API... Esto puede tardar hasta un minuto.</p></div>`;
    } else if (data) {
        resultsHTML = resultsRenderer(data);
    } else {
        resultsHTML = `<div class="text-center py-12"><p class="text-muted-foreground">Los resultados de tu análisis estratégico aparecerán aquí.</p></div>`;
    }

    return `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="bg-card p-6 rounded-lg border border-border">${inputHTML}</div>
            <div id="results-container">${resultsHTML}</div>
        </div>`;
}

// Exportamos todas las funciones para que app.js pueda usarlas
export {
    renderStructureView,
    renderLinkingView,
    renderZombiesView,
    renderSchemaView,
    renderContentStrategyView
};