let db;
let pendingReports = [];

const request = indexedDB.open('ReportesDB', 4);

request.onerror = (event) => {
    console.error('Database error:', event.target.error);
};

request.onupgradeneeded = (event) => {
    db = event.target.result;
    
    if (!db.objectStoreNames.contains('reports')) {
        const reportStore = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
        reportStore.createIndex('status', 'status', { unique: false });
        reportStore.createIndex('date', 'date', { unique: false });
        reportStore.createIndex('synced', 'synced', { unique: false });
    }
    
    if (!db.objectStoreNames.contains('pending_reports')) {
        const pendingStore = db.createObjectStore('pending_reports', { keyPath: 'id', autoIncrement: true });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
    
    console.log('Database upgraded to version 4');
};

request.onsuccess = (event) => {
    db = event.target.result;
    console.log('IndexedDB ready');
    loadPendingReports();
    checkAndSyncReports();
};

function insertarReporteDB(reporteData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['reports'], 'readwrite');
        const reportStore = transaction.objectStore('reports');
        
        const nuevoReporte = {
            titulo: reporteData.titulo,
            descripcion: reporteData.descripcion || '',
            categoria: reporteData.categoria || 'general',
            fecha: new Date().toISOString(),
            fechaLocal: new Date().toLocaleString(),
            ubicacion: reporteData.ubicacion,
            imagen: reporteData.imagen, 
            status: 'pending',
            synced: navigator.onLine
        };
        
        const addRequest = reportStore.add(nuevoReporte);
        
        addRequest.onsuccess = (event) => {
            const reportId = event.target.result;
            nuevoReporte.id = reportId;
            
            if (!navigator.onLine) {
                guardarReportePendiente(nuevoReporte);
                mostrarNotificacion('Reporte guardado localmente (Modo Offline)', 'info');
            } else {
                enviarReporteAlServidor(nuevoReporte);
                mostrarNotificacion('Reporte enviado con éxito', 'success');
            }
            
            resolve(nuevoReporte);
        };
        
        addRequest.onerror = (event) => {
            console.error('Error adding report:', event.target.error);
            reject(event.target.error);
        };
    });
}

function guardarReportePendiente(reporte) {
    const transaction = db.transaction(['pending_reports'], 'readwrite');
    const pendingStore = transaction.objectStore('pending_reports');
    
    const pendingReport = {
        ...reporte,
        timestamp: Date.now()
    };
    
    pendingStore.add(pendingReport);
    pendingReports.push(pendingReport);
}

function loadPendingReports() {
    if (!db) return;
    
    const transaction = db.transaction(['pending_reports'], 'readonly');
    const pendingStore = transaction.objectStore('pending_reports');
    const request = pendingStore.getAll();
    
    request.onsuccess = () => {
        pendingReports = request.result || [];
        console.log(`Loaded ${pendingReports.length} pending reports`);
    };
}

function checkAndSyncReports() {
    if (navigator.onLine && pendingReports.length > 0) {
        console.log('Syncing pending reports...');
        syncPendingReports();
    }
}

async function syncPendingReports() {
    for (const report of pendingReports) {
        try {
            await enviarReporteAlServidor(report);
            await eliminarReportePendiente(report.id);
            mostrarNotificacion(`Reporte "${report.titulo}" sincronizado`, 'success');
        } catch (error) {
            console.error('Error syncing report:', error);
        }
    }
}

function enviarReporteAlServidor(reporte) {
    return new Promise((resolve) => {
        console.log('Sending to server:', reporte);
        setTimeout(() => {
            console.log('Report sent successfully');
            resolve();
        }, 1000);
    });
}

function eliminarReportePendiente(reportId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pending_reports'], 'readwrite');
        const pendingStore = transaction.objectStore('pending_reports');
        const request = pendingStore.delete(reportId);
        
        request.onsuccess = () => {
            pendingReports = pendingReports.filter(r => r.id !== reportId);
            resolve();
        };
        
        request.onerror = () => reject(request.error);
    });
}

function obtenerReportes() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction(['reports'], 'readonly');
        const reportStore = transaction.objectStore('reports');
        const request = reportStore.getAll();
        
        request.onsuccess = () => {
            const reports = request.result || [];
            resolve(reports.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
        };
        
        request.onerror = () => reject(request.error);
    });
}

function obtenerReportesPendientes() {
    return pendingReports.length;
}

window.addEventListener('online', () => {
    console.log('Back online mode');
    checkAndSyncReports();
    if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('connectionChange', { detail: { online: true } }));
    }
});

window.addEventListener('offline', () => {
    console.log('Offline mode');
    if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('connectionChange', { detail: { online: false } }));
    }
});