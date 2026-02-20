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
        let datosIniciales = { nombres: '', apellido_paterno: '', correo_electronico: '', celular: '' };
        let titulo = `Nuevo ${this._estado.configActual.rol}`;

        if (id) {
            titulo = `Editar ${this._estado.configActual.rol}`;
            const usuario = await usuarioModel.obtenerPorId(id);
            if (usuario) datosIniciales = usuario;
        }

        // Aquí llamarías a un método mostrarFormulario en la vista (similar al de categorías)
        // Por ahora, implementamos la lógica de guardado:
        const resultadoForm = await usuarioView.mostrarFormularioUsuario({
            titulo: titulo,
            datos: datosIniciales,
            color: this._estado.configActual.color
        });

        if (resultadoForm) {
            this.guardarUsuario(id, resultadoForm);
        }
    },

    /**
     * Guarda los datos en la DB
     */
    async guardarUsuario(id, datos) {
        usuarioView.mostrarCargando('Guardando cambios...');

        let resultado;
        if (id) {
            resultado = await usuarioModel.actualizar(id, datos);
        } else {
            datos.rol = this._estado.rolActual;
            resultado = await usuarioModel.crear(datos);
        }

        if (resultado.exito) {
            usuarioView.notificarExito('Registro guardado con éxito.');
            this.refrescarVista();
        } else {
            usuarioView.notificarError(resultado.mensaje);
        }
    },
    async enviarInvitacion(email, rol) {
        usuarioView.mostrarCargando('Enviando invitación por correo...');

        // Llamada al modelo para invitar
        const { data, error } = await usuarioModel.invitarNuevoUsuario(email, {
            rol: rol,
            // Redirige al usuario a una página especial de bienvenida
            redirectTo: window.location.origin + '/completar-registro.html'
        });

        if (!error) {
            usuarioView.notificarExito('Invitación enviada a ' + email);
        } else {
            usuarioView.notificarError('Error: ' + error.message);
        }
    }
};

// Exposición global
window.usuarioController = usuarioController;