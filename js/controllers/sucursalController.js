import { sucursalModel } from '../models/sucursalMode.js';
import { sucursalView } from '../views/sucursalView.js';

export const sucursalController = {
    _datosCache: [],

    /**
     * Inicializa la interfaz de sucursales generando el HTML desde la View
     */
    async inicializar(silencioso = false) {
        try {
            // Solo mostramos cargando si NO es una búsqueda (silencioso)
            if (!silencioso) {
                sucursalView.mostrarCargando('Cargando sucursales...');
            }

            const data = await sucursalModel.getAll();
            this._datosCache = data;

            // Renderizamos la tabla
            sucursalView.render(this._datosCache);

            // Solo cerramos si nosotros mismos abrimos el modal
            if (!silencioso) {
                Swal.close();
            }
        } catch (error) {
            console.error("Error:", error);
            sucursalView.notificarError('Error al conectar con la base de datos');
        }
    },
    /**
     * Abre el modal de creación. Si no estamos en la vista de sucursales, la carga primero.
     */
    async mostrarFormularioCrear() {
        const datosForm = await sucursalView.mostrarFormulario({
            titulo: 'Registrar Nueva Sucursal',
            esEdicion: false
        });

        if (datosForm) {
            // Pasamos solo DATOS, la vista se encarga del estilo
            const confirmacion = await sucursalView.confirmarAccion({
                titulo: '¿Guardar Sucursal?',
                sucursalNombre: datosForm.nombre,
                mensajePersonalizado: '¿Deseas registrar la nueva sucursal?',
                botonConfirmar: 'Sí, registrar'
            });

            if (confirmacion.isConfirmed) {
                try {
                    sucursalView.mostrarCargando('Guardando...');

                    await sucursalModel.create(datosForm);

                    // IMPORTANTE: Primero refrescamos los datos, luego notificamos éxito
                    await this.inicializar(true); // Refresco silencioso de la tabla

                    // Esto reemplazará automáticamente el modal de "Cargando"
                    sucursalView.notificarExito('La sucursal ha sido registrada correctamente.');

                } catch (error) {
                    sucursalView.notificarError('No se pudo guardar la sucursal.');
                }
            }
        }
    },

    async editar(id) {
        const sucursal = this._datosCache.find(s => s.id == id);
        if (!sucursal) return;

        const datosEditados = await sucursalView.mostrarFormulario({
            titulo: 'Editar Sucursal',
            datos: sucursal,
            esEdicion: true
        });

        if (datosEditados) {
            const confirmacion = await sucursalView.confirmarAccion({
                titulo: '¿Actualizar Datos?',
                sucursalNombre: sucursal.nombre, // Nombre original o el nuevo
                mensajePersonalizado: '¿Deseas aplicar los cambios a:',
                botonConfirmar: 'Sí, actualizar'
            });

            if (confirmacion.isConfirmed) {
                try {
                    sucursalView.mostrarCargando('Actualizando...');
                    await sucursalModel.update(id, datosEditados);
                    sucursalView.notificarExito('Cambios aplicados con éxito.');
                    await this.inicializar();
                } catch (error) {
                    sucursalView.notificarError('Error al intentar actualizar.');
                }
            }
        }
    }
};

// Exponemos al objeto global
window.sucursalController = sucursalController;