import { supabase } from '../js/config/supabaseClient.js';
import { registroView } from './views/registroView.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Manejo del botón de Google
    const btnGoogle = document.getElementById('btn-google-auth');
    if (btnGoogle) {
        btnGoogle.addEventListener('click', async () => {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.href }
            });
        });
    }

    // 2. Manejo del botón de Facebook
    const btnFacebook = document.getElementById('btn-facebook-auth');
    if (btnFacebook) {
        btnFacebook.addEventListener('click', async () => {
            await supabase.auth.signInWithOAuth({
                provider: 'facebook',
                options: { redirectTo: window.location.href }
            });
        });
    }

    // 3. Verificar si hay una sesión activa tras el retorno del OAuth
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // Consultar si el usuario ya existe en la tabla pública 'usuario'
        const { data: usuarioDB } = await supabase
            .from('usuario')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (!usuarioDB) {
            // Extraer metadatos (Soporta Google y Facebook)
            const meta = session.user.user_metadata;
            
            // Facebook suele enviar 'name', Google suele enviar 'full_name'
            const nombreCompleto = meta.full_name || meta.name || '';
            
            // Aplicamos la distribución inteligente de nombres y apellidos
            const nombresDistribuidos = distribuirNombre(nombreCompleto);

            // Renderizar el formulario con los datos pre-cargados
            registroView.renderFormularioDatos({
                email: session.user.email,
                ...nombresDistribuidos
            });
            
            activarEscuchaFormulario(session.user.id, session.user.email);
        } else {
            // Si ya existe en la DB, redirigir al panel directamente
            window.location.href = 'administracion.html'; 
        }
    }
});

/**
 * Función para procesar el string de nombre completo y repartirlo en campos
 * Lógica:
 * 4+ palabras: 2 nombres, Patern, Materno
 * 3 palabras: 1 nombre, Paterno, Materno
 * 2 palabras: 1 nombre, Paterno, (Materno vacío)
 */
function distribuirNombre(fullName) {
    const partes = fullName.trim().split(/\s+/);
    
    if (partes.length >= 4) {
        return { 
            nombres: `${partes[0]} ${partes[1]}`, 
            paterno: partes[2], 
            materno: partes[3] 
        };
    }
    if (partes.length === 3) {
        return { 
            nombres: partes[0], 
            paterno: partes[1], 
            materno: partes[2] 
        };
    }
    if (partes.length === 2) {
        return { 
            nombres: partes[0], 
            paterno: partes[1], 
            materno: '' 
        };
    }
    return { 
        nombres: partes[0] || '', 
        paterno: '', 
        materno: '' 
    };
}

/**
 * Activa el evento submit del formulario generado por la vista
 */
function activarEscuchaFormulario(userId, userEmail) {
    const form = document.getElementById('form-finalizar-registro');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-pulse">Guardando perfil...</span>';

        const formData = new FormData(form);
        const datos = Object.fromEntries(formData.entries());

        // Inserción final en la tabla 'usuario'
        const { error } = await supabase
            .from('usuario')
            .upsert({
                id: userId,
                ci: datos.ci,
                nombres: datos.nombres,
                apellido_paterno: datos.apellido_paterno,
                apellido_materno: datos.apellido_materno,
                correo_electronico: userEmail,
                celular: datos.celular,
                rol: 'owner', // Se asigna automáticamente como Owner en este flujo
                visible: true
            });

        if (!error) {
            window.location.href = 'administracion.html';
        } else {
            btn.disabled = false;
            btn.innerHTML = 'Activar Cuenta Owner';
            
            // Manejo de error por CI duplicado
            if (error.code === '23505') {
                alert("Error: El CI ingresado ya está registrado en el sistema.");
            } else {
                alert("Error al finalizar registro: " + error.message);
            }
        }
    });
}