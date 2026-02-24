// ================= CONFIGURACIÓN =================
const URL_API = "https://script.google.com/macros/s/AKfycbwYJGsjmRHYxqBHe7NrC6SitY3kKIgRdxl4JXmOJcX71aajKL9qfvjtdKdRydO7x547/exec";

let noticiasGlobales = []; // Aquí guardaremos las noticias temporalmente

// Iniciar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarNoticias();
});

// --- FUNCIÓN PARA CARGAR Y DIBUJAR NOTICIAS ---
async function cargarNoticias() {
    const contenedor = document.getElementById('contenedor-noticias');
    const loader = document.getElementById('loading-overlay');
    
    try {
        const respuesta = await fetch(`${URL_API}?action=get_news`);
        const noticias = await respuesta.json();

        // 1. FILTRO MÁGICO: Ignoramos las filas del Excel que estén vacías
        const noticiasLimpias = noticias.filter(n => 
            (n.Titulo && n.Titulo.toString().trim() !== "") || 
            (n.Contenido && n.Contenido.toString().trim() !== "")
        );

        // 2. LÍMITE: Tomamos únicamente las primeras 6 noticias
        const noticiasFinales = noticiasLimpias.slice(0, 6);

        // 3. Guardamos esta lista limpia para que la ventana emergente funcione perfecto
        noticiasGlobales = noticiasFinales; 
        
        loader.classList.add('hidden'); // Apagamos la carga

        // Si después de limpiar no hay nada, mostramos el mensaje
        if (noticiasFinales.length === 0) {
            contenedor.innerHTML = `<div class="col-span-full p-8 text-center text-gray-500 bg-white rounded-lg shadow">No hay anuncios publicados por el momento.</div>`;
            return;
        }

        // Dibujamos las tarjetas usando nuestra lista final de máximo 6
        contenedor.innerHTML = noticiasFinales.map((noticia, index) => {
            let fechaBonita = "Fecha reciente";
            if (noticia.Fecha) {
                const f = new Date(noticia.Fecha);
                fechaBonita = f.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
            }

            // Imagen por defecto si la celda de Excel está vacía
            const imagenUrl = noticia.Imagen || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop';
            
            // Colores de categoría
            const categoria = noticia.Categoria || 'Anuncio';
            let colorCategoria = 'bg-blue-100 text-blue-800';
            if(categoria.toLowerCase().includes('urgente')) colorCategoria = 'bg-red-100 text-red-800';
            if(categoria.toLowerCase().includes('mantenimiento')) colorCategoria = 'bg-orange-100 text-orange-800';
            if(categoria.toLowerCase().includes('evento')) colorCategoria = 'bg-purple-100 text-purple-800';

            return `
                <article onclick="abrirNoticia(${index})" class="cursor-pointer bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full border border-gray-100 transform hover:-translate-y-1 group">
                    <div class="h-48 overflow-hidden relative">
                        <span class="absolute top-3 left-3 ${colorCategoria} text-xs font-bold px-2 py-1 rounded shadow-sm z-10 uppercase">${categoria}</span>
                        <img src="${imagenUrl}" alt="Imagen noticia" 
                            onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop';"
                            class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700">
                    </div>
                    <div class="p-6 flex flex-col flex-grow">
                        <p class="text-xs text-gray-400 font-semibold mb-2">${fechaBonita}</p>
                        <h4 class="text-xl font-bold text-gray-800 mb-3 leading-tight group-hover:text-blue-600 transition-colors">${noticia.Titulo || 'Sin título'}</h4>
                        <p class="text-gray-600 text-sm flex-grow line-clamp-4">${noticia.Contenido || ''}</p>
                        
                        <div class="mt-4 pt-4 border-t border-gray-100 text-blue-600 font-bold text-sm flex items-center justify-end">
                            Leer completo <svg class="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

    } catch (error) {
        console.error("Error:", error);
        loader.classList.add('hidden');
        contenedor.innerHTML = `<div class="col-span-full p-8 text-center text-red-500 bg-white rounded-lg shadow">Error de conexión al cargar noticias.</div>`;
    }
}

// --- FUNCIONES DE LA VENTANA EMERGENTE ---
function abrirNoticia(index) {
    const noticia = noticiasGlobales[index];
    if(!noticia) return;

    // 1. Textos principales
    document.getElementById('modal-titulo').innerText = noticia.Titulo || 'Sin título';
    document.getElementById('modal-contenido').innerText = noticia.Contenido || '';
    
    // 2. Categoría y colores
    const cat = noticia.Categoria || 'Anuncio';
    const catElement = document.getElementById('modal-categoria');
    catElement.innerText = cat;
    catElement.className = `text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm inline-block ${cat.toLowerCase().includes('urgente') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`;

    // 3. Fecha
    let fechaBonita = "";
    if (noticia.Fecha) {
        const f = new Date(noticia.Fecha);
        fechaBonita = f.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    document.getElementById('modal-fecha').innerText = fechaBonita;

    // 4. Imagen (Declarada una sola vez)
    const imagenUrl = noticia.Imagen || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop';
    const imgModal = document.getElementById('modal-img');
    
    imgModal.src = imagenUrl;

    // Red de seguridad por si la imagen principal falla al abrir el modal
    imgModal.onerror = function() {
        this.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop';
    };

    // 5. Mostrar ventana
    document.getElementById('modal-noticia').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; 
}

function cerrarNoticia() {
    document.getElementById('modal-noticia').classList.add('hidden');
    document.body.style.overflow = 'auto'; 
}