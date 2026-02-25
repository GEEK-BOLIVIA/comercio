import { usuarioController } from './controllers/usuarioController.js';
import { supabase } from '../js/config/supabaseClient.js';
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. ESCUCHAR CAMBIOS DE AUTENTICACIÓN (Vital para Google + GitHub Pages)
    // Este listener detecta el token en la URL automáticamente
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Evento Auth detectado:", event);
        
        if (session) {
            // Si hay sesión, limpiamos la URL fea de Google (#access_token...)
            if (window.location.hash) {
                window.history.replaceState(null, null, window.location.pathname);
            }
            // Ejecutamos la redirección inteligente (whitelist, onboarding, etc.)
            await usuarioController.gestionarRedireccionInicial();
        }
    });

    // 2. VERIFICACIÓN INICIAL (Para cuando entras normal sin login social)
    await usuarioController.gestionarRedireccionInicial();

    // 3. REFERENCIAS A ELEMENTOS
    const btnLogin = document.getElementById('btn-login');
    const btnGoogle = document.getElementById('btn-google-auth');
    const btnFacebook = document.getElementById('btn-facebook-auth');
    const togglePass = document.getElementById('toggle-password');

    // 4. INTERACCIÓN UI: Ver/Ocultar Contraseña
    if (togglePass) {
        togglePass.addEventListener('click', () => {
            const input = document.getElementById('password');
            const icon = document.getElementById('password-icon');
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            icon.textContent = isPass ? 'visibility_off' : 'visibility';
        });
    }

    // 5. EVENTO: Login Tradicional
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const pass = document.getElementById('password').value;
            
            if (!email || !pass) {
                Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor, llena todos los campos.' });
                return;
            }
            await usuarioController.manejarLogin(email, pass);
        });
    }

    // 6. EVENTOS: Login Social
    if (btnGoogle) {
        btnGoogle.addEventListener('click', () => {
            usuarioController.manejarLoginSocial('google');
        });
    }

    if (btnFacebook) {
        btnFacebook.addEventListener('click', () => {
            usuarioController.manejarLoginSocial('facebook');
        });
    }
});