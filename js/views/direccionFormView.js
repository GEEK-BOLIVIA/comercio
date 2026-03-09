/**
 * direccionFormView.js
 * Vista de formulario completo para crear/editar direcciones con mapa Leaflet.
 */

export const direccionFormView = {

    _map: null,
    _marker: null,
    _estado: {
        lat: -17.3935,
        lng: -66.1570,
        id_usuario: '',
        id_departamento: '',
        nombre_lugar: 'Mi Casa',
        referencia: '',
        direccion_texto: '',
        es_principal: false,
        esEdicion: false
    },
    _clientes: [],
    _departamentos: [],

    // ─────────────────────────────────────────────
    // ENTRADA PRINCIPAL
    // ─────────────────────────────────────────────
    async abrir({ datos = {}, esEdicion = false, clientes = [], departamentos = [], onGuardar, onCancelar }) {
        this._destruirMapa();
        await this._cargarLeaflet();

        this._clientes = clientes;
        this._departamentos = departamentos;
        this._onGuardar = onGuardar;
        this._onCancelar = onCancelar;

        // Departamento por defecto: primero de la lista o el del dato
        const depInicial = departamentos.find(d => d.id == datos.id_departamento) || departamentos[0];

        this._estado = {
            lat: parseFloat(datos.lat) || depInicial?.lat || -17.3935,
            lng: parseFloat(datos.lng) || depInicial?.lng || -66.1570,
            zoom: depInicial?.zoom_sugerido || 13,
            id_usuario: datos.id_usuario || '',
            id_departamento: datos.id_departamento || depInicial?.id || '',
            nombre_lugar: datos.nombre_lugar || 'Mi Casa',
            referencia: datos.referencia || '',
            direccion_texto: datos.direccion_texto || '',
            es_principal: datos.es_principal || false,
            esEdicion
        };

        const contenedor = document.getElementById('content-area');
        if (!contenedor) return;
        contenedor.innerHTML = this._renderHTML();

        requestAnimationFrame(() => setTimeout(() => this._initMapa(), 100));
        this._bindEventos();
    },

    // ─────────────────────────────────────────────
    // HTML
    // ─────────────────────────────────────────────
    _renderHTML() {
        const { lat, lng, zoom, id_usuario, id_departamento, nombre_lugar,
            referencia, direccion_texto, es_principal, esEdicion } = this._estado;

        const opcionesClientes = this._clientes.map(c => {
            const nombre = [c.nombres, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ');
            return `<option value="${c.id}" ${c.id === id_usuario ? 'selected' : ''}>${nombre} — ${c.correo_electronico}</option>`;
        }).join('');

        const opcionesDeps = this._departamentos.map(d =>
            `<option value="${d.id}" ${d.id == id_departamento ? 'selected' : ''}>${d.nombre}</option>`
        ).join('');

        const etiquetas = ['Mi Casa', 'Oficina', 'Casa de campo', 'Trabajo', 'Otro'];

        return `
        <div class="flex flex-col h-full max-h-[calc(100vh-64px)] overflow-hidden bg-slate-50">

            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
                <div class="flex items-center gap-3">
                    <button id="df-btn-cancelar"
                            class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100
                                   hover:bg-slate-200 text-slate-600 transition-all">
                        <span class="material-symbols-outlined text-lg">arrow_back</span>
                    </button>
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            ${esEdicion ? 'Editar' : 'Nueva'} Dirección
                        </p>
                        <h1 class="text-lg font-black text-slate-800 leading-tight" id="df-titulo-header">
                            ${nombre_lugar || 'Sin etiqueta'}
                        </h1>
                    </div>
                </div>
                <button id="df-btn-guardar"
                        class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700
                               text-white rounded-xl font-black text-[10px] uppercase tracking-widest
                               transition-all shadow-md active:scale-95">
                    <span class="material-symbols-outlined text-base">save</span>
                    ${esEdicion ? 'Guardar Cambios' : 'Registrar Dirección'}
                </button>
            </div>

            <!-- Layout: mapa + panel -->
            <div class="flex flex-1 overflow-hidden">

                <!-- MAPA -->
                <div class="relative flex-1 overflow-hidden">
                    <div id="df-map" class="w-full h-full"></div>

                    <!-- Instrucción flotante -->
                    <div class="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]
                                bg-white/95 backdrop-blur shadow-lg rounded-2xl px-4 py-2.5
                                flex items-center gap-2 border border-slate-200 pointer-events-none">
                        <span class="material-symbols-outlined text-blue-500 text-[18px]">touch_app</span>
                        <p class="text-[11px] font-black text-slate-600 uppercase tracking-wide">
                            Arrastra el pin o haz clic para ubicar la dirección
                        </p>
                    </div>

                    <!-- Buscador Nominatim sobre el mapa -->
                    <div class="absolute top-16 left-4 z-[1000] w-72">
                        <div class="relative">
                            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                                         text-slate-400 text-[18px]">search</span>
                            <input id="df-buscador" type="text"
                                   placeholder="Buscar dirección..."
                                   class="w-full bg-white/95 backdrop-blur border border-slate-200 rounded-xl
                                          py-2.5 pl-10 pr-10 text-sm outline-none shadow-lg
                                          focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                                          transition-all font-medium text-slate-700">
                            <button id="df-btn-buscar"
                                    class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7
                                           flex items-center justify-center bg-blue-500 hover:bg-blue-600
                                           text-white rounded-lg transition-all">
                                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </button>
                        </div>
                        <div id="df-resultados-busqueda" class="mt-1 flex flex-col gap-1 hidden
                                                                   bg-white/95 backdrop-blur rounded-xl
                                                                   border border-slate-200 shadow-lg overflow-hidden"></div>
                    </div>

                    <!-- Coordenadas en vivo -->
                    <div class="absolute bottom-4 left-4 z-[1000]
                                bg-slate-900/85 backdrop-blur rounded-xl px-3 py-2
                                flex items-center gap-3 border border-white/10">
                        <span class="material-symbols-outlined text-blue-400 text-[15px]">my_location</span>
                        <span id="df-coords-live" class="text-[11px] font-mono font-bold text-white">
                            ${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}
                        </span>
                    </div>

                    <!-- Dirección detectada -->
                    <div id="df-direccion-overlay"
                         class="absolute bottom-4 right-4 z-[1000] max-w-xs
                                bg-white/95 backdrop-blur shadow-lg rounded-xl px-3 py-2
                                border border-slate-200 ${direccion_texto ? '' : 'hidden'}">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Dirección detectada</p>
                        <p id="df-direccion-texto" class="text-[11px] text-slate-700 font-medium leading-snug">
                            ${direccion_texto || ''}
                        </p>
                    </div>

                    <!-- Reset -->
                    <button id="df-btn-reset"
                            class="absolute bottom-16 right-4 z-[1000] flex items-center gap-2 px-3 py-2
                                   bg-white/95 backdrop-blur border border-slate-200 shadow-md rounded-xl
                                   text-slate-600 hover:text-red-500 hover:border-red-200 transition-all
                                   text-[10px] font-black uppercase">
                        <span class="material-symbols-outlined text-[15px]">restart_alt</span>
                        Reset
                    </button>
                </div>

                <!-- PANEL DERECHO -->
                <div class="w-[400px] flex-shrink-0 bg-white border-l border-slate-200 overflow-y-auto flex flex-col gap-0">

                    <!-- Cliente -->
                    <div class="p-5 border-b border-slate-100">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cliente</p>
                        <select id="df-id-usuario"
                                class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4
                                       text-sm outline-none focus:ring-2 focus:ring-blue-500/20
                                       focus:border-blue-500 transition-all font-medium text-slate-700">
                            <option value="">— Selecciona un cliente —</option>
                            ${opcionesClientes}
                        </select>
                    </div>

                    <!-- Campos del formulario -->
                    <div class="p-5 flex flex-col gap-4">

                        <!-- Etiqueta -->
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Etiqueta del lugar
                            </label>
                            <div class="flex flex-wrap gap-2 mb-2">
                                ${etiquetas.map(e => `
                                <button type="button" data-etiqueta="${e}"
                                        class="etiqueta-btn px-3 py-1.5 rounded-xl text-[10px] font-black uppercase
                                               border transition-all
                                               ${nombre_lugar === e
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300'}">
                                    ${e}
                                </button>`).join('')}
                            </div>
                            <input id="df-nombre-lugar" type="text"
                                   placeholder="O escribe una etiqueta personalizada"
                                   value="${nombre_lugar}"
                                   class="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-sm
                                          outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                                          transition-all font-medium text-slate-700">
                        </div>

                        <!-- Departamento -->
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Departamento
                            </label>
                            <select id="df-id-departamento"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4
                                           text-sm outline-none focus:ring-2 focus:ring-blue-500/20
                                           focus:border-blue-500 transition-all font-medium text-slate-700">
                                ${opcionesDeps}
                            </select>
                            <p class="text-[10px] text-slate-400 px-1">Al cambiar el departamento el mapa vuela a su centro.</p>
                        </div>

                        <!-- Referencia -->
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[13px] text-amber-500">star</span>
                                Referencia para el repartidor
                            </label>
                            <textarea id="df-referencia" rows="3"
                                      placeholder='Ej: "Portón azul, frente al parque, timbre roto"'
                                      class="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-sm
                                             outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                                             transition-all font-medium text-slate-700 resize-none">${referencia}</textarea>
                            <p class="text-[10px] text-slate-400 px-1">Campo vital — ayuda al repartidor a encontrar la dirección.</p>
                        </div>

                        <!-- Es principal -->
                        <div class="flex items-center justify-between bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div>
                                <p class="text-[11px] font-black text-slate-700 uppercase tracking-wide">Dirección Principal</p>
                                <p class="text-[10px] text-slate-400 mt-0.5">Se cargará por defecto al cliente</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="df-es-principal" class="sr-only peer" ${es_principal ? 'checked' : ''}>
                                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer
                                            peer-checked:after:translate-x-full peer-checked:after:border-white
                                            after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                                            after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                                            peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <!-- Coordenadas (solo lectura) -->
                        <div class="border-t border-slate-100 pt-4">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                Coordenadas <span class="text-blue-500">(se actualizan solas)</span>
                            </p>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Latitud</p>
                                    <p id="df-display-lat" class="text-sm font-mono font-bold text-slate-700">
                                        ${parseFloat(lat).toFixed(6)}
                                    </p>
                                </div>
                                <div class="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Longitud</p>
                                    <p id="df-display-lng" class="text-sm font-mono font-bold text-slate-700">
                                        ${parseFloat(lng).toFixed(6)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Inputs hidden -->
                        <input type="hidden" id="df-lat"  value="${lat}">
                        <input type="hidden" id="df-lng"  value="${lng}">
                        <input type="hidden" id="df-direccion-texto-hidden" value="${direccion_texto}">
                    </div>
                </div>
            </div>
        </div>`;
    },

    // ─────────────────────────────────────────────
    // INIT MAPA
    // ─────────────────────────────────────────────
    _initMapa() {
        const { lat, lng, zoom } = this._estado;

        this._map = L.map('df-map', { center: [lat, lng], zoom, zoomControl: true });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors', maxZoom: 19
        }).addTo(this._map);

        const icono = L.divIcon({
            className: '',
            html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;
                               background:linear-gradient(135deg,#3b82f6,#2563eb);
                               border:3px solid white;box-shadow:0 4px 16px rgba(59,130,246,0.5);
                               transform:rotate(-45deg);cursor:grab;"></div>`,
            iconSize: [32, 32], iconAnchor: [16, 32]
        });

        this._marker = L.marker([lat, lng], { draggable: true, icon: icono }).addTo(this._map);

        this._marker.on('dragend', () => {
            const pos = this._marker.getLatLng();
            this._actualizarCoordenadas(pos.lat, pos.lng);
            this._geocodificacionInversa(pos.lat, pos.lng);
        });

        this._map.on('click', (e) => {
            this._marker.setLatLng(e.latlng);
            this._actualizarCoordenadas(e.latlng.lat, e.latlng.lng);
            this._geocodificacionInversa(e.latlng.lat, e.latlng.lng);
        });
    },

    // ─────────────────────────────────────────────
    // GEOCODIFICACIÓN INVERSA (Nominatim)
    // ─────────────────────────────────────────────
    async _geocodificacionInversa(lat, lng) {
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                { headers: { 'Accept-Language': 'es' } }
            );
            const data = await resp.json();
            const texto = data.display_name || '';

            const overlay = document.getElementById('df-direccion-overlay');
            const textoEl = document.getElementById('df-direccion-texto');
            const hidden = document.getElementById('df-direccion-texto-hidden');

            if (overlay) overlay.classList.remove('hidden');
            if (textoEl) textoEl.textContent = texto;
            if (hidden) hidden.value = texto;
        } catch (e) { }
    },

    // ─────────────────────────────────────────────
    // ACTUALIZAR COORDENADAS
    // ─────────────────────────────────────────────
    _actualizarCoordenadas(lat, lng) {
        this._estado.lat = lat;
        this._estado.lng = lng;

        const latF = parseFloat(lat).toFixed(6);
        const lngF = parseFloat(lng).toFixed(6);

        const iLat = document.getElementById('df-lat');
        const iLng = document.getElementById('df-lng');
        if (iLat) iLat.value = lat;
        if (iLng) iLng.value = lng;

        const dLat = document.getElementById('df-display-lat');
        const dLng = document.getElementById('df-display-lng');
        if (dLat) dLat.textContent = latF;
        if (dLng) dLng.textContent = lngF;

        const live = document.getElementById('df-coords-live');
        if (live) live.textContent = `${latF}, ${lngF}`;
    },

    // ─────────────────────────────────────────────
    // EVENTOS
    // ─────────────────────────────────────────────
    _bindEventos() {
        // Etiquetas rápidas
        document.querySelectorAll('.etiqueta-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.etiqueta;
                const input = document.getElementById('df-nombre-lugar');
                if (input) input.value = val;
                // Actualizar estilos
                document.querySelectorAll('.etiqueta-btn').forEach(b => {
                    b.className = b.className
                        .replace('bg-blue-600 text-white border-blue-600', 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300');
                });
                btn.className = btn.className
                    .replace('bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300', 'bg-blue-600 text-white border-blue-600');
                // Actualizar header
                const h = document.getElementById('df-titulo-header');
                if (h) h.textContent = val;
            });
        });

        // Nombre lugar manual
        document.getElementById('df-nombre-lugar')?.addEventListener('input', (e) => {
            const h = document.getElementById('df-titulo-header');
            if (h) h.textContent = e.target.value || 'Sin etiqueta';
        });

        // Departamento → volar mapa
        document.getElementById('df-id-departamento')?.addEventListener('change', (e) => {
            const dep = this._departamentos.find(d => d.id == e.target.value);
            if (dep && this._map && this._marker) {
                this._map.flyTo([dep.lat, dep.lng], dep.zoom_sugerido, { duration: 1.2 });
                this._marker.setLatLng([dep.lat, dep.lng]);
                this._actualizarCoordenadas(dep.lat, dep.lng);
            }
        });

        // Buscador Enter
        document.getElementById('df-buscador')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._buscarUbicacion();
        });
        document.getElementById('df-btn-buscar')?.addEventListener('click', () => this._buscarUbicacion());

        // Reset
        document.getElementById('df-btn-reset')?.addEventListener('click', () => {
            const dep = this._departamentos.find(d => d.id == document.getElementById('df-id-departamento')?.value)
                || this._departamentos[0];
            if (dep && this._map && this._marker) {
                this._map.flyTo([dep.lat, dep.lng], dep.zoom_sugerido, { duration: 1 });
                this._marker.setLatLng([dep.lat, dep.lng]);
                this._actualizarCoordenadas(dep.lat, dep.lng);
            }
        });

        // Cancelar
        document.getElementById('df-btn-cancelar')?.addEventListener('click', () => {
            Swal.fire({
                title: '<span class="text-slate-800 font-black uppercase text-sm">¿Salir sin guardar?</span>',
                html: `<div class="text-center"><p class="text-slate-500 text-sm">Los cambios no guardados <br><span class="text-slate-800 font-bold">se perderán.</span></p></div>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Seguir editando',
                confirmButtonColor: '#ef4444',
                customClass: {
                    popup: 'rounded-[32px] border-none shadow-2xl',
                    confirmButton: 'rounded-xl px-8 py-3 font-bold text-sm uppercase',
                    cancelButton: 'rounded-xl px-8 py-3 font-bold text-sm bg-slate-100 text-slate-500'
                }
            }).then(({ isConfirmed }) => {
                if (!isConfirmed) return;
                this._destruirMapa();
                if (this._onCancelar) this._onCancelar();
            });
        });

        // Guardar
        document.getElementById('df-btn-guardar')?.addEventListener('click', () => this._guardar());
    },

    // ─────────────────────────────────────────────
    // BUSCADOR NOMINATIM
    // ─────────────────────────────────────────────
    async _buscarUbicacion() {
        const input = document.getElementById('df-buscador');
        const query = input?.value?.trim();
        if (!query) return;

        const resultadosEl = document.getElementById('df-resultados-busqueda');
        if (resultadosEl) {
            resultadosEl.classList.remove('hidden');
            resultadosEl.innerHTML = `<div class="flex items-center gap-2 px-3 py-2 text-slate-400 text-[11px]">
                <span class="material-symbols-outlined text-[14px] animate-spin">autorenew</span> Buscando...</div>`;
        }

        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=4&countrycodes=bo`;
            const resp = await fetch(url, { headers: { 'Accept-Language': 'es' } });
            const data = await resp.json();

            if (!resultadosEl) return;

            if (data.length === 0) {
                resultadosEl.innerHTML = `<div class="px-3 py-2 text-slate-400 text-[11px] italic">Sin resultados</div>`;
                return;
            }

            resultadosEl.innerHTML = data.map(r => `
            <button class="df-res w-full text-left flex items-center gap-2 px-3 py-2.5
                           hover:bg-blue-50 transition-all text-[11px] font-medium text-slate-600
                           border-b border-slate-100 last:border-0"
                    data-lat="${r.lat}" data-lng="${r.lon}">
                <span class="material-symbols-outlined text-[14px] text-blue-400 flex-shrink-0">location_on</span>
                <span class="truncate">${r.display_name}</span>
            </button>`).join('');

            resultadosEl.querySelectorAll('.df-res').forEach(btn => {
                btn.addEventListener('click', () => {
                    const lat = parseFloat(btn.dataset.lat);
                    const lng = parseFloat(btn.dataset.lng);
                    if (this._map && this._marker) {
                        this._map.flyTo([lat, lng], 16, { duration: 1.2 });
                        this._marker.setLatLng([lat, lng]);
                        this._actualizarCoordenadas(lat, lng);
                        this._geocodificacionInversa(lat, lng);
                    }
                    resultadosEl.classList.add('hidden');
                    if (input) input.value = '';
                });
            });
        } catch (err) {
            if (resultadosEl)
                resultadosEl.innerHTML = `<div class="px-3 py-2 text-red-400 text-[11px]">Error al buscar.</div>`;
        }
    },

    // ─────────────────────────────────────────────
    // GUARDAR
    // ─────────────────────────────────────────────
    _guardar() {
        const id_usuario = document.getElementById('df-id-usuario')?.value;
        const id_departamento = parseInt(document.getElementById('df-id-departamento')?.value);
        const nombre_lugar = document.getElementById('df-nombre-lugar')?.value.trim() || 'Mi Casa';
        const referencia = document.getElementById('df-referencia')?.value.trim();
        const direccion_texto = document.getElementById('df-direccion-texto-hidden')?.value || '';
        const es_principal = document.getElementById('df-es-principal')?.checked || false;
        const lat = parseFloat(document.getElementById('df-lat')?.value);
        const lng = parseFloat(document.getElementById('df-lng')?.value);

        if (!id_usuario) {
            Swal.fire({
                icon: 'warning', title: '<span class="text-slate-800 font-black uppercase text-sm">Campo requerido</span>',
                text: 'Debes seleccionar un cliente.', confirmButtonColor: '#2563eb',
                customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
            });
            return;
        }
        if (!referencia) {
            Swal.fire({
                icon: 'warning', title: '<span class="text-slate-800 font-black uppercase text-sm">Campo requerido</span>',
                text: 'La referencia para el repartidor es obligatoria.', confirmButtonColor: '#2563eb',
                customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
            });
            document.getElementById('df-referencia')?.focus();
            return;
        }

        Swal.fire({
            title: `<span class="text-slate-800 font-black uppercase text-sm">
                        ${this._estado.esEdicion ? '¿Guardar Cambios?' : '¿Registrar Dirección?'}
                    </span>`,
            html: `<div class="text-center"><p class="text-slate-500 text-sm">
                        ${this._estado.esEdicion ? 'Se actualizarán los datos de la dirección' : 'Se registrará la nueva dirección'}: <br>
                        <span class="text-slate-800 font-bold">"${nombre_lugar}"</span>
                    </p></div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: this._estado.esEdicion ? 'Sí, guardar' : 'Sí, registrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2563eb',
            customClass: {
                popup: 'rounded-[32px] border-none shadow-2xl',
                confirmButton: 'rounded-xl px-8 py-3 font-bold text-sm uppercase transition-all hover:scale-105',
                cancelButton: 'rounded-xl px-8 py-3 font-bold text-sm bg-slate-100 text-slate-500'
            }
        }).then(({ isConfirmed }) => {
            if (!isConfirmed) return;
            this._destruirMapa();
            if (this._onGuardar)
                this._onGuardar({ id_usuario, id_departamento, nombre_lugar, lat, lng, referencia, direccion_texto, es_principal });
        });
    },

    // ─────────────────────────────────────────────
    // UTILIDADES
    // ─────────────────────────────────────────────
    _destruirMapa() {
        if (this._map) { try { this._map.remove(); } catch (e) { } this._map = null; this._marker = null; }
    },

    async _cargarLeaflet() {
        if (window.L) return;
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css'; link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
        await new Promise((resolve, reject) => {
            if (window.L) { resolve(); return; }
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }
};