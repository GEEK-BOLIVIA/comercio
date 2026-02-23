import { supabase } from './config/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 0. VERIFICACIÓN INICIAL: Si ya hay sesión, redirigir según el estado del perfil
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: usuarioDB } = await supabase
            .from('usuario')
            .select('id, ci')
            .eq('id', session.user.id)
            .single();

        if (usuarioDB && usuarioDB.ci) {
            window.location.href = 'administracion.html';
        } else {
            window.location.href = 'registrar-usuario.html';
        }
        return; 
    }

    const btnLogin = document.getElementById('btn-login');
    const btnGoogle = document.getElementById('btn-google-auth');
    const btnFacebook = document.getElementById('btn-facebook-auth'); // Referencia al nuevo botón
    const togglePass = document.getElementById('toggle-password');

    // 1. Ver/Ocultar Contraseña
    if (togglePass) {
        togglePass.addEventListener('click', () => {
            const input = document.getElementById('password');
            const icon = document.getElementById('password-icon');
            if (input.type === 'password') {
                input.type = 'text';
                icon.textContent = 'visibility_off';
            } else {
                input.type = 'password';
                icon.textContent = 'visibility';
            }
        });
    }

    // 2. Ejecutar Login Tradicional (Email/Password)
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const pass = document.getElementById('password').value;
            
            if (!email || !pass) {
                Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor, llena todos los campos.' });
                return;
            }

            const respuesta = await window.usuarioController.manejarLogin(email, pass);
            
            if (!respuesta.exito) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de acceso',
                    text: respuesta.mensaje
                });
            }
        });
    }

    // 3. Ejecutar Login con Google
    if (btnGoogle) {
        btnGoogle.addEventListener('click', async () => {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + window.location.pathname 
                }
            });

            if (error) {
                Swal.fire({ icon: 'error', title: 'Error con Google', text: error.message });
            }
        });
    }

    // 4. Ejecutar Login con Facebook
    if (btnFacebook) {
        btnFacebook.addEventListener('click', async () => {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'facebook',
                options: {
                    // Al regresar, el "Paso 0" detectará la sesión y decidirá la ruta
                    redirectTo: window.location.origin + window.location.pathname 
                }
            });

            if (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error con Facebook',
                    text: error.message
                });
            }
        });
    }
});