import { usuarioModel } from '../models/usuarioModel.js';
import { usuarioView } from '../views/usuarioView.js';

export const usuarioController = {
    // Estado interno del controlador para saber qué estamos gestionando
    _estado: {
        rolActual: '',
        configActual: null
    },

    // Configuración estética por rol
    _configuraciones: {
        'owner': { rol: 'owner', titulo: 'Owners', color: 'blue' },
        'admin': { rol: 'admin', titulo: 'Administradores', color: 'indigo' },
        'cliente': { rol: 'cliente', titulo: 'Clientes', color: 'emerald' }
    },

    // ==========================================
    // SECCIÓN: AUTENTICACIÓN
    // ==========================================

    async manejarLogin(email, password) {
        if (!email || !password) {
            return { exito: false, mensaje: "Todos los campos son obligatorios" };
        }
        const respuesta = await usuarioModel.login(email, password);
        if (respuesta.exito) {
            const rol = respuesta.perfil.rol.toLowerCase();
            if (['owner', 'admin'].includes(rol)) {
                sessionStorage.setItem('usuario_rol', rol);
                sessionStorage.setItem('usuario_nombre', respuesta.perfil.nombres);
                sessionStorage.setItem('usuario_id', respuesta.perfil.id);
                window.location.href = '/administracion.html';
                return { exito: true };
            } else {
                await usuarioModel.logout();
                return { exito: false, mensaje: "Acceso denegado: Se requieren permisos administrativos." };
            }
        }
        return respuesta;
    },

    // ==========================================
    // SECCIÓN: MOTOR CRUD GLOBAL
    // ==========================================

    /**
     * Inicializa la sección según el rol (Se llama desde navigation.js)
     */
    async inicializarSeccion(rol) {
        try {
            if (document.activeElement) document.activeElement.blur();

            const config = this._configuraciones[rol.toLowerCase()];
            if (!config) throw new Error(`Rol ${rol} no configurado`);

            this._estado.rolActual = rol;
            this._estado.configActual = config;

            usuarioView.mostrarCargando(`Obteniendo listado de ${config.titulo}...`);

            const datos = await usuarioModel.obtenerPorRol(rol);

            // Renderizamos usando la vista global
            usuarioView.render(datos, config);

            Swal.close();
        } catch (error) {
            console.error(`Error al inicializar:`, error);
            usuarioView.notificarError("No se pudieron cargar los datos.");
        }
    },

    /**
     * Refresca la vista actual (útil para búsqueda, paginación o tras cambios)
     */
    async refrescarVista() {
        const datos = await usuarioModel.obtenerPorRol(this._estado.rolActual);
        usuarioView.render(datos, this._estado.configActual);
    },

    /**
     * Lógica para eliminar (Desactivación lógica)
     */
    async eliminarRegistro(id) {
        try {
            usuarioView.mostrarCargando('Desactivando usuario...');
            const res = await usuarioModel.actualizar(id, { visible: false });

            if (res.exito) {
                usuarioView.notificarExito(`Usuario desactivado correctamente.`);
                this.refrescarVista();
            } else {
                usuarioView.notificarError(res.mensaje);
            }
        } catch (error) {
            usuarioView.notificarError("Error inesperado al eliminar.");
        }
    },

    /**
     * Abre el modal para ver detalles (Llamado desde la vista)
     */
    async verDetalle(id) {
        try {
            const usuario = await usuarioModel.obtenerPorId(id);
            if (usuario) {
                usuarioView.mostrarDetalle(usuario);
            }
        } catch (error) {
            usuarioView.notificarError("Error al cargar detalles.");
        }
    },

    /**
     * Prepara y muestra el formulario de creación o edición
     */
    async mostrarFormulario(id = null) {
        let datosIniciales = { nombres: '', apellido_paterno: '', apellido_materno: '', correo_electronico: '', celular: '', ci: '' };
        let titulo = `Nuevo ${this._estado.configActual.rol}`;

        if (id) {
            titulo = `Editar ${this._estado.configActual.rol}`;
            const usuario = await usuarioModel.obtenerPorId(id);
            if (usuario) datosIniciales = usuario;
        }

        const resultadoForm = await usuarioView.mostrarFormularioUsuario({
            titulo: titulo,
            datos: datosIniciales,
            color: this._estado.configActual.color,
            esEdicion: !!id // Pasamos si es edición para bloquear el email en el form
        });

        if (resultadoForm) {
            this.guardarUsuario(id, resultadoForm);
        }
    },

    async guardarUsuario(id, datos) {
        const mensajeCarga = id ? 'Guardando cambios...' : `Invitando al nuevo ${this._estado.rolActual.toUpperCase()}...`;
        usuarioView.mostrarCargando(mensajeCarga);

        let resultado;

        if (id) {
            // --- EDICIÓN ---
            resultado = await usuarioModel.actualizar(id, datos);
        } else {
            // --- NUEVO (INVITACIÓN + PERFIL) ---
            try {
                const rolParaInvitar = this._estado.rolActual;

                // 1. Invitar en Auth
                const { data: authData, error: authError } = await usuarioModel.invitarNuevoUsuario(
                    datos.correo_electronico,
                    {
                        rol: rolParaInvitar,
                        nombres: datos.nombres,
                        redirectTo: window.location.origin + '/index.html'
                    }
                );

                if (authError) throw authError;

                // 2. Crear registro en tabla pública
                const nuevoPerfil = {
                    id: authData.user.id,
                    ci: datos.ci,
                    nombres: datos.nombres,
                    apellido_paterno: datos.apellido_paterno,
                    apellido_materno: datos.apellido_materno,
                    correo_electronico: datos.correo_electronico,
                    celular: datos.celular,
                    rol: rolParaInvitar,
                    visible: true
                };

                resultado = await usuarioModel.crear(nuevoPerfil);

            } catch (error) {
                resultado = { exito: false, mensaje: "Error en invitación: " + error.message };
            }
        }

        if (resultado.exito) {
            usuarioView.notificarExito(id ? 'Cambios guardados.' : 'Invitación enviada al correo.');
            this.refrescarVista();
        } else {
            usuarioView.notificarError(resultado.mensaje);
        }
    }
};

// Exposición global
window.usuarioController = usuarioController;