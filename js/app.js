// js/app.js (Versión Final con Dashboard Real y corrección de bucle)

// --- 1. IMPORTACIONES DE MÓDulos ---
import { renderDashboard, renderCharts } from './components/dashboard-view.js';
import { renderProjectsView } from './components/projects-view.js';
import { renderUserProfile, buildSidebarNav } from './components/sidebar.js';
import { renderAuthView } from './components/auth-view.js';
import { renderSettingsView } from './components/settings-view.js';
import { 
    renderStructureView, renderLinkingView, renderZombiesView,
    renderSchemaView, renderContentStrategyView
} from './components/tool-views.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. CONEXIÓN A SUPABASE ---
    const SUPABASE_URL = 'https://fgcnkcihoozagmgpczlj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnY25rY2lob296YWdtZ3BjemxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDA0NDksImV4cCI6MjA3MDU3NjQ0OX0.p7t5AqCbl_LZ-cjw_LS2ROd_TsttWnjjopes_MZLnCU';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 3. DATOS Y ESTADO DE LA APLICACIÓN ---
    const appState = {
        session: null, 
        userProfile: null,
        currentView: 'dashboard', 
        projects: [], 
        currentProjectId: null, 
        editingProjectId: null,
        isDropdownOpen: false, 
        isLoading: false, 
        projectSearchQuery: '', 
        moduleResults: {},
        dashboardDetailsOpen: {}, 
        isUserMenuOpen: false,
        isDeleteModalOpen: false, 
        projectToDelete: null, 
        projectActionsOpen: {},
        dashboardData: null, 
        isDeleteAccountModalOpen: false, 
    };
    
    const views = {
        'dashboard': { name: 'Dashboard', icon: 'grid-outline' },
        'projects': { name: 'Proyectos', icon: 'briefcase-outline' },
        'structure': { name: 'Estructura y Relevancia', icon: 'document-text-outline' },
        'linking': { name: 'Profundidad de Enlazado', icon: 'git-network-outline' },
        'zombie-urls': { name: 'Análisis de URLs Zombie', icon: 'walk-outline' },
        'structured-data': { name: 'Auditor de Datos Estructurados', icon: 'code-slash-outline' },
        'content-strategy': { name: 'Estrategia de Contenido', icon: 'apps-outline' }
    };

    // --- 4. REFERENCIAS A ELEMENTOS DEL DOM ---
    const mainAppContainer = document.getElementById('main-app-container');
    const authContainer = document.getElementById('auth-container');
    const mainContent = document.getElementById('main-content');
    const headerTitle = document.getElementById('header-title');
    const sidebarNav = document.getElementById('sidebar-nav');
    const projectSelectorContainer = document.getElementById('project-selector-container');
    const exportButtonContainer = document.getElementById('export-button-container');
    const userProfileContainer = document.getElementById('user-profile-container');
    const modalContainer = document.getElementById('modal-container');

    // --- 5. LÓGICA DE RENDERIZADO Y ESTADO ---
    function setState(newState, shouldRender = true) {
        Object.assign(appState, newState);
        if (shouldRender) {
            render();
        }
    }

    async function loadDashboardData() {
        if (!appState.currentProjectId) {
            setState({ dashboardData: null, isLoading: false });
            return;
        }

        appState.isLoading = true;
        appState.dashboardData = null;
        render(); 

        try {
            const token = appState.session.access_token;
            const response = await fetch('/api/get-dashboard-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ projectId: appState.currentProjectId })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error en el servidor: ${errorText}`);
            }
            const data = await response.json();
            
            // --- LÓGICA MODIFICADA ---
            // Primero actualizamos el estado con los nuevos datos
            setState({ isLoading: false, dashboardData: data });
            
            // Inmediatamente después, nos aseguramos de que los gráficos se dibujen
            setTimeout(() => renderCharts(data), 0);
            // --- FIN DE LA LÓGICA MODIFICADA ---

        } catch (error) {
            console.error(error);
            alert(`Fallo al cargar los datos del dashboard. Detalle: ${error.message}`);
            setState({ isLoading: false });
        }
    }
    
    function renderProjectSelector() {
        if (!appState.currentProjectId || appState.projects.length === 0) {
            projectSelectorContainer.innerHTML = ''; return;
        }
        const currentProject = appState.projects.find(p => p.id === appState.currentProjectId);
        if (!currentProject) {
            projectSelectorContainer.innerHTML = ''; return;
        };
        const dropdownItems = appState.projects
            .filter(p => p.id !== appState.currentProjectId)
            .map(p => `<button data-project-id="${p.id}" class="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-primary hover:text-primary-foreground rounded-md">${p.name}</button>`)
            .join('');
        const dropdownMenu = appState.isDropdownOpen ? `<div class="absolute right-0 mt-2 w-56 origin-top-right bg-card rounded-lg shadow-lg ring-1 ring-border focus:outline-none z-50"><div class="p-2"><div class="px-2 py-2 text-xs text-muted-foreground uppercase">Cambiar Proyecto</div>${dropdownItems}</div></div>` : '';
        projectSelectorContainer.innerHTML = `<button id="project-selector-btn" class="flex items-center space-x-2 bg-card px-4 py-2 rounded-lg border border-border hover:border-primary transition"><ion-icon name="briefcase-outline" class="text-primary"></ion-icon><span class="font-semibold text-foreground">${currentProject.name}</span><ion-icon name="chevron-down-outline" class="text-muted-foreground"></ion-icon></button>${dropdownMenu}`;
    }

    function renderModals() {
        let modalHTML = '';
        if (appState.isDeleteModalOpen && appState.projectToDelete) {
            const project = appState.projects.find(p => p.id === appState.projectToDelete);
            if(project) {
                modalHTML = `<div class="modal-overlay open"><div class="bg-card rounded-lg shadow-xl p-6 w-full max-w-md border border-border"><h3 class="text-lg font-bold text-destructive flex items-center gap-2"><ion-icon name="warning-outline"></ion-icon>Confirmar Eliminación</h3><p class="text-muted-foreground mt-2">¿Estás seguro de que quieres eliminar el proyecto <strong class="text-foreground">${project.name}</strong>? Esta acción no se puede deshacer.</p><div class="mt-6 flex justify-end gap-3"><button id="cancel-delete-btn" class="bg-muted text-foreground px-4 py-2 rounded-md hover:opacity-80">Cancelar</button><button id="confirm-delete-btn" class="bg-destructive text-primary-foreground px-4 py-2 rounded-md hover:opacity-80">Confirmar Borrado</button></div></div></div>`;
            }
        } else if (appState.isDeleteAccountModalOpen) {
            modalHTML = `<div class="modal-overlay open"><div class="bg-card rounded-lg shadow-xl p-6 w-full max-w-md border border-destructive"><h3 class="text-lg font-bold text-destructive flex items-center gap-2"><ion-icon name="warning-outline"></ion-icon>¿Estás absolutamente seguro?</h3><p class="text-muted-foreground mt-2">Esta acción es irreversible. Se eliminarán permanentemente tu cuenta, perfil, proyectos y todos los análisis asociados. Esta información no podrá ser recuperada.</p><p class="mt-4 text-muted-foreground">Por favor, escribe <strong class="text-foreground">${appState.session.user.email}</strong> para confirmar.</p><input id="delete-confirm-input" type="text" class="w-full bg-background border border-border rounded-md px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-destructive"><div class="mt-6 flex justify-end gap-3"><button id="cancel-delete-account-btn" class="bg-muted text-foreground px-4 py-2 rounded-md hover:opacity-80">Cancelar</button><button id="confirm-delete-account-btn" class="bg-destructive text-primary-foreground px-4 py-2 rounded-md hover:opacity-80 opacity-50 cursor-not-allowed" disabled>Borrado Definitivo</button></div></div></div>`;
        }
        modalContainer.innerHTML = modalHTML;
    }
    
    function updateActiveNav() {
        sidebarNav.querySelectorAll('button').forEach(link => {
            const isActive = link.dataset.view === appState.currentView;
            link.classList.toggle('bg-primary', isActive);
            link.classList.toggle('text-primary-foreground', isActive);
            link.classList.toggle('text-muted-foreground', !isActive);
            link.classList.toggle('hover:bg-muted', !isActive);
        });
    }

    function render() {
        if (!appState.session) {
            mainAppContainer.classList.add('hidden');
            authContainer.classList.remove('hidden');
            authContainer.innerHTML = renderAuthView();
        } else {
            mainAppContainer.classList.remove('hidden');
            authContainer.classList.add('hidden');
            
            const viewMap = {
                'dashboard': () => renderDashboard(appState, appState.dashboardData),
                'projects': () => renderProjectsView(appState),
                'settings': () => renderSettingsView(appState, appState.userProfile),
                'structure': () => renderStructureView(appState),
                'linking': () => renderLinkingView(appState),
                'zombie-urls': () => renderZombiesView(appState),
                'structured-data': () => renderSchemaView(appState),
                'content-strategy': () => renderContentStrategyView(appState),
            };
            const renderFunction = viewMap[appState.currentView] || (() => `<div class="p-4 bg-card rounded-lg">Vista no encontrada.</div>`);
            
            const userProfileData = {
                email: appState.session.user.email,
                name: appState.userProfile?.full_name || appState.session.user.email,
                avatar_url: appState.userProfile?.avatar_url
            };
            mainContent.innerHTML = renderFunction();
            renderUserProfile(userProfileContainer, appState, userProfileData);
            renderModals();
            // --- LÓGICA DE RENDERIZADO DE GRÁFICOS CORREGIDA ---
            if (appState.currentView === 'dashboard') {
                exportButtonContainer.innerHTML = `<button id="export-pdf-btn" class="bg-primary hover:opacity-90 text-primary-foreground font-semibold px-4 py-2 rounded-md flex items-center gap-2"><ion-icon name="download-outline"></ion-icon> Exportar</button>`;
                
                // Si estamos en el dashboard y los datos existen, nos aseguramos de que los gráficos se dibujen.
                if (appState.dashboardData) {
                    // Usamos setTimeout para asegurar que el DOM se haya actualizado antes de dibujar.
                    setTimeout(() => renderCharts(appState.dashboardData), 0);
                }
            } else { 
                exportButtonContainer.innerHTML = ''; 
            }
            // --- FIN DE LA LÓGICA DE RENDERIZADO DE GRÁFICOS CORREGIDA ---

            headerTitle.textContent = views[appState.currentView]?.name || 'Fundamentos SEO';
            renderProjectSelector();
            updateActiveNav();
            appState.lastRenderedView = appState.currentView;
        }
    }

    // --- 6. EVENT LISTENERS ---
    function setupEventListeners() {
        sidebarNav.addEventListener('click', e => {
            const link = e.target.closest('button[data-view]');
            if (link) {
                const newView = link.dataset.view;
                if (newView !== appState.currentView) {
                    setState({ currentView: newView, moduleResults: {}, dashboardDetailsOpen: {} }, false); // No renderizamos aún
                    if (newView === 'dashboard') {
                        loadDashboardData(); // Esta función se encargará del renderizado
                    } else {
                        render(); // Renderizamos para las otras vistas
                    }
                }
            }
        });

        projectSelectorContainer.addEventListener('click', e => {
            e.stopPropagation();
            const button = e.target.closest('button');
            if (!button) return;
            if (button.id === 'project-selector-btn') {
                setState({ isDropdownOpen: !appState.isDropdownOpen });
            } else if (button.dataset.projectId) {
                const newProjectId = parseInt(button.dataset.projectId);
                if (newProjectId !== appState.currentProjectId) {
                    setState({ currentProjectId: newProjectId, isDropdownOpen: false, currentView: 'dashboard' }, false);
                    loadDashboardData();
                } else {
                    setState({ isDropdownOpen: false });
                }
            }
        });

        userProfileContainer.addEventListener('click', e => {
            const profileButton = e.target.closest('#user-profile-btn');
            const logoutButton = e.target.closest('#logout-btn');
            const settingsButton = e.target.closest('#open-settings-btn');

            if (profileButton) { e.stopPropagation(); setState({ isUserMenuOpen: !appState.isUserMenuOpen }); }
            if (logoutButton) supabaseClient.auth.signOut();
            if (settingsButton) setState({ currentView: 'settings', isUserMenuOpen: false });
        });      

        mainContent.addEventListener('click', async (e) => {
            const resetButton = e.target.closest('#reset-password-btn');
            const deleteAccountBtn = e.target.closest('#delete-account-btn');
            const actionButton = e.target.closest('button[data-project-action-id]');
            const editButton = e.target.closest('button[data-edit-project-id]');
            const cancelButton = e.target.closest('button[data-cancel-edit-id]');
            const deleteButton = e.target.closest('button[data-delete-project-id]');
            const dashboardButton = e.target.closest('button[data-module-key]');
            const moduleButton = e.target.closest('button[data-module]');
            const exportLinkingBtn = e.target.closest('#export-linking-csv');
            const copyQuestionsBtn = e.target.closest('#copy-questions-btn');
            const exportStrategyBtn = e.target.closest('#export-strategy-btn');

            if (resetButton) {
                resetButton.disabled = true;
                resetButton.textContent = 'Enviando...';
                const { error } = await supabaseClient.auth.resetPasswordForEmail(appState.session.user.email, {
                    redirectTo: window.location.origin,
                });
                if (error) {
                    alert('Error al enviar el enlace: ' + error.message);
                } else {
                    alert('¡Enlace enviado! Revisa tu correo electrónico.');
                }
                resetButton.disabled = false;
                resetButton.textContent = 'Enviar Enlace';
            } else if (deleteAccountBtn) {
                setState({ isDeleteAccountModalOpen: true });
            } else if (actionButton) {
                const projectId = parseInt(actionButton.dataset.projectActionId);
                setState({ projectActionsOpen: { [projectId]: !appState.projectActionsOpen[projectId] } });
            } else if (editButton) {
                const projectId = parseInt(editButton.dataset.editProjectId);
                setState({ editingProjectId: projectId, projectActionsOpen: {} });
            } else if (cancelButton) {
                setState({ editingProjectId: null });
            } else if (deleteButton) {
                const projectId = parseInt(deleteButton.dataset.deleteProjectId);
                setState({ isDeleteModalOpen: true, projectToDelete: projectId, projectActionsOpen: {} });
            } else if (dashboardButton) {
                const key = dashboardButton.dataset.moduleKey;
                setState({ dashboardDetailsOpen: { ...appState.dashboardDetailsOpen, [key]: !appState.dashboardDetailsOpen[key] } });
            } else if (moduleButton && !appState.isLoading) {
                const moduleKey = moduleButton.dataset.module;
                const token = appState.session.access_token;
                let payload = {};
                const currentProject = appState.projects.find(p => p.id === appState.currentProjectId);

                if (moduleKey === 'content-strategy' || moduleKey === 'structured-data') {
                    if (moduleKey === 'content-strategy') {
                        const keyword = document.getElementById('content-strategy-keyword-input')?.value;
                        if (!keyword) return alert('Por favor, introduce una palabra clave.');
                        payload = { keyword, projectId: currentProject?.id };
                    } else if (moduleKey === 'structured-data') {
                                                const path = document.getElementById('schema-path-input')?.value || '';
                        if (!path.startsWith('/')) {
                            return alert('La ruta debe comenzar con una barra inclinada "/". Por ejemplo: /mi-pagina');
                        }
                        const fullUrl = `https://${currentProject.url}${path}`;
                        
                        payload = { url: fullUrl, projectId: currentProject?.id };
                    }
                } else {
                    if (!currentProject) return alert("Selecciona un proyecto para usar esta herramienta.");
                    if (moduleKey === 'linking') {
                        const startUrl = currentProject.url.startsWith('http') ? currentProject.url : `https://${currentProject.url}`;
                        const keyUrlsText = document.getElementById('linking-key-urls-input')?.value;
                        if (!keyUrlsText) return alert("Añade URLs clave.");
                        const keyUrls = keyUrlsText.split('\n').filter(url => url.trim() !== '');
                        if (keyUrls.length === 0) return alert("Introduce al menos una URL clave.");
                        payload = { startUrl, keyUrls, projectId: currentProject.id };
                    } else if (moduleKey === 'structure') {
                        const keyword = document.getElementById('structure-keyword-input')?.value;
                        const articleText = document.getElementById('structure-text-input')?.value;
                        if (!keyword || !articleText) return alert('Introduce la palabra clave y el texto.');
                        payload = { keyword, articleText, projectId: currentProject.id };
                    } else if (moduleKey === 'zombie-urls') {
                        payload = { domain: currentProject.url, projectId: currentProject.id };
                    }
                }

                setState({ isLoading: true });
                try {
                    const functionUrl = `/api/${moduleKey}`;
                    const response = await fetch(functionUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(payload)
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Hubo un error en el servidor.');
                    }
                    const data = await response.json();
                    setState({ isLoading: false, moduleResults: { [moduleKey]: data } });
                } catch (error) {
                    alert(`Error: ${error.message}`);
                    setState({ isLoading: false });
                }
            } else if (exportLinkingBtn) {
                const data = appState.moduleResults['linking'];
                if (!data || !data.crawlLog || data.crawlLog.length === 0) return;
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += "URL,Profundidad (clics)\n";
                data.crawlLog.forEach(row => { csvContent += `${row.url},${row.depth}\n`; });
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "mapa_de_rastreo_completo.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else if (copyQuestionsBtn) {
                const results = appState.moduleResults['structure'];
                if (results && results.unansweredQuestions.length > 0) {
                    const textToCopy = results.unansweredQuestions.join('\n');
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        copyQuestionsBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Copiado!';
                        setTimeout(() => { copyQuestionsBtn.innerHTML = '<ion-icon name="copy-outline"></ion-icon> Copiar'; }, 2000);
                    }).catch(err => { alert('Error al copiar el texto.'); });
                }
            } else if (exportStrategyBtn) {
                const data = appState.moduleResults['content-strategy'];
                if (!data || !data.competitors) return;
                let textContent = `Estrategia de Contenido para la Keyword: ${document.getElementById('content-strategy-keyword-input')?.value || 'N/A'}\n\n`;
                data.competitors.forEach(c => {
                    textContent += `========================================\n`;
                    textContent += `Dominio: ${c.domain}\n`;
                    textContent += `----------------------------------------\n`;
                    textContent += `Pilar de Contenido Principal:\n- ${c.contentPillar}\n\n`;
                    textContent += `Subtemas Cubiertos:\n${c.subTopics.map(t => `- ${t}`).join('\n')}\n\n`;
                    textContent += `Oportunidad de Nicho:\n- ${c.opportunity}\n`;
                    textContent += `========================================\n\n`;
                });
                const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", "estrategia_de_contenido.txt");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });

        mainContent.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const submitButton = form.querySelector('button[type="submit"]');
            const originalButtonHTML = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mx-auto"></div>';

            if (form.id === 'profile-form') {
                const fullName = form.querySelector('#full-name').value;
                const avatarUrl = form.querySelector('#avatar-url').value;
                const { data, error } = await supabaseClient.from('profiles').update({ full_name: fullName, avatar_url: avatarUrl }).eq('id', appState.session.user.id).select().single();
                if (error) alert('Error al actualizar el perfil: ' + error.message);
                else setState({ userProfile: data });
            } else if (form.id === 'api-keys-form') {
                const updates = {};
                const serperInput = form.querySelector('#serper-key');
                if (serperInput.value) updates.serper_api_key = serperInput.value;
                const scraperInput = form.querySelector('#scraperapi-key');
                if (scraperInput.value) updates.scraper_api_key = scraperInput.value;
                const geminiInput = form.querySelector('#gemini-key');
                if (geminiInput.value) updates.gemini_api_key = geminiInput.value;
                if (Object.keys(updates).length > 0) {
                    const { data, error } = await supabaseClient.from('profiles').update(updates).eq('id', appState.session.user.id).select().single();
                    if (error) {
                        alert('Error al guardar las claves: ' + error.message);
                    } else {
                        alert('¡Claves guardadas con éxito!');
                        form.reset();
                        setState({ userProfile: data });
                    }
                } else {
                    alert('No has introducido ninguna clave nueva para guardar.');
                }
            } else if (form.id === 'add-project-form') {
                const nameInput = form.querySelector('#project-name');
                const urlInput = form.querySelector('#project-url');
                const { data: newProject, error } = await supabaseClient.from('projects').insert({ name: nameInput.value, url: urlInput.value, user_id: appState.session.user.id }).select().single();
                if (error) alert('Hubo un error al guardar el proyecto.');
                else { const newProjects = [...appState.projects, newProject]; setState({ projects: newProjects, currentProjectId: newProject.id, currentView: 'dashboard' });}
                form.reset();
            } else if (form.dataset.editFormId) {
                const projectId = parseInt(form.dataset.editFormId);
                const nameInput = form.querySelector('input[name="name"]');
                const urlInput = form.querySelector('input[name="url"]');
                const { data: updatedProject, error } = await supabaseClient.from('projects').update({ name: nameInput.value, url: urlInput.value }).eq('id', projectId).select().single();
                if (error) alert('Hubo un error al actualizar el proyecto.');
                else { const updatedProjects = appState.projects.map(p => p.id === projectId ? updatedProject : p); setState({ projects: updatedProjects, editingProjectId: null }); }
            }
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHTML;
        });

        mainContent.addEventListener('input', e => {
            if (e.target.id === 'project-search-input') {
                setState({ projectSearchQuery: e.target.value });
            } else if (e.target.id === 'delete-confirm-input') {
                const confirmBtn = document.getElementById('confirm-delete-account-btn');
                if (e.target.value === appState.session.user.email) {
                    confirmBtn.disabled = false;
                    confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                } else {
                    confirmBtn.disabled = true;
                    confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
            }
        });

        modalContainer.addEventListener('click', async (e) => {
            if (e.target.closest('#cancel-delete-btn')) {
                setState({ isDeleteModalOpen: false, projectToDelete: null });
            }
            if (e.target.closest('#confirm-delete-btn')) {
                const projectIdToDelete = appState.projectToDelete;
                if (!projectIdToDelete) return;
                const { error } = await supabaseClient.from('projects').delete().eq('id', projectIdToDelete);
                if (error) alert('No se pudo borrar el proyecto.');
                else {
                    const updatedProjects = appState.projects.filter(p => p.id !== projectIdToDelete);
                    setState({
                        projects: updatedProjects, isDeleteModalOpen: false, projectToDelete: null,
                        currentProjectId: appState.currentProjectId === projectIdToDelete ? (updatedProjects[0]?.id || null) : appState.currentProjectId,
                    });
                }
            }
            if (e.target.closest('#cancel-delete-account-btn')) {
                setState({ isDeleteAccountModalOpen: false });
            }
            if (e.target.closest('#confirm-delete-account-btn') && !e.target.closest('#confirm-delete-account-btn').disabled) {
                // IMPORTANTE: Esto requiere una función RPC 'delete_user_account' en tu backend de Supabase.
                const { error } = await supabaseClient.rpc('delete_user_account'); 
                if (error) {
                    alert('Error al borrar la cuenta: ' + error.message);
                } else {
                    alert('Tu cuenta ha sido eliminada con éxito.');
                    await supabaseClient.auth.signOut();
                }
            }
        });
        
    // --- LÓGICA DE EXPORTACIÓN A PDF MEJORADA ---
        exportButtonContainer.addEventListener('click', async (e) => {
            const exportButton = e.target.closest('#export-pdf-btn');
            if (exportButton && appState.dashboardData) {
                exportButton.disabled = true;
                exportButton.innerHTML = '<ion-icon name="hourglass-outline" class="animate-spin"></ion-icon> Generando...';
                
                try {
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
                    const { modules, healthScore, contentOpportunities } = appState.dashboardData;
                    const currentProject = appState.projects.find(p => p.id === appState.currentProjectId);
                    const projectName = currentProject ? currentProject.name : 'Reporte';
                    const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                    let yPos = 60; // Posición vertical inicial

                    // --- Encabezado del PDF ---
                    pdf.setFontSize(22).setFont(undefined, 'bold');
                    pdf.text(`Reporte de Salud SEO - ${projectName}`, 40, yPos);
                    yPos += 25;
                    pdf.setFontSize(12).setFont(undefined, 'normal');
                    pdf.text(date, 40, yPos);
                    yPos += 40;

                    // --- Gráficos ---
                    if (window.healthChartInstance && window.severityChartInstance) {
                        const healthImg = window.healthChartInstance.toBase64Image();
                        const severityImg = window.severityChartInstance.toBase64Image();
                        pdf.addImage(healthImg, 'PNG', 40, yPos, 150, 150);
                        pdf.addImage(severityImg, 'PNG', 220, yPos, 335, 150);
                        
                        // --- LÓGICA AÑADIDA PARA DIBUJAR EL TEXTO DEL GRÁFICO ---
                        const chartCenterX = 40 + (150 / 2); // Coordenada X del centro del gráfico
                        const chartCenterY = yPos + (150 / 2); // Coordenada Y del centro del gráfico

                        pdf.setFontSize(30).setFont(undefined, 'bold');
                        pdf.text(`${healthScore}%`, chartCenterX, chartCenterY, { align: 'center' });
                        pdf.setFontSize(10).setFont(undefined, 'normal');
                        pdf.text('Salud', chartCenterX, chartCenterY + 15, { align: 'center' });
                        // --- FIN DE LA LÓGICA AÑADIDA ---

                        yPos += 180;
                    }

                    // --- Desglose por Módulo ---
                    pdf.setFontSize(16).setFont(undefined, 'bold');
                    pdf.text('Desglose por Módulo Técnico', 40, yPos);
                    yPos += 25;
                    
                    Object.values(modules).forEach(module => {
                        pdf.setFontSize(12).setFont(undefined, 'bold');
                        pdf.text(`${module.name}:`, 40, yPos);
                        pdf.setFont(undefined, 'normal');
                        pdf.text(`${module.health}% Salud`, 555, yPos, { align: 'right' }); // Ajustado a 555 para alinear a la derecha
                        yPos += 20;

                        if (module.issuesList.length > 0) {
                            module.issuesList.forEach(issue => {
                                pdf.setFontSize(10);
                                const issueText = `- ${issue.text}`;
                                const splitText = pdf.splitTextToSize(issueText, 515); 
                                pdf.text(splitText, 50, yPos);
                                yPos += (splitText.length * 12);
                            });
                        } else {
                            pdf.setFontSize(10).setTextColor(150); // Color gris para texto normal
                            pdf.text('- ¡Todo en orden!', 50, yPos);
                            pdf.setTextColor(0); // Restaurar a color negro
                            yPos += 15;
                        }
                        yPos += 10;
                    });
                    
                    // --- Oportunidades de Contenido ---
                    if(contentOpportunities && contentOpportunities.length > 0) {
                        // Comprobamos si el contenido cabe en la página actual
                        if (yPos > 700) { // Si estamos muy abajo, creamos nueva página
                           pdf.addPage();
                           yPos = 60;
                        }
                        pdf.setFontSize(16).setFont(undefined, 'bold');
                        pdf.text('Oportunidades de Contenido', 40, yPos);
                        yPos += 25;

                        contentOpportunities.forEach(opp => {
                            pdf.setFontSize(12).setFont(undefined, 'bold');
                            pdf.text(`Keyword: ${opp.keyword}`, 40, yPos);
                            yPos += 20;
                            
                            pdf.setFontSize(10).setFont(undefined, 'normal');
                            const opportunityText = `Sugerencia: ${opp.competitors?.[0]?.opportunity || 'N/A'}`;
                            const splitText = pdf.splitTextToSize(opportunityText, 515);
                            pdf.text(splitText, 50, yPos);
                            yPos += (splitText.length * 12) + 15;
                        });
                    }
                    
                    // --- Guardar el PDF ---
                    pdf.save(`Reporte_SEO_${projectName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);

                } catch (error) {
                    console.error("Error al generar PDF:", error);
                    alert("Hubo un error al generar el PDF.");
                } finally {
                    exportButton.disabled = false;
                    exportButton.innerHTML = '<ion-icon name="download-outline"></ion-icon> Exportar';
                }
            }
        });
    // --- FIN DE LA LÓGICA DE EXPORTACIÓN ---

        document.addEventListener('click', e => {
            if (!projectSelectorContainer.contains(e.target) && appState.isDropdownOpen) {
                setState({ isDropdownOpen: false });
            }
            if (!userProfileContainer.contains(e.target) && appState.isUserMenuOpen) {
                setState({ isUserMenuOpen: false });
            }
            const isClickInsideActionMenu = e.target.closest('.action-menu-popover') || e.target.closest('button[data-project-action-id]');
            if (!isClickInsideActionMenu && Object.keys(appState.projectActionsOpen).length > 0) {
                setState({ projectActionsOpen: {} });
            }
        });
    }

    function setupAuthEventListeners() {
        authContainer.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formId = e.target.id;
            const email = e.target.querySelector('input[type="email"]').value;
            const password = e.target.querySelector('input[type="password"]').value;
            const messageDiv = document.getElementById('auth-message');
            const submitButton = e.target.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mx-auto"></div>';

            if (formId === 'login-form') {
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) {
                    messageDiv.textContent = `Error: ${error.message}`;
                    messageDiv.className = 'text-destructive font-semibold';
                }                
                // Se mueven estas dos líneas fuera del if para que se ejecuten siempre
                submitButton.disabled = false;
                submitButton.textContent = 'Iniciar Sesión';                
            }
            else if (formId === 'register-form') {
                const termsCheckbox = e.target.querySelector('#terms-checkbox');
                
                // --- LÓGICA DE VALIDACIÓN AÑADIDA ---
                if (!termsCheckbox.checked) {
                    messageDiv.textContent = 'Debes aceptar los términos y condiciones para continuar.';
                    messageDiv.className = 'text-destructive font-semibold';
                    submitButton.disabled = false;
                    submitButton.textContent = 'Crear Cuenta';
                    return; // Detiene la ejecución
                }
                
                const fullName = e.target.querySelector('#register-name').value;
                const { error } = await supabaseClient.auth.signUp({ 
                    email, 
                    password,
                    options: { data: { full_name: fullName } }
                });
                if (error) {
                    messageDiv.textContent = `Error: ${error.message}`;
                    messageDiv.className = 'text-destructive font-semibold';
                    submitButton.disabled = false;
                    submitButton.textContent = 'Crear Cuenta';
                } else {
                    messageDiv.textContent = '¡Registro exitoso! Revisa tu email para confirmar tu cuenta.';
                    messageDiv.className = 'text-secondary font-semibold';
                }
            }
        });

        authContainer.addEventListener('click', async (e) => {
            if (e.target.id === 'forgot-password-link') {
                e.preventDefault();
                const email = window.prompt("Por favor, introduce tu dirección de email para recuperar tu contraseña:");
                if (email) {
                    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin,
                    });
                    if (error) { alert("Error: " + error.message); }
                    else { alert("Se ha enviado un enlace de recuperación a tu email."); }
                }
            }
            
            const toggleButton = e.target.closest('[data-toggle-password]');
            if (toggleButton) {
                const inputId = toggleButton.dataset.togglePassword;
                const passwordInput = document.getElementById(inputId);
                const icon = toggleButton.querySelector('ion-icon');
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text'; icon.setAttribute('name', 'eye-outline');
                } else {
                    passwordInput.type = 'password'; icon.setAttribute('name', 'eye-off-outline');
                }
            }

            const loginContainer = document.getElementById('login-form-container');
            const registerContainer = document.getElementById('register-form-container');
            if (e.target.id === 'show-register-btn') {
                loginContainer.classList.add('hidden');
                registerContainer.classList.remove('hidden');
            }
            if (e.target.id === 'show-login-btn') {
                registerContainer.classList.add('hidden');
                loginContainer.classList.remove('hidden');
            }
        });
    }

    // --- 7. INICIALIZACIÓN ---
    async function initAppForUser() {
        // --- LÓGICA SIMPLIFICADA ---
        const [projectsResponse, profileResponse] = await Promise.all([
            supabaseClient.from('projects').select('*').order('created_at', { ascending: true }),
            supabaseClient.from('profiles').select('*').single()
        ]);

        const { data: projectsFromDB, error: projectsError } = projectsResponse;
        if (projectsError) {
            // Si falla, lo guardamos en el estado para que render() lo muestre
            appState.error = "Error al cargar proyectos.";
            return; 
        }

        const { data: userProfile, error: profileError } = profileResponse;
        if (profileError) console.warn("No se pudo cargar el perfil del usuario:", profileError.message);

        // Actualizamos el estado de la aplicación con los datos cargados
        appState.projects = projectsFromDB || [];
        appState.userProfile = userProfile;
        if (projectsFromDB.length > 0 && !appState.currentProjectId) {
            appState.currentProjectId = projectsFromDB[0].id;
        }
        
        buildSidebarNav(sidebarNav, views);
    }
    
    function init() {
        const appLoader = document.getElementById('app-loader');

        // --- LÓGICA DE INICIALIZACIÓN ---
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            appState.session = session;

            if (session) {
                // Si hay sesión, primero cargamos todos los datos del usuario
                await initAppForUser();
                // Luego, si estamos en el dashboard, cargamos sus datos específicos
                if (appState.currentView === 'dashboard') {
                    await loadDashboardData(); // Esperamos a que termine
                } else {
                    render(); // Para otras vistas, solo renderizamos
                }
            } else {
                // Si no hay sesión, limpiamos y renderizamos el login
                appState.userProfile = null;
                appState.projects = [];
                appState.currentProjectId = null;
                render();
            }

            // Al final de todo, quitamos el loader principal
            if (appLoader) {
                appLoader.classList.add('hidden');
            }
        });

        setupAuthEventListeners();
        setupEventListeners();
    }

    init();
});
