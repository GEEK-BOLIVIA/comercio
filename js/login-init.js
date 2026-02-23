import { supabase } from './config/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 0. VERIFICACIÓN INICIAL: Si ya hay sesión, redirigir según el estado del perfil
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // Consultamos si tiene perfil completo para saber a dónde mandarlo
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
        return; // Detenemos la ejecución si ya está logueado
    }

    const btnLogin = document.getElementById('btn-login');
    const btnGoogle = document.getElementById('btn-google-auth');
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
                    // Importante: Al volver, regresará al index.html y la validación inicial (paso 0) 
                    // decidirá si lo manda a administracion o a registrar-usuario.
                    redirectTo: window.location.origin + window.location.pathname 
                }
            });

            if (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error con Google',
                    text: error.message
                });
            }
        });
    }
});