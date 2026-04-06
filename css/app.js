let currentStream = null; 
let currentImage = null; 
const video = document.getElementById('video'); 
const canvas = document.getElementById('canvas'); 
const captureBtn = document.getElementById('capture'); 

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

let currentLocation = null; 
const form = document.getElementById('form-reportes'); 
const tituloInput = document.getElementById('reporte-titulo'); 
const descripcionInput = document.getElementById('reporte-descripcion'); 
const categoriaSelect = document.getElementById('reporte-categoria'); 
const fab = document.getElementById('fab'); 
const modal = document.getElementById('report-modal'); 
const closeModal = document.getElementById('close-modal'); 

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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker Registrado', reg))
            .catch(err => console.warn('Error en registro de SW', err));
    });
}

if ('Notification' in window) {
    Notification.requestPermission();
}

if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('Notificaciones push soportadas');
}