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

// PREVENCIÓN DE ERRORES: Intentamos inicializar Firebase, si falla por falta de llaves, no rompe la web
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} catch (error) {
    console.warn("Aviso: Firebase no configurado correctamente todavía. Reemplaza las variables en script.js.");
}

let inventario = []; 
let carrito = []; 

window.onload = function() {
    cargarInventario();
};

function cargarInventario() {
    if(!db) return; // Si Firebase falló, detenemos la carga pero no rompemos la web
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
    });
}

function renderizarProductos(productos) {
    const grid = document.getElementById('productos-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    productos.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.innerHTML = `
            <img src="${prod.imagen}" alt="${prod.nombre}">
            <h3 class="product-title">${prod.nombre}</h3>
            <p class="product-desc">${prod.descripcion}</p>
            <p class="product-price">$${prod.precio}</p>
            <button class="btn-add" onclick="agregarAlCarrito('${prod.id}')">Agregar a Wishlist</button>
            ${prod.categoria === 'Anillos' ? `<button class="btn-talla" onclick="abrirSizeModal()">¿No sabes tu talla?</button>` : ''}
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

// CORRECCIÓN DEL FILTRO: Se agregó 'btnElement' para evitar el error de variable indefinida
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
                        <p style="color: var(--color-precio); font-weight: bold;">$${prod.precio}</p>
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
    
    let mensaje = "Hola Spinella, me encantaría adquirir:%0A%0A";
    let total = 0;
    
    carrito.forEach(prod => {
        mensaje += `- ${prod.nombre} ($${prod.precio})%0A`;
        total += Number(prod.precio);
    });
    
    mensaje += `%0ATotal estimado: $${total}`;
    
    const numeroTelefono = "584120000000"; 
    const url = `https://wa.me/${numeroTelefono}?text=${mensaje}`;
    window.open(url, '_blank');
}

function abrirSizeModal() { document.getElementById('size-modal').style.display = 'block'; }
function cerrarSizeModal() { document.getElementById('size-modal').style.display = 'none'; }

function calcularTalla() {
    // Parseamos el valor a decimal para leer los milímetros con precisión
    const mm = parseFloat(document.getElementById('medida-mm').value);
    const resultado = document.getElementById('size-result');
    
    // Buscamos o creamos un contenedor para la nota de recomendación
    let notaDiv = document.getElementById('size-note');
    if (!notaDiv) {
        notaDiv = document.createElement('p');
        notaDiv.id = 'size-note';
        notaDiv.style.fontSize = '14px';
        notaDiv.style.color = '#8c1c13'; // Color rojo oscuro para destacar
        notaDiv.style.marginTop = '10px';
        notaDiv.style.fontWeight = 'bold';
        resultado.parentNode.appendChild(notaDiv);
    }
    
    // Limpiamos la nota anterior cada vez que se presiona el botón
    notaDiv.innerText = "";

    // Validamos el nuevo rango estadounidense (44.0 a 67.8)
    if (!mm || mm < 44.0 || mm > 67.8) {
        resultado.innerText = "Ingresa una medida válida (ej: 48.5).";
        resultado.style.color = "#8c1c13";
        return;
    }
    
    let talla = "Desconocida";
    let limiteSuperior = 0;
    let proximaTalla = "";

    // Nuevas medidas - Tallas Estadounidenses
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

    // Lógica para mostrar la nota en los últimos 0.3 milímetros del rango superior
    const umbralNota = parseFloat((limiteSuperior - 0.2).toFixed(1));
    
    if (talla !== "Desconocida" && proximaTalla !== "Consulta con asesor") {
        if (mm >= umbralNota) {
            notaDiv.innerText = `💡 Nota: Tu medida (${mm} mm) está en el límite superior. Te recomendamos elegir la ${proximaTalla} para mayor comodidad.`;
        }
    }
}

let carruselIndex = 0;
let autoPlayInterval;

function actualizarCarrusel() {
    const track = document.getElementById('carousel-track');
    if(!track) return;
    track.innerHTML = '';
    
    const destacados = inventario.filter(prod => prod.destacado === true);
    
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
    
    if (carruselIndex > totalItems - itemsPorVista) {
        carruselIndex = 0;
    } else if (carruselIndex < 0) {
        carruselIndex = totalItems - itemsPorVista;
    }

    const itemWidth = items[0].offsetWidth + 20; 
    track.style.transform = `translateX(-${carruselIndex * itemWidth}px)`;
    reiniciarAutoPlay();
}

function iniciarAutoPlay() { autoPlayInterval = setInterval(() => moverCarrusel(1), 3000); }
function reiniciarAutoPlay() { clearInterval(autoPlayInterval); iniciarAutoPlay(); }

// ==========================================
// ACCESO SECRETO (ACTUALIZADO)
// ==========================================

// Para PC: Ctrl + Shift + Q (Se cambió la J por la Q para evitar conflictos con el navegador)
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
        document.getElementById('admin-login-modal').style.display = 'block';
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
        
        // CORRECCIÓN: Renderizar la tabla justo después de crear el panel para que no aparezca vacía
        renderizarTablaAdmin();
        
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
                    <li><button class="active" onclick="cambiarPestana('nuevo-producto', this)">+ Nuevo Producto</button></li>
                    <li><button onclick="cambiarPestana('inventario-lista', this)">📦 Ver Inventario</button></li>
                    <li><button onclick="salirAdmin()" style="color: #FFF0DD; margin-top: 20px;">← Volver a Tienda</button></li>
                </ul>
            </aside>
            <main class="dashboard-content">
                <section id="nuevo-producto" class="admin-section active">
                    <div class="admin-header">
                        <h2>Agregar Nueva Joya</h2>
                    </div>
                    <div class="admin-card">
                        <form id="form-producto" onsubmit="guardarProducto(event)">
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
                                    <label>Precio (USD)</label>
                                    <input type="number" id="prod-precio" required>
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
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label>Imagen del Producto</label>
                                <input type="file" id="prod-img" accept="image/*" required>
                            </div>
                            <button type="submit" class="btn-submit" id="btn-guardar-prod">Guardar Producto en Base de Datos</button>
                        </form>
                    </div>
                </section>
                <section id="inventario-lista" class="admin-section">
                    <div class="admin-header"><h2>Inventario Actual</h2></div>
                    <div class="admin-card">
                        <table class="admin-table">
                            <thead>
                                <tr><th>Imagen</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Acciones</th></tr>
                            </thead>
                            <tbody id="tabla-inventario-body"></tbody>
                        </table>
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
    if(!db) {
        alert("Error: Firebase no está configurado. No se puede guardar.");
        return;
    }
    
    const archivoImg = document.getElementById('prod-img').files[0];
    
    // CORRECCIÓN: Validación por si no se selecciona archivo
    if(!archivoImg) {
        alert("Por favor selecciona una imagen para el producto.");
        return;
    }

    const btnSubmit = document.getElementById('btn-guardar-prod');
    btnSubmit.innerText = "Subiendo imagen... Por favor espera.";
    btnSubmit.disabled = true;

    const nombre = document.getElementById('prod-nombre').value;
    const categoria = document.getElementById('prod-categoria').value;
    const precio = document.getElementById('prod-precio').value;
    const desc = document.getElementById('prod-desc').value;
    const destacado = document.getElementById('prod-destacado').value === 'si';

    try {
        const formData = new FormData();
        formData.append('image', archivoImg);

        const responseImg = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        
        const dataImg = await responseImg.json();
        const urlImagen = dataImg.data.url;

        const nuevoProducto = {
            nombre: nombre,
            categoria: categoria,
            precio: precio,
            descripcion: desc,
            imagen: urlImagen,
            destacado: destacado
        };

        await db.ref('productos').push(nuevoProducto);

        alert("¡Producto guardado con éxito!");
        document.getElementById('form-producto').reset();

    } catch (error) {
        console.error(error);
        alert("Hubo un error al guardar el producto.");
    } finally {
        btnSubmit.innerText = "Guardar Producto en Base de Datos";
        btnSubmit.disabled = false;
    }
}

function renderizarTablaAdmin() {
    const tbody = document.getElementById('tabla-inventario-body');
    if(!tbody) return; 
    tbody.innerHTML = '';
    inventario.forEach(prod => {
        tbody.innerHTML += `
            <tr>
                <td><img src="${prod.imagen}" alt="${prod.nombre}"></td>
                <td style="font-family: var(--fuente-general); font-weight: bold;">${prod.nombre}</td>
                <td>${prod.categoria}</td>
                <td>$${prod.precio}</td>
                <td><button class="btn-action btn-delete" onclick="eliminarProductoBD('${prod.id}')">Eliminar</button></td>
            </tr>
        `;
    });
}

function eliminarProductoBD(id) {
    if(confirm("¿Estás seguro de que deseas eliminar este producto de la base de datos?")) {
        db.ref('productos/' + id).remove()
        .then(() => alert("Producto eliminado."))
        .catch(err => alert("Error al eliminar: " + err));
    }
}

// ==========================================
// VENTANAS DE INFORMACIÓN (Garantía, Misión, Visión)
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

function cerrarInfoModal() {
    document.getElementById('info-modal').style.display = 'none';
}