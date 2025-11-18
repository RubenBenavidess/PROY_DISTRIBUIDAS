/**
 * Script de prueba para el sistema de análisis de archivos con Web Workers
 * Ejecutar en consola del navegador (dentro de ChatRoomPage)
 */

// ========================================
// PRUEBA 1: Archivo Normal (bajo riesgo)
// ========================================
async function testNormalFile() {
    console.log('🧪 PRUEBA 1: Archivo Normal');
    console.log('='.repeat(50));
    
    // Crear archivo de prueba con datos aleatorios de baja entropía
    const data = new Uint8Array(5000);
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.floor(i % 256); // Patrón predecible
    }
    
    // Agregar magic bytes de JPEG
    data[0] = 0xFF;
    data[1] = 0xD8;
    data[2] = 0xFF;
    
    const blob = new Blob([data], { type: 'image/jpeg' });
    const file = new File([blob], 'normal.jpg', { type: 'image/jpeg' });
    
    const result = await window.fileValidationService.analyzeFile(file);
    console.log('📊 Resultado:', result);
    console.log('📋 Reporte:\n' + window.fileValidationService.generateReport(result));
    console.log('🎯 Decisión:', window.fileValidationService.shouldBlockFile(result));
    
    return result;
}

// ========================================
// PRUEBA 2: Alta Entropía (riesgo medio)
// ========================================
async function testHighEntropyFile() {
    console.log('\n🧪 PRUEBA 2: Alta Entropía');
    console.log('='.repeat(50));
    
    // Crear archivo con datos altamente aleatorios (alta entropía)
    const data = new Uint8Array(5000);
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.floor(Math.random() * 256); // Datos aleatorios
    }
    
    // Agregar magic bytes de PNG
    data[0] = 0x89;
    data[1] = 0x50;
    data[2] = 0x4E;
    data[3] = 0x47;
    
    const blob = new Blob([data], { type: 'image/png' });
    const file = new File([blob], 'high_entropy.png', { type: 'image/png' });
    
    const result = await window.fileValidationService.analyzeFile(file);
    console.log('📊 Resultado:', result);
    console.log('📋 Reporte:\n' + window.fileValidationService.generateReport(result));
    console.log('🎯 Decisión:', window.fileValidationService.shouldBlockFile(result));
    
    return result;
}

// ========================================
// PRUEBA 3: MIME Type Mismatch (alto riesgo)
// ========================================
async function testMimeTypeMismatch() {
    console.log('\n🧪 PRUEBA 3: MIME Type Mismatch');
    console.log('='.repeat(50));
    
    // Crear archivo PNG pero declarar como JPEG
    const data = new Uint8Array(5000);
    
    // Magic bytes de PNG
    data[0] = 0x89;
    data[1] = 0x50;
    data[2] = 0x4E;
    data[3] = 0x47;
    
    const blob = new Blob([data], { type: 'image/jpeg' }); // ❌ MIME incorrecto
    const file = new File([blob], 'fake.jpg', { type: 'image/jpeg' });
    
    const result = await window.fileValidationService.analyzeFile(file);
    console.log('📊 Resultado:', result);
    console.log('📋 Reporte:\n' + window.fileValidationService.generateReport(result));
    console.log('🎯 Decisión:', window.fileValidationService.shouldBlockFile(result));
    
    return result;
}

// ========================================
// PRUEBA 4: Archivo Muy Grande (crítico)
// ========================================
async function testOversizedFile() {
    console.log('\n🧪 PRUEBA 4: Archivo Muy Grande');
    console.log('='.repeat(50));
    
    // Crear archivo de 15 MB (excede límite de 10 MB)
    const size = 15 * 1024 * 1024;
    const data = new Uint8Array(size);
    
    // Magic bytes de JPEG
    data[0] = 0xFF;
    data[1] = 0xD8;
    data[2] = 0xFF;
    
    const blob = new Blob([data], { type: 'image/jpeg' });
    const file = new File([blob], 'oversized.jpg', { type: 'image/jpeg' });
    
    const result = await window.fileValidationService.analyzeFile(file);
    console.log('📊 Resultado:', result);
    console.log('📋 Reporte:\n' + window.fileValidationService.generateReport(result));
    console.log('🎯 Decisión:', window.fileValidationService.shouldBlockFile(result));
    
    return result;
}

// ========================================
// PRUEBA 5: Esteganografía LSB Simulada
// ========================================
async function testLSBSteganography() {
    console.log('\n🧪 PRUEBA 5: Esteganografía LSB Simulada');
    console.log('='.repeat(50));
    
    // Crear archivo con patrón LSB sospechoso
    const data = new Uint8Array(5000);
    
    // Magic bytes de PNG
    data[0] = 0x89;
    data[1] = 0x50;
    data[2] = 0x4E;
    data[3] = 0x47;
    
    // Patrón LSB sospechoso (muchos bits iguales)
    for (let i = 4; i < data.length; i++) {
        if (i % 2 === 0) {
            data[i] = 0xAA; // 10101010 - LSB = 0
        } else {
            data[i] = 0xAB; // 10101011 - LSB = 1
        }
    }
    
    const blob = new Blob([data], { type: 'image/png' });
    const file = new File([blob], 'steganography.png', { type: 'image/png' });
    
    const result = await window.fileValidationService.analyzeFile(file);
    console.log('📊 Resultado:', result);
    console.log('📋 Reporte:\n' + window.fileValidationService.generateReport(result));
    console.log('🎯 Decisión:', window.fileValidationService.shouldBlockFile(result));
    
    return result;
}

// ========================================
// PRUEBA 6: Análisis Múltiple en Paralelo
// ========================================
async function testMultipleFilesParallel() {
    console.log('\n🧪 PRUEBA 6: Análisis Múltiple en Paralelo');
    console.log('='.repeat(50));
    
    // Crear 5 archivos diferentes
    const files = [];
    for (let i = 0; i < 5; i++) {
        const data = new Uint8Array(2000);
        data[0] = 0xFF;
        data[1] = 0xD8;
        data[2] = 0xFF;
        
        const blob = new Blob([data], { type: 'image/jpeg' });
        files.push(new File([blob], `test_${i}.jpg`, { type: 'image/jpeg' }));
    }
    
    console.log('⏱️ Iniciando análisis paralelo de 5 archivos...');
    const startTime = performance.now();
    
    const results = await window.fileValidationService.analyzeMultipleFiles(files);
    
    const endTime = performance.now();
    console.log(`✅ Completado en ${(endTime - startTime).toFixed(2)} ms`);
    console.log('📊 Resultados:', results);
    
    results.forEach((result, i) => {
        console.log(`\nArchivo ${i + 1}: ${result.filename}`);
        console.log(`  - Tamaño: ${result.size} bytes`);
        console.log(`  - Entropía: ${result.analysis.entropy.toFixed(2)}`);
        console.log(`  - Riesgo: ${result.analysis.riskLevel}`);
        console.log(`  - Tiempo: ${result.processingTimeMs.toFixed(2)} ms`);
    });
    
    return results;
}

// ========================================
// PRUEBA 7: Rendimiento (archivo grande)
// ========================================
async function testPerformance() {
    console.log('\n🧪 PRUEBA 7: Rendimiento (5 MB)');
    console.log('='.repeat(50));
    
    const size = 5 * 1024 * 1024; // 5 MB
    const data = new Uint8Array(size);
    
    // Magic bytes de JPEG
    data[0] = 0xFF;
    data[1] = 0xD8;
    data[2] = 0xFF;
    
    // Datos semi-aleatorios
    for (let i = 3; i < data.length; i++) {
        data[i] = (i * 13) % 256;
    }
    
    const blob = new Blob([data], { type: 'image/jpeg' });
    const file = new File([blob], 'performance_test_5mb.jpg', { type: 'image/jpeg' });
    
    console.log('⏱️ Iniciando análisis de archivo de 5 MB...');
    const startTime = performance.now();
    
    const result = await window.fileValidationService.analyzeFile(file);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    console.log(`✅ Análisis completado en ${totalTime.toFixed(2)} ms`);
    console.log('📊 Desglose:');
    console.log(`  - Tiempo Worker: ${result.processingTimeMs.toFixed(2)} ms`);
    console.log(`  - Overhead comunicación: ${(totalTime - result.processingTimeMs).toFixed(2)} ms`);
    console.log(`  - Throughput: ${(size / 1024 / 1024 / (totalTime / 1000)).toFixed(2)} MB/s`);
    
    return result;
}

// ========================================
// EJECUTAR TODAS LAS PRUEBAS
// ========================================
async function runAllTests() {
    console.log('\n🚀 EJECUTANDO TODAS LAS PRUEBAS');
    console.log('='.repeat(70));
    
    try {
        await testNormalFile();
        await testHighEntropyFile();
        await testMimeTypeMismatch();
        await testOversizedFile();
        await testLSBSteganography();
        await testMultipleFilesParallel();
        await testPerformance();
        
        console.log('\n✅ TODAS LAS PRUEBAS COMPLETADAS');
        console.log('='.repeat(70));
    } catch (error) {
        console.error('❌ Error en pruebas:', error);
    }
}

// ========================================
// EXPONER FUNCIONES AL OBJETO WINDOW
// ========================================
window.fileAnalysisTests = {
    testNormalFile,
    testHighEntropyFile,
    testMimeTypeMismatch,
    testOversizedFile,
    testLSBSteganography,
    testMultipleFilesParallel,
    testPerformance,
    runAllTests
};

console.log('\n📦 Tests de análisis de archivos cargados.');
console.log('💡 Uso:');
console.log('  - window.fileAnalysisTests.runAllTests()          // Ejecutar todas');
console.log('  - window.fileAnalysisTests.testNormalFile()       // Prueba individual');
console.log('  - window.fileAnalysisTests.testLSBSteganography() // Detectar steganografía');
console.log('='.repeat(70));
