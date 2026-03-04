import { ActionButtons, TableWidgets } from '../../utils/componentUtils.js';

export const productoTabla = {

    /**
     * Render principal — devuelve HTML string
     * @param {Array}    datos         - Productos ya filtrados y ordenados
     * @param {Object}   estado        - _estado del productoView (paginaActual, filasPorPagina)
     * @param {Function} renderSwitch  - productoView._renderSwitch (bound)
     * @param {Function} renderPag     - productoView._generarPaginacion (bound)
     * @param {Function} getColor      - productoView._obtenerColorCategoria (bound)
     */
    render(datos, estado, renderSwitch, renderPag, getColor) {
        return `
        <div class="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden mb-8">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/80">
                            <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase w-20 text-center">N°</th>
                            <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase">Producto / Categoría</th>
                            <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase text-center">Precio</th>
                            <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase text-center">Stock</th>
                            <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase text-center">WhatsApp</th>
                            <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase text-center">Precio Pub.</th>
                            <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase text-center w-48">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${this._renderFilas(datos, estado, renderSwitch, getColor)}
                    </tbody>
                </table>
            </div>
            ${renderPag(datos.length)}
        </div>`;
    },

    /* ── Filas paginadas ── */
    _renderFilas(datos, estado, renderSwitch, getColor) {
        if (datos.length === 0) {
            return `
            <tr>
                <td colspan="7" class="px-6 py-16 text-center">
                    <div class="flex flex-col items-center gap-3 text-slate-400">
                        <span class="material-symbols-outlined text-[48px] opacity-30">inventory_2</span>
                        <p class="text-sm font-bold uppercase tracking-wide">Sin productos que mostrar</p>
                        <p class="text-xs">Prueba cambiando los filtros activos</p>
                    </div>
                </td>
            </tr>`;
        }

        const inicio = (estado.paginaActual - 1) * estado.filasPorPagina;
        const paged = datos.slice(inicio, inicio + estado.filasPorPagina);

        return paged.map((p, i) => {
            const dataEnc = btoa(unescape(encodeURIComponent(JSON.stringify(p))));
            const nombreMostrarCat = p.categoria_padre_nombre || 'General';
            const colorCat = getColor(nombreMostrarCat);
            const stockClase = p.stock === 0
                ? 'bg-red-50 text-red-600'
                : p.stock <= 5
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600';

            return `
            <tr class="hover:bg-blue-50/40 transition-colors group">

                <td class="px-6 py-5 text-center text-xs font-bold text-slate-400">
                    ${inicio + i + 1}
                </td>

                <td class="px-6 py-5">
                    <div class="flex items-center gap-3">
                        <img src="${p.imagen_url || 'https://via.placeholder.com/44'}"
                             class="h-11 w-11 rounded-xl object-cover border border-slate-100 shadow-sm"
                             onerror="this.src='https://via.placeholder.com/44'">
                        <div class="flex flex-col text-left">
                            <span class="text-slate-800 font-bold uppercase text-[12px] tracking-wide mb-1 leading-none">
                                ${p.nombre}
                            </span>
                            <span title="Ruta: ${p.nombre_categoria || 'General'}"
                                  class="px-2 py-0.5 rounded text-[9px] font-black uppercase w-fit ${colorCat} cursor-help">
                                ${nombreMostrarCat}
                            </span>
                        </div>
                    </div>
                </td>

                <td class="px-6 py-5 text-center font-black text-slate-700 text-sm">
                    Bs. ${p.precio}
                </td>

                <td class="px-6 py-5 text-center">
                  ${TableWidgets.badge(p.stock, 'UDS')}
                </td>

                <td class="px-6 py-5 text-center">
                    ${renderSwitch(p.id, 'habilitar_whatsapp', p.habilitar_whatsapp, 'emerald', false, p.nombre)}
                </td>

                <td class="px-6 py-5 text-center">
                    ${renderSwitch(p.id, 'mostrar_precio', p.mostrar_precio, 'blue', false, p.nombre)}
                </td>

                <td class="px-6 py-4 text-center">
                    <div class="flex justify-center gap-2">
                        ${ActionButtons.render(p.id, 'edit', 'Editar', 'blue', 'productoController.mostrarFormularioEditar')}
                        ${ActionButtons.render(p.id, 'visibility', 'Ver detalle', 'indigo', 'productoController.verDetalle')}
                        ${ActionButtons.render(dataEnc, 'delete', 'Eliminar', 'red', 'productoView.confirmarEliminacion')}
                    </div>
                </td>

            </tr>`;
        }).join('');
    },
    renderSkeletonFilas(cantidad = 10) {
        const fila = () => `
    <tr class="animate-pulse">
        <td class="px-6 py-5 text-center">
            <div class="h-3 w-6 bg-slate-200 rounded-full mx-auto"></div>
        </td>
        <td class="px-6 py-5">
            <div class="flex items-center gap-3">
                <div class="h-11 w-11 rounded-xl bg-slate-200 flex-shrink-0"></div>
                <div class="flex flex-col gap-2 flex-1">
                    <div class="h-3 bg-slate-200 rounded-full w-3/4"></div>
                    <div class="h-2 bg-slate-100 rounded-full w-1/3"></div>
                </div>
            </div>
        </td>
        <td class="px-6 py-5 text-center">
            <div class="h-3 w-14 bg-slate-200 rounded-full mx-auto"></div>
        </td>
        <td class="px-6 py-5 text-center">
            <div class="h-6 w-16 bg-slate-200 rounded-lg mx-auto"></div>
        </td>
        <td class="px-6 py-5 text-center">
            <div class="h-5 w-9 bg-slate-200 rounded-full mx-auto"></div>
        </td>
        <td class="px-6 py-5 text-center">
            <div class="h-5 w-9 bg-slate-200 rounded-full mx-auto"></div>
        </td>
        <td class="px-6 py-5 text-center">
            <div class="flex justify-center gap-2">
                <div class="h-9 w-9 bg-slate-200 rounded-xl"></div>
                <div class="h-9 w-9 bg-slate-200 rounded-xl"></div>
                <div class="h-9 w-9 bg-slate-200 rounded-xl"></div>
            </div>
        </td>
    </tr>`;

        return Array.from({ length: cantidad }, fila).join('');
    }
};