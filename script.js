/* =====================================================================
   1. CONFIGURACIÓN Y ESTADO GLOBAL
   ===================================================================== */
const IMGBB_API_KEY = "3f569ba6339a1968b75ea5fc7a82169c";
const WHATSAPP_NUMERO = "573202654167";
const ADMIN_PASS = "spinella2026";
const ORDEN_CATEGORIAS = ["Anillos", "Cadenas", "Pulseras", "Aretes"];

const PLANTILLA_FICHA_TECNICA = `Material Principal: Plata 925
Revestimiento: Oro 14K
Incrustación: N/A
Color: Dorado
Medidas: 
Peso: `;

const firebaseConfig = {
    apiKey: "AIzaSyA2NOClkIKgwN6v4vynhYd5aX1G74MDsGU",
    authDomain: "spinella-jewelry.firebaseapp.com",
    databaseURL: "https://spinella-jewelry-default-rtdb.firebaseio.com/",
    projectId: "spinella-jewelry",
    storageBucket: "spinella-jewelry.firebasestorage.app",
    messagingSenderId: "664464145046",
    appId: "1:664464145046:web:c7b0954c13890f8ccb60b7"
};

let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} catch (error) {
    console.warn("Aviso: Firebase no configurado correctamente todavía.");
}

let inventario = [];
let carrito = [];
let categoriaActiva = "Todos";
let productoDetalleActual = null;
let carruselIndex = 0;
let autoPlayInterval;

// Estado del visor Lightbox de Zoom
let lightboxImagenes = [];
let lightboxIndice = 0;
let lightboxZoomActivo = false;

/* =====================================================================
   2. INICIALIZACIÓN, SCROLL MÓVIL Y SINCRONIZACIÓN DE DATOS
   ===================================================================== */
window.onload = function() {
    cargarInventario();
    inicializarGestosLightbox();
    inicializarScrollNavbar();
};

function inicializarScrollNavbar() {
    const navbar = document.getElementById('main-navbar');
    if (!navbar) return;

    const actualizarEstadoNavbar = () => {
        if (window.innerWidth > 768) {
            navbar.classList.remove('navbar-scrolled');
            return;
        }
        const scrollActual = window.scrollY || window.pageYOffset;
        if (scrollActual > 45) {
            navbar.classList.add('navbar-scrolled');
        } else if (scrollActual < 15) {
            navbar.classList.remove('navbar-scrolled');
        }
    };

    window.addEventListener('scroll', actualizarEstadoNavbar, { passive: true });
    window.addEventListener('resize', actualizarEstadoNavbar);
}

function cargarInventario() {
    if (!db) return;
    db.ref('productos').on('value', (snapshot) => {
        inventario = [];
        snapshot.forEach((childSnapshot) => {
            const producto = childSnapshot.val();
            producto.id = childSnapshot.key;
            inventario.push(producto);
        });

        aplicarFiltros();
        actualizarCarrusel();
        renderizarTablaAdmin();
        if (typeof renderizarEstadisticas === "function") renderizarEstadisticas();
    });
}

/* =====================================================================
   3. UTILIDADES (FORMATO DE MONEDA Y CÁLCULO DE TALLAS)
   ===================================================================== */
function formatoCOP(valor) {
    const numeroFormateado = Number(valor).toLocaleString('es-CO', {
        minimumFractionDigits: 0
    });
    return "COP " + numeroFormateado;
}

function obtenerDatosTalla(mm) {
    if (!mm || mm < 44.0 || mm > 67.8) {
        return { valida: false, talla: "Ingresa una medida entre 44.0 y 67.8 mm", nota: "" };
    }

    const rangos = [
        { min: 44.0, max: 44.7, talla: "Talla 3", next: "Talla 3.5" },
        { min: 44.8, max: 46.0, talla: "Talla 3.5", next: "Talla 4" },
        { min: 46.1, max: 47.3, talla: "Talla 4", next: "Talla 4.5" },
        { min: 47.4, max: 48.6, talla: "Talla 4.5", next: "Talla 5" },
        { min: 48.7, max: 49.9, talla: "Talla 5", next: "Talla 5.5" },
        { min: 50.0, max: 51.1, talla: "Talla 5.5", next: "Talla 6" },
        { min: 51.2, max: 52.4, talla: "Talla 6", next: "Talla 6.5" },
        { min: 52.5, max: 53.7, talla: "Talla 6.5", next: "Talla 7" },
        { min: 53.8, max: 55.0, talla: "Talla 7", next: "Talla 7.5" },
        { min: 55.1, max: 56.2, talla: "Talla 7.5", next: "Talla 8" },
        { min: 56.3, max: 57.5, talla: "Talla 8", next: "Talla 8.5" },
        { min: 57.6, max: 58.8, talla: "Talla 8.5", next: "Talla 9" },
        { min: 58.9, max: 60.1, talla: "Talla 9", next: "Talla 9.5" },
        { min: 60.2, max: 61.3, talla: "Talla 9.5", next: "Talla 10" },
        { min: 61.4, max: 62.6, talla: "Talla 10", next: "Talla 10.5" },
        { min: 62.7, max: 63.9, talla: "Talla 10.5", next: "Talla 11" },
        { min: 64.0, max: 65.2, talla: "Talla 11", next: "Talla 11.5" },
        { min: 65.3, max: 66.5, talla: "Talla 11.5", next: "Talla 12" },
        { min: 66.6, max: 67.8, talla: "Talla 12", next: "Consulta con asesor" }
    ];

    const encontrado = rangos.find(r => mm >= r.min && mm <= r.max);
    if (!encontrado) return { valida: false, talla: "Medida fuera de rango", nota: "" };

    let nota = "";
    const umbralNota = parseFloat((encontrado.max - 0.2).toFixed(1));
    if (encontrado.next !== "Consulta con asesor" && mm >= umbralNota) {
        nota = `💡 Tu medida (${mm} mm) está en el límite superior. Te recomendamos la ${encontrado.next}.`;
    }

    return { valida: true, talla: encontrado.talla, nota };
}

/* =====================================================================
   4. CATÁLOGO POR SECCIONES, BÚSQUEDA Y FILTROS
   ===================================================================== */
function crearTarjetaProductoHTML(prod) {
    let textoBotonInactivo = "Agotado";
    let badgeText = "";
    let badgeColor = "";

    if (prod.agotado) {
        if (prod.prontoStock) {
            badgeText = "PRONTO EN STOCK";
            badgeColor = "#e67e22";
            textoBotonInactivo = "Pronto en Stock";
        } else {
            badgeText = "AGOTADO";
            badgeColor = "#8c1c13";
        }
    }

    const badgeHTML = badgeText
        ? `<div class="product-badge-status" style="background:${badgeColor};">${badgeText}</div>`
        : "";

    const btnTallaHTML = prod.categoria === "Anillos"
        ? `<button class="btn-talla" onclick="abrirSizeModal()">¿No sabes tu talla?</button>`
        : "";

    const btnCarritoHTML = prod.agotado
        ? `<button class="btn-add" style="background:#888; cursor:not-allowed;" disabled>${textoBotonInactivo}</button>`
        : `<button class="btn-add" onclick="agregarAlCarrito('${prod.id}')">Agregar a Wishlist</button>`;

    const estiloAgotado = prod.agotado ? "filter: grayscale(100%); opacity: 0.6;" : "";

    return `
        <div class="product-card">
            <div class="product-img-box" onclick="abrirDetalles('${prod.id}')" title="Toca para ver detalles">
                ${badgeHTML}
                <img src="${prod.imagen}" alt="${prod.nombre}" style="${estiloAgotado}">
            </div>
            <div class="product-title-box">
                <h3 class="product-title">${prod.nombre}</h3>
            </div>
            <div class="product-desc-box">
                <p class="product-desc">${prod.descripcion}</p>
            </div>
            <div class="product-price-box">
                <p class="product-price">${formatoCOP(prod.precio)}</p>
            </div>
            <div class="product-actions-box">
                ${btnTallaHTML}
                ${btnCarritoHTML}
            </div>
        </div>
    `;
}

function renderizarProductos(productos) {
    const contenedor = document.getElementById('productos-grid');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (!productos || productos.length === 0) {
        contenedor.innerHTML = `<p class="empty-catalog-msg">No se encontraron piezas que coincidan con tu búsqueda.</p>`;
        return;
    }

    const categoriasExtras = [...new Set(productos.map(p => (p.categoria || '').trim()))]
        .filter(c => c && !ORDEN_CATEGORIAS.some(oc => oc.toLowerCase() === c.toLowerCase()));
    const listaCategorias = [...ORDEN_CATEGORIAS, ...categoriasExtras];

    listaCategorias.forEach(categoria => {
        const itemsCategoria = productos
            .filter(p => (p.categoria || '').trim().toLowerCase() === categoria.toLowerCase())
            .sort((a, b) => (a.agotado === b.agotado ? 0 : a.agotado ? 1 : -1));

        if (itemsCategoria.length === 0) return;

        const seccion = document.createElement('section');
        seccion.className = 'category-section';
        seccion.innerHTML = `
            <div class="category-header">
                <h2 class="category-title">${categoria}</h2>
            </div>
            <div class="grid">
                ${itemsCategoria.map(crearTarjetaProductoHTML).join('')}
            </div>
        `;
        contenedor.appendChild(seccion);
    });
}

function aplicarFiltros() {
    const inputBuscador = document.getElementById('buscador');
    const texto = inputBuscador ? inputBuscador.value.trim().toLowerCase() : '';

    const filtrados = inventario.filter(prod => {
        const coincideCategoria = categoriaActiva === 'Todos' ||
            (prod.categoria || '').trim().toLowerCase() === categoriaActiva.toLowerCase();
        const coincideTexto = !texto ||
            (prod.nombre || '').toLowerCase().includes(texto) ||
            (prod.descripcion || '').toLowerCase().includes(texto) ||
            (prod.categoria || '').toLowerCase().includes(texto);
        return coincideCategoria && coincideTexto;
    });

    renderizarProductos(filtrados);
}

document.getElementById('buscador')?.addEventListener('input', aplicarFiltros);

function filtrarCategoria(categoria, btnElement) {
    categoriaActiva = categoria;
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    aplicarFiltros();
}

/* =====================================================================
   5. WISHLIST Y PEDIDO POR WHATSAPP
   ===================================================================== */
function agregarAlCarrito(id) {
    const producto = inventario.find(p => p.id === id);
    if (!producto) return;
    carrito.push(producto);
    document.getElementById('wishlist-count').innerText = carrito.length;
}

function abrirWishlist() {
    const modal = document.getElementById('wishlist-modal');
    const container = document.getElementById('wishlist-items');
    container.innerHTML = '';

    if (carrito.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--color-secundario-2);">Tu colección está vacía.</p>';
    } else {
        carrito.forEach((prod, index) => {
            container.innerHTML += `
                <div class="wishlist-item">
                    <img src="${prod.imagen}" alt="${prod.nombre}">
                    <div>
                        <h4 style="font-family: var(--fuente-general); color: var(--color-primario);">${prod.nombre}</h4>
                        <p style="color: var(--color-precio); font-weight: bold;">${formatoCOP(prod.precio)}</p>
                    </div>
                    <button onclick="eliminarDelCarrito(${index})" style="margin-left:auto; background:none; border:none; color:#8c1c13; cursor:pointer; font-weight:bold;">X</button>
                </div>
            `;
        });
    }
    modal.style.display = 'block';
}

function cerrarWishlist() {
    document.getElementById('wishlist-modal').style.display = 'none';
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    document.getElementById('wishlist-count').innerText = carrito.length;
    abrirWishlist();
}

function enviarAWhatsApp() {
    if (carrito.length === 0) {
        alert("Agrega productos a tu colección primero.");
        return;
    }

    let mensaje = "Hola Spinella, me encantaría comprar:%0A%0A";
    let total = 0;

    carrito.forEach(prod => {
        mensaje += `- ${prod.nombre} (${formatoCOP(prod.precio)})%0A`;
        total += Number(prod.precio);

        const ventasActuales = prod.compras || 0;
        db.ref('productos/' + prod.id).update({ compras: ventasActuales + 1 });
    });

    mensaje += `%0ATotal estimado: ${formatoCOP(total)}`;
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${mensaje}`, '_blank');

    carrito = [];
    document.getElementById('wishlist-count').innerText = 0;
    cerrarWishlist();
}

/* =====================================================================
   6. CALCULADORA DE TALLAS (PÁGINA PRINCIPAL)
   ===================================================================== */
function abrirSizeModal() { document.getElementById('size-modal').style.display = 'block'; }
function cerrarSizeModal() { document.getElementById('size-modal').style.display = 'none'; }

function calcularTalla() {
    const mm = parseFloat(document.getElementById('medida-mm').value);
    const resultado = document.getElementById('size-result');

    let notaDiv = document.getElementById('size-note');
    if (!notaDiv) {
        notaDiv = document.createElement('p');
        notaDiv.id = 'size-note';
        notaDiv.style.fontSize = '14px';
        notaDiv.style.color = '#8c1c13';
        notaDiv.style.marginTop = '10px';
        notaDiv.style.fontWeight = 'bold';
        resultado.parentNode.appendChild(notaDiv);
    }

    const datos = obtenerDatosTalla(mm);
    resultado.innerText = datos.valida ? datos.talla : "Ingresa una medida válida (ej: 48.5).";
    resultado.style.color = datos.valida ? "var(--color-primario)" : "#8c1c13";
    notaDiv.innerText = datos.nota;
}

/* =====================================================================
   7. CARRUSEL DE PIEZAS DESTACADAS
   ===================================================================== */
function actualizarCarrusel() {
    const track = document.getElementById('carousel-track');
    const seccionCarrusel = document.querySelector('.promotions-carousel');
    if (!track || !seccionCarrusel) return;

    track.innerHTML = '';
    const destacados = inventario.filter(prod => prod.destacado === true && !prod.agotado);

    if (destacados.length === 0) {
        seccionCarrusel.style.display = 'none';
        return;
    }

    seccionCarrusel.style.display = 'block';
    destacados.forEach(prod => {
        track.innerHTML += `
            <div class="carousel-item" onclick="abrirDetalles('${prod.id}')" style="cursor:pointer;">
                <img src="${prod.imagen}" alt="${prod.nombre}">
                <div class="carousel-info">
                    <h4>${prod.nombre}</h4>
                    <p>¡Pieza Exclusiva!</p>
                </div>
            </div>
        `;
    });
    iniciarAutoPlay();
}

function moverCarrusel(direccion) {
    const track = document.getElementById('carousel-track');
    const items = document.querySelectorAll('.carousel-item');
    if (!items.length) return;

    const totalItems = items.length;
    const itemsPorVista = window.innerWidth <= 768 ? 1 : 3;
    if (totalItems <= itemsPorVista) return;

    carruselIndex += direccion;
    if (carruselIndex > totalItems - itemsPorVista) carruselIndex = 0;
    else if (carruselIndex < 0) carruselIndex = totalItems - itemsPorVista;

    const itemWidth = items[0].offsetWidth + 20;
    track.style.transform = `translateX(-${carruselIndex * itemWidth}px)`;
    reiniciarAutoPlay();
}

function iniciarAutoPlay() {
    clearInterval(autoPlayInterval);
    autoPlayInterval = setInterval(() => moverCarrusel(1), 3000);
}

function reiniciarAutoPlay() {
    clearInterval(autoPlayInterval);
    iniciarAutoPlay();
}

/* =====================================================================
   8. MODAL INTERACTIVO DE DETALLES DEL PRODUCTO
   ===================================================================== */
function renderizarFichaTecnica(textoSpecs) {
    const container = document.getElementById('detalles-specs-list');
    const box = document.getElementById('detalles-specs-box');
    container.innerHTML = '';

    if (!textoSpecs || textoSpecs.trim() === '') {
        box.style.display = 'none';
        return;
    }

    let itemsRenderizados = 0;
    textoSpecs.split('\n').forEach(linea => {
        const limpia = linea.trim();
        if (!limpia) return;

        const idx = limpia.indexOf(':');
        if (idx !== -1) {
            const clave = limpia.substring(0, idx).trim();
            const valor = limpia.substring(idx + 1).trim();
            if (clave && valor) {
                container.innerHTML += `
                    <div class="spec-item">
                        <span class="spec-label">${clave}</span>
                        <span class="spec-value">${valor}</span>
                    </div>
                `;
                itemsRenderizados++;
            }
        } else {
            container.innerHTML += `
                <div class="spec-item spec-item-full">
                    <span class="spec-value">${limpia}</span>
                </div>
            `;
            itemsRenderizados++;
        }
    });

    box.style.display = itemsRenderizados > 0 ? 'block' : 'none';
}

function abrirDetalles(id) {
    const prod = inventario.find(p => p.id === id);
    if (!prod) return;
    productoDetalleActual = prod;

    document.getElementById('detalles-categoria').innerText = prod.categoria;
    document.getElementById('detalles-titulo').innerText = prod.nombre;
    document.getElementById('detalles-precio').innerText = formatoCOP(prod.precio);

    renderizarFichaTecnica(prod.especificaciones);

    const mediaGrid = document.getElementById('detalles-media-grid');
    const img1 = document.getElementById('detalles-img-1');
    const img2Wrap = document.getElementById('detalles-img-2-wrap');
    const img2 = document.getElementById('detalles-img-2');

    const urlSecundaria = prod.imagenSecundaria || prod.imagenFicha || "";
    const filtroAgotado = prod.agotado ? 'grayscale(100%)' : 'none';

    img1.src = prod.imagen;
    img1.style.filter = filtroAgotado;

    if (urlSecundaria) {
        img2.src = urlSecundaria;
        img2.style.filter = filtroAgotado;
        img2Wrap.style.display = 'block';
        mediaGrid.classList.remove('una-imagen');
    } else {
        img2.src = "";
        img2Wrap.style.display = 'none';
        mediaGrid.classList.add('una-imagen');
    }

    const badgeEl = document.getElementById('detalles-badge');
    const btnWishlist = document.getElementById('detalles-btn-wishlist');

    if (prod.agotado) {
        badgeEl.style.display = 'block';
        badgeEl.innerText = prod.prontoStock ? 'PRONTO EN STOCK' : 'AGOTADO';
        badgeEl.style.background = prod.prontoStock ? '#e67e22' : '#8c1c13';

        btnWishlist.disabled = true;
        btnWishlist.style.background = '#888';
        btnWishlist.style.cursor = 'not-allowed';
        btnWishlist.innerText = prod.prontoStock ? 'Pronto en Stock' : 'Agotado';
    } else {
        badgeEl.style.display = 'none';
        btnWishlist.disabled = false;
        btnWishlist.style.background = 'var(--color-primario)';
        btnWishlist.style.cursor = 'pointer';
        btnWishlist.innerText = 'Agregar a Wishlist';
    }

    const sizerBox = document.getElementById('detalles-ring-sizer');
    if (prod.categoria === 'Anillos') {
        sizerBox.style.display = 'block';
        document.getElementById('detalles-medida-slider').value = 52.0;
        document.getElementById('detalles-medida-mm').value = '';
        document.getElementById('detalles-size-result').innerText = 'Mueve el control o escribe tu medida';
        document.getElementById('detalles-size-result').style.color = 'var(--color-primario)';
        document.getElementById('detalles-size-note').innerText = '';
    } else {
        sizerBox.style.display = 'none';
    }

    document.getElementById('detalles-modal').style.display = 'block';
}

function sincronizarMedidaDetalle(origen) {
    const slider = document.getElementById('detalles-medida-slider');
    const input = document.getElementById('detalles-medida-mm');
    const resEl = document.getElementById('detalles-size-result');
    const noteEl = document.getElementById('detalles-size-note');

    let valor;
    if (origen === 'slider') {
        valor = parseFloat(slider.value);
        input.value = valor.toFixed(1);
    } else {
        valor = parseFloat(input.value);
        if (!isNaN(valor) && valor >= 44.0 && valor <= 67.8) {
            slider.value = valor;
        }
    }

    const datos = obtenerDatosTalla(valor);
    resEl.innerText = datos.talla;
    resEl.style.color = datos.valida ? 'var(--color-primario)' : '#8c1c13';
    noteEl.innerText = datos.nota;
}

function agregarDesdeDetalle() {
    if (!productoDetalleActual || productoDetalleActual.agotado) return;
    agregarAlCarrito(productoDetalleActual.id);

    const btn = document.getElementById('detalles-btn-wishlist');
    btn.innerText = '✓ Agregado a tu Colección';
    btn.style.background = '#2e6f40';

    setTimeout(() => {
        if (productoDetalleActual && !productoDetalleActual.agotado) {
            btn.innerText = 'Agregar a Wishlist';
            btn.style.background = 'var(--color-primario)';
        }
    }, 1400);
}

function cerrarDetalles() {
    cerrarLightbox();
    document.getElementById('detalles-modal').style.display = 'none';
    document.getElementById('detalles-img-1').src = "";
    document.getElementById('detalles-img-2').src = "";
    productoDetalleActual = null;
}

/* =====================================================================
   9. VISOR LIGHTBOX DE ZOOM INTERACTIVO
   ===================================================================== */
function abrirLightbox(indice) {
    if (!productoDetalleActual) return;

    const urlSecundaria = productoDetalleActual.imagenSecundaria || productoDetalleActual.imagenFicha || "";
    lightboxImagenes = [productoDetalleActual.imagen, urlSecundaria].filter(Boolean);
    if (lightboxImagenes.length === 0) return;

    lightboxIndice = Math.min(indice, lightboxImagenes.length - 1);
    actualizarVistaLightbox();

    document.getElementById('lightbox-modal').style.display = 'flex';
}

function actualizarVistaLightbox() {
    const imgEl = document.getElementById('lightbox-img');
    const counterEl = document.getElementById('lightbox-counter');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    resetearZoomLightbox();
    imgEl.src = lightboxImagenes[lightboxIndice];
    counterEl.innerText = `${lightboxIndice + 1} / ${lightboxImagenes.length}`;

    const mostrarFlechas = lightboxImagenes.length > 1 ? 'flex' : 'none';
    prevBtn.style.display = mostrarFlechas;
    nextBtn.style.display = mostrarFlechas;
}

function toggleZoomLightbox(event) {
    if (event) event.stopPropagation();
    const imgEl = document.getElementById('lightbox-img');
    const zoomBtn = document.getElementById('lightbox-zoom-btn');
    const hintEl = document.getElementById('lightbox-hint');

    lightboxZoomActivo = !lightboxZoomActivo;

    if (lightboxZoomActivo) {
        if (event && event.clientX !== undefined) {
            const rect = imgEl.getBoundingClientRect();
            const xPct = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
            const yPct = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
            imgEl.style.transformOrigin = `${xPct}% ${yPct}%`;
        } else {
            imgEl.style.transformOrigin = 'center center';
        }
        imgEl.classList.add('zoom-activo');
        zoomBtn.innerHTML = `<i class="fas fa-search-minus"></i> <span>Alejar</span>`;
        hintEl.innerText = "Mueve el cursor o desliza para explorar el detalle • Clic para alejar";
    } else {
        resetearZoomLightbox();
    }
}

function resetearZoomLightbox() {
    lightboxZoomActivo = false;
    const imgEl = document.getElementById('lightbox-img');
    const zoomBtn = document.getElementById('lightbox-zoom-btn');
    const hintEl = document.getElementById('lightbox-hint');

    if (imgEl) {
        imgEl.classList.remove('zoom-activo');
        imgEl.style.transformOrigin = 'center center';
    }
    if (zoomBtn) zoomBtn.innerHTML = `<i class="fas fa-search-plus"></i> <span>Acercar</span>`;
    if (hintEl) hintEl.innerText = "Toca o haz clic sobre la foto para hacer zoom";
}

function cambiarImagenLightbox(direccion, event) {
    if (event) event.stopPropagation();
    if (lightboxImagenes.length <= 1) return;

    lightboxIndice = (lightboxIndice + direccion + lightboxImagenes.length) % lightboxImagenes.length;
    actualizarVistaLightbox();
}

function cerrarLightbox() {
    resetearZoomLightbox();
    const modal = document.getElementById('lightbox-modal');
    if (modal) modal.style.display = 'none';
}

function cerrarLightboxFondo(event) {
    if (event.target === document.getElementById('lightbox-modal') ||
        event.target === document.getElementById('lightbox-stage')) {
        cerrarLightbox();
    }
}

function inicializarGestosLightbox() {
    const stage = document.getElementById('lightbox-stage');
    const imgEl = document.getElementById('lightbox-img');
    if (!stage || !imgEl) return;

    stage.addEventListener('mousemove', (e) => {
        if (!lightboxZoomActivo) return;
        const rect = stage.getBoundingClientRect();
        const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        imgEl.style.transformOrigin = `${xPct}% ${yPct}%`;
    });

    stage.addEventListener('touchmove', (e) => {
        if (!lightboxZoomActivo || e.touches.length !== 1) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = stage.getBoundingClientRect();
        const xPct = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
        const yPct = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
        imgEl.style.transformOrigin = `${xPct}% ${yPct}%`;
    }, { passive: false });
}

/* =====================================================================
   10. MODALES INFORMATIVOS Y CIERRE EXTERNO
   ===================================================================== */
function abrirInfoModal(seccion) {
    const modal = document.getElementById('info-modal');
    const titulo = document.getElementById('info-modal-title');
    const cuerpo = document.getElementById('info-modal-body');

    const contenidos = {
        garantia: { titulo: "Políticas de Garantía", id: "contenido-garantia" },
        mision: { titulo: "Nuestra Misión", id: "contenido-mision" },
        vision: { titulo: "Nuestra Visión", id: "contenido-vision" }
    };

    if (contenidos[seccion]) {
        titulo.innerText = contenidos[seccion].titulo;
        cuerpo.innerHTML = document.getElementById(contenidos[seccion].id).innerHTML;
        modal.style.display = 'block';
    }
}

function cerrarInfoModal() {
    document.getElementById('info-modal').style.display = 'none';
}

window.onclick = function(event) {
    if (event.target === document.getElementById('info-modal')) cerrarInfoModal();
    if (event.target === document.getElementById('detalles-modal')) cerrarDetalles();
    if (event.target === document.getElementById('wishlist-modal')) cerrarWishlist();
    if (event.target === document.getElementById('size-modal')) cerrarSizeModal();
};

/* =====================================================================
   11. PANEL DE ADMINISTRACIÓN (MODO OSCURO FIJO + FUENTE FUTURA)
   ===================================================================== */
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
        document.getElementById('admin-login-modal').style.display = 'block';
    }
    if (event.key === 'Escape') {
        const lightbox = document.getElementById('lightbox-modal');
        if (lightbox && lightbox.style.display === 'flex') {
            cerrarLightbox();
        } else if (document.getElementById('detalles-modal').style.display === 'block') {
            cerrarDetalles();
        }
    }
});

let contadorToques = 0;
let temporizadorToques;

function accesoSecretoMovil() {
    contadorToques++;
    if (contadorToques === 1) {
        temporizadorToques = setTimeout(() => { contadorToques = 0; }, 2000);
    }
    if (contadorToques === 5) {
        clearTimeout(temporizadorToques);
        contadorToques = 0;
        document.getElementById('admin-login-modal').style.display = 'block';
    }
}

function verificarAdmin() {
    const pass = document.getElementById('admin-password').value;
    if (pass === ADMIN_PASS) {
        document.getElementById('admin-login-modal').style.display = 'none';
        document.querySelector('.navbar').style.display = 'none';
        document.querySelector('.promotions-carousel').style.display = 'none';
        document.querySelector('.container').style.display = 'none';
        document.querySelector('.footer').style.display = 'none';

        if (!document.getElementById('admin-view-container')) {
            crearPanelAdmin();
        }
        document.getElementById('admin-view-container').style.display = 'block';
        renderizarTablaAdmin();
        renderizarEstadisticas();
    } else {
        alert("Contraseña incorrecta.");
    }
}

function salirAdmin() {
    document.getElementById('admin-view-container').style.display = 'none';
    document.querySelector('.navbar').style.display = 'flex';
    document.querySelector('.container').style.display = 'block';
    document.querySelector('.footer').style.display = 'block';
    actualizarCarrusel();
}

function crearPanelAdmin() {
    const adminHTML = `
    <div id="admin-view-container" class="admin-view">
        <div class="dashboard-layout">
            <aside class="sidebar">
                <div class="logo" style="cursor:default;">
                    <img src="image_289add.png" alt="Logo">
                    <span>SPINELLA</span>
                </div>
                <ul class="sidebar-menu">
                    <li><button class="active" onclick="cambiarPestana('nuevo-producto', this)">+ Formulario Joya</button></li>
                    <li><button onclick="cambiarPestana('inventario-lista', this)">📦 Ver Inventario</button></li>
                    <li><button onclick="cambiarPestana('estadisticas-avanzadas', this)">📊 Estadísticas</button></li>
                    <li><button class="btn-volver-tienda" onclick="salirAdmin()">← Volver a Tienda</button></li>
                </ul>
            </aside>
            <main class="dashboard-content">
                <section id="nuevo-producto" class="admin-section active">
                    <div class="admin-header">
                        <h2 id="titulo-form-producto">Agregar Nueva Joya</h2>
                    </div>
                    <div class="admin-card">
                        <form id="form-producto" onsubmit="guardarProducto(event)">
                            <input type="hidden" id="prod-id" value="">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Nombre de la Pieza</label>
                                    <input type="text" id="prod-nombre" required>
                                </div>
                                <div class="form-group">
                                    <label>Categoría</label>
                                    <select id="prod-categoria" required>
                                        <option value="Anillos">Anillos</option>
                                        <option value="Cadenas">Cadenas</option>
                                        <option value="Pulseras">Pulseras</option>
                                        <option value="Aretes">Aretes</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Precio (COP)</label>
                                    <input type="number" id="prod-precio" step="1" required>
                                </div>
                                <div class="form-group">
                                    <label>¿Destacar en Carrusel?</label>
                                    <select id="prod-destacado">
                                        <option value="no">No</option>
                                        <option value="si">Sí, destacar</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group" style="margin-bottom: 20px;">
                                <label>Texto breve para la página principal</label>
                                <input type="text" id="prod-desc" placeholder="Ej: Brillo y elegancia única" required>
                                <small>Este texto solo aparece en la tarjeta de la tienda principal.</small>
                            </div>

                            <div class="form-group" style="margin-bottom: 20px;">
                                <label>Ficha Técnica (Especificaciones escritas)</label>
                                <textarea id="prod-especificaciones" rows="6">${PLANTILLA_FICHA_TECNICA}</textarea>
                                <small>Usa el formato <strong>Característica: Valor</strong> en cada línea. Las líneas que dejes sin valor no se mostrarán.</small>
                            </div>
                            
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Imagen Principal (Página principal y detalles)</label>
                                    <input type="file" id="prod-img" accept="image/*">
                                </div>
                                <div class="form-group">
                                    <label>Imagen Secundaria (Detalle adicional en modal)</label>
                                    <input type="file" id="prod-img-secundaria" accept="image/*">
                                    <small>Se mostrará junto a la imagen principal al abrir los detalles.</small>
                                </div>
                            </div>
                            
                            <button type="submit" class="btn-submit" id="btn-guardar-prod">Guardar en Base de Datos</button>
                        </form>
                    </div>
                </section>
                
                <section id="inventario-lista" class="admin-section">
                    <div class="admin-header"><h2>Inventario Actual</h2></div>
                    <div class="admin-card" style="overflow-x:auto;">
                        <table class="admin-table">
                            <thead>
                                <tr><th>Imagen</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr>
                            </thead>
                            <tbody id="tabla-inventario-body"></tbody>
                        </table>
                    </div>
                </section>

                <section id="estadisticas-avanzadas" class="admin-section">
                    <div class="admin-header"><h2>Análisis de Ventas</h2></div>
                    <div class="form-grid">
                        <div class="admin-card">
                            <h3>Joyas Más Vendidas</h3>
                            <ul id="lista-top-ventas" class="top-ventas-list"></ul>
                        </div>
                        <div class="admin-card">
                            <h3>Demanda por Categoría</h3>
                            <div id="grafico-categorias" class="grafico-container"></div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', adminHTML);
}

function cambiarPestana(idSeccion, boton) {
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(idSeccion).classList.add('active');
    boton.classList.add('active');
}

async function subirImagenImgBB(archivo) {
    const formData = new FormData();
    formData.append('image', archivo);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
    });
    const data = await response.json();
    return data.data.url;
}

async function guardarProducto(e) {
    e.preventDefault();
    if (!db) { alert("Error: Firebase no está configurado."); return; }

    const idEdicion = document.getElementById('prod-id').value;
    const archivoImg = document.getElementById('prod-img').files[0];
    const archivoSecundaria = document.getElementById('prod-img-secundaria').files[0];

    if (!idEdicion && !archivoImg) {
        alert("Por favor selecciona la Imagen Principal para el nuevo producto.");
        return;
    }

    const btnSubmit = document.getElementById('btn-guardar-prod');
    btnSubmit.innerText = "Procesando... Por favor espera.";
    btnSubmit.disabled = true;

    try {
        const productoData = {
            nombre: document.getElementById('prod-nombre').value,
            categoria: document.getElementById('prod-categoria').value,
            precio: document.getElementById('prod-precio').value,
            descripcion: document.getElementById('prod-desc').value,
            especificaciones: document.getElementById('prod-especificaciones').value,
            destacado: document.getElementById('prod-destacado').value === 'si'
        };

        if (archivoImg) productoData.imagen = await subirImagenImgBB(archivoImg);
        if (archivoSecundaria) productoData.imagenSecundaria = await subirImagenImgBB(archivoSecundaria);

        if (idEdicion) {
            await db.ref('productos/' + idEdicion).update(productoData);
            alert("¡Producto editado exitosamente!");
        } else {
            productoData.compras = 0;
            productoData.agotado = false;
            await db.ref('productos').push(productoData);
            alert("¡Producto nuevo guardado!");
        }

        document.getElementById('form-producto').reset();
        document.getElementById('prod-id').value = "";
        document.getElementById('prod-especificaciones').value = PLANTILLA_FICHA_TECNICA;
        document.getElementById('titulo-form-producto').innerText = "Agregar Nueva Joya";
    } catch (error) {
        console.error(error);
        alert("Hubo un error al procesar el producto.");
    } finally {
        btnSubmit.innerText = "Guardar en Base de Datos";
        btnSubmit.disabled = false;
    }
}

function renderizarTablaAdmin() {
    const tbody = document.getElementById('tabla-inventario-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    inventario.forEach(prod => {
        let txtEstado = '<span class="admin-badge-ok">Disponible</span>';
        if (prod.agotado) {
            txtEstado = prod.prontoStock
                ? '<span class="admin-badge-warn">Pronto en Stock</span>'
                : '<span class="admin-badge-out">Agotado</span>';
        }

        const txtBotonAgotado = prod.agotado ? '✅ Stock Activo' : '🚫 Agotar';
        const botonProntoStock = prod.agotado
            ? `<button class="btn-action btn-soon" onclick="marcarProntoStockBD('${prod.id}', ${prod.prontoStock || false})">${prod.prontoStock ? 'Quitar "Pronto"' : '⏳ Pronto Stock'}</button>`
            : '';

        tbody.innerHTML += `
            <tr style="${prod.agotado ? 'opacity:0.72;' : ''}">
                <td><img src="${prod.imagen}" alt="${prod.nombre}"></td>
                <td style="font-weight: 700;">${prod.nombre}</td>
                <td>${prod.categoria}</td>
                <td>${formatoCOP(prod.precio)}</td>
                <td>${txtEstado}</td>
                <td style="display:flex; flex-wrap: wrap; gap: 6px;">
                    <button class="btn-action btn-edit" onclick="editarProductoBD('${prod.id}')">✏️ Editar</button>
                    <button class="btn-action btn-stock" onclick="marcarAgotadoBD('${prod.id}', ${prod.agotado || false})">${txtBotonAgotado}</button>
                    ${botonProntoStock}
                    <button class="btn-action btn-delete" onclick="eliminarProductoBD('${prod.id}')">🗑 Eliminar</button>
                </td>
            </tr>
        `;
    });
}

function editarProductoBD(id) {
    const prod = inventario.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('prod-id').value = prod.id;
    document.getElementById('prod-nombre').value = prod.nombre;
    document.getElementById('prod-categoria').value = prod.categoria;
    document.getElementById('prod-precio').value = prod.precio;
    document.getElementById('prod-desc').value = prod.descripcion;
    document.getElementById('prod-especificaciones').value = prod.especificaciones || PLANTILLA_FICHA_TECNICA;
    document.getElementById('prod-destacado').value = prod.destacado ? 'si' : 'no';

    document.getElementById('titulo-form-producto').innerText = "✏️ Editando: " + prod.nombre;
    cambiarPestana('nuevo-producto', document.querySelector('.sidebar-menu button'));
}

function marcarAgotadoBD(id, estadoActual) {
    const nuevoEstado = !estadoActual;
    const actualizaciones = { agotado: nuevoEstado };
    if (!nuevoEstado) actualizaciones.prontoStock = false;
    db.ref('productos/' + id).update(actualizaciones);
}

function marcarProntoStockBD(id, estadoActual) {
    db.ref('productos/' + id).update({ prontoStock: !estadoActual });
}

function eliminarProductoBD(id) {
    if (confirm("¿Estás seguro de que deseas eliminar permanentemente este producto?")) {
        db.ref('productos/' + id).remove()
            .then(() => alert("Producto eliminado."))
            .catch(err => alert("Error al eliminar: " + err));
    }
}

function renderizarEstadisticas() {
    const listaTop = document.getElementById('lista-top-ventas');
    const graficoContainer = document.getElementById('grafico-categorias');
    if (!listaTop || !graficoContainer) return;

    const productosOrdenados = [...inventario].sort((a, b) => (b.compras || 0) - (a.compras || 0));
    listaTop.innerHTML = '';

    productosOrdenados.forEach((prod, index) => {
        const ventas = prod.compras || 0;
        listaTop.innerHTML += `
            <li class="top-ventas-item">
                <span><strong class="top-ventas-rank">#${index + 1}</strong> ${prod.nombre}</span>
                <span class="top-ventas-pill">${ventas} ventas</span>
            </li>
        `;
    });

    const categoriasData = { "Anillos": 0, "Cadenas": 0, "Pulseras": 0, "Aretes": 0 };
    let totalVentas = 0;

    inventario.forEach(prod => {
        if (categoriasData[prod.categoria] !== undefined) {
            const c = prod.compras || 0;
            categoriasData[prod.categoria] += c;
            totalVentas += c;
        }
    });

    graficoContainer.innerHTML = '';
    if (totalVentas === 0) {
        graficoContainer.innerHTML = '<p class="admin-empty-text">Aún no hay compras registradas para generar la gráfica.</p>';
        return;
    }

    for (const [cat, ventas] of Object.entries(categoriasData)) {
        const porcentaje = Math.round((ventas / totalVentas) * 100);
        graficoContainer.innerHTML += `
            <div class="grafico-row">
                <div class="grafico-labels">
                    <span>${cat}</span>
                    <span>${porcentaje}% (${ventas})</span>
                </div>
                <div class="grafico-track">
                    <div class="grafico-fill" style="width: ${porcentaje}%;"></div>
                </div>
            </div>
        `;
    }
}