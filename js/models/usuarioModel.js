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
    async crear(datos) {
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: datos.correo_electronico,
                password: datos.password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("No se pudo crear el usuario en Auth");

            const payload = {
                id: authData.user.id,
                nombres: datos.nombres,
                apellido_paterno: datos.apellido_paterno,
                apellido_materno: datos.apellido_materno,
                correo_electronico: datos.correo_electronico,
                celular: datos.celular,
                ci: datos.ci,
                rol: datos.rol || 'cliente',
                visible: true
            };

            const { data: perfil, error: perfilError } = await supabase
                .from('usuario')
                .insert([payload])
                .select();

            if (perfilError) throw perfilError;

            return { exito: true, data: perfil[0] };
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
    }
};