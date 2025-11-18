/**
 * Servicio de Validación de Archivos del Lado del Cliente
 * Implementa análisis de seguridad con Web Workers (hilos)
 * Compatible con E2EE - analiza ANTES de encriptar
 */

class FileValidationService {
    constructor() {
        this.worker = null;
        this.pendingAnalysis = new Map(); // Map<requestId, { resolve, reject, timeout }>
        this.requestIdCounter = 0;
        this.workerInitialized = false;
    }

    /**
     * Inicializa el Web Worker para análisis en segundo plano
     */
    initializeWorker() {
        if (this.workerInitialized) return;

        try {
            // Crear worker desde archivo
            this.worker = new Worker(
                new URL('../workers/fileAnalysisWorker.js', import.meta.url),
                { type: 'module' }
            );

            // Escuchar mensajes del worker
            this.worker.addEventListener('message', (event) => {
                this.handleWorkerMessage(event.data);
            });

            // Manejar errores del worker
            this.worker.addEventListener('error', (error) => {
                console.error('[FileValidation] Error en Worker:', error);
                this.rejectAllPending(new Error('Worker crashed: ' + error.message));
            });

            this.workerInitialized = true;
            console.log('[FileValidation] Worker inicializado');
        } catch (error) {
            console.error('[FileValidation] Error creando Worker:', error);
            throw error;
        }
    }

    /**
     * Maneja mensajes recibidos del worker
     */
    handleWorkerMessage(message) {
        const { type, result, error } = message;

        if (type === 'ANALYSIS_COMPLETE') {
            // Buscar la promesa pendiente correspondiente
            const pending = this.pendingAnalysis.get(result.requestId);
            if (pending) {
                clearTimeout(pending.timeout);
                pending.resolve(result);
                this.pendingAnalysis.delete(result.requestId);
            }
        } else if (type === 'ANALYSIS_ERROR') {
            console.error('[FileValidation] Error en análisis:', error);
            this.rejectAllPending(new Error(error.message));
        }
    }

    /**
     * Rechaza todas las promesas pendientes (en caso de crash del worker)
     */
    rejectAllPending(error) {
        for (const [requestId, pending] of this.pendingAnalysis.entries()) {
            clearTimeout(pending.timeout);
            pending.reject(error);
            this.pendingAnalysis.delete(requestId);
        }
    }

    /**
     * Analiza un archivo en busca de amenazas de seguridad
     * Se ejecuta en un Web Worker separado (no bloquea la UI)
     * 
     * @param {File} file - Archivo a analizar
     * @param {Object} options - Opciones de análisis
     * @returns {Promise<Object>} Resultado del análisis
     */
    async analyzeFile(file, options = {}) {
        // Asegurar que el worker está inicializado
        if (!this.workerInitialized) {
            this.initializeWorker();
        }

        const {
            timeout = 30000, // 30 segundos máximo
            enableLSBAnalysis = true,
            enableMetadataAnalysis = true,
            enableEntropyAnalysis = true
        } = options;

        return new Promise((resolve, reject) => {
            // Generar ID único para esta solicitud
            const requestId = ++this.requestIdCounter;

            // Leer el archivo como ArrayBuffer
            const reader = new FileReader();

            reader.onload = () => {
                const fileBuffer = reader.result;

                // Configurar timeout
                const timeoutId = setTimeout(() => {
                    this.pendingAnalysis.delete(requestId);
                    reject(new Error('Análisis de archivo timeout (excedió ' + timeout + 'ms)'));
                }, timeout);

                // Guardar promesa pendiente
                this.pendingAnalysis.set(requestId, {
                    resolve: (result) => {
                        // Agregar requestId al resultado para debug
                        result.requestId = requestId;
                        resolve(result);
                    },
                    reject,
                    timeout: timeoutId
                });

                // Enviar archivo al worker para análisis
                this.worker.postMessage({
                    type: 'ANALYZE_FILE',
                    data: {
                        fileBuffer,
                        filename: file.name,
                        mimeType: file.type,
                        requestId,
                        options: {
                            enableLSBAnalysis,
                            enableMetadataAnalysis,
                            enableEntropyAnalysis
                        }
                    }
                });

                console.log(`📊 [FileValidation] Análisis iniciado: ${file.name} (ID: ${requestId})`);
            };

            reader.onerror = () => {
                reject(new Error('Error leyendo archivo: ' + reader.error));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Valida múltiples archivos en paralelo usando el pool de workers
     * @param {File[]} files - Array de archivos a validar
     * @returns {Promise<Object[]>} Array de resultados
     */
    async analyzeMultipleFiles(files) {
        const promises = files.map(file => this.analyzeFile(file));
        return Promise.all(promises);
    }

    /**
     * Determina si un archivo debe ser bloqueado según el resultado del análisis
     * @param {Object} analysisResult - Resultado del análisis
     * @returns {Object} { shouldBlock, reason, riskLevel }
     */
    shouldBlockFile(analysisResult) {
        const { analysis } = analysisResult;

        // Bloquear si hay amenazas críticas
        const criticalThreats = analysis.threats.filter(t => t.severity === 'critical');
        if (criticalThreats.length > 0) {
            return {
                shouldBlock: true,
                reason: criticalThreats[0].message,
                riskLevel: 'critical',
                threats: criticalThreats
            };
        }

        // Bloquear si hay amenazas altas
        const highThreats = analysis.threats.filter(t => t.severity === 'high');
        if (highThreats.length > 0) {
            return {
                shouldBlock: true,
                reason: highThreats[0].message,
                riskLevel: 'high',
                threats: highThreats
            };
        }

        // Advertir pero permitir si hay amenazas medias
        const mediumThreats = analysis.threats.filter(t => t.severity === 'medium');
        if (mediumThreats.length > 0) {
            return {
                shouldBlock: false,
                shouldWarn: true,
                reason: mediumThreats[0].message,
                riskLevel: 'medium',
                threats: mediumThreats
            };
        }

        // Archivo seguro
        return {
            shouldBlock: false,
            shouldWarn: false,
            reason: 'Archivo seguro',
            riskLevel: 'low',
            threats: []
        };
    }

    /**
     * Genera un reporte legible del análisis
     * @param {Object} analysisResult - Resultado del análisis
     * @returns {string} Reporte en texto
     */
    generateReport(analysisResult) {
        const { filename, size, declaredMimeType, analysis, processingTimeMs } = analysisResult;

        let report = `📄 REPORTE DE ANÁLISIS DE ARCHIVO\n`;
        report += `${'='.repeat(50)}\n\n`;
        report += `Archivo: ${filename}\n`;
        report += `Tamaño: ${(size / 1024).toFixed(2)} KB\n`;
        report += `Tipo MIME declarado: ${declaredMimeType}\n`;
        report += `Tipo MIME detectado: ${analysis.detectedMimeType || 'N/A'}\n`;
        report += `Entropía: ${analysis.entropy.toFixed(2)} bits/byte\n`;
        report += `Nivel de riesgo: ${analysis.riskLevel.toUpperCase()}\n`;
        report += `Tiempo de análisis: ${processingTimeMs.toFixed(2)} ms\n\n`;

        if (analysis.threats.length > 0) {
            report += `AMENAZAS DETECTADAS (${analysis.threats.length}):\n`;
            analysis.threats.forEach((threat, i) => {
                report += `  ${i + 1}. [${threat.severity.toUpperCase()}] ${threat.message}\n`;
                if (threat.details) {
                    report += `     Detalles: ${JSON.stringify(threat.details, null, 2)}\n`;
                }
            });
            report += '\n';
        }

        if (analysis.warnings.length > 0) {
            report += `ADVERTENCIAS (${analysis.warnings.length}):\n`;
            analysis.warnings.forEach((warning, i) => {
                report += `  ${i + 1}. ${warning}\n`;
            });
            report += '\n';
        }

        if (analysis.lsbAnalysis) {
            report += `ANÁLISIS LSB:\n`;
            report += `  - Entropía LSB: ${analysis.lsbAnalysis.entropy.toFixed(4)}\n`;
            report += `  - Tasa de transiciones: ${(analysis.lsbAnalysis.transitionRate * 100).toFixed(2)}%\n`;
            if (analysis.lsbAnalysis.balance) {
                report += `  - Balance (0s/1s): ${(analysis.lsbAnalysis.balance.zeros * 100).toFixed(1)}% / ${(analysis.lsbAnalysis.balance.ones * 100).toFixed(1)}%\n`;
            }
            report += `  - Sospechoso: ${analysis.lsbAnalysis.isSuspicious ? 'SÍ' : 'NO'}\n`;
            if (analysis.lsbAnalysis.isSuspicious) {
                report += `  - Nivel de riesgo: ${analysis.lsbAnalysis.riskLevel.toFixed(2)}%\n`;
            }
            report += '\n';
        }

        if (analysis.metadata) {
            report += `METADATOS:\n`;
            report += `  - Tiene metadatos: ${analysis.metadata.hasMetadata ? 'SÍ' : 'NO'}\n`;
            report += `  - Tamaño metadatos: ${analysis.metadata.size} bytes\n`;
            report += `  - Sospechoso: ${analysis.metadata.isSuspicious ? 'SÍ' : 'NO'}\n`;
            if (analysis.metadata.warnings.length > 0) {
                report += `  - Advertencias:\n`;
                analysis.metadata.warnings.forEach(w => {
                    report += `    * ${w}\n`;
                });
            }
        }

        report += `${'='.repeat(50)}\n`;

        return report;
    }

    /**
     * Limpia recursos y termina el worker
     */
    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.workerInitialized = false;
            console.log('🧹 [FileValidation] Worker terminado');
        }
        this.rejectAllPending(new Error('Service destroyed'));
    }
}

// Exportar instancia singleton
export const fileValidationService = new FileValidationService();
