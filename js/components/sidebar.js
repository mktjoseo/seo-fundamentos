// Le decimos a la función que ahora también recibe 'userData'
function renderUserProfile(containerElement, appState, userData) {
    const userMenu = appState.isUserMenuOpen ? `
        <div class="absolute bottom-full left-0 mb-2 w-56 bg-card border border-border rounded-lg shadow-lg z-10 p-2">
            <button id="open-settings-btn" class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2 rounded-md"><ion-icon name="settings-outline"></ion-icon> Configuración</button>
            <button id="logout-btn" class="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center gap-2 rounded-md"><ion-icon name="log-out-outline"></ion-icon> Cerrar Sesión</button>
        </div>
    ` : '';

    // Mostramos los datos del usuario real si existen, o unos por defecto si no.
    const userName = userData?.name || 'Usuario';
    const userEmail = userData?.email || 'email@example.com';

    containerElement.innerHTML = `
        <div class="relative"> ${userMenu}
            <button id="user-profile-btn" class="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-muted">
                ${userData.avatar_url 
                    ? `<img src="${userData.avatar_url}" alt="Avatar" class="w-10 h-10 rounded-full object-cover">` 
                    : `<div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><ion-icon name="person-outline" class="text-2xl text-muted-foreground"></ion-icon></div>`
                }
                <div>
                    <p class="font-semibold text-sm text-foreground">${userName}</p>
                    <p class="text-xs text-muted-foreground">${userEmail}</p>
                </div>
            </button>
        </div>
    `;
}

function buildSidebarNav(navElement, views) {
    navElement.innerHTML = Object.keys(views).map(key => `
        <button data-view="${key}" class="w-full flex items-center space-x-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 text-left text-muted-foreground hover:bg-muted">
            <ion-icon name="${views[key].icon}" class="w-5 h-5 flex-shrink-0"></ion-icon>
            <span>${views[key].name}</span>
        </button>
    `).join('');
}

export { renderUserProfile, buildSidebarNav };