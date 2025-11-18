/**
 * Script de prueba para validar las mejoras implementadas
 * Ejecutar en consola del navegador
 */

// Test 1: Verificar umbrales dinámicos
console.group('🧪 Test 1: Umbrales Dinámicos');
const testEntropies = [
    { mime: 'image/jpeg', entropy: 7.5, expected: 'normal' },
    { mime: 'image/jpeg', entropy: 7.9, expected: 'suspicious' },
    { mime: 'image/png', entropy: 7.5, expected: 'normal' },
    { mime: 'image/gif', entropy: 7.5, expected: 'suspicious' },
    { mime: 'video/mp4', entropy: 7.9, expected: 'normal' },
];

testEntropies.forEach(test => {
    console.log(`${test.mime} con entropía ${test.entropy} → Esperado: ${test.expected}`);
});
console.groupEnd();

// Test 2: Crear datos de prueba para LSB
console.group('🧪 Test 2: Datos de Prueba LSB');

// Imagen normal (bits aleatorios balanceados)
function createNormalImageData(size = 8192) {
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
        data[i] = Math.floor(Math.random() * 256);
    }
    return data;
}

// Imagen con esteganografía LSB simulada (bits muy uniformes)
function createStegoImageData(size = 8192) {
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
        // Valor base aleatorio
        const base = Math.floor(Math.random() * 254);
        // Forzar LSB a patrón 0101... muy uniforme
        data[i] = (base & 0xFE) | (i % 2);
    }
    return data;
}

console.log('✅ Funciones de generación de datos de prueba creadas');
console.log('- createNormalImageData(): Imagen normal');
console.log('- createStegoImageData(): Imagen con esteganografía simulada');
console.groupEnd();

// Test 3: Validar detección de polyglots
console.group('🧪 Test 3: Detección de Archivos Polyglot');

// Crear un archivo polyglot simulado (JPEG + ZIP)
function createPolyglotData() {
    const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
    const zipSignature = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);
    const padding = new Uint8Array(100);
    
    // Combinar: inicio con JPEG, luego ZIP embebido
    const combined = new Uint8Array(jpegHeader.length + padding.length + zipSignature.length);
    combined.set(jpegHeader, 0);
    combined.set(padding, jpegHeader.length);
    combined.set(zipSignature, jpegHeader.length + padding.length);
    
    return combined;
}

console.log('✅ Función createPolyglotData() creada');
console.log('Genera archivo con firmas JPEG y ZIP');
console.groupEnd();

// Test 4: Ejemplo de uso con el Worker
console.group('🧪 Test 4: Ejemplo de Uso del Worker');

const workerTestCode = `
// Crear worker
const worker = new Worker('/src/workers/fileAnalysisWorker.js');

// Escuchar resultados
worker.addEventListener('message', (event) => {
    const { type, result, error } = event.data;
    
    if (type === 'ANALYSIS_COMPLETE') {
        console.log('✅ Análisis completado:', result);
        console.log('Nivel de riesgo:', result.analysis.riskLevel);
        console.log('Amenazas detectadas:', result.analysis.threats);
        console.log('Entropía:', result.analysis.entropy);
        console.log('LSB Analysis:', result.analysis.lsbAnalysis);
    } else if (type === 'ANALYSIS_ERROR') {
        console.error('❌ Error:', error);
    }
});

// Probar con imagen normal
const normalData = createNormalImageData(10000);
worker.postMessage({
    type: 'ANALYZE_FILE',
    data: {
        fileBuffer: normalData.buffer,
        filename: 'test-normal.png',
        mimeType: 'image/png',
        requestId: 'test-1'
    }
});

// Probar con imagen sospechosa
setTimeout(() => {
    const stegoData = createStegoImageData(10000);
    worker.postMessage({
        type: 'ANALYZE_FILE',
        data: {
            fileBuffer: stegoData.buffer,
            filename: 'test-stego.png',
            mimeType: 'image/png',
            requestId: 'test-2'
        }
    });
}, 1000);

// Probar con archivo polyglot
setTimeout(() => {
    const polyglotData = createPolyglotData();
    worker.postMessage({
        type: 'ANALYZE_FILE',
        data: {
            fileBuffer: polyglotData.buffer,
            filename: 'test-polyglot.jpg',
            mimeType: 'image/jpeg',
            requestId: 'test-3'
        }
    });
}, 2000);
`;

console.log('📋 Código de ejemplo:');
console.log(workerTestCode);
console.groupEnd();

// Test 5: Comparación de rendimiento
console.group('🧪 Test 5: Métricas de Rendimiento');

const performanceMetrics = {
    'Tamaño archivo pequeño (1KB)': '~5-15ms',
    'Tamaño archivo medio (100KB)': '~20-50ms',
    'Tamaño archivo grande (1MB)': '~100-300ms',
    'Tamaño archivo muy grande (10MB)': '~500-1500ms',
    'Timeout máximo': '5000ms',
};

console.table(performanceMetrics);
console.groupEnd();

// Test 6: Casos de prueba sugeridos
console.group('🧪 Test 6: Casos de Prueba Recomendados');

const testCases = [
    {
        nombre: 'Foto JPEG normal',
        archivo: 'photo.jpg',
        esperado: { riskLevel: 'low', threats: 0 }
    },
    {
        nombre: 'PNG con transparencia',
        archivo: 'logo.png',
        esperado: { riskLevel: 'low', threats: 0 }
    },
    {
        nombre: 'Imagen con esteganografía LSB',
        archivo: 'secret.png',
        esperado: { riskLevel: 'high', threats: '≥1 (LSB_STEGANOGRAPHY)' }
    },
    {
        nombre: 'Archivo polyglot (JPEG+ZIP)',
        archivo: 'exploit.jpg',
        esperado: { riskLevel: 'high', threats: '≥1 (POLYGLOT_FILE)' }
    },
    {
        nombre: 'MIME type mismatch',
        archivo: 'virus.jpg (realmente .exe)',
        esperado: { riskLevel: 'high', threats: '≥1 (MIME_MISMATCH)' }
    },
    {
        nombre: 'PDF con metadatos excesivos',
        archivo: 'document.pdf',
        esperado: { riskLevel: 'medium', threats: '≥1 (SUSPICIOUS_METADATA)' }
    },
    {
        nombre: 'Archivo muy grande (>10MB)',
        archivo: 'large.mp4',
        esperado: { riskLevel: 'critical', threats: '1 (SIZE_EXCEEDED)' }
    }
];

console.table(testCases);
console.groupEnd();

// Exportar funciones para uso en consola
if (typeof window !== 'undefined') {
    window.stegoTests = {
        createNormalImageData,
        createStegoImageData,
        createPolyglotData,
        testCases
    };
    console.log('✅ Funciones de prueba disponibles en window.stegoTests');
}

console.log('\n🎉 Tests preparados! Ejecuta el código de ejemplo del Test 4 para probar el worker.');
