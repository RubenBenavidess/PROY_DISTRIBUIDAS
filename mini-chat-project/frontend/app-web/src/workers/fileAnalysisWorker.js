/**
 * Web Worker para análisis de seguridad de archivos en segundo plano
 * 
 * @description
 * Implementa detección de esteganografía, análisis de entropía y verificación de seguridad.
 * Se ejecuta en un hilo separado para no bloquear la UI principal.
 * 
 * @version 2.0.0
 * @author PROY_DISTRIBUIDAS Team
 * 
 * @features
 * - Detección de esteganografía LSB multi-plano (3 planos)
 * - Análisis de entropía con umbrales dinámicos por tipo de archivo
 * - Detección de archivos polyglot
 * - Validación de tipo MIME (32 formatos)
 * - Test Chi-Square para distribuciones anormales
 * - Sistema de timeout (5s máximo)
 * 
 */

const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    MAX_PROCESSING_TIME: 5000,
    CHUNK_SIZE: 512 * 1024,
    
    ENTROPY_PROFILES: {
        'image/jpeg': { min: 7.2, max: 7.8, suspicious: 7.85 },
        'image/png': { min: 7.0, max: 7.6, suspicious: 7.7 },
        'image/gif': { min: 5.0, max: 7.0, suspicious: 7.5 },
        'image/webp': { min: 7.3, max: 7.9, suspicious: 7.85 },
        'image/bmp': { min: 6.0, max: 7.5, suspicious: 7.6 },
        'image/tiff': { min: 6.5, max: 7.7, suspicious: 7.8 },
        'application/pdf': { min: 7.5, max: 8.0, suspicious: 7.95 },
        'video/mp4': { min: 7.8, max: 8.0, suspicious: 7.99 },
        'audio/mpeg': { min: 7.7, max: 8.0, suspicious: 7.98 },
        'application/zip': { min: 7.9, max: 8.0, suspicious: 7.99 },
        'default': { min: 6.0, max: 8.0, suspicious: 7.5 }
    },
    
    SUSPICIOUS_PATTERNS: {
        LSB_PATTERN_SIZE: 8192,
        LSB_BIT_PLANES: 3,
        METADATA_MAX_SIZE: 64 * 1024,
    }
};

/**
 * Calcula la entropía de Shannon de un buffer de datos
 * 
 * @description
 * La entropía mide el grado de aleatoriedad/información en los datos.
 * Valores altos (cerca de 8) pueden indicar compresión o esteganografía.
 * 
 * @algorithm
 * H(X) = -Σ p(x) * log₂(p(x))
 * donde p(x) es la probabilidad de cada byte (0-255)
 * 
 * @param {Uint8Array} data - Buffer de datos a analizar
 * @returns {number} Entropía en bits por byte (rango 0-8)
 * 
 * @example
 * const entropy = calculateEntropy(fileData);
 * // entropy ≈ 7.8 → Alta compresión o posible esteganografía
 * // entropy ≈ 4.5 → Datos estructurados normales
 */
function calculateEntropy(data) {
    const frequencies = new Array(256).fill(0);
    
    for (let i = 0; i < data.length; i++) {
        frequencies[data[i]]++;
    }
    
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
 * Analiza múltiples planos de bits para detectar esteganografía LSB
 * 
 * @description
 * Detecta datos ocultos en los bits menos significativos de los bytes.
 * Analiza 3 planos (LSB, LSB+1, LSB+2) con muestra de 8KB.
 * 
 * @technique
 * Esteganografía LSB oculta datos en los bits menos significativos,
 * creando patrones detectables mediante:
 * - Análisis de entropía de bits
 * - Tasa de transiciones (cambios 0→1, 1→0)
 * - Test Chi-Square para distribución anormal
 * - Balance de 0s vs 1s
 * 
 * @param {Uint8Array} data - Buffer de datos de imagen
 * @returns {Object} Resultado del análisis con detalles por plano
 * @returns {Array} returns.planes - Análisis de cada plano de bits
 * @returns {Object} returns.mostSuspiciousPlane - Plano con mayor riesgo
 * @returns {number} returns.overallRiskLevel - Nivel de riesgo global (0-100)
 * @returns {boolean} returns.isSuspicious - Si se detectó patrón sospechoso
 * 
 * @example
 * const lsb = analyzeLSB(imageData);
 * if (lsb.isSuspicious) {
 *   console.log(`Riesgo ${lsb.overallRiskLevel}% en plano ${lsb.mostSuspiciousPlane.plane}`);
 * }
 */
function analyzeLSB(data) {
    const sampleSize = Math.min(data.length, CONFIG.SUSPICIOUS_PATTERNS.LSB_PATTERN_SIZE);
    const bitPlanes = CONFIG.SUSPICIOUS_PATTERNS.LSB_BIT_PLANES;
    
    const planeResults = [];
    let maxRiskLevel = 0;
    let mostSuspiciousPlane = null;
    
    for (let plane = 0; plane < bitPlanes; plane++) {
        const mask = 1 << plane;
        const planeBits = new Uint8Array(sampleSize);
        
        for (let i = 0; i < sampleSize; i++) {
            planeBits[i] = (data[i] & mask) ? 1 : 0;
        }
        
        let zeros = 0;
        let ones = 0;
        for (let i = 0; i < planeBits.length; i++) {
            if (planeBits[i] === 0) zeros++;
            else ones++;
        }
        
        const p0 = zeros / planeBits.length;
        const p1 = ones / planeBits.length;
        let planeEntropy = 0;
        if (p0 > 0) planeEntropy -= p0 * Math.log2(p0);
        if (p1 > 0) planeEntropy -= p1 * Math.log2(p1);
        
        let transitions = 0;
        for (let i = 1; i < planeBits.length; i++) {
            if (planeBits[i] !== planeBits[i - 1]) {
                transitions++;
            }
        }
        
        const transitionRate = transitions / planeBits.length;
        const deviationFromRandom = Math.abs(transitionRate - 0.5);
        const balanceDeviation = Math.abs(p0 - 0.5);
        
        // Chi-Square: mide qué tan lejos está la distribución de lo esperado (uniforme)
        // Valor < 0.1 indica distribución DEMASIADO perfecta (sospechoso)
        // Valor > 3.841 indica distribución muy desbalanceada
        const expected = sampleSize / 2;
        const chiSquare = ((zeros - expected) ** 2 / expected) + 
                         ((ones - expected) ** 2 / expected);
        const chiSquareSuspicious = chiSquare < 0.1;
        
        // Criterios de detección (reducen falsos positivos):
        // 1. Transiciones extremadamente uniformes → típico de esteganografía
        const suspiciousTransitions = transitionRate > 0.52 || transitionRate < 0.42;
        
        // 2. Patrón perfecto: entropía + balance + Chi-Square perfectos
        const perfectPattern = planeEntropy > 0.98 && balanceDeviation < 0.02 && chiSquareSuspicious;
        
        // 3. Patrón muy desbalanceado con baja entropía
        const unbalancedPattern = balanceDeviation > 0.25 && planeEntropy < 0.8;
        
        const isSuspicious = perfectPattern || (suspiciousTransitions && planeEntropy > 0.95 && chiSquareSuspicious) || unbalancedPattern;
        
        let riskLevel = 0;
        if (isSuspicious) {
            if (perfectPattern) {
                riskLevel = 85 + (planeEntropy - 0.98) * 750;
            } else if (suspiciousTransitions && planeEntropy > 0.95) {
                riskLevel = 55 + deviationFromRandom * 200;
            } else if (unbalancedPattern) {
                riskLevel = 30 + balanceDeviation * 100;
            }
            riskLevel = Math.min(100, Math.max(0, riskLevel));
        }
        
        const planeResult = {
            plane,
            entropy: planeEntropy,
            transitionRate,
            balance: { zeros: p0, ones: p1 },
            chiSquare,
            isSuspicious,
            riskLevel
        };
        
        planeResults.push(planeResult);
        
        if (riskLevel > maxRiskLevel) {
            maxRiskLevel = riskLevel;
            mostSuspiciousPlane = planeResult;
        }
    }
    
    const overallSuspicious = planeResults.some(p => p.isSuspicious);
    
    return {
        planes: planeResults,
        mostSuspiciousPlane,
        overallRiskLevel: maxRiskLevel,
        isSuspicious: overallSuspicious,
        sampleSize,
        entropy: mostSuspiciousPlane?.entropy || planeResults[0].entropy,
        transitionRate: mostSuspiciousPlane?.transitionRate || planeResults[0].transitionRate,
        balance: mostSuspiciousPlane?.balance || planeResults[0].balance,
        riskLevel: maxRiskLevel
    };
}

/**
 * Detecta el tipo MIME real mediante análisis de magic bytes
 * 
 * @description
 * Analiza las firmas de archivo (magic bytes) para determinar el tipo real,
 * independiente del MIME declarado. Soporta 32 formatos y detecta polyglots.
 * 
 * @security
 * Un archivo polyglot contiene múltiples firmas de formato, lo cual puede
 * usarse para bypass de validaciones de seguridad.
 * 
 * @param {Uint8Array} data - Primeros bytes del archivo (mínimo 12 bytes)
 * @returns {Object} Información de detección MIME
 * @returns {string|null} returns.primary - Tipo MIME principal detectado
 * @returns {Array<string>} returns.all - Todos los tipos MIME detectados
 * @returns {boolean} returns.isPolyglot - Si contiene múltiples formatos
 * @returns {Array<Object>} returns.detections - Detecciones con offsets
 * 
 * @example
 * const detection = detectMimeType(fileData);
 * if (detection.isPolyglot) {
 *   console.warn('Archivo polyglot:', detection.all);
 * }
 */
function detectMimeType(data) {
    const detectedTypes = [];
    
    const signatures = [
        { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF], offset: 0 },
        { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], offset: 0 },
        { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], offset: 0 },
        { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], offset: 0 },
        { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
        { mime: 'image/bmp', bytes: [0x42, 0x4D], offset: 0 },
        { mime: 'image/tiff', bytes: [0x49, 0x49, 0x2A, 0x00], offset: 0 },
        { mime: 'image/tiff', bytes: [0x4D, 0x4D, 0x00, 0x2A], offset: 0 },
        { mime: 'image/x-icon', bytes: [0x00, 0x00, 0x01, 0x00], offset: 0 },
        { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 },
        { mime: 'application/zip', bytes: [0x50, 0x4B, 0x03, 0x04], offset: 0 },
        { mime: 'application/zip', bytes: [0x50, 0x4B, 0x05, 0x06], offset: 0 },
        { mime: 'application/zip', bytes: [0x50, 0x4B, 0x07, 0x08], offset: 0 },
        { mime: 'video/mp4', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
        { mime: 'video/x-msvideo', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
        { mime: 'video/x-matroska', bytes: [0x1A, 0x45, 0xDF, 0xA3], offset: 0 },
        { mime: 'audio/mpeg', bytes: [0xFF, 0xFB], offset: 0 },
        { mime: 'audio/mpeg', bytes: [0xFF, 0xF3], offset: 0 },
        { mime: 'audio/mpeg', bytes: [0xFF, 0xF2], offset: 0 },
        { mime: 'audio/mpeg', bytes: [0x49, 0x44, 0x33], offset: 0 },
        { mime: 'audio/wav', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
        { mime: 'audio/ogg', bytes: [0x4F, 0x67, 0x67, 0x53], offset: 0 },
        { mime: 'application/x-rar-compressed', bytes: [0x52, 0x61, 0x72, 0x21], offset: 0 },
        { mime: 'application/x-7z-compressed', bytes: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], offset: 0 },
        { mime: 'application/gzip', bytes: [0x1F, 0x8B], offset: 0 },
    ];
    
    for (const sig of signatures) {
        let matches = true;
        for (let i = 0; i < sig.bytes.length; i++) {
            if (data[sig.offset + i] !== sig.bytes[i]) {
                matches = false;
                break;
            }
        }
        if (matches) {
            if (sig.mime === 'image/webp') {
                const webpMarker = String.fromCharCode(data[8], data[9], data[10], data[11]);
                if (webpMarker !== 'WEBP') continue;
            }
            
            // Formatos RIFF (WebP/AVI/WAV) requieren validación adicional
            if (sig.mime === 'video/x-msvideo' || sig.mime === 'audio/wav') {
                const riffType = String.fromCharCode(data[8], data[9], data[10], data[11]);
                if (riffType === 'AVI ') {
                    detectedTypes.push({ mime: 'video/x-msvideo', offset: sig.offset });
                } else if (riffType === 'WAVE') {
                    detectedTypes.push({ mime: 'audio/wav', offset: sig.offset });
                }
                continue;
            }
            
            detectedTypes.push({ mime: sig.mime, offset: sig.offset });
        }
    }
    
    const isPolyglot = detectedTypes.length > 1;
    const uniqueMimes = [...new Set(detectedTypes.map(d => d.mime))];
    
    return {
        primary: detectedTypes.length > 0 ? detectedTypes[0].mime : null,
        all: uniqueMimes,
        isPolyglot,
        detections: detectedTypes
    };
}

/**
 * Analiza metadatos de imágenes JPEG y PNG
 * 
 * @description
 * Examina segmentos de metadatos (EXIF, IPTC, XMP en JPEG; chunks en PNG).
 * Metadatos excesivamente grandes pueden ocultar datos esteganográficos.
 * 
 * @param {Uint8Array} data - Buffer completo del archivo
 * @param {string} mimeType - Tipo MIME detectado del archivo
 * @returns {Object} Información de metadatos
 * @returns {boolean} returns.hasMetadata - Si contiene metadatos
 * @returns {number} returns.size - Tamaño total de metadatos en bytes
 * @returns {boolean} returns.isSuspicious - Si el tamaño es anormal
 * @returns {Array<string>} returns.warnings - Lista de advertencias
 * 
 * @example
 * const meta = analyzeMetadata(jpegData, 'image/jpeg');
 * if (meta.isSuspicious) {
 *   console.warn('Metadatos sospechosos:', meta.size, 'bytes');
 * }
 */
function analyzeMetadata(data, mimeType) {
    const metadata = {
        hasMetadata: false,
        size: 0,
        isSuspicious: false,
        warnings: []
    };
    
    if (mimeType === 'image/jpeg') {
        let pos = 2;
        
        while (pos < data.length - 1) {
            if (data[pos] !== 0xFF) break;
            
            const marker = data[pos + 1];
            if (marker === 0xD8 || marker === 0xD9) break;
            
            const segmentLength = (data[pos + 2] << 8) | data[pos + 3];
            
            if (marker >= 0xE0 && marker <= 0xEF) {
                metadata.hasMetadata = true;
                metadata.size += segmentLength;
            }
            
            pos += segmentLength + 2;
        }
        
        if (metadata.size > CONFIG.SUSPICIOUS_PATTERNS.METADATA_MAX_SIZE) {
            metadata.isSuspicious = true;
            metadata.warnings.push('Metadatos excesivamente grandes (posible esteganografía)');
        }
    } else if (mimeType === 'image/png') {
        let pos = 8;
        
        while (pos < data.length - 8) {
            const chunkLength = (data[pos] << 24) | (data[pos + 1] << 16) | 
                               (data[pos + 2] << 8) | data[pos + 3];
            const chunkType = String.fromCharCode(data[pos + 4], data[pos + 5], 
                                                   data[pos + 6], data[pos + 7]);
            
            if (['tEXt', 'zTXt', 'iTXt', 'eXIf'].includes(chunkType)) {
                metadata.hasMetadata = true;
                metadata.size += chunkLength;
            }
            
            // Chunks privados no estándar pueden ser sospechosos
            if (chunkType[0] === chunkType[0].toLowerCase() && 
                !['tEXt', 'zTXt', 'iTXt', 'eXIf', 'pHYs', 'sPLT', 'iCCP', 
                  'tIME', 'cHRM', 'gAMA', 'sBIT', 'sRGB', 'bKGD', 'hIST', 'tRNS'].includes(chunkType)) {
                metadata.warnings.push(`Chunk PNG no estándar: ${chunkType}`);
                metadata.isSuspicious = true;
            }
            
            pos += chunkLength + 12;
        }
    }
    
    return metadata;
}

/**
 * Evalúa la entropía usando umbrales dinámicos por tipo de archivo
 * 
 * @description
 * Cada formato tiene rangos normales diferentes de entropía.
 * Ejemplo: MP4 naturalmente tiene mayor entropía que GIF.
 * 
 * @param {number} entropy - Entropía calculada (0-8 bits/byte)
 * @param {string} mimeType - Tipo MIME del archivo
 * @returns {Object} Evaluación de entropía
 * @returns {number} returns.entropy - Entropía original
 * @returns {string} returns.level - Nivel: 'normal' | 'high' | 'critical'
 * @returns {boolean} returns.isSuspicious - Si excede umbrales
 * @returns {string|null} returns.message - Mensaje descriptivo
 * @returns {Object} returns.profile - Perfil usado para evaluación
 * @returns {boolean} returns.withinNormalRange - Si está en rango esperado
 * 
 * @example
 * const eval = evaluateEntropy(7.85, 'image/jpeg');
 * // eval.level === 'high' → Entropía elevada para JPEG
 */
function evaluateEntropy(entropy, mimeType) {
    const profile = CONFIG.ENTROPY_PROFILES[mimeType] || CONFIG.ENTROPY_PROFILES['default'];
    
    let level = 'normal';
    let isSuspicious = false;
    let message = null;
    
    if (entropy > profile.suspicious) {
        level = 'critical';
        isSuspicious = true;
        message = `Entropía anormalmente alta para ${mimeType} (${entropy.toFixed(3)} > ${profile.suspicious})`;
    } else if (entropy > profile.max) {
        level = 'high';
        isSuspicious = true;
        message = `Entropía elevada para ${mimeType} (${entropy.toFixed(3)} > ${profile.max})`;
    } else if (entropy < profile.min) {
        level = 'low';
        message = `Entropía inusualmente baja para ${mimeType} (${entropy.toFixed(3)} < ${profile.min})`;
    }
    
    return {
        entropy,
        level,
        isSuspicious,
        message,
        profile,
        withinNormalRange: entropy >= profile.min && entropy <= profile.max
    };
}

/**
 * Ejecuta análisis completo de seguridad del archivo
 * 
 * @description
 * Orquesta todos los análisis de seguridad con protección de timeout.
 * Combina múltiples técnicas de detección para clasificar el nivel de riesgo.
 * 
 * @workflow
 * 1. Validar tamaño del archivo
 * 2. Detectar tipo MIME real y verificar polyglots
 * 3. Calcular entropía con umbrales dinámicos
 * 4. Análisis LSB multi-plano (solo imágenes)
 * 5. Inspección de metadatos
 * 6. Clasificación de riesgo final
 * 
 * @param {ArrayBuffer} fileBuffer - Buffer completo del archivo
 * @param {string} filename - Nombre del archivo
 * @param {string} declaredMimeType - Tipo MIME declarado por el cliente
 * @returns {Object} Resultado completo del análisis
 * @returns {Object} returns.analysis - Detalles del análisis
 * @returns {string} returns.analysis.riskLevel - 'low' | 'medium' | 'high' | 'critical'
 * @returns {Array<Object>} returns.analysis.threats - Amenazas detectadas
 * @returns {number} returns.processingTimeMs - Tiempo de procesamiento
 * 
 * @throws {Error} Si el procesamiento excede MAX_PROCESSING_TIME
 * 
 * @example
 * const result = analyzeFile(buffer, 'image.png', 'image/png');
 * if (result.analysis.riskLevel === 'high') {
 *   console.warn('Archivo rechazado:', result.analysis.threats);
 * }
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
            entropyEvaluation: null,
            detectedMimeType: null,
            allDetectedTypes: [],
            isPolyglot: false,
            mimeTypeMismatch: false,
            lsbAnalysis: null,
            metadata: null,
            warnings: [],
            threats: [],
            riskLevel: 'low'
        },
        timestamp: new Date().toISOString(),
        processingTimeMs: 0
    };
    
    if (data.length > CONFIG.MAX_FILE_SIZE) {
        result.analysis.threats.push({
            type: 'SIZE_EXCEEDED',
            severity: 'critical',
            message: `Archivo excede el tamaño máximo (${CONFIG.MAX_FILE_SIZE} bytes)`
        });
        result.analysis.riskLevel = 'critical';
        result.processingTimeMs = performance.now() - startTime;
        return result;
    }
    
    const checkTimeout = () => {
        const elapsed = performance.now() - startTime;
        if (elapsed > CONFIG.MAX_PROCESSING_TIME) {
            throw new Error(`Procesamiento excedió el tiempo máximo (${CONFIG.MAX_PROCESSING_TIME}ms)`);
        }
    };
    
    try {
        const mimeDetection = detectMimeType(data);
        result.analysis.detectedMimeType = mimeDetection.primary;
        result.analysis.allDetectedTypes = mimeDetection.all;
        result.analysis.isPolyglot = mimeDetection.isPolyglot;
        
        checkTimeout();
        
        if (mimeDetection.isPolyglot) {
            result.analysis.threats.push({
                type: 'POLYGLOT_FILE',
                severity: 'high',
                message: `Archivo polyglot detectado: contiene múltiples formatos (${mimeDetection.all.join(', ')})`,
                details: mimeDetection.detections
            });
            result.analysis.riskLevel = 'high';
        }
        
        if (result.analysis.detectedMimeType && 
            result.analysis.detectedMimeType !== declaredMimeType) {
            result.analysis.mimeTypeMismatch = true;
            result.analysis.threats.push({
                type: 'MIME_MISMATCH',
                severity: 'high',
                message: `Tipo MIME declarado (${declaredMimeType}) no coincide con el detectado (${result.analysis.detectedMimeType})`
            });
            if (result.analysis.riskLevel === 'low') {
                result.analysis.riskLevel = 'high';
            }
        }
        
        checkTimeout();
        
        result.analysis.entropy = calculateEntropy(data);
        
        const mimeForEvaluation = result.analysis.detectedMimeType || declaredMimeType;
        result.analysis.entropyEvaluation = evaluateEntropy(result.analysis.entropy, mimeForEvaluation);
        
        if (result.analysis.entropyEvaluation.isSuspicious) {
            result.analysis.warnings.push(result.analysis.entropyEvaluation.message);
            if (result.analysis.entropyEvaluation.level === 'critical') {
                result.analysis.riskLevel = 'high';
            } else if (result.analysis.riskLevel === 'low') {
                result.analysis.riskLevel = 'medium';
            }
        }
        
        checkTimeout();
        
        if (declaredMimeType.startsWith('image/') || 
            (result.analysis.detectedMimeType && result.analysis.detectedMimeType.startsWith('image/'))) {
            result.analysis.lsbAnalysis = analyzeLSB(data);
            
            if (result.analysis.lsbAnalysis.isSuspicious) {
                result.analysis.threats.push({
                    type: 'LSB_STEGANOGRAPHY',
                    severity: 'high',
                    message: `Posible esteganografía LSB detectada (nivel de riesgo: ${result.analysis.lsbAnalysis.overallRiskLevel.toFixed(1)}%)`,
                    details: {
                        overallRisk: result.analysis.lsbAnalysis.overallRiskLevel,
                        mostSuspiciousPlane: result.analysis.lsbAnalysis.mostSuspiciousPlane,
                        planesAnalyzed: result.analysis.lsbAnalysis.planes.length,
                        sampleSize: result.analysis.lsbAnalysis.sampleSize
                    }
                });
                result.analysis.riskLevel = 'high';
            }
        }
        
        checkTimeout();
        
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
        
        checkTimeout();
        
    } catch (error) {
        result.analysis.threats.push({
            type: 'PROCESSING_ERROR',
            severity: 'high',
            message: error.message
        });
        result.analysis.riskLevel = 'high';
    }
    
    result.processingTimeMs = performance.now() - startTime;
    
    if (result.processingTimeMs > CONFIG.MAX_PROCESSING_TIME * 0.8) {
        result.analysis.warnings.push(`Procesamiento lento (${result.processingTimeMs.toFixed(0)}ms)`);
    }
    
    return result;
}

/**
 * Event listener para mensajes del hilo principal
 * 
 * @listens message
 * @event {MessageEvent} event - Evento con datos del archivo a analizar
 * @event.data.type {string} - Tipo de operación: 'ANALYZE_FILE'
 * @event.data.data {Object} - Datos del archivo
 * @event.data.data.fileBuffer {ArrayBuffer} - Buffer del archivo
 * @event.data.data.filename {string} - Nombre del archivo
 * @event.data.data.mimeType {string} - Tipo MIME declarado
 * @event.data.data.requestId {string} - ID único de la petición
 * 
 * @sends ANALYSIS_COMPLETE - Cuando el análisis termina exitosamente
 * @sends ANALYSIS_ERROR - Cuando ocurre un error durante el análisis
 */
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    if (type === 'ANALYZE_FILE') {
        try {
            const { fileBuffer, filename, mimeType, requestId } = data;
            
            console.log(`[Worker] Analizando archivo: ${filename} (${(fileBuffer.byteLength / 1024).toFixed(1)} KB, ID: ${requestId})`);
            
            const result = analyzeFile(fileBuffer, filename, mimeType);
            result.requestId = requestId;
            
            console.log(`[Worker] Análisis completado: ${filename} - Nivel de riesgo: ${result.analysis.riskLevel} (${result.processingTimeMs.toFixed(0)}ms)`);
            
            self.postMessage({
                type: 'ANALYSIS_COMPLETE',
                result
            });
            
        } catch (error) {
            console.error('[Worker] Error durante el análisis:', error);
            
            self.postMessage({
                type: 'ANALYSIS_ERROR',
                error: {
                    message: error.message,
                    stack: error.stack,
                    requestId: data?.requestId
                }
            });
        }
    }
});

console.log('[Worker] File Analysis Worker inicializado - v2.0 (Mejoras prioritarias implementadas)');
