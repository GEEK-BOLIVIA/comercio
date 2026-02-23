import { supabase } from '../config/supabaseClient.js';

export const usuarioModel = {
    // ==========================================
    // SECCIÓN: AUTENTICACIÓN (AUTH)
    // ==========================================

    /**
     * Inicia sesión en Supabase Auth y obtiene el perfil de la tabla pública
     */
    async login(email, password) {
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) throw authError;

            const { data: perfil, error: perfilError } = await supabase
                .from('usuario')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (perfilError) throw perfilError;

            return { exito: true, user: authData.user, perfil };
        } catch (err) {
            console.error('Error en usuarioModel.login:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Obtiene los datos del usuario actual si hay una sesión activa
     */
    async obtenerSesionActual() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: perfil } = await supabase
                .from('usuario')
                .select('*')
                .eq('id', user.id)
                .single();

            return { ...user, perfil };
        } catch (err) {
            return null;
        }
    },

    /**
     * Cierra la sesión globalmente y limpia el storage local
     */
    async logout() {
        const { error } = await supabase.auth.signOut();
        sessionStorage.clear();
        return { exito: !error };
    },

    // ==========================================
    // SECCIÓN: CRUD Y GESTIÓN DE USUARIOS
    // ==========================================

    /**
     * Registra un usuario en Auth e inserta su perfil en la tabla pública
     */
    async crear(payload) {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .insert([payload])
                .select();

            if (error) throw error;
            return { exito: true, data: data[0] };
        } catch (err) {
            console.error('Error en usuarioModel.crear:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Obtiene todos los usuarios activos
     */
    async obtenerTodos() {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .select('*')
                .eq('visible', true)
                .order('apellido_paterno', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error al obtener usuarios:', error.message);
            return [];
        }
    },

    /**
     * Obtiene un usuario por su UUID (ID de Auth)
     */
    async obtenerPorId(id) {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error al obtener usuario con ID ${id}:`, error.message);
            return null;
        }
    },
    // Añadir esto a tu usuarioModel.js
    async obtenerPorRol(rol) {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .select('*')
                .eq('visible', true)
                .eq('rol', rol) // Filtramos por el rol específico
                .order('apellido_paterno', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error al obtener ${rol}s:`, error.message);
            return [];
        }
    },
    /**
     * Actualiza datos parciales del perfil del usuario
     */
    async actualizar(id, cambios) {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .update(cambios)
                .eq('id', id);

            if (error) throw error;
            return { exito: true };
        } catch (error) {
            return { exito: false, mensaje: error.message };
        }
    },

    /**
     * Función para configuraciones especiales (usada por Owners/Admins)
     */
    async obtenerDestinosConfiguracion() {
        try {
            const { data: usuarios, error: errUser } = await supabase
                .from('usuario')
                .select('id, nombres, apellido_paterno, apellido_materno, rol')
                .eq('visible', true);

            if (errUser) throw errUser;

            const rolesUnicos = [...new Set(usuarios.map(u => u.rol))];

            return {
                usuarios: usuarios.map(u => ({
                    id: u.id,
                    nombreCompleto: `${u.apellido_paterno} ${u.apellido_materno} ${u.nombres}`
                })),
                roles: rolesUnicos
            };
        } catch (error) {
            console.error('Error en obtenerDestinosConfiguracion:', error.message);
            return { usuarios: [], roles: [] };
        }
    },
    async invitarNuevoUsuario(email, metadatos) {
        try {
            const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
                data: {
                    rol: metadatos.rol,
                    nombres: metadatos.nombres
                },
                redirectTo: metadatos.redirectTo
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error al invitar:', error.message);
            return { data: null, error };
        }
    },

    async limpiarRegistrosIncompletos() {
        // 1. Obtener todos los usuarios de Auth
        const { data: { users }, error } = await supabase.auth.admin.listUsers();

        if (error) return { exito: false, mensaje: error.message };

        for (const user of users) {
            // 2. Verificar si existe en la tabla pública
            const { data: perfil } = await supabase
                .from('usuario')
                .select('id')
                .eq('id', user.id)
                .single();

            // 3. Si no existe y lleva más de un día, borrar
            const unDiaEnMs = 24 * 60 * 60 * 1000;
            const antiguedad = new Date() - new Date(user.created_at);

            if (!perfil && antiguedad > unDiaEnMs) {
                await supabase.auth.admin.deleteUser(user.id);
                console.log(`Usuario huérfano eliminado: ${user.email}`);
            }
        }
    },
    async eliminarUsuarioTotal(userId) {
        try {
            // Al borrar de Auth, el CASCADE borra automáticamente la fila en 'public.usuario'
            const { error } = await supabase.auth.admin.deleteUser(userId);

            if (error) throw error;
            return { exito: true };
        } catch (error) {
            console.error('Error al eliminar usuario:', error.message);
            return { exito: false, mensaje: error.message };
        }
    }
};