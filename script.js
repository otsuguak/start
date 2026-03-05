// 1. CONFIGURACIÓN GLOBAL
const URL_API = "https://script.google.com/macros/s/AKfycbyzxwC0l7oJQ5JMBr8ePbhaivNVsQPsSDgtqrx3RDXCTVHMX5yk4w17huZmSRej-CEZ/exec";

let usuarioActual = "";
let rolActual = "";
let pqrSeleccionada = null; 
let datosGlobales = []; // <--- ¡AGREGA ESTA LÍNEA AQUÍ!

// --- FUNCIONES DE PANTALLA DE CARGA ---
function mostrarCarga() {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.classList.remove('hidden');
}

async function cargarDirectorio() {
    try {
        const resp = await fetch(`${URL_API}?action=get_config`);
        const data = await resp.json();
        document.getElementById('dir-admin').innerText = data.TelAdmin || "No registrado";
        document.getElementById('dir-porteria').innerText = data.TelPorteria || "No registrado";
        document.getElementById('dir-emergencia').innerText = data.TelEmergencia || "No registrado";
    } catch(e) { console.log("Error cargando directorio"); }
}

function ocultarCarga() {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.classList.add('hidden');
}

// --- FUNCIONES DE NAVEGACIÓN (Pégalas al inicio de script.js) ---

function mostrarLogin() {
    // Ocultamos todo menos el Login
    document.getElementById('register-section').classList.add('hidden');
    document.getElementById('recovery-section').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    
    // Mostramos el Login
    document.getElementById('login-section').classList.remove('hidden');
    
    // Limpiamos formularios por si acaso
    limpiarFormulario(); 
}


// Asegúrate de que esta función también exista
function limpiarFormulario() {
    document.getElementById('reg-nombre').value = "";
    document.getElementById('reg-email').value = "";
    document.getElementById('reg-inmueble').value = "";
    document.getElementById('reg-pass').value = "";
    document.getElementById('reg-pass-confirm').value = "";
    if(document.getElementById('captcha')) document.getElementById('captcha').checked = false;
}

// --- NAVEGACIÓN ---
function mostrarRegistro() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('register-section').classList.remove('hidden');
}

// --- FUNCIONES DE RECUPERACIÓN (Pégalas en script.js) ---

function mostrarRecuperacion() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('register-section').classList.add('hidden');
    document.getElementById('recovery-section').classList.remove('hidden');
}

function ocultarRecuperacion() {
    document.getElementById('recovery-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
}

async function recuperarContrasena() {
    const email = document.getElementById('rec-email').value.trim();
    const inmueble = document.getElementById('rec-inmueble').value.trim();
    const newPass = document.getElementById('rec-pass').value;

    if (!email || !inmueble || !newPass) return mostrarMensaje("Completa todos los campos.");

    const passEncriptada = CryptoJS.SHA256(newPass).toString();
    const btn = document.querySelector("#recovery-section button");
    const originalText = btn.innerText;
    
    btn.innerText = "Procesando...";
    btn.disabled = true;

    try {
        // Asegúrate de que URL_API esté definida al inicio de tu archivo
        await fetch(URL_API, {
            method: 'POST',
//            mode: 'no-cors',
            body: JSON.stringify({
                action: "reset_pass",
                email: email,
                inmueble: inmueble,
                newPass: passEncriptada
            })
        });
        mostrarMensaje("Solicitud enviada. Si los datos coinciden, usa tu nueva contraseña.");
        ocultarRecuperacion();
    } catch (e) {
        mostrarMensaje("Error de conexión");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- LOGICA DE LOGIN REAL ---
async function login() {
    const email = document.getElementById('email-input').value.trim();
    const pass = document.getElementById('pass-input').value;
    const role = document.getElementById('role-input').value;

    if (!email || !pass) return mostrarMensaje("Por favor, ingresa correo y contraseña.");

    const passEncriptada = CryptoJS.SHA256(pass).toString();
    const btn = document.querySelector("#login-section button");
    const originalText = btn.innerText;
    btn.innerText = "Validando...";
    btn.disabled = true;

    // ENCENDEMOS LA CARGA
    mostrarCarga();

   try {
        const url = `${URL_API}?action=login&email=${email}&pass=${passEncriptada}&rol=${role}`;
        const resp = await fetch(url);
        const resultado = await resp.json();

        if (resultado.auth) {
            usuarioActual = email;
            rolActual = role;

            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');// --- CAMBIO AQUÍ ---
            // Intenta usar el nombre de la BD, si no lo encuentra, usa el correo temporalmente
            const nombreMostrar = resultado.nombre ? resultado.nombre : usuarioActual;
            document.getElementById('welcome-text').innerText = `Hola, ${nombreMostrar}`;
            // -------------------

            document.getElementById('role-badge').innerText = rolActual;

            if (rolActual === 'usuario') {
                document.getElementById('form-container').classList.remove('hidden');
                document.getElementById('menu-admin-noticias')?.classList.add('hidden');
                document.getElementById('menu-admin-config')?.classList.add('hidden');
            } else {
                document.getElementById('form-container').classList.add('hidden');
                // Habilitamos el menú de admin
                document.getElementById('menu-admin-noticias')?.classList.remove('hidden');
                document.getElementById('menu-admin-config')?.classList.remove('hidden');
            }

            await cargarDatosReales();
            await cargarDirectorio(); // NUEVO: Carga los números al iniciar sesión
        } else {
            mostrarMensaje("Atención", "Acceso denegado. Verifica correo, clave o rol.", "error");
        }
    } catch (e) {
        console.error(e);
        mostrarMensaje("Error", "Error de conexión con el servidor.", "error");
    } finally {
        // APAGAMOS LA CARGA SIEMPRE AL TERMINAR Y RESTAURAMOS EL BOTÓN
        ocultarCarga();
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- LÓGICA DE LA MODAL (CORREGIDA) ---
function verDetalle(id) {
    // 1. Buscamos el caso específico en la memoria usando el ID
    const caso = datosGlobales.find(item => item.ID === id);

    if (!caso) return mostrarMensaje("No se pudo cargar la información del caso.");

    pqrSeleccionada = id;
    document.getElementById('modal-detalle').classList.remove('hidden');
    
    // 2. Llenamos los datos desde el objeto encontrado
    document.getElementById('det-id').innerText = caso.ID;
    document.getElementById('det-desc').innerText = caso.Descripcion || "Sin descripción";
    document.getElementById('det-email').innerText = caso.Email || "Desconocido";
    document.getElementById('det-estado').innerText = caso.Estado || "Abierto";

    // SOLO DECLARAMOS LA VARIABLE UNA VEZ AQUÍ
    const respuestaActual = caso.Respuesta || "";
    document.getElementById('det-respuesta-texto').innerText = respuestaActual || "Aún no hay una respuesta registrada en este caso.";

    // 3. Lógica según el rol
    if (rolActual === 'usuario') {
        // Al usuario le ocultamos los controles de edición y le mostramos la lectura
        document.getElementById('seccion-respuesta').classList.add('hidden');
        document.getElementById('vista-respuesta-usuario').classList.remove('hidden');
    } else {
        // Lógica para Agente
        document.getElementById('seccion-respuesta').classList.remove('hidden');
        
        // Si ya hay una respuesta guardada, se la mostramos al agente para que recuerde
        if (respuestaActual) {
            document.getElementById('vista-respuesta-usuario').classList.remove('hidden');
        } else {
            // Si es un caso nuevo y no hay respuesta, ocultamos el cuadro verde
            document.getElementById('vista-respuesta-usuario').classList.add('hidden');
        }
        
        // Limpiamos el campo para escribir una NUEVA respuesta
        document.getElementById('input-respuesta').value = ""; 
        
        // Ajustamos el selector de estado según como esté el caso
        const estadoActual = caso.Estado || "Abierto";
        const selector = document.getElementById('input-estado');
        if (selector) {
            selector.value = (estadoActual === 'Cerrado') ? 'Cerrado' : 'En Proceso';
        }
    }
}

function cerrarModal() {
    document.getElementById('modal-detalle').classList.add('hidden');
    document.getElementById('input-respuesta').value = ""; 
}

// --- VERSIÓN PROFESIONAL PARA AGENTES ---
async function guardarRespuesta() {
    const respuestaTexto = document.getElementById('input-respuesta').value;
    const nuevoEstado = document.getElementById('input-estado').value;

    // Validación bonita
    if (!respuestaTexto) {
        return mostrarMensaje("Falta información", "Por favor escribe una respuesta para el usuario antes de guardar.", "error");
    }

    const btn = document.querySelector("#seccion-respuesta button");
    const textoOriginal = btn.innerText;
    btn.innerText = "Guardando...";
    btn.disabled = true;

    const datosActualizacion = {
        action: "update_pqr",
        id: pqrSeleccionada,
        respuesta: respuestaTexto,
        estado: nuevoEstado
    };

    // ENCENDEMOS LA PANTALLA DE CARGA
    mostrarCarga();
    try {
        await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify(datosActualizacion)
        });

        // 1. Primero cerramos el modal de trabajo para limpiar la pantalla
        cerrarModal();

        // 2. Mostramos el mensaje de ÉXITO con el diseño bonito
        mostrarMensaje("¡Gestión Guardada!", "El caso ha sido actualizado y notificado correctamente.", "success");
        
        // 3. Recargamos la tabla para ver el cambio
        setTimeout(async () => {
            await cargarDatosReales();
        }, 1000); 

    } catch (e) {
        console.error(e);
        mostrarMensaje("Error", "No se pudo guardar la respuesta. Intenta nuevamente.", "error");
    } finally {
        // APAGAMOS LA PANTALLA DE CARGA
        ocultarCarga();
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
}

// --- FUNCIONES PARA LA VENTANA EMERGENTE (NUEVO) ---
function mostrarMensaje(titulo, texto, tipo = 'info') {
    const modal = document.getElementById('msg-modal');
    const content = document.getElementById('msg-modal-content');
    const titleEl = document.getElementById('msg-title');
    const bodyEl = document.getElementById('msg-body');
    const iconEl = document.getElementById('msg-icon');

    titleEl.innerText = titulo;
    bodyEl.innerText = texto;
    modal.classList.remove('hidden');

    // Estilos según tipo
    if (tipo === 'error') {
        content.classList.replace('border-blue-600', 'border-red-500'); // Borde rojo
        content.classList.replace('border-green-600', 'border-red-500');
        iconEl.innerHTML = `<svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else if (tipo === 'success') {
        content.classList.replace('border-red-500', 'border-green-600'); // Borde verde
        content.classList.replace('border-blue-600', 'border-green-600');
        iconEl.innerHTML = `<svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else {
        content.classList.replace('border-red-500', 'border-blue-600');
        content.classList.replace('border-green-600', 'border-blue-600');
        iconEl.innerHTML = `<svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }
}

function cerrarMensaje() {
    document.getElementById('msg-modal').classList.add('hidden');
}


// --- LOGICA DE REGISTRO CORREGIDA ---
async function registrarUsuario() {
    // 1. Obtener datos del formulario
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const rol = document.getElementById('reg-rol').value;
    const inmueble = document.getElementById('reg-inmueble').value;
    const pass = document.getElementById('reg-pass').value;
    const passConfirm = document.getElementById('reg-pass-confirm').value;
    const captcha = document.getElementById('captcha').checked;

    // 2. Validaciones básicas
    if (!nombre || !email || !pass || !inmueble) return mostrarMensaje("Faltan datos", "Todos los campos son obligatorios.", "error");
    if (pass !== passConfirm) return mostrarMensaje("Error", "Las contraseñas no coinciden.", "error");
    if (!captcha) return mostrarMensaje("Seguridad", "Por favor confirma que no eres un robot.", "error");

    const passEncriptada = CryptoJS.SHA256(pass).toString();

    const nuevoUsuario = {
        action: "register",
        nombre: nombre,
        email: email,
        rol: rol,
        inmueble: inmueble,
        password: passEncriptada
    };

    // 3. Feedback visual (Botón)
    const btn = document.querySelector("#register-section button");
    const textoOriginal = btn.innerText;
    btn.innerText = "Procesando...";
    btn.disabled = true;
    // ENCENDEMOS LA PANTALLA DE CARGA
    mostrarCarga();
    try {
        // 4. Petición al servidor
        const response = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify(nuevoUsuario)
        });

        // Leemos la respuesta como texto plano primero para evitar errores de parseo
        const textoRespuesta = await response.text();
        console.log("Respuesta Google:", textoRespuesta); // Para depuración

        // --- ZONA DE CORRECCIÓN ---
        
        // A. Si la respuesta contiene explícitamente "error", mostramos el error.
        // Esto cubre el caso de "Ya existe agente" o "Correo duplicado".
        if (textoRespuesta.includes('"result":"error"') || textoRespuesta.includes('"result": "error"')) {
            // Intentamos extraer el mensaje limpio
            try {
                const jsonError = JSON.parse(textoRespuesta);
                mostrarMensaje("Atención", jsonError.message, "error");
            } catch (e) {
                // Si no es JSON pero dice error, mensaje genérico
                mostrarMensaje("Atención", "El usuario o agente ya existe.", "error");
            }
            // NO limpiamos formulario aquí para que puedan corregir (como hiciste al cambiar de Agente a Usuario)
            return; 
        }

        // B. SI LLEGAMOS AQUÍ: No hubo error explícito.
        // Aunque Google responda HTML raro o JSON, si no dijo "error", asumimos ÉXITO.
        // Esto elimina el mensaje de "Revisa tu conexión" cuando el registro sí funcionó.
        
        mostrarMensaje("¡Registro Exitoso!", "Tu cuenta ha sido creada. Ya puedes iniciar sesión.", "success");
        limpiarFormulario(); // Aquí SÍ limpiamos porque ya terminó todo bien.
        mostrarLogin();

    } catch (error) {
        // Este bloque solo se activa si REALMENTE no hay internet o el servidor no responde nada (Time out)
        console.error("Fallo grave:", error);
        mostrarMensaje("Revisa tu conexión", "Hubo un problema de red, pero verifica si puedes iniciar sesión.", "error");
    } finally {
        ocultarCarga();
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
}

// --- LOGICA DE PQRs ---
async function enviarPQR() {
    const descElement = document.getElementById('pqr-desc');
    const tipoElement = document.getElementById('pqr-tipo');

    if (!descElement || !descElement.value) return mostrarMensaje("Escribe una descripción");

    const datos = {
        email: usuarioActual,
        tipo: tipoElement.value,
        descripcion: descElement.value
    };

    // 1. ENCENDEMOS LA PANTALLA DE CARGA AQUÍ
    mostrarCarga();

    try {
        await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify(datos)
        });

        mostrarMensaje("¡Datos enviados con éxito!", "Tu solicitud ha sido registrada.", "success");
        descElement.value = ""; 
        await cargarDatosReales(); 
    } catch (error) {
        console.error("Error al enviar:", error);
        mostrarMensaje("Error", "Hubo un problema al enviar la PQR.", "error");
    } finally {
        // 2. APAGAMOS LA PANTALLA DE CARGA AL FINALIZAR (así haya error o éxito)
        ocultarCarga();
    }
}

async function cargarDatosReales() {
    mostrarCarga(); // Encendemos la carga
    try {
        const urlFinal = `${URL_API}?email=${encodeURIComponent(usuarioActual)}&rol=${rolActual}&t=${new Date().getTime()}`;
        const respuesta = await fetch(urlFinal);
        const datos = await respuesta.json(); // Asegúrate de que esto sea .json() directamente

        renderizarTabla(datos);
        actualizarGrafica(datos);
    } catch (error) {
        console.log("Error de lectura de datos:", error);
    } finally {
        ocultarCarga(); // Apagamos la carga
    }
}

function renderizarTabla(datos) {
    const tableBody = document.getElementById('pqr-table-body');
    datosGlobales = datos; 

    if (!datos || datos.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500">No hay registros aún.</td></tr>`;
        return;
    }

    tableBody.innerHTML = datos.map(item => {
        const estadoReal = item.Estado || item.estado || 'Abierto';
        
        // Formatear Fecha Bonita (Ej: 13 Feb 2026)
        let fechaBonita = "---";
        if (item.Fecha) {
            const f = new Date(item.Fecha);
            // Truco para que no reste un día por zona horaria
            fechaBonita = f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        const colorClase = estadoReal.trim().toLowerCase() === 'cerrado' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : (estadoReal.trim().toLowerCase() === 'en proceso' ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-red-100 text-red-800 border border-red-200');

        return `
            <tr class="border-b hover:bg-slate-50 transition duration-150 text-sm">
                <td class="p-4 font-medium text-gray-700">${item.ID || '---'}</td>
                <td class="p-4 text-gray-500">${fechaBonita}</td> <td class="p-4 text-gray-600">${item.Email || '---'}</td>
                <td class="p-4 text-gray-600">${item.Tipo || '---'}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs font-bold shadow-sm ${colorClase}">
                        ${estadoReal}
                    </span>
                </td>
                <td class="p-4 text-center">
                    <button class="text-blue-600 hover:text-blue-800 font-semibold hover:underline" 
                        onclick="verDetalle('${item.ID}')">
                        Gestionar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function actualizarGrafica(datos) {
    const cerrados = datos.filter(d => (d.Estado || d.estado) === 'Cerrado').length;
    const abiertos = datos.filter(d => (d.Estado || d.estado) === 'Abierto').length;
    const procesos = datos.filter(d => (d.Estado || d.estado) === 'En Proceso').length;
    const total = cerrados + abiertos + procesos;

    const ctx = document.getElementById('myChart').getContext('2d');
    
    if (window.chartPQR) { window.chartPQR.destroy(); }

    window.chartPQR = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Abiertos (Pendientes)', 'En Gestión', 'Finalizados'],
            datasets: [{
                data: [abiertos, procesos, cerrados],
                backgroundColor: [
                    '#EF4444', // Rojo suave (Abierto)
                    '#F59E0B', // Naranja (Proceso)
                    '#10B981'  // Verde Esmeralda (Cerrado)
                ],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Permite que se adapte perfecto a su contenedor
            cutout: '75%', // Anillo fino elegante
            layout: {
                padding: 10
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12, family: "'Segoe UI', sans-serif" },
                        usePointStyle: true,
                        padding: 20
                    }
                },
                title: {
                    display: false // Lo apagamos aquí porque ya tienes un título <h3> en tu HTML
                }
            }
        },
        // Plugin mejorado para centrar perfectamente el texto
        plugins: [{
            id: 'textCenter',
            beforeDraw: function(chart) {
                const ctx = chart.ctx;
                
                // Obtenemos el área exacta donde se dibuja el gráfico (sin contar leyendas)
                const chartArea = chart.chartArea;
                if (!chartArea) return; // Si aún no se dibuja, esperamos

                const centerX = (chartArea.left + chartArea.right) / 2;
                const centerY = (chartArea.top + chartArea.bottom) / 2;

                ctx.restore();
                
                // 1. DIBUJAR EL NÚMERO
                ctx.font = "bold 3rem sans-serif"; // Tamaño fijo profesional
                ctx.textBaseline = "middle";
                ctx.textAlign = "center"; // Centrado perfecto horizontal
                ctx.fillStyle = "#1E293B"; // Un gris muy oscuro, casi azul
                
                // Subimos el número un poquitito (-10px) para dejar espacio a la palabra "Total"
                ctx.fillText(total.toString(), centerX, centerY - 10);

                // 2. DIBUJAR LA PALABRA "TOTAL" (Toque extra)
                ctx.font = "normal 1rem sans-serif";
                ctx.fillStyle = "#64748B"; // Gris suave
                ctx.fillText("Total", centerX, centerY + 22);

                ctx.save();
            }
        }]
    });
}

// Función para borrar todo lo que el usuario escribió
function limpiarFormulario() {
    document.getElementById('reg-nombre').value = "";
    document.getElementById('reg-email').value = "";
    document.getElementById('reg-inmueble').value = "";
    document.getElementById('reg-pass').value = "";
    document.getElementById('reg-pass-confirm').value = "";
    if(document.getElementById('captcha')) document.getElementById('captcha').checked = false;
}

// ==========================================
//  MÓDULO ADMIN PRO (SHEETS) - NOTICIAS Y CONFIG
// ==========================================

let noticiasAdminGlobal = [];

window.cerrarModalGeneral = (id) => document.getElementById(id).classList.add('hidden');

// --- NOTICIAS ---
window.abrirModalNoticias = async () => {
    document.getElementById('modal-admin-noticias').classList.remove('hidden');
    volverListaNoticias();
    await cargarNoticiasAdmin();
};

// Cuando le damos al botón "+ Añadir Noticia" (Limpia todo)
window.mostrarFormularioNoticia = () => {
    document.getElementById('vista-lista-noticias').classList.add('hidden');
    document.getElementById('vista-form-noticia').classList.remove('hidden');
    
    document.getElementById('noti-id').value = ""; // Limpiamos el ID fantasma
    document.getElementById('noti-titulo').value = "";
    document.getElementById('noti-resumen').value = "";
    document.getElementById('noti-contenido').value = "";
    document.getElementById('noti-imagen').value = "";
    document.getElementById('noti-fecha').valueAsDate = new Date();
    
    document.getElementById('btn-guardar-noti').innerText = "Publicar Noticia";
};

// NUEVA: Cuando le damos al lapicito (Llena el formulario con los datos)
window.editarNoticiaPro = (id) => {
    const noti = noticiasAdminGlobal.find(n => n.ID === id);
    if(!noti) return;

    document.getElementById('vista-lista-noticias').classList.add('hidden');
    document.getElementById('vista-form-noticia').classList.remove('hidden');

    document.getElementById('noti-id').value = noti.ID; // Guardamos el ID fantasma
    document.getElementById('noti-titulo').value = noti.Titulo || '';
    document.getElementById('noti-categoria').value = noti.Categoria || 'Informativo';
    document.getElementById('noti-resumen').value = noti.Resumen || '';
    document.getElementById('noti-imagen').value = noti.Imagen || '';
    document.getElementById('noti-contenido').value = noti.Contenido || '';

    // Arreglar la fecha para que el input la entienda
    if(noti.Fecha) {
        const d = new Date(noti.Fecha);
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        document.getElementById('noti-fecha').value = `${d.getFullYear()}-${mes}-${dia}`;
    }

    document.getElementById('btn-guardar-noti').innerText = "Actualizar Noticia";
};

window.volverListaNoticias = () => {
    document.getElementById('vista-form-noticia').classList.add('hidden');
    document.getElementById('vista-lista-noticias').classList.remove('hidden');
};

async function cargarNoticiasAdmin() {
    mostrarCarga();
    const tbody = document.getElementById('tabla-admin-noticias');
    try {
        const resp = await fetch(`${URL_API}?action=get_news`);
        const data = await resp.json();
        
        noticiasAdminGlobal = data.filter(n => n.Titulo && n.Titulo.toString().trim() !== "");
        
        document.getElementById('contador-noticias').innerText = noticiasAdminGlobal.length;
        const btnAdd = document.getElementById('btn-nueva-noticia');
        if (noticiasAdminGlobal.length >= 4) {
            btnAdd.classList.add('hidden'); 
        } else {
            btnAdd.classList.remove('hidden');
        }

        if (noticiasAdminGlobal.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">No hay noticias publicadas.</td></tr>';
            return;
        }

        tbody.innerHTML = noticiasAdminGlobal.map((noti, index) => {
            let colorClase = 'bg-blue-100 text-blue-800';
            if(noti.Categoria?.includes('Urgente')) colorClase = 'bg-red-100 text-red-800';
            if(noti.Categoria?.includes('Mantenimiento')) colorClase = 'bg-orange-100 text-orange-800';
            
            const f = noti.Fecha ? new Date(noti.Fecha).toLocaleDateString() : '--';

            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3 text-gray-500">${f}</td>
                    <td class="p-3 font-bold text-gray-800">${noti.Titulo}</td>
                    <td class="p-3"><span class="px-2 py-1 text-[10px] font-bold uppercase rounded ${colorClase}">${noti.Categoria || 'Info'}</span></td>
                    <td class="p-3 text-center">
                        <button onclick="editarNoticiaPro('${noti.ID}')" class="text-blue-500 hover:text-blue-700 p-2" title="Modificar"><i class="fas fa-edit"></i></button>
                        <button onclick="borrarNoticiaPro('${noti.ID}')" class="text-red-500 hover:text-red-700 p-2" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">Error al cargar.</td></tr>';
    } finally {
        ocultarCarga();
    }
}

// Convertidor de Imagen para enviarla a Google Sheets/Drive
function leerImagenComoBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ nombre: file.name, tipo: file.type, base64: reader.result.split(',')[1] });
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

window.guardarNoticiaPro = async () => {
    const idNoticia = document.getElementById('noti-id').value; // Leemos el ID oculto
    const titulo = document.getElementById('noti-titulo').value.trim();
    const resumen = document.getElementById('noti-resumen').value.trim();
    const categoria = document.getElementById('noti-categoria').value;
    const fecha = document.getElementById('noti-fecha').value;
    const contenido = document.getElementById('noti-contenido').value.trim();
    const imagenUrl = document.getElementById('noti-imagen').value.trim(); 

    if (!titulo || !resumen || !contenido || !fecha) {
        return Swal.fire("Atención", "Título, resumen, fecha y contenido son obligatorios.", "warning");
    }

    mostrarCarga();
    try {
        const payload = {
            action: idNoticia ? "edit_news" : "save_news", // Si hay ID, edita. Si no, crea.
            id: idNoticia,
            titulo: titulo,
            resumen: resumen,
            categoria: categoria,
            fecha: fecha,
            contenido: contenido,
            imagenUrl: imagenUrl 
        };

        const response = await fetch(URL_API, { method: 'POST', body: JSON.stringify(payload) });
        const textoServidor = await response.text(); 

        if (textoServidor.includes('"error"')) {
            let msg = "El servidor rechazó la noticia.";
            try { msg = JSON.parse(textoServidor).message || msg; } catch(e) {}
            return Swal.fire("Error", msg, "error");
        }

        const mensajeExito = idNoticia ? "La noticia se actualizó correctamente." : "La noticia se guardó correctamente.";
        Swal.fire("¡Listo!", mensajeExito, "success");
        
        volverListaNoticias();
        setTimeout(async () => { await cargarNoticiasAdmin(); }, 1500);

    } catch (e) {
        Swal.fire("Error de Conexión", "No se pudo comunicar con el servidor.", "error");
    } finally {
        ocultarCarga();
    }
};

window.borrarNoticiaPro = async (idNoticia) => {
    // ¡Adiós recuadro feo del navegador! Usamos SweetAlert2
    const result = await Swal.fire({
        title: '¿Eliminar Noticia?',
        text: "Esta acción la borrará de la cartelera y de Google Drive.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return; // Si el administrador cancela, no hacemos nada

    mostrarCarga();
    try {
        await fetch(URL_API, { 
            method: 'POST', 
            body: JSON.stringify({ action: "delete_news", id: idNoticia }) 
        });
        
        // Mensaje de éxito hermoso
        Swal.fire('¡Borrada!', 'La noticia fue eliminada correctamente.', 'success');
        await cargarNoticiasAdmin(); // Recargamos la tabla
    } catch (e) {
        Swal.fire('Error', 'Fallo la conexión al intentar borrar.', 'error');
    } finally {
        ocultarCarga();
    }
};

// --- CONFIGURACIÓN CARTELERA ---
// --- CONFIGURACIÓN CARTELERA Y DIRECTORIO ---
window.abrirModalConfig = async () => {
    document.getElementById('modal-admin-config').classList.remove('hidden');
    mostrarCarga();
    try {
        const resp = await fetch(`${URL_API}?action=get_config`);
        const data = await resp.json();
        if(data) {
            document.getElementById('conf-titulo-form').value = data.TituloFormulario || "";
            document.getElementById('conf-url-form').value = data.UrlGimnasio || "";
            document.getElementById('conf-tel-admin').value = data.TelAdmin || "";
            document.getElementById('conf-tel-porteria').value = data.TelPorteria || "";
            document.getElementById('conf-tel-emergencia').value = data.TelEmergencia || "";
        }
    } catch(e) { console.log(e); }
    ocultarCarga();
};

window.guardarConfiguracionPro = async () => {
    const titulo = document.getElementById('conf-titulo-form').value.trim();
    const url = document.getElementById('conf-url-form').value.trim();
    const tAdmin = document.getElementById('conf-tel-admin').value.trim();
    const tPort = document.getElementById('conf-tel-porteria').value.trim();
    const tEmer = document.getElementById('conf-tel-emergencia').value.trim();

    mostrarCarga();
    try {
        await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify({ 
                action: "save_config", 
                tituloForm: titulo, 
                urlForm: url,
                telAdmin: tAdmin,
                telPorteria: tPort,
                telEmergencia: tEmer
            })
        });
        Swal.fire("¡Guardado!", "Configuración y directorio actualizados.", "success");
        cerrarModalGeneral('modal-admin-config');
        cargarDirectorio(); // Refrescamos los números en la pantalla principal
    } catch (e) {
        Swal.fire("Error", "No se pudo guardar la configuración.", "error");
    } finally {
        ocultarCarga();
    }
};

// --- ABRIR MODAL DIRECTORIO TELEFÓNICO ---
window.abrirModalDirectorio = () => {
    document.getElementById('modal-directorio').classList.remove('hidden');
};