import React from 'react';
import './FileAnalysisStatus.css';

/**
 * Componente para mostrar el estado del análisis de archivos
 * Muestra información en tiempo real del análisis de seguridad
 */
export const FileAnalysisStatus = ({ analysisResult }) => {
    if (!analysisResult) return null;

    const { filename, size, analysis, processingTimeMs } = analysisResult;

    const getRiskColor = (riskLevel) => {
        const colors = {
            low: '#4CAF50',      // Verde
            medium: '#FF9800',   // Naranja
            high: '#FF5722',     // Rojo-Naranja
            critical: '#F44336'  // Rojo
        };
        return colors[riskLevel] || colors.low;
    };

    const getRiskEmoji = (riskLevel) => {
        const labels = {
            low: 'OK',
            medium: 'WARNING',
            high: 'DANGER',
            critical: 'BLOCKED'
        };
        return labels[riskLevel] || 'OK';
    };

    return (
        <div className="file-analysis-status">
            <div className="analysis-header">
                <span className="analysis-icon">{getRiskEmoji(analysis.riskLevel)}</span>
                <h4>Análisis de Seguridad</h4>
            </div>

            <div className="analysis-info">
                <div className="info-row">
                    <span className="label">Archivo:</span>
                    <span className="value">{filename}</span>
                </div>
                <div className="info-row">
                    <span className="label">Tamaño:</span>
                    <span className="value">{(size / 1024).toFixed(2)} KB</span>
                </div>
                <div className="info-row">
                    <span className="label">Nivel de Riesgo:</span>
                    <span 
                        className="value risk-badge" 
                        style={{ backgroundColor: getRiskColor(analysis.riskLevel) }}
                    >
                        {analysis.riskLevel.toUpperCase()}
                    </span>
                </div>
                <div className="info-row">
                    <span className="label">Entropía:</span>
                    <span className="value">{analysis.entropy.toFixed(2)} bits/byte</span>
                </div>
                <div className="info-row">
                    <span className="label">Tiempo de análisis:</span>
                    <span className="value">{processingTimeMs.toFixed(2)} ms</span>
                </div>
            </div>

            {analysis.threats.length > 0 && (
                <div className="analysis-threats">
                    <h5>Amenazas Detectadas ({analysis.threats.length})</h5>
                    <ul>
                        {analysis.threats.map((threat, i) => (
                            <li key={i} className={`threat-item severity-${threat.severity}`}>
                                <strong>[{threat.severity.toUpperCase()}]</strong> {threat.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {analysis.warnings.length > 0 && (
                <div className="analysis-warnings">
                    <h5>Advertencias ({analysis.warnings.length})</h5>
                    <ul>
                        {analysis.warnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                        ))}
                    </ul>
                </div>
            )}

            {analysis.lsbAnalysis && (
                <div className="analysis-lsb">
                    <h5>Análisis LSB</h5>
                    <div className="lsb-details">
                        <div className="detail-item">
                            <span>Entropía LSB:</span>
                            <span>{analysis.lsbAnalysis.entropy.toFixed(4)}</span>
                        </div>
                        <div className="detail-item">
                            <span>Tasa de transiciones:</span>
                            <span>{(analysis.lsbAnalysis.transitionRate * 100).toFixed(2)}%</span>
                        </div>
                        {analysis.lsbAnalysis.balance && (
                            <div className="detail-item">
                                <span>Balance (0s/1s):</span>
                                <span>{(analysis.lsbAnalysis.balance.zeros * 100).toFixed(1)}% / {(analysis.lsbAnalysis.balance.ones * 100).toFixed(1)}%</span>
                            </div>
                        )}
                        {analysis.lsbAnalysis.isSuspicious && (
                            <div className="detail-item suspicious">
                                <span>Patrón sospechoso detectado</span>
                                <span>Nivel de riesgo: {analysis.lsbAnalysis.riskLevel.toFixed(1)}%</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
