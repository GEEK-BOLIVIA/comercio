import { usuarioController } from './controllers/usuarioController.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. DELEGACIÓN DE CONTROL: El controlador decide a dónde ir si ya hay sesión
    // Esto reemplaza tu "Paso 0" manual y asegura que se aplique la lógica de Whitelist/Onboarding
    await usuarioController.gestionarRedireccionInicial();

    // 2. REFERENCIAS A ELEMENTOS
    const btnLogin = document.getElementById('btn-login');
    const btnGoogle = document.getElementById('btn-google-auth');
    const btnFacebook = document.getElementById('btn-facebook-auth');
    const togglePass = document.getElementById('toggle-password');

    // 3. INTERACCIÓN UI: Ver/Ocultar Contraseña
    if (togglePass) {
        togglePass.addEventListener('click', () => {
            const input = document.getElementById('password');
            const icon = document.getElementById('password-icon');
            const isPass = input.type === 'password';
            
            input.type = isPass ? 'text' : 'password';
            icon.textContent = isPass ? 'visibility_off' : 'visibility';
        });
    }

    // 4. EVENTO: Login Tradicional
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const pass = document.getElementById('password').value;
            
            if (!email || !pass) {
                Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor, llena todos los campos.' });
                return;
            }

            // El controlador maneja la carga, el error y la redirección
            await usuarioController.manejarLogin(email, pass);
        });
    }

    // 5. EVENTO: Login Social (Google)
    if (btnGoogle) {
        btnGoogle.addEventListener('click', () => {
            usuarioController.manejarLoginSocial('google');
        });
    }

    // 6. EVENTO: Login Social (Facebook)
    if (btnFacebook) {
        btnFacebook.addEventListener('click', () => {
            usuarioController.manejarLoginSocial('facebook');
        });
    }
});