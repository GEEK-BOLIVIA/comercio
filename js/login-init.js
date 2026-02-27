import { usuarioController } from './controllers/usuarioController.js';
import { supabase } from '../js/config/supabaseClient.js';

let redireccionEjecutada = false;

/**
 * Inicia el flujo de verificación de perfil y redirección.
 * Se añade try/catch para liberar la bandera en caso de error.
 */
async function iniciarFlujoAcceso() {
    if (redireccionEjecutada) return;
    
    try {
        redireccionEjecutada = true;
        console.log("Iniciando flujo de acceso único...");
        await usuarioController.gestionarRedireccionInicial();
    } catch (error) {
        console.error("Error en iniciarFlujoAcceso:", error);
        // Si falla, permitimos que el usuario intente loguearse de nuevo
        redireccionEjecutada = false; 
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. ESCUCHAR CAMBIOS DE AUTENTICACIÓN
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Evento Auth detectado:", event);
        
        // Manejamos el inicio de sesión
        if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
            
            // RETRASO DE SEGURIDAD: 
            // Esperamos 500ms para que Supabase procese el hash de la URL 
            // antes de limpiarlo. Si se limpia instantáneamente, el login falla.
            setTimeout(() => {
                if (window.location.hash) {
                    window.history.replaceState(null, null, window.location.pathname);
                    console.log("Hash de URL limpiado de forma segura.");
                }
            }, 500);

            await iniciarFlujoAcceso();
        }

        // Si el usuario cierra sesión, reseteamos la bandera para permitir nuevos inicios
        if (event === 'SIGNED_OUT') {
            redireccionEjecutada = false;
            console.log("Sesión cerrada: Bandera de redirección reseteada.");
        }
    });

    // 2. VERIFICACIÓN DE RESPALDO (Sesiones persistentes)
    const { data: { session } } = await supabase.auth.getSession();
    if (session && !redireccionEjecutada) {
        await iniciarFlujoAcceso();
    }

    // --- EVENTOS DE UI ---
    const btnLogin = document.getElementById('btn-login');
    const btnGoogle = document.getElementById('btn-google-auth');
    const togglePass = document.getElementById('toggle-password');

    // Mostrar/Ocultar Password
    if (togglePass) {
        togglePass.addEventListener('click', () => {
            const input = document.getElementById('password');
            const icon = document.getElementById('password-icon');
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            icon.textContent = isPass ? 'visibility_off' : 'visibility';
        });
    }

    // Login Tradicional
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = document.getElementById('email').value.trim();
            const pass = document.getElementById('password').value.trim();
            
            if (!email || !pass) {
                Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor ingresa correo y contraseña.' });
                return;
            }
            // Ejecutar login
            await usuarioController.manejarLogin(email, pass);
        });
    }

    // Login Social (Google)
    if (btnGoogle) {
        btnGoogle.addEventListener('click', async () => {
            // Reiniciamos bandera por si hubo un error previo
            redireccionEjecutada = false; 
            await usuarioController.manejarLoginSocial('google');
        });
    }
});