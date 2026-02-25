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
    _distribuirNombre(fullName) {
        const partes = fullName.trim().split(/\s+/);
        if (partes.length >= 4) return { nombres: `${partes[0]} ${partes[1]}`, paterno: partes[2], materno: partes[3] };
        if (partes.length === 3) return { nombres: partes[0], paterno: partes[1], materno: partes[2] };
        if (partes.length === 2) return { nombres: partes[0], paterno: partes[1], materno: '' };
        return { nombres: partes[0] || '', paterno: '', materno: '' };
    },

    async gestionarRedireccionInicial() {
        const sesion = await usuarioModel.obtenerSesionActual();

        // 1. Caso: Sin sesión activa
        if (!sesion) {
            const esPaginaPrivada = !window.location.pathname.includes('index.html') && window.location.pathname !== '/';
            if (esPaginaPrivada) window.location.href = 'index.html';
            return;
        }

        const { auth, perfil, tipo } = sesion;

        // 2. Caso: Acceso denegado
        if (tipo === 'denegado') {
            await usuarioModel.logout();
            usuarioView.notificarError("Acceso denegado: Tu correo no ha sido autorizado.");
            setTimeout(() => window.location.href = 'index.html', 3000);
            return;
        }

        // 3. Caso: Usuario Nuevo (Whitelist) o Perfil Incompleto
        if (perfil.temporal || !perfil.ci || !perfil.celular) {

            const nombresAuto = this._distribuirNombre(
                auth.user_metadata?.full_name || auth.user_metadata?.name || ''
            );

            const datosSugeridos = {
                nombres: perfil.nombres || nombresAuto.nombres,
                apellido_paterno: perfil.apellido_paterno || nombresAuto.paterno,
                apellido_materno: perfil.apellido_materno || nombresAuto.materno,
            };

            // Esperamos los datos capturados en el modal
            const completado = await usuarioView.mostrarModalCompletarPerfil(auth.id, datosSugeridos);

            if (completado) {
                let res;
                if (perfil.temporal) {
                    // PRIMERA VEZ: Insertamos el registro completo en Supabase
                    const nuevoRegistro = {
                        id: auth.id,
                        correo_electronico: auth.email,
                        rol: perfil.rol,
                        visible: true,
                        ...completado // Aquí entran nombres, apellidos, CI y celular del modal
                    };
                    res = await usuarioModel.crear(nuevoRegistro);
                } else {
                    // YA EXISTÍA (pero estaba incompleto): Actualizamos
                    res = await usuarioModel.actualizar(auth.id, completado);
                }

                if (res.exito) {
                    usuarioView.notificarExito("¡Bienvenido! Perfil configurado correctamente.");
                    // Pequeña pausa para que vea el mensaje de éxito antes de redirigir
                    setTimeout(() => window.location.href = 'administracion.html', 1500);
                } else {
                    usuarioView.notificarError("No se pudo guardar: " + res.mensaje);
                    // Si falla, cerramos sesión para evitar estados inconsistentes
                    await usuarioModel.logout();
                }
            } else {
                // Si canceló el modal (aunque pusimos allowOutsideClick: false), deslogueamos
                await usuarioModel.logout();
                window.location.href = 'index.html';
            }
            return;
        }

        // 4. Caso: Usuario recurrente y completo
        sessionStorage.setItem('usuario_rol', perfil.rol);
        sessionStorage.setItem('usuario_nombre', perfil.nombres);

        const enIndex = window.location.pathname.includes('index.html') || window.location.pathname === '/';
        if (enIndex) window.location.href = 'administracion.html';
    },

    async manejarLogin(email, pass) {
        usuarioView.mostrarCargando('Iniciando sesión...');
        const respuesta = await usuarioModel.login(email, pass);
        if (respuesta.exito) {
            await this.gestionarRedireccionInicial();
        } else {
            usuarioView.notificarError(respuesta.mensaje);
        }
    },
    // Reemplaza tu sección de Autenticación por esta:
    async manejarLoginSocial(proveedor) {
        usuarioView.mostrarCargando(`Conectando con ${proveedor}...`);
        const respuesta = await usuarioModel.loginConRedSocial(proveedor);
        if (!respuesta.exito) usuarioView.notificarError(respuesta.mensaje);
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
        const mensajeCarga = id ? 'Actualizando datos...' : 'Enviando invitación...';
        usuarioView.mostrarCargando(mensajeCarga);

        try {
            let resultado;
            if (id) {
                // CASO A: Edición de usuario existente
                resultado = await usuarioModel.actualizar(id, datos);
            } else {
                // CASO B: Invitación (Aquí es donde Make.com entra en acción)
                const datosInvitacion = {
                    correo_electronico: datos.correo_electronico.toLowerCase().trim(),
                    rol: this._estado.rolActual
                };
                resultado = await usuarioModel.autorizarEnWhitelist(datosInvitacion);
            }

            if (resultado.exito) {
                if (id) {
                    usuarioView.notificarExito('Perfil actualizado correctamente.');
                } else {
                    // Notificación específica para el flujo de Make.com
                    usuarioView.notificarExito(`¡Invitación en camino! Se ha autorizado a ${datos.correo_electronico}. El correo llegará en unos instantes.`);
                }
                await this.refrescarVista();
            } else {
                usuarioView.notificarError(resultado.mensaje);
            }
        } catch (error) {
            console.error("Error en guardarUsuario:", error);
            usuarioView.notificarError("Ocurrió un error inesperado.");
        }
    }
};

// Exposición global
window.usuarioController = usuarioController;