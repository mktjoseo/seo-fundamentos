// js/components/settingsView.js

export function renderSettingsView(appState, userProfile) {
    // Si no tenemos los datos del perfil, mostramos un estado de carga.
    if (!userProfile) {
        return `<div class="text-center py-10"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div></div>`;
    }

    // Usamos los datos del perfil para rellenar los campos.
    const fullName = userProfile.full_name || '';
    const serperApiKey = userProfile.serper_api_key ? '••••••••••••••••' : '';
    const scraperApiKey = userProfile.scraper_api_key ? '••••••••••••••••' : '';
    const geminiApiKey = userProfile.gemini_api_key ? '••••••••••••••••' : '';

    return `
    <div class="max-w-4xl mx-auto space-y-8">
        <div>
            <h2 class="text-3xl font-bold text-foreground">Configuración de la Cuenta</h2>
            <p class="text-muted-foreground mt-2">Gestiona tu información personal y tus claves de API.</p>
        </div>

        <div class="bg-card p-6 rounded-lg border border-border">
            <h3 class="text-xl font-semibold text-foreground mb-4">Datos Personales</h3>
            <form id="profile-form" class="space-y-4">
                <div>
                    <label for="full-name" class="block text-sm font-bold text-muted-foreground mb-2">Nombre Completo</label>
                    <input type="text" id="full-name" value="${fullName}" class="w-full md:w-1/2 bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Tu nombre y apellido">
                </div>
                <div>
                    <label for="avatar-url" class="block text-sm font-bold text-muted-foreground mb-2">URL del Avatar</label>
                    <input type="text" id="avatar-url" value="${userProfile.avatar_url || ''}" class="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://ejemplo.com/tu-imagen.png">
                    <p class="text-xs text-muted-foreground mt-1">Pega la URL de una imagen cuadrada (ej. 100x100px).</p>
                </div>
                <div class="text-right">
                    <button type="submit" class="bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-md hover:opacity-90">Guardar Cambios</button>
                </div>
            </form>
        </div>

        <div class="bg-card p-6 rounded-lg border border-border">
            <h3 class="text-xl font-semibold text-foreground mb-2">Tus Claves de API (BYOK)</h3>
            <p class="text-sm text-muted-foreground mb-6">Tus claves se guardan de forma segura y nunca se exponen en el navegador. Se utilizan directamente en el servidor para realizar los análisis.</p>
            <form id="api-keys-form" class="space-y-6">
                <div>
                    <label for="serper-key" class="block text-sm font-bold text-muted-foreground mb-2">Serper API Key</label>
                    <input type="password" id="serper-key" class="w-full bg-background border border-border rounded-md px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-ring" placeholder="${serperApiKey || 'Introduce tu clave de Serper'}">
                </div>
                <div>
                    <label for="scraperapi-key" class="block text-sm font-bold text-muted-foreground mb-2">ScraperAPI Key</label>
                    <input type="password" id="scraperapi-key" class="w-full bg-background border border-border rounded-md px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-ring" placeholder="${scraperApiKey || 'Introduce tu clave de ScraperAPI'}">
                </div>
                <div>
                    <label for="gemini-key" class="block text-sm font-bold text-muted-foreground mb-2">Gemini API Key</label>
                    <input type="password" id="gemini-key" class="w-full bg-background border border-border rounded-md px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-ring" placeholder="${geminiApiKey || 'Introduce tu clave de Gemini'}">
                </div>
                <div class="text-right">
                    <button type="submit" class="bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-md hover:opacity-90">Guardar Claves</button>
                </div>
            </form>
        </div>
    </div>
    `;
}