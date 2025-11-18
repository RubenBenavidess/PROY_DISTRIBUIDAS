/**
 * Web Worker para análisis de archivos en segundo plano
 * Implementa detección de esteganografía, análisis de entropía y verificación de seguridad
 * Se ejecuta en un hilo separado para no bloquear la UI
 */

// Configuración de límites y umbrales
const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
    ENTROPY_THRESHOLD: 7.5, // Umbral para detectar alta entropía (posible esteganografía)
    SUSPICIOUS_PATTERNS: {
        // Patrones sospechosos en archivos
        LSB_PATTERN_SIZE: 1024, // Tamaño de muestra para análisis LSB
        METADATA_MAX_SIZE: 64 * 1024, // Máximo tamaño razonable de metadatos
    }
};

/**
 * Calcula la entropía de Shannon de un buffer
 * Alta entropía puede indicar esteganografía o compresión
 * @param {Uint8Array} data - Datos a analizar
 * @returns {number} Entropía (0-8 bits por byte)
 */
function calculateEntropy(data) {
    const frequencies = new Array(256).fill(0);
    
    // Contar frecuencias de cada byte
    for (let i = 0; i < data.length; i++) {
        frequencies[data[i]]++;
    }
    
    // Calcular entropía de Shannon
    let entropy = 0;
    const len = data.length;
    
    for (let i = 0; i < 256; i++) {
        if (frequencies[i] > 0) {
            const p = frequencies[i] / len;
            entropy -= p * Math.log2(p);
        }
    }
    
    return entropy;
}

/**
 * Analiza los bits menos significativos (LSB) para detectar esteganografía LSB
 * @param {Uint8Array} data - Datos a analizar
 * @returns {Object} Resultado del análisis LSB
 */
function analyzeLSB(data) {
    const sampleSize = Math.min(data.length, CONFIG.SUSPICIOUS_PATTERNS.LSB_PATTERN_SIZE);
    const lsbBits = new Uint8Array(sampleSize);
    
    // Extraer bits LSB
    for (let i = 0; i < sampleSize; i++) {
        lsbBits[i] = data[i] & 0x01;
    }
    
    // Calcular entropía de los LSBs (solo bits 0 y 1)
    let zeros = 0;
    let ones = 0;
    for (let i = 0; i < lsbBits.length; i++) {
        if (lsbBits[i] === 0) zeros++;
        else ones++;
    }
    
    const p0 = zeros / lsbBits.length;
    const p1 = ones / lsbBits.length;
    let lsbEntropy = 0;
    if (p0 > 0) lsbEntropy -= p0 * Math.log2(p0);
    if (p1 > 0) lsbEntropy -= p1 * Math.log2(p1);
    
    // Contar transiciones (cambios de 0 a 1 o viceversa)
    let transitions = 0;
    for (let i = 1; i < lsbBits.length; i++) {
        if (lsbBits[i] !== lsbBits[i - 1]) {
            transitions++;
        }
    }
    
    const transitionRate = transitions / lsbBits.length;
    
    // ANÁLISIS RIGUROSO:
    // - Imágenes normales: transiciones ~48-52%, entropía cercana a 1.0, distribución 50/50
    // - Esteganografía LSB: patrones muy uniformes (>52% o <45%), entropía perfecta (>0.99)
    // - Compresión/estructura: transiciones bajas (<40%), distribución sesgada
    
    const deviationFromRandom = Math.abs(transitionRate - 0.5);
    const balanceDeviation = Math.abs(p0 - 0.5); // Qué tan balanceado está 0s vs 1s
    
    // Criterios MÁS ESTRICTOS para reducir falsos positivos:
    // 1. Transiciones extremadamente uniformes (típico de esteganografía)
    const suspiciousTransitions = transitionRate > 0.52 || transitionRate < 0.42;
    
    // 2. Entropía PERFECTA (cercana a 1.0) + balance perfecto (señal de datos embebidos)
    const perfectPattern = lsbEntropy > 0.98 && balanceDeviation < 0.02;
    
    // 3. Patrón muy desbalanceado (muchos 0s o muchos 1s) + baja entropía
    const unbalancedPattern = balanceDeviation > 0.25 && lsbEntropy < 0.8;
    
    const isSuspicious = perfectPattern || (suspiciousTransitions && lsbEntropy > 0.95) || unbalancedPattern;
    
    // Calcular nivel de riesgo (0-100)
    let riskLevel = 0;
    if (isSuspicious) {
        if (perfectPattern) {
            // Patrón perfecto = alto riesgo
            riskLevel = 80 + (lsbEntropy - 0.98) * 2000; // 80-100%
        } else if (suspiciousTransitions && lsbEntropy > 0.95) {
            // Transiciones anormales + alta entropía
            riskLevel = 50 + deviationFromRandom * 200; // 50-80%
        } else if (unbalancedPattern) {
            // Muy desbalanceado
            riskLevel = 30 + balanceDeviation * 100; // 30-60%
        }
        riskLevel = Math.min(100, Math.max(0, riskLevel));
    }
    
    return {
        entropy: lsbEntropy,
        transitionRate,
        balance: { zeros: p0, ones: p1 },
        isSuspicious,
        riskLevel
    };
}

/**
 * Detecta el tipo MIME real del archivo analizando sus magic bytes
 * @param {Uint8Array} data - Primeros bytes del archivo
 * @returns {string|null} Tipo MIME detectado o null
 */
function detectMimeType(data) {
    // Magic bytes de formatos comunes
    const signatures = [
        { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
        { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47] },
        { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
        { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // + WEBP después
        { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
        { mime: 'video/mp4', bytes: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70] },
        { mime: 'audio/mpeg', bytes: [0xFF, 0xFB] },
        { mime: 'audio/mpeg', bytes: [0x49, 0x44, 0x33] }, // ID3 tag
        { mime: 'application/zip', bytes: [0x50, 0x4B, 0x03, 0x04] },
    ];
    
    for (const sig of signatures) {
        let matches = true;
        for (let i = 0; i < sig.bytes.length; i++) {
            if (data[i] !== sig.bytes[i]) {
                matches = false;
                break;
            }
        }
        if (matches) return sig.mime;
    }
    
    return null;
}

/**
 * Analiza metadatos de imágenes (EXIF, IPTC, XMP)
 * Metadatos excesivos pueden ocultar datos
 * @param {Uint8Array} data - Datos del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @returns {Object} Información sobre metadatos
 */
function analyzeMetadata(data, mimeType) {
    const metadata = {
        hasMetadata: false,
        size: 0,
        isSuspicious: false,
        warnings: []
    };
    
    if (mimeType === 'image/jpeg') {
        // Buscar segmentos EXIF en JPEG
        let pos = 2; // Saltar SOI marker (0xFFD8)
        
        while (pos < data.length - 1) {
            if (data[pos] !== 0xFF) break;
            
            const marker = data[pos + 1];
            if (marker === 0xD8 || marker === 0xD9) break; // SOI o EOI
            
            const segmentLength = (data[pos + 2] << 8) | data[pos + 3];
            
            // APP0-APP15 markers (metadatos)
            if (marker >= 0xE0 && marker <= 0xEF) {
                metadata.hasMetadata = true;
                metadata.size += segmentLength;
            }
            
            pos += segmentLength + 2;
        }
        
        // Metadatos sospechosamente grandes
        if (metadata.size > CONFIG.SUSPICIOUS_PATTERNS.METADATA_MAX_SIZE) {
            metadata.isSuspicious = true;
            metadata.warnings.push('Metadatos excesivamente grandes (posible esteganografía)');
        }
    } else if (mimeType === 'image/png') {
        // PNG chunks - buscar chunks no estándar o muy grandes
        let pos = 8; // Saltar PNG signature
        
        while (pos < data.length - 8) {
            const chunkLength = (data[pos] << 24) | (data[pos + 1] << 16) | 
                               (data[pos + 2] << 8) | data[pos + 3];
            const chunkType = String.fromCharCode(data[pos + 4], data[pos + 5], 
                                                   data[pos + 6], data[pos + 7]);
            
            // Chunks de metadatos
            if (['tEXt', 'zTXt', 'iTXt', 'eXIf'].includes(chunkType)) {
                metadata.hasMetadata = true;
                metadata.size += chunkLength;
            }
            
            // Chunks no estándar (ancillary chunks privados)
            if (chunkType[0] === chunkType[0].toLowerCase() && 
                !['tEXt', 'zTXt', 'iTXt', 'eXIf', 'pHYs', 'sPLT', 'iCCP', 
                  'tIME', 'cHRM', 'gAMA', 'sBIT', 'sRGB', 'bKGD', 'hIST', 'tRNS'].includes(chunkType)) {
                metadata.warnings.push(`Chunk PNG no estándar: ${chunkType}`);
                metadata.isSuspicious = true;
            }
            
            pos += chunkLength + 12; // length(4) + type(4) + data + CRC(4)
        }
    }
    
    return metadata;
}

/**
 * Análisis completo de archivo para detección de esteganografía
 * @param {ArrayBuffer} fileBuffer - Buffer del archivo
 * @param {string} filename - Nombre del archivo
 * @param {string} declaredMimeType - Tipo MIME declarado
 * @returns {Object} Resultado completo del análisis
 */
function analyzeFile(fileBuffer, filename, declaredMimeType) {
    const data = new Uint8Array(fileBuffer);
    const startTime = performance.now();
    
    const result = {
        filename,
        size: data.length,
        declaredMimeType,
        analysis: {
            entropy: 0,
            detectedMimeType: null,
            mimeTypeMismatch: false,
            lsbAnalysis: null,
            metadata: null,
            warnings: [],
            threats: [],
            riskLevel: 'low' // low, medium, high, critical
        },
        timestamp: new Date().toISOString(),
        processingTimeMs: 0
    };
    
    // 1. Verificar tamaño
    if (data.length > CONFIG.MAX_FILE_SIZE) {
        result.analysis.threats.push({
            type: 'SIZE_EXCEEDED',
            severity: 'critical',
            message: `Archivo excede el tamaño máximo (${CONFIG.MAX_FILE_SIZE} bytes)`
        });
        result.analysis.riskLevel = 'critical';
        return result;
    }
    
    // 2. Calcular entropía global
    result.analysis.entropy = calculateEntropy(data);
    
    if (result.analysis.entropy > CONFIG.ENTROPY_THRESHOLD) {
        result.analysis.warnings.push('Alta entropía detectada (posible compresión o esteganografía)');
        result.analysis.riskLevel = 'medium';
    }
    
    // 3. Detectar tipo MIME real
    result.analysis.detectedMimeType = detectMimeType(data);
    
    if (result.analysis.detectedMimeType && 
        result.analysis.detectedMimeType !== declaredMimeType) {
        result.analysis.mimeTypeMismatch = true;
        result.analysis.threats.push({
            type: 'MIME_MISMATCH',
            severity: 'high',
            message: `Tipo MIME declarado (${declaredMimeType}) no coincide con el detectado (${result.analysis.detectedMimeType})`
        });
        result.analysis.riskLevel = 'high';
    }
    
    // 4. Análisis LSB (solo para imágenes)
    if (declaredMimeType.startsWith('image/')) {
        result.analysis.lsbAnalysis = analyzeLSB(data);
        
        if (result.analysis.lsbAnalysis.isSuspicious) {
            result.analysis.threats.push({
                type: 'LSB_STEGANOGRAPHY',
                severity: 'high',
                message: `Posible esteganografía LSB detectada (nivel de riesgo: ${result.analysis.lsbAnalysis.riskLevel.toFixed(1)}%)`,
                details: result.analysis.lsbAnalysis
            });
            result.analysis.riskLevel = 'high';
        }
    }
    
    // 5. Análisis de metadatos
    if (result.analysis.detectedMimeType) {
        result.analysis.metadata = analyzeMetadata(data, result.analysis.detectedMimeType);
        
        if (result.analysis.metadata.isSuspicious) {
            result.analysis.threats.push({
                type: 'SUSPICIOUS_METADATA',
                severity: 'medium',
                message: 'Metadatos sospechosos detectados',
                details: result.analysis.metadata.warnings
            });
            if (result.analysis.riskLevel === 'low') {
                result.analysis.riskLevel = 'medium';
            }
        }
    }
    
    // 6. Tiempo de procesamiento
    result.processingTimeMs = performance.now() - startTime;
    
    return result;
}

// Escuchar mensajes del hilo principal
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    if (type === 'ANALYZE_FILE') {
        try {
            const { fileBuffer, filename, mimeType, requestId } = data;
            
            console.log(`[Worker] Analizando archivo: ${filename} (ID: ${requestId})`);
            
            const result = analyzeFile(fileBuffer, filename, mimeType);
            
            // Agregar requestId al resultado
            result.requestId = requestId;
            
            // Enviar resultado al hilo principal
            self.postMessage({
                type: 'ANALYSIS_COMPLETE',
                result
            });
            
        } catch (error) {
            self.postMessage({
                type: 'ANALYSIS_ERROR',
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
        }
    }
});

console.log('[Worker] File Analysis Worker inicializado');
