// js/components/authView.js

export function renderAuthView() {
    return `
    <div class="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div class="max-w-md w-full mx-auto">
            
            <div class="text-center mb-8">
                <img src="/assets/seo-fundamentos-logo.svg" alt="Fundamentos SEO Logo" class="h-20 w-auto mx-auto">
                <p class="text-muted-foreground mt-2">Accede a tu cuenta para gestionar tus proyectos</p>
            </div>

            <div class="bg-card border border-border rounded-lg shadow-lg p-8 glow-card">
                
                <div id="login-form-container">
                    <form id="login-form" class="space-y-6">
                        <div>
                            <label for="login-email" class="block text-sm font-bold text-muted-foreground mb-2">Email</label>
                            <input id="login-email" type="email" required autocomplete="email" class="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                        </div>
                        <div>
                            <div class="flex justify-between items-center">
                                <label for="login-password" class="block text-sm font-bold text-muted-foreground mb-2">Contraseña</label>
                                <a href="#" id="forgot-password-link" class="text-sm text-primary hover:underline">¿Olvidaste tu contraseña?</a>
                            </div>
                            <div class="relative">
                                <input id="login-password" type="password" required autocomplete="current-password" class="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                                <button type="button" data-toggle-password="login-password" class="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-primary">
                                    <ion-icon name="eye-off-outline"></ion-icon>
                                </button>
                            </div>
                        </div>
                        <button type="submit" class="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                            Iniciar Sesión
                        </button>
                    </form>
                    <p class="text-center text-sm text-muted-foreground mt-6">
                        ¿No tienes una cuenta? 
                        <button id="show-register-btn" class="font-semibold text-primary hover:underline">Regístrate aquí</button>
                    </p>
                </div>

                <div id="register-form-container" class="hidden">
                    <form id="register-form" class="space-y-6">
                        <div>
                            <label for="register-name" class="block text-sm font-bold text-muted-foreground mb-2">Nombre Completo</label>
                            <input id="register-name" type="text" required class="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                        </div>
                        <div>
                            <label for="register-email" class="block text-sm font-bold text-muted-foreground mb-2">Email</label>
                            <input id="register-email" type="email" required autocomplete="email" class="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                        </div>
                        <div>
                            <label for="register-password" class="block text-sm font-bold text-muted-foreground mb-2">Contraseña</label>
                            <div class="relative">
                                <input id="register-password" type="password" required autocomplete="new-password" placeholder="Mínimo 6 caracteres" class="w-full bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                                <button type="button" data-toggle-password="register-password" class="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-primary">
                                    <ion-icon name="eye-off-outline"></ion-icon>
                                </button>
                            </div>
                        </div>

                        <div class="flex items-start space-x-3">
                            <input id="terms-checkbox" type="checkbox" required class="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary">
                            <label for="terms-checkbox" class="text-sm text-muted-foreground">
                                He leído y acepto los 
                                <a href="/terminos-y-condiciones.html" target="_blank" class="font-medium text-primary hover:underline">Términos y Condiciones</a> 
                                y la 
                                <a href="/politica-de-privacidad.html" target="_blank" class="font-medium text-primary hover:underline">Política de Privacidad</a>.
                            </label>
                        </div>
                        <button type="submit" class="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                           Crear Cuenta
                        </button>
                    </form>
                <p class="text-center text-sm text-muted-foreground mt-6">
                        ¿Ya tienes una cuenta? 
                        <button id="show-login-btn" class="font-semibold text-primary hover:underline">Inicia sesión</button>
                    </p>
                </div>
                
                <div id="auth-message" class="mt-4 text-center text-sm"></div>
            </div>
        </div>
    </div>
    `;
}