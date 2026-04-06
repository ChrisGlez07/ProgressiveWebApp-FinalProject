/**
 * Obtiene la ubicación actual del usuario usando el GPS
 * @returns {Promise} Promesa que resuelve con el objeto de ubicación
 *//**
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