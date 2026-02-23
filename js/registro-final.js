import { supabase } from '../js/config/supabaseClient.js';
import { registroView } from './views/registroView.js';

document.addEventListener('DOMContentLoaded', async () => {
    const btnGoogle = document.getElementById('btn-google-auth');
    if (btnGoogle) {
        btnGoogle.addEventListener('click', async () => {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.href }
            });
        });
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        const { data: usuarioDB } = await supabase
            .from('usuario')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (!usuarioDB) {
            const meta = session.user.user_metadata;
            // Usamos el full_name que viene de Google para procesarlo
            const nombreCompleto = meta.full_name || '';
            const nombresDistribuidos = distribuirNombre(nombreCompleto);

            // Renderizar con la distribución inteligente
            registroView.renderFormularioDatos({
                email: session.user.email,
                ...nombresDistribuidos
            });
            activarEscuchaFormulario(session.user.id, session.user.email);
        } else {
            window.location.href = 'administracion.html'; 
        }
    }
});

// Función de apoyo para procesar el string de Google
function distribuirNombre(fullName) {
    const partes = fullName.trim().split(/\s+/);
    if (partes.length >= 4) return { nombres: `${partes[0]} ${partes[1]}`, paterno: partes[2], materno: partes[3] };
    if (partes.length === 3) return { nombres: partes[0], paterno: partes[1], materno: partes[2] };
    if (partes.length === 2) return { nombres: partes[0], paterno: partes[1], materno: '' };
    return { nombres: partes[0] || '', paterno: '', materno: '' };
}

function activarEscuchaFormulario(userId, userEmail) {
    const form = document.getElementById('form-finalizar-registro');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        btn.innerHTML = 'Procesando...';

        const formData = new FormData(form);
        const datos = Object.fromEntries(formData.entries());

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
                rol: 'owner',
                visible: true
            });

        if (!error) {
            window.location.href = 'administracion.html';
        } else {
            btn.disabled = false;
            btn.innerHTML = 'Activar Cuenta Owner';
            alert("Error: " + error.message);
        }
    });
}