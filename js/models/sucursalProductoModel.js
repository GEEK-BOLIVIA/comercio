import { supabase } from '../config/supabaseClient.js';

export const sucursalProductoModel = {

    async getBySucursal(idSucursal) {
        try {
            const { data, error } = await supabase
                .from('sucursal_producto')
                .select(`
                    *
                `) // Quitamos 'sku' para evitar el error
                .eq('id_sucursal', idSucursal)
                .eq('visible', true);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Model Error [sucursalProducto.getBySucursal]:", error.message);
            return [];
        }
    },

    /**
     * Actualiza el stock o precio de un producto en una sucursal específica
     * Usa la llave primaria compuesta (id_sucursal, id_producto)
     */
    async updateStock(idSucursal, idProducto, updates) {
        try {
            const { data, error } = await supabase
                .from('sucursal_producto')
                .update({
                    precio: updates.precio,
                    stock: updates.stock,
                    visible: updates.visible ?? true
                })
                .eq('id_sucursal', idSucursal)
                .eq('id_producto', idProducto)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error("Model Error [sucursalProducto.updateStock]:", error.message);
            return null;
        }
    },

    /**
     * Asigna un producto a una sucursal (Crear registro de stock)
     */
    async asignarProducto(payload) {
        try {
            const { data, error } = await supabase
                .from('sucursal_producto')
                .insert([{
                    id_sucursal: payload.idSucursal,
                    id_producto: payload.idProducto,
                    precio: payload.precio || 0,
                    stock: payload.stock || 0,
                    visible: true
                }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error("Model Error [sucursalProducto.asignar]:", error.message);
            throw error;
        }
    },

    /**
     * Borrado lógico de un producto en la sucursal
     */
    async ocultarProducto(idSucursal, idProducto) {
        try {
            const { error } = await supabase
                .from('sucursal_producto')
                .update({ visible: false })
                .match({ id_sucursal: idSucursal, id_producto: idProducto });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error("Model Error [sucursalProducto.ocultar]:", error.message);
            return false;
        }
    }
};