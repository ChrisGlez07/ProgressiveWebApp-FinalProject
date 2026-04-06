const reportsList = document.getElementById('reports-list'); 
const statusDiv = document.getElementById('status');
const pendingBadge = document.getElementById('pending-badge'); 

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

window.addEventListener('online', () => {
    statusDiv.textContent = '🟢 Online';
    statusDiv.className = 'status online';
    mostrarReportes(); 
});

window.addEventListener('offline', () => {
    statusDiv.textContent = '🔴 Offline';
    statusDiv.className = 'status offline';
});



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
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado seguro para HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text; 
    return div.innerHTML;
}
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