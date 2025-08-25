// js/components/settings-view.js (VERSIÓN FINAL CON ZONA DE PELIGRO E INFO TOOLTIPS)

export function renderSettingsView(appState, userProfile) {
    if (!userProfile) {
        return `<div class="text-center py-10"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div></div>`;
    }

    const fullName = userProfile.full_name || '';
    const avatarUrl = userProfile.avatar_url || '';

    const renderKeyStatus = (key) => {
        if (key) {
            return `<span class="text-xs font-medium bg-secondary/20 text-secondary px-2 py-1 rounded-full">Guardada</span>`;
        }
        return `<span class="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">No configurada</span>`;
    };

    return `
    <div class="max-w-4xl mx-auto space-y-10">
        <div>
            <h2 class="text-3xl font-bold text-foreground">Configuración de la Cuenta</h2>
            <p class="text-muted-foreground mt-2">Gestiona tu información personal, claves de API y seguridad de la cuenta.</p>
        </div>

        {/* ... (La sección de Datos Personales no cambia) ... */}
        <div class="bg-card p-6 rounded-lg border border-border">
             <h3 class="text-xl font-semibold text-foreground mb-4">Datos Personales</h3>
             <form id="profile-form" class="space-y-4">
                 <div>
                     <label for="full-name" class="block text-sm font-bold text-muted-foreground mb-2">Nombre Completo</label>
                     <input type="text" id="full-name" value="${fullName}" class="w-full md:w-1/2 bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Tu nombre y apellido">
                 </div>
                 <div>
                     <label for="avatar-url" class="block text-sm font-bold text-muted-foreground mb-2">URL del Avatar</label>
                     <input type="text" id="avatar-url" value="${avatarUrl}" class="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://ejemplo.com/tu-imagen.png">
                     <p class="text-xs text-muted-foreground mt-1">Pega la URL de una imagen cuadrada (ej. 100x100px).</p>
                 </div>
                 <div class="text-right pt-2">
                     <button type="submit" class="bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-md hover:opacity-90">Guardar Cambios</button>
                 </div>
             </form>
        </div>

        <div class="bg-card p-6 rounded-lg border border-border">
            <div class="flex items-center gap-2 mb-1">
                <h3 class="text-xl font-semibold text-foreground">Gestión de Claves API</h3>
                <div class="tooltip">
                    <ion-icon name="information-circle-outline" class="text-muted-foreground text-xl cursor-pointer"></ion-icon>
                    <span class="tooltip-text">
                        Tus claves se cifran y almacenan de forma segura en la base de datos. Nadie, ni siquiera nosotros, tiene acceso a ellas. La aplicación las utiliza únicamente para comunicarse con los servicios de terceros en tu nombre.
                    </span>
                </div>
            </div>
            <p class="text-muted-foreground text-sm mb-6">Tus claves no se volverán a mostrar. Si necesitas cambiarlas, simplemente introduce una nueva.</p>
            <form id="api-keys-form" class="space-y-6">
                
                 <div class="grid grid-cols-3 items-center gap-4">
                     <label for="serper-key" class="col-span-1 text-sm font-bold text-muted-foreground">Serper API Key</label>
                     <div class="col-span-2 relative">
                         <input type="password" id="serper-key" class="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring font-mono" placeholder="Introduce tu clave de Serper...">
                         <div class="absolute right-3 top-1/2 -translate-y-1/2">${renderKeyStatus(userProfile.serper_api_key)}</div>
                     </div>
                 </div>
                 <div class="grid grid-cols-3 items-center gap-4">
                    <label for="scraperapi-key" class="col-span-1 text-sm font-bold text-muted-foreground">ScraperAPI Key</label>
                    <div class="col-span-2 relative">
                        <input type="password" id="scraperapi-key" class="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring font-mono" placeholder="Introduce tu clave de ScraperAPI...">
                         <div class="absolute right-3 top-1/2 -translate-y-1/2">${renderKeyStatus(userProfile.scraper_api_key)}</div>
                    </div>
                </div>
                 <div class="grid grid-cols-3 items-center gap-4">
                    <label for="gemini-key" class="col-span-1 text-sm font-bold text-muted-foreground">Gemini API Key</label>
                    <div class="col-span-2 relative">
                        <input type="password" id="gemini-key" class="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring font-mono" placeholder="Introduce tu clave de Gemini...">
                         <div class="absolute right-3 top-1/2 -translate-y-1/2">${renderKeyStatus(userProfile.gemini_api_key)}</div>
                    </div>
                </div>
                <div class="text-right pt-2 border-t border-border">
                    <button type="submit" class="bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-md hover:opacity-90">Guardar Claves API</button>
                </div>
            </form>
        </div>
        
        <div class="bg-card p-6 rounded-lg border border-border">
             <h3 class="text-xl font-semibold text-foreground mb-4">Seguridad</h3>
             <div class="flex justify-between items-center">
                <div>
                    <p class="font-medium text-foreground">Cambiar contraseña</p>
                    <p class="text-sm text-muted-foreground">Se te enviará un enlace a tu email para que puedas reestablecer tu contraseña.</p>
                </div>
                <button id="reset-password-btn" class="bg-secondary text-secondary-foreground font-semibold px-5 py-2 rounded-md hover:opacity-90 whitespace-nowrap">Enviar Enlace</button>
             </div>
        </div>

        <div class="bg-card p-6 rounded-lg border border-destructive">
            <div class="flex items-center gap-2 mb-4">
                 <h3 class="text-xl font-semibold text-destructive">Zona de Peligro</h3>
                 <div class="tooltip">
                    <ion-icon name="information-circle-outline" class="text-muted-foreground text-xl cursor-pointer"></ion-icon>
                    <span class="tooltip-text">
                        Esta acción es irreversible. Se eliminarán permanentemente tu cuenta, perfil, proyectos y todos los análisis asociados. Esta información no podrá ser recuperada por nadie.
                    </span>
                </div>
            </div>
            <div class="flex justify-between items-center">
                 <div>
                    <p class="font-medium text-foreground">Borrar esta cuenta</p>
                    <p class="text-sm text-muted-foreground">Una vez que borres tu cuenta, no hay vuelta atrás. Por favor, ten la certeza.</p>
                </div>
                <button id="delete-account-btn" class="bg-destructive text-destructive-foreground font-semibold px-5 py-2 rounded-md hover:opacity-80 whitespace-nowrap">Borrar Cuenta</button>
             </div>
        </div>
    </div>
    `;
}