if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Registra el Service Worker para funcionalidades offline y notificaciones push
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker Registrado', reg))
            .catch(err => console.warn('Error en registro de SW', err));
    });
}

let currentStream = null; 
const video = document.getElementById('video'); 
const canvas = document.getElementById('canvas'); 
const captureBtn = document.getElementById('capture'); 
const openCameraBtn = document.getElementById('openCamera');
const form = document.getElementById('form-reportes'); 
const tituloInput = document.getElementById('reporte-titulo'); 
const descripcionInput = document.getElementById('reporte-descripcion'); 
const categoriaSelect = document.getElementById('reporte-categoria'); 
const reportsList = document.getElementById('reports-list'); 
const fab = document.getElementById('fab'); 
const modal = document.getElementById('report-modal'); 
const closeModal = document.getElementById('close-modal'); 
const statusDiv = document.getElementById('status'); 
const pendingBadge = document.getElementById('pending-badge'); 
let currentLocation = null; 
let currentImage = null; 

if ('Notification' in window) {
    Notification.requestPermission();
}

if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('Notificaciones push soportadas');
}

/**
 * Muestra una notificación al usuario
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación ('info', 'success', 'error')
 */
function mostrarNotificacion(message, type = 'info') {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Reporte UTP', {
            body: message,
            icon: './images/icon-192.png',
            badge: './images/icon-192.png'
        });
    }
    
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification ${type}`;
    notificationDiv.textContent = message;
    document.body.appendChild(notificationDiv);
    
    setTimeout(() => {
        notificationDiv.remove();
    }, 3000);
}

/**
 * Obtiene la ubicación actual del usuario usando el GPS
 * @returns {Promise} Promesa que resuelve con el objeto de ubicación
 */
function obtenerUbicacion() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Geolocalización no soportada');
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                resolve(location);
            },
            (error) => {
                console.error('Error de geolocalización:', error);
                reject(error.message);
            },
            {
                enableHighAccuracy: true, 
                timeout: 10000, 
                maximumAge: 0 
            }
        );
    });
}

async function iniciarCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false 
        });
        
        currentStream = stream;
        video.srcObject = stream;
        video.style.display = 'block';
        canvas.style.display = 'none';
        captureBtn.style.display = 'inline-block'; 
        
        mostrarNotificacion('Cámara activada', 'info');
    } catch (error) {
        console.error('Error de cámara:', error);
        mostrarNotificacion('No se pudo acceder a la cámara: ' + error.message, 'error');
    }
}

captureBtn.addEventListener('click', () => {
    if (!video.srcObject) {
        mostrarNotificacion('Primero abre la cámara', 'error');
        return;
    }
    
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    currentImage = canvas.toDataURL('image/jpeg', 0.8);
    
    video.style.display = 'none';
    canvas.style.display = 'block';
    
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    mostrarNotificacion('Foto capturada', 'success');
});


async function mostrarReportes() {
    try {
        const reports = await obtenerReportes();
        reportsList.innerHTML = '';
        
        if (reports.length === 0) {
            reportsList.innerHTML = '<div class="empty-state">No hay reportes aún</div>';
            return;
        }
        
        reports.forEach(report => {
            const reportDiv = document.createElement('div');
            reportDiv.className = `report-card ${report.synced ? '' : 'pending'}`;
            
            reportDiv.innerHTML = `
                <div class="report-header">
                    <h3>${escapeHtml(report.titulo)}</h3>
                    <span class="report-status ${report.status}">${report.status === 'pending' ? 'Pendiente' : 'Procesado'}</span>
                </div>
                <div class="report-category">📁 ${escapeHtml(report.categoria)}</div>
                ${report.descripcion ? `<div class="report-description">${escapeHtml(report.descripcion)}</div>` : ''}
                ${report.imagen ? `<img src="${report.imagen}" class="report-image" alt="Evidencia">` : ''}
                ${report.ubicacion ? `
                    <div class="report-location">
                        📍 Lat: ${report.ubicacion.lat.toFixed(6)}<br>
                        📍 Lng: ${report.ubicacion.lng.toFixed(6)}
                    </div>
                ` : ''}
                <div class="report-footer">
                    <span class="report-date">📅 ${report.fechaLocal}</span>
                    ${!report.synced ? '<span class="pending-badge">⏳ Pendiente de sincronizar</span>' : ''}
                </div>
            `;
            
            reportsList.appendChild(reportDiv);
        });
        
        const pendingCount = await obtenerReportesPendientes();
        if (pendingBadge) {
            pendingBadge.textContent = pendingCount;
            pendingBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }
        
    } catch (error) {
        console.error('Error al cargar reportes:', error);
        mostrarNotificacion('Error al cargar reportes', 'error');
    }
}

/**
 * Escapa caracteres HTML para prevenir XSS (Cross-Site Scripting)
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado seguro para HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text; 
    return div.innerHTML; 
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const titulo = tituloInput.value.trim();
    if (!titulo) {
        mostrarNotificacion('Por favor ingresa un título', 'error');
        return;
    }
    
    try {
        mostrarNotificacion('Obteniendo ubicación...', 'info');
        const ubicacion = await obtenerUbicacion();
        currentLocation = ubicacion;
        
        const reporteData = {
            titulo: titulo,
            descripcion: descripcionInput.value.trim(),
            categoria: categoriaSelect.value,
            ubicacion: ubicacion,
            imagen: currentImage
        };
        
        await insertarReporteDB(reporteData);
        
        tituloInput.value = '';
        descripcionInput.value = '';
        categoriaSelect.value = 'general';
        currentImage = null;
        currentLocation = null;
        
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
        
        await mostrarReportes();
        modal.style.display = 'none';
        
    } catch (error) {
        console.error('Error al crear reporte:', error);
        mostrarNotificacion('Error al crear reporte: ' + error.message, 'error');
    }
});

fab.addEventListener('click', () => {
    modal.style.display = 'flex';
    currentImage = null; 
    tituloInput.focus(); 
});

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
    }
});

window.addEventListener('online', () => {
    statusDiv.textContent = '🟢 Online';
    statusDiv.className = 'status online';
    mostrarReportes(); 
});

window.addEventListener('offline', () => {
    statusDiv.textContent = '🔴 Offline';
    statusDiv.className = 'status offline';
});

mostrarReportes();