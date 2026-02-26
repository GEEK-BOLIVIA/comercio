import { usuarioController } from './controllers/usuarioController.js';
import { supabase } from '../js/config/supabaseClient.js';

// Bandera para evitar que la redirección se ejecute dos veces (previene el parpadeo)
let redireccionEjecutada = false;

async function iniciarFlujoAcceso() {
    if (redireccionEjecutada) return;
    redireccionEjecutada = true;
    
    console.log("Iniciando flujo de acceso único...");
    await usuarioController.gestionarRedireccionInicial();
}

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. ESCUCHAR CAMBIOS DE AUTENTICACIÓN
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Evento Auth detectado:", event);
        
        // INITIAL_SESSION ocurre al cargar, SIGNED_IN ocurre al volver de Google
        if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
            if (window.location.hash) {
                // Limpiar hash antes de disparar la lógica
                window.history.replaceState(null, null, window.location.pathname);
            }
            await iniciarFlujoAcceso();
        }
    });

    // 2. VERIFICACIÓN DE RESPALDO
    // Si la sesión ya existía y el evento no saltó a tiempo
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await iniciarFlujoAcceso();
    }

    // --- EL RESTO DE TUS EVENTOS SIGUE IGUAL ---
    const btnLogin = document.getElementById('btn-login');
    const btnGoogle = document.getElementById('btn-google-auth');
    const togglePass = document.getElementById('toggle-password');

    if (togglePass) {
        togglePass.addEventListener('click', () => {
            const input = document.getElementById('password');
            const icon = document.getElementById('password-icon');
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            icon.textContent = isPass ? 'visibility_off' : 'visibility';
        });
    }

    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const pass = document.getElementById('password').value;
            if (!email || !pass) {
                Swal.fire({ icon: 'warning', title: 'Campos incompletos' });
                return;
            }
            await usuarioController.manejarLogin(email, pass);
        });
    }

    if (btnGoogle) {
        btnGoogle.addEventListener('click', () => {
            usuarioController.manejarLoginSocial('google');
        });
    }
});