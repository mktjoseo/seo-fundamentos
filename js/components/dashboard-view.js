// dashboardView.js file
// Le decimos a las funciones que recibirán 'appState' y 'projectDetails' como parámetros.
function renderDashboard(appState, projectDetails) {
    if (!projectDetails) return `<div class="bg-card p-6 rounded-lg border border-border text-center text-muted-foreground">No hay datos de detalle para este proyecto.</div>`;

    const modulesHTML = Object.entries(projectDetails.modules).map(([key, module]) => {
        const isOpen = appState.dashboardDetailsOpen[key];
        const severityColors = { high: 'bg-destructive', medium: 'bg-accent', low: 'bg-primary' };
        const detailContent = `
            <div class="collapse-content ${isOpen ? 'open' : ''}">
                <div class="border-t border-border mt-4 pt-4 space-y-2">
                    ${module.issuesList.length > 0 ? module.issuesList.map(issue => `
                        <div class="flex items-start gap-3 text-sm"><div class="w-2 h-2 ${severityColors[issue.severity]} rounded-full mt-1.5 flex-shrink-0"></div><p class="text-muted-foreground">${issue.text}</p></div>`).join('') : '<p class="text-sm text-muted-foreground">¡Todo en orden!</p>'}
                </div>
            </div>`;

        return `
            <div class="bg-card p-4 rounded-lg border border-border">
                <button data-module-key="${key}" class="w-full flex items-center justify-between text-left">
                    <div class="flex items-center gap-4"><div class="w-2 h-10 rounded-full ${'bg-'+module.status}"></div><div><p class="font-semibold text-foreground">${module.name}</p><p class="text-sm text-muted-foreground">${module.issuesCount} problemas</p></div></div>
                    <div class="flex items-center gap-4"><div class="text-2xl font-bold ${'text-'+module.status}">${module.health}%</div><ion-icon name="chevron-down-outline" class="transition-transform ${isOpen ? 'rotate-180' : ''} text-muted-foreground"></ion-icon></div>
                </button>
                ${detailContent}
            </div>`;
    }).join('');
    
    return `
        <div id="dashboard-report">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div class="lg:col-span-1 bg-card p-6 rounded-lg border border-border flex flex-col justify-center items-center">
                    <div class="relative w-48 h-48">
                        <canvas id="health-chart"></canvas>
                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                            <span class="text-4xl font-bold text-foreground">${projectDetails.healthScore}%</span>
                            <span class="text-sm text-muted-foreground">Salud</span>
                        </div>
                    </div>
                </div>
                <div class="lg:col-span-2 bg-card p-6 rounded-lg border border-border">
                    <h4 class="font-semibold mb-4 text-foreground">Problemas por Severidad</h4>
                    <canvas id="severity-chart"></canvas>
                </div>
            </div>
            <h3 class="text-xl font-bold mb-4 text-foreground">Desglose por Módulo</h3>
            <div class="space-y-4">${modulesHTML}</div>
        </div>`;
}

function renderCharts(projectDetails) {
    // Usamos la variable global 'Chart' de la librería que cargamos en index.html
    const healthChartCtx = document.getElementById('health-chart')?.getContext('2d');
    const severityChartCtx = document.getElementById('severity-chart')?.getContext('2d');

    if (window.healthChartInstance) window.healthChartInstance.destroy();
    if (window.severityChartInstance) window.severityChartInstance.destroy();

    if (healthChartCtx && projectDetails) {
        window.healthChartInstance = new Chart(healthChartCtx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [projectDetails.healthScore, 100 - projectDetails.healthScore],
                    backgroundColor: [getComputedStyle(document.documentElement).getPropertyValue('--primary'), getComputedStyle(document.documentElement).getPropertyValue('--muted')],
                    borderWidth: 0,
                    borderRadius: 5,
                }]
            },
            options: { responsive: true, cutout: '80%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    }
    if (severityChartCtx && projectDetails) {
        window.severityChartInstance = new Chart(severityChartCtx, {
            type: 'bar',
            data: {
                labels: ['Alta', 'Media', 'Baja'],
                datasets: [{
                    label: 'Nº de Problemas',
                    data: [projectDetails.issuesBySeverity.high, projectDetails.issuesBySeverity.medium, projectDetails.issuesBySeverity.low],
                    backgroundColor: [getComputedStyle(document.documentElement).getPropertyValue('--destructive'), getComputedStyle(document.documentElement).getPropertyValue('--accent'), getComputedStyle(document.documentElement).getPropertyValue('--primary')],
                    borderRadius: 5,
                }]
            },
            options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border') } }, y: { grid: { display: false } } } }
        });
    }
}

export { renderDashboard, renderCharts };