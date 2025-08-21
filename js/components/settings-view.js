// js/components/settingsView.js (VERSIÓN SIMPLIFICADA)

export function renderSettingsView(appState, userProfile) {
    if (!userProfile) {
        return `<div class="text-center py-10"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div></div>`;
    }

    const fullName = userProfile.full_name || '';

    return `
    <div class="max-w-4xl mx-auto space-y-8">
        <div>
            <h2 class="text-3xl font-bold text-foreground">Configuración de la Cuenta</h2>
            <p class="text-muted-foreground mt-2">Gestiona tu información personal.</p>
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

        </div>
    `;
}