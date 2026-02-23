export const registroView = {
    renderFormularioDatos(datos) {
        const contenedor = document.getElementById('app-registro');
        if (!contenedor) return;

        contenedor.innerHTML = `
            <div class="mx-auto w-full max-w-sm lg:w-96 animate-fade-in">
                <div class="mb-8 text-center lg:text-left">
                    <h2 class="text-3xl font-bold text-brand-dark">Datos de Identidad</h2>
                    <p class="text-sm text-slate-500">Verifica que tu nombre se haya distribuido correctamente.</p>
                </div>

                <form id="form-finalizar-registro" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-brand-dark mb-1">Cédula de Identidad (CI)</label>
                        <input type="text" name="ci" required class="w-full rounded-xl border-slate-200 focus:ring-brand-primary/20">
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-brand-dark mb-1">Nombre(s)</label>
                        <input type="text" name="nombres" value="${datos.nombres}" required 
                            class="w-full rounded-xl border-slate-200 bg-slate-50">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-brand-dark mb-1">Ap. Paterno</label>
                            <input type="text" name="apellido_paterno" value="${datos.paterno}" required 
                                class="w-full rounded-xl border-slate-200 bg-slate-50">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-brand-dark mb-1">Ap. Materno</label>
                            <input type="text" name="apellido_materno" value="${datos.materno}" required 
                                class="w-full rounded-xl border-slate-200">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-brand-dark mb-1">Celular</label>
                        <input type="tel" name="celular" required class="w-full rounded-xl border-slate-200">
                    </div>

                    <button type="submit" class="w-full bg-brand-dark hover:bg-brand-primary text-white font-bold py-3.5 rounded-xl transition-all uppercase tracking-widest text-sm">
                        Activar Cuenta
                    </button>
                </form>
            </div>
        `;
    }
};