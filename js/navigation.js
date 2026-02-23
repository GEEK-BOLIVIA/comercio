import { categoriasController } from './controllers/categoriasController.js';
import { productoController } from './controllers/productoController.js';
import { importacionController } from './controllers/importacionController.js';
import { usuarioModel } from './models/usuarioModel.js';
import { usuarioController } from './controllers/usuarioController.js';

document.addEventListener('DOMContentLoaded', async () => {

    // --- 0. PROTECCIÓN DE RUTAS Y SESIÓN ---
    const verificarAcceso = async () => {
        // 1. Obtener la sesión del modelo
        const sesion = await usuarioModel.obtenerSesionActual();

        // Caso A: No hay nadie logueado (ni en Auth)
        if (!sesion) {
            console.log("No hay sesión activa. Al login.");
            window.location.href = 'index.html';
            return null;
        }

        // Caso B: Está logueado en Auth pero NO existe en la tabla 'usuario'
        // (Usuario que entró por Google y cerró la pestaña sin llenar datos)
        if (!sesion.perfil) {
            console.warn("Sesión detectada pero perfil inexistente en DB.");
            window.location.href = 'registrar-usuario.html';
            return null;
        }

        // Caso C: Existe el perfil pero no es Owner
        if (sesion.perfil.rol.toLowerCase() !== 'owner') {
            console.error("Acceso denegado: El rol no es Owner.");
            // Opcional: Cerrar sesión si no es el rol permitido
            await usuarioModel.logout();
            window.location.href = 'index.html';
            return null;
        }

        // Caso D: El perfil existe pero le faltan campos críticos (CI, Celular, etc.)
        const camposCriticos = ['ci', 'nombres', 'celular'];
        const estaIncompleto = camposCriticos.some(campo => !sesion.perfil[campo]);

        if (estaIncompleto) {
            console.warn("Perfil incompleto detectado.");
            window.location.href = 'registrar-usuario.html';
            return null;
        }

        // Si llegó aquí, todo está perfecto
        return sesion;
    };
    const sesionActiva = await verificarAcceso();
    if (!sesionActiva) return; // Detiene la ejecución si no está autorizado

    // --- 0.1 CARGAR DATOS DEL USUARIO EN LA UI ---
    // --- CARGAR DATOS DEL USUARIO EN LA UI ---
    const perfil = sesionActiva.perfil;
    const userNameDisplay = document.querySelector('.sidebar-hide p.text-slate-800.text-sm.font-bold');
    const userRoleDisplay = document.querySelector('.sidebar-hide p.text-slate-500.text-\\[11px\\]');
    const userAvatarImg = document.querySelector('aside img[alt="Profile"]');

    if (userNameDisplay) userNameDisplay.textContent = `${perfil.nombres} ${perfil.apellido_paterno}`;
    if (userRoleDisplay) userRoleDisplay.textContent = perfil.rol.charAt(0).toUpperCase() + perfil.rol.slice(1);
    if (userAvatarImg) {
        userAvatarImg.src = `https://ui-avatars.com/api/?name=${perfil.nombres}+${perfil.apellido_paterno}&background=3b82f6&color=fff`;
        // Añadimos una clase al contenedor del avatar para el CSS
        userAvatarImg.parentElement.classList.add('avatar-container');
    }

    // --- 0.2 INICIALIZACIÓN AUTOMÁTICA DE PRODUCTOS ---
    try {
        // Cargamos la vista de productos por defecto al entrar
        await productoController.inicializar();
    } catch (error) {
        console.error("Error al cargar productos iniciales:", error);
    }

    const mapeoRolesUsuarios = {
        'link-owners': 'owner',
        'link-admins': 'admin',
        'link-clientes': 'cliente'
    };
    // Modificamos la función cargarSeccion o el listener de clics
    async function ejecutarControladorSegunID(idElemento) {
        const controlador = mapeoControladores[idElemento];
        if (controlador) {
            // Esperamos un momento a que el HTML se cargue en el DOM si usas AJAX
            setTimeout(async () => {
                await controlador.inicializar();
            }, 100);
        }
    }
    // --- 0.3 LÓGICA DE LOGOUT ---
    const btnLogout = document.querySelector('button[title="Cerrar Sesión"]');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            const result = await Swal.fire({
                title: '¿Cerrar sesión?',
                text: "Se cerrará tu acceso al panel administrativo.",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3b82f6',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                await usuarioModel.logout();
                window.location.href = '../index.html';
            }
        });
    }

    // --- EXPOSICIÓN GLOBAL PARA EVENTOS ONCLICK ---
    window.categoriasController = categoriasController;
    window.productoController = productoController;
    window.importacionController = importacionController;

    const navItems = document.querySelectorAll('.nav-item');
    const contentArea = document.getElementById('content-area');

    const inyectarEstilosGlobales = () => {
        if (document.getElementById('nexus-dynamic-styles')) return;
        const style = document.createElement('style');
        style.id = 'nexus-dynamic-styles';
        style.innerHTML = `
            * { transition: background-color 0.2s ease, border-color 0.2s ease, width 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            .dark body { background-color: #101922 !important; color: #f1f5f9; }
            .dark #main-sidebar { background-color: #101922 !important; border-right-color: #1e293b; }
            .dark .bg-white { background-color: #16222e !important; color: #f1f5f9 !important; }
            .animate-fade-in { animation: fadeIn 0.3s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

            /* Evita que el avatar se corte al colapsar */
            .sidebar-colapsado .profile-wrapper { 
                justify-content: center !important; 
                padding: 0 !important; 
                border: none !important; 
                background: transparent !important; 
                box-shadow: none !important;
                overflow: visible !important; /* Crucial para que no se corte */
            }
            .sidebar-colapsado .logout-btn { justify-content: center !important; padding: 0.5rem 0 !important; }
            .sidebar-colapsado .avatar-container { margin: 0 auto !important; display: flex; justify-content: center; }
            
            /* Asegura que el avatar mantenga su tamaño circular */
            .avatar-container img { min-width: 40px; min-height: 40px; }
        `;
        document.head.appendChild(style);
    };
    inyectarEstilosGlobales();

    // --- LÓGICA DE UI: SIDEBAR (Corregida para alineación) ---
    window.sidebarController = {
        toggle() {
            const sidebar = document.getElementById('main-sidebar');
            const icon = document.getElementById('sidebar-icon');
            const logoImg = document.getElementById('sidebar-logo');

            // Intentamos capturar los contenedores de perfil y logout para alinearlos
            const profileWrapper = sidebar.querySelector('.flex.items-center.bg-white.rounded-xl') || sidebar.querySelector('aside .p-4 div:has(img)');
            const logoutBtn = document.querySelector('button[title="Cerrar Sesión"]');

            const isColapsed = sidebar.classList.toggle('w-[80px]');

            if (isColapsed) {
                sidebar.classList.remove('w-[280px]');
                sidebar.classList.add('sidebar-colapsado'); // Clase de control para CSS
                icon.innerText = 'chevron_right';

                if (logoImg) {
                    logoImg.src = 'images/favicon.png';
                    logoImg.classList.add('h-8');
                }

                if (profileWrapper) profileWrapper.classList.add('profile-wrapper');
                if (logoutBtn) logoutBtn.classList.add('logout-btn');

                document.querySelectorAll('.sidebar-hide').forEach(el => el.classList.add('hidden'));
            } else {
                sidebar.classList.add('w-[280px]');
                sidebar.classList.remove('sidebar-colapsado');
                icon.innerText = 'chevron_left';

                if (logoImg) {
                    logoImg.src = 'images/logo.png';
                    logoImg.classList.remove('h-8');
                }

                if (profileWrapper) profileWrapper.classList.remove('profile-wrapper');
                if (logoutBtn) logoutBtn.classList.remove('logout-btn');

                document.querySelectorAll('.sidebar-hide').forEach(el => el.classList.remove('hidden'));
            }
        }
    };

    // --- LÓGICA DE CARGA DE CONTENIDO ---
    async function cargarSeccion(url, type, elemento) {
        if (!url) return;
        mostrarLoading('Cargando sección');
        actualizarEstadoActivo(elemento);

        if (type === 'iframe') {
            contentArea.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.className = "w-full h-full border-none bg-transparent opacity-0 transition-opacity duration-300";
            iframe.onload = () => {
                if (iframe.contentDocument) {
                    const isDark = document.documentElement.classList.contains('dark');
                    iframe.contentDocument.documentElement.classList.toggle('dark', isDark);
                    const styleClone = document.createElement('style');
                    styleClone.innerHTML = document.getElementById('nexus-dynamic-styles').innerHTML;
                    iframe.contentDocument.head.appendChild(styleClone);
                }
                iframe.classList.remove('opacity-0');
                Swal.close();
            };
            contentArea.appendChild(iframe);
        } else {
            await cargarPaginaAjax(url, elemento);
        }
    }

    // --- NAVEGACIÓN UNIFICADA (DELEGACIÓN DE EVENTOS) ---
    document.getElementById('main-sidebar')?.addEventListener('click', (e) => {
        const item = e.target.closest('.nav-item, [id^="link-"], button, summary');
        if (!item) return;

        // Ejecutamos la limpieza visual
        actualizarEstadoActivo(item);
    });

    // --- NAVEGACIÓN UNIFICADA ---
    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            // Evitamos que el clic en elementos internos del botón interfiera
            e.preventDefault();

            const id = item.id;
            const viewUrl = item.getAttribute('data-view');
            const rolParaCargar = mapeoRolesUsuarios[id];

            // Caso A: Es una sección de Usuarios (Owner, Admin, Cliente)
            if (rolParaCargar) {
                actualizarEstadoActivo(item);
                // El controlador ya sabe que debe limpiar el contentArea y dibujar la tabla
                await usuarioController.inicializarSeccion(rolParaCargar);
            }
            // Caso B: Son secciones de Inventario (Productos, Categorías)
            else if (id === 'link-productos' || id === 'link-categorias') {
                actualizarEstadoActivo(item);
                if (id === 'link-productos') await productoController.inicializar();
                if (id === 'link-categorias') await categoriasController.inicializar();
            }
            // Caso C: Es una página estática o con AJAX simple
            else if (viewUrl) {
                await cargarSeccion(viewUrl, 'ajax', item);
            }
        });
    });

    // --- HELPERS ---
    async function cargarPaginaAjax(url, elemento) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const html = await response.text();
                contentArea.innerHTML = `<div class="h-full overflow-auto animate-fade-in">${html}</div>`;
                actualizarEstadoActivo(elemento);
                Swal.close();
            } else { throw new Error('404'); }
        } catch (error) { mostrarError(url); }
    }

    function mostrarLoading(titulo) {
        Swal.fire({
            title: titulo,
            html: 'Por favor espere un momento...',
            allowOutsideClick: false,
            focusConfirm: false,
            didOpen: () => Swal.showLoading(),
            showConfirmButton: false,
            backdrop: `rgba(15, 23, 42, 0.1)`
        });
    }

    function mostrarError(url) {
        Swal.fire({ icon: 'error', title: 'Error al cargar', text: `No se encontró la ruta: ${url}` });
        contentArea.innerHTML = `<div class="flex items-center justify-center h-full text-slate-400">Error al cargar ${url}</div>`;
    }

    /**
  * Gestiona el resaltado visual de la opción seleccionada en el sidebar
  */
    function actualizarEstadoActivo(elementoActivo) {
        if (!elementoActivo) return;

        // 1. Limpiamos todos los estilos de "activo" de todos los nav-items
        const todosLosLinks = document.querySelectorAll('.nav-item');
        todosLosLinks.forEach(link => {
            // Quitamos fondos y colores de texto activos (blue, indigo, emerald, etc.)
            link.classList.remove(
                'bg-blue-50', 'text-blue-600',
                'bg-indigo-50', 'text-indigo-600',
                'bg-emerald-50', 'text-emerald-600',
                'bg-slate-100'
            );
            // Volvemos al color base (gris)
            link.classList.add('text-slate-500');

            // Si tienes iconos o texto <p> internos, también los reseteamos
            const texto = link.querySelector('p');
            if (texto) texto.classList.remove('text-blue-600', 'font-bold');
        });

        // 2. Aplicamos el estilo activo solo al elemento clickeado
        elementoActivo.classList.remove('text-slate-500');

        // Personalización por ID (Opcional: puedes hacer que cada uno tenga su color)
        if (elementoActivo.id === 'link-admins') {
            elementoActivo.classList.add('bg-indigo-50', 'text-indigo-600');
        } else if (elementoActivo.id === 'link-clientes') {
            elementoActivo.classList.add('bg-emerald-50', 'text-emerald-600');
        } else {
            // Por defecto para Owners, Productos y Categorías usamos Azul
            elementoActivo.classList.add('bg-blue-50', 'text-blue-600');
        }

        // Opcional: poner el texto en negrita
        const textoActivo = elementoActivo.querySelector('p');
        if (textoActivo) textoActivo.classList.add('font-bold');
    }
});
window.usuarioController = usuarioController;