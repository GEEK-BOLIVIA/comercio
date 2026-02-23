import { PaginationHelper } from '../utils/paginationHelper.js';

export const usuarioView = {
    // Estado local para manejar UI de cada rol de forma independiente
    _estado: {
        busqueda: '',
        orden: 'asc',
        paginaActual: 1,
        filasPorPagina: 10,
        rolActual: '' 
    },

    /**
     * MÉTODOS DE NOTIFICACIÓN ESTILO PREMIUM
     */
    notificarExito(mensaje) {
        Swal.fire({
            icon: 'success',
            title: '<span class="text-slate-800 font-black uppercase text-sm">¡Operación Exitosa!</span>',
            text: mensaje,
            timer: 2000,
            showConfirmButton: false,
            customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
        });
    },

    notificarError(mensaje) {
        Swal.fire({
            icon: 'error',
            title: '<span class="text-red-600 font-black uppercase text-sm">Error en la Operación</span>',
            text: mensaje,
            confirmButtonColor: '#2563eb',
            customClass: {
                popup: 'rounded-[32px] border-none shadow-xl',
                confirmButton: 'rounded-xl px-6 py-2 font-bold text-xs uppercase'
            }
        });
    },

    mostrarCargando(mensaje = 'Procesando solicitud...') {
        Swal.fire({
            title: '<span class="text-slate-800 font-black uppercase text-sm">Cargando</span>',
            text: mensaje,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
        });
    },

    /**
     * RENDER PRINCIPAL DE LA SECCIÓN DE USUARIOS
     */
    render(datos, infoConfig) {
        const contenedor = document.getElementById('content-area');
        if (!contenedor) return;

        this._estado.rolActual = infoConfig.rol;

        // Filtramos y ordenamos antes de paginar
        let datosFiltrados = this._ordenarDatos(this._filtrarDatos(datos));
        
        const inicio = (this._estado.paginaActual - 1) * this._estado.filasPorPagina;
        const fin = inicio + this._estado.filasPorPagina;
        const datosPaginados = datosFiltrados.slice(inicio, fin);

        const html = `
            <div class="p-8 animate-fade-in max-h-[calc(100vh-64px)] overflow-y-auto">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Gestión de ${infoConfig.titulo}</h1>
                        <p class="text-slate-500 text-sm">Administración y control de perfiles tipo ${infoConfig.rol}.</p>
                    </div>
                    <button onclick="usuarioController.mostrarFormulario()" 
                            class="bg-${infoConfig.color}-600 hover:bg-${infoConfig.color}-700 text-white px-6 py-3 rounded-2xl transition-all shadow-lg shadow-${infoConfig.color}-200 font-bold text-sm flex items-center gap-2 w-fit">
                        <span class="material-symbols-outlined text-[20px]">person_add</span> Nuevo ${infoConfig.rol}
                    </button>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div class="relative flex-1 md:w-96">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input type="text" 
                               id="input-busqueda-usuarios"
                               placeholder="Buscar por nombre, C.I. o correo..." 
                               value="${this._estado.busqueda}"
                               oninput="usuarioView.gestionarBusqueda(this.value)"
                               class="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-${infoConfig.color}-500/10 focus:border-${infoConfig.color}-500 transition-all font-medium">
                    </div>
                    
                    <button onclick="usuarioView.gestionarOrden()" 
                            class="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-${infoConfig.color}-600 transition-all shadow-sm font-bold text-sm">
                        <span class="material-symbols-outlined text-lg">${this._estado.orden === 'asc' ? 'sort_by_alpha' : 'text_rotate_vertical'}</span>
                        ${this._estado.orden === 'asc' ? 'A-Z' : 'Z-A'}
                    </button>
                </div>

                <div class="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-8">
                    <div class="overflow-x-auto"> 
                        <table class="w-full text-left border-collapse table-auto"> 
                            <thead>
                                <tr class="bg-slate-50/80 border-b border-slate-200">
                                    <th class="px-4 py-5 text-[11px] font-bold text-slate-400 uppercase w-12 text-center">#</th>
                                    <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase w-20 text-center">Perfil</th>
                                    <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase">Nombre Completo</th>
                                    <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase text-center">C.I.</th>
                                    <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase text-center">Teléfono</th>
                                    <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase text-center w-48">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${datosPaginados.length > 0
                                    ? datosPaginados.map((u, index) => this._crearFila(u, infoConfig.color, inicio + index + 1)).join('')
                                    : `<tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 italic text-sm">No se encontraron usuarios</td></tr>`
                                }
                            </tbody>
                        </table>
                    </div>

                    ${PaginationHelper.render(datosFiltrados.length, this._estado.filasPorPagina, this._estado.paginaActual, 'usuarioView')}
                </div>
            </div>
        `;

        contenedor.innerHTML = html;
        this._enfocarBusqueda();
    },

    /**
     * ESTRUCTURA DE FILA INDIVIDUAL
     */
    _crearFila(u, color, numero) {
        const nombreCompleto = `${u.nombres} ${u.apellido_paterno} ${u.apellido_materno || ''}`.trim();

        return `
            <tr class="hover:bg-slate-50/50 transition-colors group">
                <td class="px-4 py-4 text-center">
                    <span class="text-slate-400 font-bold text-xs">${numero}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex justify-center">
                        <div class="w-10 h-10 rounded-2xl bg-${color}-100 text-${color}-600 flex items-center justify-center font-black text-sm shadow-sm border border-${color}-200/50">
                            ${u.nombres.charAt(0)}${u.apellido_paterno.charAt(0)}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex flex-col">
                        <span class="text-slate-800 font-bold uppercase text-[13px] tracking-wide">${nombreCompleto}</span>
                        <span class="text-slate-400 text-xs font-medium">${u.correo_electronico}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="text-slate-600 font-bold text-xs">${u.ci || '---'}</span>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="text-slate-600 font-bold text-xs">${u.celular || '---'}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onclick="usuarioController.editar('${u.id}')" title="Editar" class="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                        <button onclick="usuarioView.verDetalle('${u.id}')" title="Ver Detalle" class="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><span class="material-symbols-outlined text-[18px]">visibility</span></button>
                        <button onclick="usuarioView.confirmarEliminacion('${u.id}', '${u.nombres}')" title="Eliminar" class="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm"><span class="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                </td>
            </tr>`;
    },

    /**
     * LÓGICA DE FILTRADO Y ORDEN
     */
    _filtrarDatos(datos) {
        if (!this._estado.busqueda) return [...datos];
        const term = this._estado.busqueda.toLowerCase();
        return datos.filter(u => 
            u.nombres.toLowerCase().includes(term) || 
            u.apellido_paterno.toLowerCase().includes(term) ||
            (u.apellido_materno && u.apellido_materno.toLowerCase().includes(term)) ||
            u.correo_electronico.toLowerCase().includes(term) ||
            (u.ci && u.ci.toLowerCase().includes(term))
        );
    },

    _ordenarDatos(datos) {
        return [...datos].sort((a, b) => {
            const nombreA = a.nombres.toLowerCase();
            const nombreB = b.nombres.toLowerCase();
            return this._estado.orden === 'asc' ? nombreA.localeCompare(nombreB) : nombreB.localeCompare(nombreA);
        });
    },

    gestionarBusqueda(valor) {
        this._estado.busqueda = valor;
        this._estado.paginaActual = 1;
        usuarioController.refrescarVista();
    },

    gestionarOrden() {
        this._estado.orden = this._estado.orden === 'asc' ? 'desc' : 'asc';
        usuarioController.refrescarVista();
    },

    cambiarPagina(nuevaPagina) {
        this._estado.paginaActual = nuevaPagina;
        usuarioController.refrescarVista();
    },

    _enfocarBusqueda() {
        const input = document.getElementById('input-busqueda-usuarios');
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    },

    /**
     * MODALES DE DETALLE Y ELIMINACIÓN
     */
    verDetalle(id) {
        usuarioController.verDetalle(id);
    },

    mostrarDetalle(u) {
        Swal.fire({
            title: '<span class="text-slate-800 font-black uppercase text-sm">Ficha de Usuario</span>',
            html: `
                <div class="text-left space-y-4 p-2">
                    <div class="p-5 bg-slate-50 rounded-[24px] border border-slate-100 shadow-inner flex items-center gap-4">
                        <div class="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black">
                            ${u.nombres[0]}${u.apellido_paterno[0]}
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</p>
                            <p class="text-slate-800 font-bold text-lg uppercase">${u.nombres} ${u.apellido_paterno} ${u.apellido_materno || ''}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">C.I.</p>
                            <p class="text-slate-700 font-bold text-sm uppercase">${u.ci || 'N/A'}</p>
                        </div>
                        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Teléfono</p>
                            <p class="text-slate-700 font-bold text-sm">${u.celular || 'No registrado'}</p>
                        </div>
                        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 col-span-2">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Correo Electrónico</p>
                            <p class="text-slate-700 font-bold text-sm">${u.correo_electronico}</p>
                        </div>
                    </div>
                </div>`,
            icon: 'info',
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#2563eb',
            customClass: { popup: 'rounded-[32px] border-none shadow-2xl', confirmButton: 'rounded-xl px-10 py-3 font-bold text-sm uppercase' }
        });
    },

    confirmarEliminacion(id, nombre) {
        Swal.fire({
            title: '<span class="text-red-600 font-black uppercase text-sm">¿Desactivar Usuario?</span>',
            text: `¿Estás seguro de que deseas quitar el acceso a ${nombre.toUpperCase()}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'SÍ, DESACTIVAR',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: '#000000',
            customClass: { popup: 'rounded-[32px]', confirmButton: 'rounded-xl px-6 py-3 font-bold text-sm', cancelButton: 'rounded-xl px-6 py-3 font-bold text-sm bg-slate-100 text-slate-500' }
        }).then((result) => {
            if (result.isConfirmed) usuarioController.eliminarRegistro(id);
        });
    },
    /**
     * FORMULARIO DINÁMICO PARA CREACIÓN (INVITACIÓN) O EDICIÓN
     */
    async mostrarFormularioUsuario({ titulo, datos, color, esEdicion }) {
        const { value: formValues } = await Swal.fire({
            title: `<span class="text-slate-800 font-black uppercase text-sm">${titulo}</span>`,
            html: `
                <div class="text-left space-y-4 p-2">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Nombres</label>
                            <input id="swal-nombres" class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-${color}-500/10 outline-none" 
                                   placeholder="Ej. Juan Pablo" value="${datos.nombres || ''}">
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Apellido Paterno</label>
                            <input id="swal-paterno" class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-${color}-500/10 outline-none" 
                                   placeholder="Ej. Perez" value="${datos.apellido_paterno || ''}">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Apellido Materno</label>
                            <input id="swal-materno" class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-${color}-500/10 outline-none" 
                                   placeholder="Ej. Mamani" value="${datos.apellido_materno || ''}">
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-black text-slate-400 uppercase ml-2">C.I. / Documento</label>
                            <input id="swal-ci" class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-${color}-500/10 outline-none" 
                                   placeholder="Ej. 8475632" value="${datos.ci || ''}">
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Correo Electrónico (Para invitación)</label>
                        <input id="swal-email" type="email" 
                               ${esEdicion ? 'disabled' : ''} 
                               class="${esEdicion ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50'} w-full border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-${color}-500/10 outline-none" 
                               placeholder="correo@ejemplo.com" value="${datos.correo_electronico || ''}">
                        ${esEdicion ? '<p class="text-[9px] text-amber-500 font-bold ml-2 italic">* El correo no se puede modificar por seguridad</p>' : ''}
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Celular / WhatsApp</label>
                        <input id="swal-celular" class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-${color}-500/10 outline-none" 
                               placeholder="Ej. 70712345" value="${datos.celular || ''}">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: esEdicion ? 'Guardar Cambios' : 'Enviar Invitación',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#000000',
            customClass: {
                popup: 'rounded-[32px] border-none shadow-2xl w-[90%] max-w-lg',
                confirmButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase transition-all hover:scale-105',
                cancelButton: 'rounded-xl px-6 py-3 font-bold text-sm bg-slate-100 text-slate-500'
            },
            preConfirm: () => {
                const nombres = document.getElementById('swal-nombres').value.trim();
                const email = document.getElementById('swal-email').value.trim();
                
                if (!nombres || !email) {
                    Swal.showValidationMessage('Nombres y Correo son obligatorios');
                    return false;
                }
                
                return {
                    nombres: nombres,
                    apellido_paterno: document.getElementById('swal-paterno').value.trim(),
                    apellido_materno: document.getElementById('swal-materno').value.trim(),
                    ci: document.getElementById('swal-ci').value.trim(),
                    correo_electronico: email,
                    celular: document.getElementById('swal-celular').value.trim()
                };
            }
        });

        return formValues; // Retorna los datos al controller
    }
};

window.usuarioView = usuarioView;