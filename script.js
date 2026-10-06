const IMGBB_API_KEY = "3f569ba6339a1968b75ea5fc7a82169c"; 

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

// Función para convertir a Pesos Colombianos mostrando "COP"
function formatoCOP(valor) {
    const numeroFormateado = Number(valor).toLocaleString('es-CO', {
        minimumFractionDigits: 0
    });
    return "COP " + numeroFormateado;
}

window.onload = function() {
    cargarInventario();
};

function cargarInventario() {
    if(!db) return; 
    db.ref('productos').on('value', (snapshot) => {
        inventario = [];
        snapshot.forEach((childSnapshot) => {
            let producto = childSnapshot.val();
            producto.id = childSnapshot.key;
            inventario.push(producto);
        });
        
        renderizarProductos(inventario);
        actualizarCarrusel();
        renderizarTablaAdmin();
        if(typeof renderizarEstadisticas === "function") renderizarEstadisticas();
    });
}

function renderizarProductos(productos) {
    const grid = document.getElementById('productos-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    // MEJORA 2: Ordenar para que los agotados vayan al final automáticamente
    const productosOrdenados = [...productos].sort((a, b) => {
        if (a.agotado === b.agotado) return 0;
        return a.agotado ? 1 : -1;
    });
    
    productosOrdenados.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'product-card';
        
        // Lógica de texto y colores para "Agotado" vs "Pronto en Stock"
        let textoBotonInactivo = "Agotado";
        let badgeText = "";
        let badgeColor = "";

        if (prod.agotado) {
            if (prod.prontoStock) {
                badgeText = "PRONTO EN STOCK";
                badgeColor = "#e67e22"; // Naranja/Dorado
                textoBotonInactivo = "Pronto en Stock";
            } else {
                badgeText = "AGOTADO";
                badgeColor = "#8c1c13"; // Rojo
            }
        }

        const btnCarrito = prod.agotado 
            ? `<button class="btn-add" style="background:#888; cursor:not-allowed;" disabled>${textoBotonInactivo}</button>`
            : `<button class="btn-add" onclick="agregarAlCarrito('${prod.id}')">Agregar a Wishlist</button>`;
            
        const badgeAgotado = badgeText !== "" 
            ? `<div style="position:absolute; top:10px; right:10px; background:${badgeColor}; color:white; padding:5px 10px; border-radius:5px; font-weight:bold; font-size:12px; z-index:10; letter-spacing: 1px;">${badgeText}</div>` 
            : '';

        const imgFicha = prod.imagenFicha ? prod.imagenFicha : prod.imagen;

        // MEJORA 1: Botón de talla arriba del de Wishlist con separación
        const btnTalla = prod.categoria === 'Anillos' 
            ? `<button class="btn-talla" onclick="abrirSizeModal()" style="margin-bottom: 15px;">¿No sabes tu talla?</button>` 
            : '';

        div.innerHTML = `
            <div style="position:relative; cursor: zoom-in;" onclick="abrirDetalles('${imgFicha}')" title="Toca para ver características">
                ${badgeAgotado}
                <img src="${prod.imagen}" alt="${prod.nombre}" style="${prod.agotado ? 'filter: grayscale(100%); opacity: 0.6;' : ''}">
            </div>
            <h3 class="product-title">${prod.nombre}</h3>
            <p class="product-desc">${prod.descripcion}</p>
            <p class="product-price">${formatoCOP(prod.precio)}</p>
            ${btnTalla}
            ${btnCarrito}
        `;
        grid.appendChild(div);
    });
}

document.getElementById('buscador')?.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase();
    const filtrados = inventario.filter(prod => 
        prod.nombre.toLowerCase().includes(texto) || 
        prod.descripcion.toLowerCase().includes(texto)
    );
    renderizarProductos(filtrados);
});

function filtrarCategoria(categoria, btnElement) {
    const botones = document.querySelectorAll('.btn-filter');
    botones.forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    if (categoria === 'Todos') {
        renderizarProductos(inventario);
    } else {
        const filtrados = inventario.filter(prod => prod.categoria === categoria);
        renderizarProductos(filtrados);
    }
}

function agregarAlCarrito(id) {
    const producto = inventario.find(p => p.id === id);
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
                    <button onclick="eliminarDelCarrito(${index})" style="margin-left:auto; background:none; border:none; color:#8c1c13; cursor:pointer;">X</button>
                </div>
            `;
        });
    }
    modal.style.display = 'block';
}

function cerrarWishlist() { document.getElementById('wishlist-modal').style.display = 'none'; }

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
    
    const numeroTelefono = "573202654167"; 
    const url = `https://wa.me/${numeroTelefono}?text=${mensaje}`;
    window.open(url, '_blank');

    carrito = [];
    document.getElementById('wishlist-count').innerText = 0;
    cerrarWishlist();
}

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
    notaDiv.innerText = "";

    if (!mm || mm < 44.0 || mm > 67.8) {
        resultado.innerText = "Ingresa una medida válida (ej: 48.5).";
        resultado.style.color = "#8c1c13";
        return;
    }
    
    let talla = "Desconocida", limiteSuperior = 0, proximaTalla = "";

    if (mm >= 44.0 && mm <= 44.7) { talla = "Talla 3"; limiteSuperior = 44.7; proximaTalla = "Talla 3.5"; }
    else if (mm >= 44.8 && mm <= 46.0) { talla = "Talla 3.5"; limiteSuperior = 46.0; proximaTalla = "Talla 4"; }
    else if (mm >= 46.1 && mm <= 47.3) { talla = "Talla 4"; limiteSuperior = 47.3; proximaTalla = "Talla 4.5"; }
    else if (mm >= 47.4 && mm <= 48.6) { talla = "Talla 4.5"; limiteSuperior = 48.6; proximaTalla = "Talla 5"; }
    else if (mm >= 48.7 && mm <= 49.9) { talla = "Talla 5"; limiteSuperior = 49.9; proximaTalla = "Talla 5.5"; }
    else if (mm >= 50.0 && mm <= 51.1) { talla = "Talla 5.5"; limiteSuperior = 51.1; proximaTalla = "Talla 6"; }
    else if (mm >= 51.2 && mm <= 52.4) { talla = "Talla 6"; limiteSuperior = 52.4; proximaTalla = "Talla 6.5"; }
    else if (mm >= 52.5 && mm <= 53.7) { talla = "Talla 6.5"; limiteSuperior = 53.7; proximaTalla = "Talla 7"; }
    else if (mm >= 53.8 && mm <= 55.0) { talla = "Talla 7"; limiteSuperior = 55.0; proximaTalla = "Talla 7.5"; }
    else if (mm >= 55.1 && mm <= 56.2) { talla = "Talla 7.5"; limiteSuperior = 56.2; proximaTalla = "Talla 8"; }
    else if (mm >= 56.3 && mm <= 57.5) { talla = "Talla 8"; limiteSuperior = 57.5; proximaTalla = "Talla 8.5"; }
    else if (mm >= 57.6 && mm <= 58.8) { talla = "Talla 8.5"; limiteSuperior = 58.8; proximaTalla = "Talla 9"; }
    else if (mm >= 58.9 && mm <= 60.1) { talla = "Talla 9"; limiteSuperior = 60.1; proximaTalla = "Talla 9.5"; }
    else if (mm >= 60.2 && mm <= 61.3) { talla = "Talla 9.5"; limiteSuperior = 61.3; proximaTalla = "Talla 10"; }
    else if (mm >= 61.4 && mm <= 62.6) { talla = "Talla 10"; limiteSuperior = 62.6; proximaTalla = "Talla 10.5"; }
    else if (mm >= 62.7 && mm <= 63.9) { talla = "Talla 10.5"; limiteSuperior = 63.9; proximaTalla = "Talla 11"; }
    else if (mm >= 64.0 && mm <= 65.2) { talla = "Talla 11"; limiteSuperior = 65.2; proximaTalla = "Talla 11.5"; }
    else if (mm >= 65.3 && mm <= 66.5) { talla = "Talla 11.5"; limiteSuperior = 66.5; proximaTalla = "Talla 12"; }
    else if (mm >= 66.6 && mm <= 67.8) { talla = "Talla 12"; limiteSuperior = 67.8; proximaTalla = "Consulta con asesor"; }

    resultado.innerText = talla;
    resultado.style.color = "var(--color-primario)";

    const umbralNota = parseFloat((limiteSuperior - 0.2).toFixed(1));
    if (talla !== "Desconocida" && proximaTalla !== "Consulta con asesor") {
        if (mm >= umbralNota) {
            notaDiv.innerText = `💡 Nota: Tu medida (${mm} mm) está en el límite superior. Te recomendamos elegir la ${proximaTalla}.`;
        }
    }
}

let carruselIndex = 0;
let autoPlayInterval;

function actualizarCarrusel() {
    const track = document.getElementById('carousel-track');
    if(!track) return;
    track.innerHTML = '';
    
    const destacados = inventario.filter(prod => prod.destacado === true && !prod.agotado); 
    
    if(destacados.length === 0) {
        document.querySelector('.promotions-carousel').style.display = 'none';
        return;
    } else {
        document.querySelector('.promotions-carousel').style.display = 'block';
    }

    destacados.forEach(prod => {
        track.innerHTML += `
            <div class="carousel-item">
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
    if(!items.length) return;
    
    const totalItems = items.length;
    const itemsPorVista = window.innerWidth <= 768 ? 1 : 3;
    
    if (totalItems <= itemsPorVista) return; 
    carruselIndex += direccion;
    
    if (carruselIndex > totalItems - itemsPorVista) { carruselIndex = 0; } 
    else if (carruselIndex < 0) { carruselIndex = totalItems - itemsPorVista; }

    const itemWidth = items[0].offsetWidth + 20; 
    track.style.transform = `translateX(-${carruselIndex * itemWidth}px)`;
    reiniciarAutoPlay();
}

function iniciarAutoPlay() { autoPlayInterval = setInterval(() => moverCarrusel(1), 3000); }
function reiniciarAutoPlay() { clearInterval(autoPlayInterval); iniciarAutoPlay(); }

// ==========================================
// ACCESO SECRETO ADMIN
// ==========================================
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
        document.getElementById('admin-login-modal').style.display = 'block';
    }
});

let contadorToques = 0;
let temporizadorToques;

function accesoSecretoMovil() {
    contadorToques++;
    if (contadorToques === 1) { temporizadorToques = setTimeout(() => { contadorToques = 0; }, 2000); }
    if (contadorToques === 5) {
        clearTimeout(temporizadorToques);
        contadorToques = 0;
        document.getElementById('admin-login-modal').style.display = 'block';
    }
}

function verificarAdmin() {
    const pass = document.getElementById('admin-password').value;
    if (pass === "spinella2026") {
        document.getElementById('admin-login-modal').style.display = 'none';
        document.querySelector('.navbar').style.display = 'none';
        document.querySelector('.promotions-carousel').style.display = 'none';
        document.querySelector('.container').style.display = 'none';
        document.querySelector('.footer').style.display = 'none';
        
        if(!document.getElementById('admin-view-container')) {
            crearPanelAdmin();
        }
        document.getElementById('admin-view-container').style.display = 'block';
        renderizarTablaAdmin();
        if(typeof renderizarEstadisticas === "function") renderizarEstadisticas();
    } else {
        alert("Contraseña incorrecta.");
    }
}

function salirAdmin() {
    document.getElementById('admin-view-container').style.display = 'none';
    document.querySelector('.navbar').style.display = 'flex';
    document.querySelector('.promotions-carousel').style.display = 'block';
    document.querySelector('.container').style.display = 'block';
    document.querySelector('.footer').style.display = 'block';
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
                    <li><button onclick="salirAdmin()" style="color: #FFF0DD; margin-top: 20px;">← Volver a Tienda</button></li>
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
                                <label>Descripción breve</label>
                                <textarea id="prod-desc" rows="2" required></textarea>
                            </div>
                            
                            <!-- AQUÍ AÑADIMOS EL CAMPO PARA LA IMAGEN DE CARACTERÍSTICAS -->
                            <div class="form-grid">
                                <div class="form-group" style="margin-bottom: 20px;">
                                    <label>Imagen Principal (La que se ve en la tienda)</label>
                                    <input type="file" id="prod-img" accept="image/*">
                                </div>
                                <div class="form-group" style="margin-bottom: 20px;">
                                    <label>Ficha Técnica (Imagen con detalles)</label>
                                    <input type="file" id="prod-img-ficha" accept="image/*">
                                    <small style="color: var(--color-secundario-2); margin-top: 5px;">Opcional. Formato vertical 1080x1920 px recomendado.</small>
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
                            <h3 style="color: var(--color-primario); margin-bottom: 15px;">Joyas Más Vendidas</h3>
                            <ul id="lista-top-ventas" class="top-ventas-list"></ul>
                        </div>
                        <div class="admin-card">
                            <h3 style="color: var(--color-primario); margin-bottom: 15px;">Demanda por Categoría</h3>
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

async function guardarProducto(e) {
    e.preventDefault();
    if(!db) { alert("Error: Firebase no está configurado."); return; }
    
    const idEdicion = document.getElementById('prod-id').value;
    const archivoImg = document.getElementById('prod-img').files[0];
    const archivoFicha = document.getElementById('prod-img-ficha').files[0];
    
    if(!idEdicion && !archivoImg) {
        alert("Por favor selecciona la Imagen Principal para el nuevo producto.");
        return;
    }

    const btnSubmit = document.getElementById('btn-guardar-prod');
    btnSubmit.innerText = "Procesando... Por favor espera.";
    btnSubmit.disabled = true;

    try {
        let urlImagen = "";
        let urlFicha = "";
        
        if (archivoImg) {
            const formData = new FormData();
            formData.append('image', archivoImg);
            const responseImg = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const dataImg = await responseImg.json();
            urlImagen = dataImg.data.url;
        }

        if (archivoFicha) {
            const formDataFicha = new FormData();
            formDataFicha.append('image', archivoFicha);
            const responseFicha = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formDataFicha });
            const dataFicha = await responseFicha.json();
            urlFicha = dataFicha.data.url;
        }

        const productoData = {
            nombre: document.getElementById('prod-nombre').value,
            categoria: document.getElementById('prod-categoria').value,
            precio: document.getElementById('prod-precio').value,
            descripcion: document.getElementById('prod-desc').value,
            destacado: document.getElementById('prod-destacado').value === 'si'
        };

        if (urlImagen !== "") { productoData.imagen = urlImagen; }
        if (urlFicha !== "") { productoData.imagenFicha = urlFicha; }

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
    if(!tbody) return; 
    tbody.innerHTML = '';
    inventario.forEach(prod => {
        // Lógica de texto para la columna ESTADO
        let txtEstado = '<span style="color:green;">Disponible</span>';
        if (prod.agotado) {
            txtEstado = prod.prontoStock 
                ? '<span style="color:#e67e22; font-weight:bold;">Pronto en Stock</span>' 
                : '<span style="color:#8c1c13; font-weight:bold;">Agotado</span>';
        }

        const txtBotonAgotado = prod.agotado ? '✅ Stock Activo' : '🚫 Agotar';
        
        // MEJORA 3: Botón adicional que SOLO aparece cuando el producto está agotado
        const botonProntoStock = prod.agotado 
            ? `<button class="btn-action" style="background:${prod.prontoStock ? '#7f8c8d' : '#f39c12'}; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer;" onclick="marcarProntoStockBD('${prod.id}', ${prod.prontoStock || false})">${prod.prontoStock ? 'Quitar "Pronto"' : '⏳ Pronto Stock'}</button>` 
            : '';

        tbody.innerHTML += `
            <tr style="${prod.agotado ? 'opacity:0.6;' : ''}">
                <td><img src="${prod.imagen}" alt="${prod.nombre}" style="width:40px; height:40px; object-fit:cover; border-radius:5px;"></td>
                <td style="font-family: var(--fuente-general); font-weight: bold;">${prod.nombre}</td>
                <td>${prod.categoria}</td>
                <td>${formatoCOP(prod.precio)}</td>
                <td>${txtEstado}</td>
                <td style="display:flex; flex-wrap: wrap; gap: 5px;">
                    <button class="btn-action" style="background:var(--color-secundario-2); color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer;" onclick="editarProductoBD('${prod.id}')">✏️ Editar</button>
                    <button class="btn-action" style="background:#e67e22; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer;" onclick="marcarAgotadoBD('${prod.id}', ${prod.agotado || false})">${txtBotonAgotado}</button>
                    ${botonProntoStock}
                    <button class="btn-action btn-delete" style="padding:5px 8px; border-radius:3px;" onclick="eliminarProductoBD('${prod.id}')">🗑️️ Eliminar</button>
                </td>
            </tr>
        `;
    });
}

function editarProductoBD(id) {
    const prod = inventario.find(p => p.id === id);
    if(!prod) return;
    
    document.getElementById('prod-id').value = prod.id;
    document.getElementById('prod-nombre').value = prod.nombre;
    document.getElementById('prod-categoria').value = prod.categoria;
    document.getElementById('prod-precio').value = prod.precio;
    document.getElementById('prod-desc').value = prod.descripcion;
    document.getElementById('prod-destacado').value = prod.destacado ? 'si' : 'no';
    
    document.getElementById('titulo-form-producto').innerText = "✏️ Editando: " + prod.nombre;
    cambiarPestana('nuevo-producto', document.querySelector('.sidebar-menu button'));
}

function marcarAgotadoBD(id, estadoActual) {
    const nuevoEstado = !estadoActual;
    const actualizaciones = { agotado: nuevoEstado };
    
    // MEJORA 3: Si devolvemos a Stock, apaga automáticamente "Pronto en Stock"
    if (!nuevoEstado) {
        actualizaciones.prontoStock = false; 
    }
    
    db.ref('productos/' + id).update(actualizaciones);
}

function marcarProntoStockBD(id, estadoActual) {
    db.ref('productos/' + id).update({ prontoStock: !estadoActual });
}

function eliminarProductoBD(id) {
    if(confirm("¿Estás seguro de que deseas eliminar permanentemente este producto?")) {
        db.ref('productos/' + id).remove()
        .then(() => alert("Producto eliminado."))
        .catch(err => alert("Error al eliminar: " + err));
    }
}

function renderizarEstadisticas() {
    const listaTop = document.getElementById('lista-top-ventas');
    const graficoContainer = document.getElementById('grafico-categorias');
    if(!listaTop || !graficoContainer) return; 

    const productosOrdenados = [...inventario].sort((a, b) => (b.compras || 0) - (a.compras || 0));
    listaTop.innerHTML = '';
    
    productosOrdenados.forEach((prod, index) => {
        const ventas = prod.compras || 0;
        listaTop.innerHTML += `
            <li style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee;">
                <span><strong style="color:var(--color-primario);">#${index + 1}</strong> ${prod.nombre}</span>
                <span style="background: var(--color-secundario-1); color: white; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight:bold;">${ventas} ventas</span>
            </li>
        `;
    });

    const categoriasData = { "Anillos": 0, "Cadenas": 0, "Pulseras": 0, "Aretes": 0 };
    let totalVentas = 0;
    
    inventario.forEach(prod => {
        if(categoriasData[prod.categoria] !== undefined) {
            const c = prod.compras || 0;
            categoriasData[prod.categoria] += c;
            totalVentas += c;
        }
    });

    graficoContainer.innerHTML = '';
    if (totalVentas === 0) {
        graficoContainer.innerHTML = '<p style="color:var(--color-secundario-2);">Aún no hay compras registradas para generar la gráfica.</p>';
        return;
    }

    for (const [cat, ventas] of Object.entries(categoriasData)) {
        const porcentaje = Math.round((ventas / totalVentas) * 100);
        graficoContainer.innerHTML += `
            <div style="margin-bottom: 18px;">
                <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; font-weight:bold; color:var(--color-texto);">
                    <span>${cat}</span>
                    <span>${porcentaje}% (${ventas})</span>
                </div>
                <div style="width: 100%; background: #e6e2dc; height: 16px; border-radius: 8px; overflow: hidden;">
                    <div style="width: ${porcentaje}%; background: var(--color-primario); height: 100%; border-radius: 8px;"></div>
                </div>
            </div>
        `;
    }
}

// ==========================================
// VENTANAS MODALES INFORMATIVAS Y DETALLES
// ==========================================
function abrirInfoModal(seccion) {
    const modal = document.getElementById('info-modal');
    const titulo = document.getElementById('info-modal-title');
    const cuerpo = document.getElementById('info-modal-body');

    if (seccion === 'garantia') {
        titulo.innerText = "Políticas de Garantía";
        cuerpo.innerHTML = document.getElementById('contenido-garantia').innerHTML;
    } else if (seccion === 'mision') {
        titulo.innerText = "Nuestra Misión";
        cuerpo.innerHTML = document.getElementById('contenido-mision').innerHTML;
    } else if (seccion === 'vision') {
        titulo.innerText = "Nuestra Visión";
        cuerpo.innerHTML = document.getElementById('contenido-vision').innerHTML;
    }
    modal.style.display = 'block';
}

function cerrarInfoModal() { document.getElementById('info-modal').style.display = 'none'; }

function abrirDetalles(urlFicha) {
    document.getElementById('detalles-img').src = urlFicha;
    document.getElementById('detalles-modal').style.display = 'block';
}

function cerrarDetalles() {
    document.getElementById('detalles-modal').style.display = 'none';
    document.getElementById('detalles-img').src = "";
}

// Cierra cualquier ventana flotante si tocas fuera de ella
window.onclick = function(event) {
    const modalInfo = document.getElementById('info-modal');
    const modalDetalles = document.getElementById('detalles-modal');
    if (event.target == modalInfo) { cerrarInfoModal(); }
    if (event.target == modalDetalles) { cerrarDetalles(); }
}