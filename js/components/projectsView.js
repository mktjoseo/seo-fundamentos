// Le decimos a la función que recibirá 'appState'
function renderProjectsView(appState) {
    const searchQuery = appState.projectSearchQuery.toLowerCase();
    const filteredProjects = appState.projects.filter(p => p.name.toLowerCase().includes(searchQuery) || p.url.toLowerCase().includes(searchQuery));

    const projectsListHTML = filteredProjects.map(p => {
        // ¿Estamos editando este proyecto en particular?
        if (appState.editingProjectId === p.id) {
            // Si es así, dibuja el formulario de edición
            return `
            <div class="bg-card p-5 rounded-lg border-2 border-primary">
                <form data-edit-form-id="${p.id}" class="space-y-4">
                    <div>
                        <label class="text-xs text-muted-foreground">Nombre del Proyecto</label>
                        <input type="text" name="name" value="${p.name}" class="w-full bg-background border border-border rounded-md px-3 py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring">
                    </div>
                    <div>
                        <label class="text-xs text-muted-foreground">URL del Dominio</label>
                        <input type="text" name="url" value="${p.url}" class="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    </div>
                    <div class="flex justify-end gap-2">
                        <button type="button" data-cancel-edit-id="${p.id}" class="bg-muted text-foreground px-4 py-2 rounded-md hover:opacity-80">Cancelar</button>
                        <button type="submit" class="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-80">Guardar Cambios</button>
                    </div>
                </form>
            </div>
            `;
        } else {
            // Si no, dibuja la vista normal del proyecto
            return `
            <div class="bg-card p-5 rounded-lg border border-border flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="w-2 h-10 rounded-full" style="background-color: hsl(${p.id * 100}, 70%, 50%)"></div>
                    <div>
                        <p class="font-bold text-lg text-foreground">${p.name}</p>
                        <a href="http://${p.url}" target="_blank" class="text-sm text-muted-foreground hover:text-primary transition">${p.url} <ion-icon name="open-outline" class="inline-block"></ion-icon></a>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
            
                    <div class="relative">
                        <button data-project-action-id="${p.id}" class="text-muted-foreground hover:text-primary p-2 rounded-full hover:bg-muted"><ion-icon name="ellipsis-vertical"></ion-icon></button>
                        ${appState.projectActionsOpen[p.id] ? `
                        <div class="action-menu-popover">
                            <button data-edit-project-id="${p.id}" class="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"><ion-icon name="create-outline"></ion-icon> Editar</button>
                            <button data-delete-project-id="${p.id}" class="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted flex items-center gap-2"><ion-icon name="trash-outline"></ion-icon> Borrar</button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            `;
        }
    }).join('');

    return `
        <div class="space-y-10">
            <div>
                <h3 class="text-2xl font-bold mb-4">Añadir Nuevo Proyecto</h3>
                <form id="add-project-form" class="bg-card p-6 rounded-lg border border-border">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="md:col-span-2">
                            <label for="project-name" class="block text-sm font-medium text-muted-foreground mb-1">Nombre del Proyecto</label>
                            <input type="text" id="project-name" required class="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Mi Nuevo Sitio Web">
                        </div>
                         <div>
                            <label for="project-url" class="block text-sm font-medium text-muted-foreground mb-1">URL del Dominio</label>
                            <input type="text" id="project-url" required class="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring" placeholder="ejemplo.com">
                        </div>
                    </div>
                    <div class="mt-4 text-right">
                        <button type="submit" class="bg-primary hover:opacity-90 text-primary-foreground font-semibold px-6 py-2.5 rounded-md flex items-center gap-2 inline-flex">
                            <ion-icon name="add-circle-outline"></ion-icon>
                            Guardar Proyecto
                        </button>
                    </div>
                </form>
            </div>
            <div>
                <div class="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                    <h3 class="text-2xl font-bold">Tus Proyectos (${filteredProjects.length})</h3>
                    <div class="relative md:w-1/3">
                        <ion-icon name="search-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"></ion-icon>
                        <input type="text" id="project-search-input" value="${appState.projectSearchQuery}" placeholder="Buscar por nombre o URL..." class="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                    </div>
                </div>
                <div class="space-y-4">
                    ${filteredProjects.length > 0 ? projectsListHTML : `<div class="text-center py-12 bg-card rounded-lg border border-dashed border-border"><p class="text-muted-foreground">No se encontraron proyectos.</p></div>`}
                </div>
            </div>
        </div>
    `;
}
export { renderProjectsView };