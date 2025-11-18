import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { socketService } from '../services/socketService';
import { cryptoService } from '../utils/cryptoService';
import { fileValidationService } from '../services/fileValidationService';
import { validateMessage } from '../utils/xssValidator';
import { getRoomInfo } from '../api/roomApi';

import { ChatBubble } from '../components/chat/ChatBubble';
import { MessageInput } from '../components/chat/MessageInput';
import './ChatRoomPage.css';

const ChatRoomPage = () => {
    const navigate = useNavigate();
    const chatBodyRef = useRef(null); // Ref para hacer scroll automático
    const [disconnectMessage, setDisconnectMessage] = useState(null);
    const [roomTitle, setRoomTitle] = useState('Cargando...'); // Estado para el título de la sala

    // Saca toda la data del "cerebro" (roomStore)
    const roomInfo = useRoomStore((state) => state.roomInfo);
    const messages = useRoomStore((state) => state.messages);
    const participants = useRoomStore((state) => state.participants);
    const nickname = useRoomStore((state) => state.nickname);
    const hashedNickname = useRoomStore((state) => state.hashedNickname);
    const sessionId = useRoomStore((state) => state.sessionId);
    const isConnected = useRoomStore((state) => state.isConnected);
    
    // Leemos las acciones (funciones) del store
    const addMessage = useRoomStore((state) => state.addMessage);
    const setParticipants = useRoomStore((state) => state.setParticipants);
    const clearRoom = useRoomStore((state) => state.clearRoom);

    // --- Función para cargar participantes ---
    const loadParticipants = useCallback(async () => {
        try {
            const response = await socketService.getParticipants();
            if (response.success) {
                setParticipants(response.participants || []);
                console.log('Participantes cargados:', response.participants);
            }
        } catch (err) {
            console.error('Error cargando participantes:', err);
        }
    }, [setParticipants]);

    // --- VERIFICAR SI TENEMOS DATOS VÁLIDOS Y CLAVES CRIPTOGRÁFICAS ---
    useEffect(() => {
        // Verificar datos de la sala
        if (!roomInfo || !sessionId || !nickname || !hashedNickname) {
            console.warn('No room data found, redirecting to join page');
            navigate('/join', { replace: true });
            return;
        }
        
        // Verificar que las claves de encriptación estén disponibles
        if (!cryptoService.aesKey || !cryptoService.rsaKeyPair) {
            console.warn('⚠️ Claves de encriptación perdidas (recarga detectada)');
            console.warn('Por seguridad E2EE, debes volver a unirte a la sala');
            alert('⚠️ Las claves de encriptación se perdieron.\n\nPor seguridad, debes volver a unirte a la sala con el PIN correcto.');
            clearRoom();
            navigate('/join', { replace: true });
            return;
        }

        // 🧵 Inicializar Web Worker para análisis de archivos
        console.log('🧵 Inicializando Web Worker para análisis de archivos...');
        fileValidationService.initializeWorker();

        // Cargar el título real de la sala desde la API
        const loadRoomTitle = async () => {
            try {
                const fullRoomInfo = await getRoomInfo(roomInfo.roomId);
                setRoomTitle(fullRoomInfo.title || roomInfo.roomId);
                console.log('Título de sala cargado:', fullRoomInfo.title);
            } catch (err) {
                console.error('Error cargando título de sala:', err);
                setRoomTitle(roomInfo.roomId); // Fallback al roomId
            }
        };

        loadRoomTitle();

        // Cleanup: destruir worker al desmontar componente
        return () => {
            console.log('Limpiando Web Worker...');
            fileValidationService.destroy();
        };
    }, [roomInfo, sessionId, nickname, hashedNickname, navigate, clearRoom]);

    // --- EFECTO 1: Escuchar Sockets y Manejar Salida ---
    useEffect(() => {
        if (!roomInfo || !sessionId) return; // No hacer nada si no hay datos

        // --- Suscribirse a eventos del socket ---
        const handleNewMessage = async (msg) => {
            console.log('Nuevo mensaje recibido (encriptado):', msg);
            
            try {
                // 1️⃣ Verificar firma digital (si existe)
                if (msg.signature && msg.publicKey) {
                    const isValid = await cryptoService.verifySignature(
                        msg.content,
                        msg.signature,
                        msg.publicKey
                    );
                    
                    if (!isValid) {
                        console.warn('FIRMA INVÁLIDA - Mensaje posiblemente alterado:', msg);
                        // Agregar advertencia visual al mensaje
                        addMessage({
                            ...msg,
                            content: '[FIRMA INVÁLIDA - No confiar en este mensaje]',
                            isInvalid: true
                        });
                        return;
                    }
                    console.log('Firma verificada correctamente');
                }
                
                // 2️⃣ Desencriptar el mensaje (E2EE)
                const decryptedContent = await cryptoService.decryptMessage(msg.content);
                console.log('Mensaje desencriptado:', decryptedContent);
                
                // 3️⃣ Agregar mensaje desencriptado al store
                addMessage({
                    ...msg,
                    content: decryptedContent
                });
            } catch (err) {
                console.error('Error procesando mensaje:', err);
                // Si falla la desencriptación, mostrar error
                addMessage({
                    ...msg,
                    content: '[Error: No se pudo desencriptar el mensaje]',
                    isError: true
                });
            }
        };
        
        const handleNewFile = async (fileMsg) => {
            console.log('Nuevo archivo recibido (encriptado):', fileMsg);
            
            try {
                // 1️⃣ Verificar firma digital (si existe)
                if (fileMsg.signature && fileMsg.publicKey) {
                    const isValid = await cryptoService.verifySignature(
                        fileMsg.content,
                        fileMsg.signature,
                        fileMsg.publicKey
                    );
                    
                    if (!isValid) {
                        console.warn('FIRMA INVÁLIDA - Archivo posiblemente alterado:', fileMsg);
                        addMessage({
                            ...fileMsg,
                            content: null,
                            isInvalid: true,
                            filename: fileMsg.filename + ' [FIRMA INVÁLIDA]'
                        });
                        return;
                    }
                    console.log('Firma del archivo verificada correctamente');
                }
                
                // 2️⃣ Desencriptar el archivo (E2EE)
                console.log('Desencriptando archivo...');
                const decryptedBuffer = await cryptoService.decryptFile(fileMsg.content);
                
                // 3️⃣ Crear un Blob URL temporal para el archivo descifrado
                const blob = new Blob([decryptedBuffer], { type: fileMsg.contentType || 'application/octet-stream' });
                const blobUrl = URL.createObjectURL(blob);
                
                console.log('Archivo desencriptado correctamente');
                
                // 4️⃣ Agregar mensaje con URL del blob descifrado
                addMessage({
                    ...fileMsg,
                    content: blobUrl,
                    isEncrypted: true // Marca para limpiar el blob URL después
                });
            } catch (err) {
                console.error('Error procesando archivo:', err);
                addMessage({
                    ...fileMsg,
                    content: null,
                    isError: true,
                    filename: fileMsg.filename + ' [Error al descifrar]'
                });
            }
        };

        // Manejar cuando un usuario se une
        const handleUserJoined = (data) => {
            console.log('Usuario se unió:', data);
            // Recargar lista de participantes
            loadParticipants();
        };

        // Manejar cuando un usuario se va
        const handleUserLeft = (data) => {
            console.log('Usuario salió:', data);
            // Recargar lista de participantes
            loadParticipants();
        };

        // Manejar desconexión del servidor
        const handleDisconnect = (reason) => {
            // Solo mostrar mensaje si fue desconectado por el servidor
            if (reason === 'io server disconnect') {
                setDisconnectMessage('Desconectado del servidor');
                
                // Limpiar estado y redirigir después de 3 segundos
                setTimeout(() => {
                    clearRoom();
                    socketService.disconnect();
                    navigate('/join', { replace: true });
                }, 3000);
            }
        };
        
        socketService.listen('new-message', handleNewMessage);
        socketService.listen('new-file', handleNewFile);
        socketService.listen('user-joined', handleUserJoined);
        socketService.listen('user-left', handleUserLeft);
        socketService.onDisconnect(handleDisconnect);

        // Cargar participantes al montar
        loadParticipants();

        // --- Función de LIMPIEZA ---
        return () => {
            socketService.stopListening('new-message', handleNewMessage);
            socketService.stopListening('new-file', handleNewFile);
            socketService.stopListening('user-joined', handleUserJoined);
            socketService.stopListening('user-left', handleUserLeft);
            socketService.offDisconnect();
        };
    }, [roomInfo, sessionId, addMessage, clearRoom, navigate, loadParticipants]);

    // --- EFECTO 2: Scroll automático al fondo ---
    useEffect(() => {
        if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]); // Se ejecuta cada vez que llega un mensaje

    // --- Funciones para mandar datos ---
    const handleSendMessage = async (text) => {
        try {
            // PASO 1: Validación XSS (ANTES DE ENCRIPTAR)
            console.log('Validando contenido contra XSS...');
            const validation = validateMessage(text, { 
                autoSanitize: false,
                maxLength: 10000 
            });
            
            if (!validation.isValid) {
                const errorMsg = 'MENSAJE BLOQUEADO\n\n' +
                    'Se detectaron patrones peligrosos en el mensaje:\n' +
                    validation.threats.map(t => `- ${t.type}: ${t.severity}`).join('\n');
                
                alert(errorMsg);
                console.error('[XSS] Mensaje bloqueado:', validation);
                throw new Error('Message blocked due to XSS patterns');
            }
            
            console.log('[XSS] Mensaje validado correctamente');
            
            // PASO 2: Encriptar el mensaje con AES (E2EE)
            console.log('Encriptando mensaje...');
            const encryptedMessage = await cryptoService.encryptMessage(text);
            
            // PASO 3: Firmar el mensaje encriptado con RSA
            console.log('Firmando mensaje...');
            const signature = await cryptoService.signMessage(encryptedMessage);
            
            // PASO 4: Obtener la clave pública para enviar
            const publicKeyPem = cryptoService.getPublicKeyPEM();
            
            // PASO 5: Enviar mensaje encriptado con firma y clave pública
            console.log('Enviando mensaje encriptado al servidor...');
            await socketService.sendMessage(encryptedMessage, signature, publicKeyPem);
            console.log('Mensaje enviado correctamente');
        } catch (err) {
            console.error("Error enviando mensaje:", err);
            throw err;
        }
    };

    const handleSendFile = async (file) => {
        try {
            // PASO 1: ANÁLISIS DE SEGURIDAD (ANTES DE ENCRIPTAR) usando Web Worker
            console.log('Iniciando análisis de seguridad en hilo separado...');
            const analysisResult = await fileValidationService.analyzeFile(file);
            
            // Mostrar reporte en consola
            const report = fileValidationService.generateReport(analysisResult);
            console.log(report);
            
            // Verificar si el archivo debe ser bloqueado
            const blockDecision = fileValidationService.shouldBlockFile(analysisResult);
            
            if (blockDecision.shouldBlock) {
                // ARCHIVO BLOQUEADO POR AMENAZAS DE SEGURIDAD
                const errorMsg = `ARCHIVO BLOQUEADO\n\n` +
                    `Razón: ${blockDecision.reason}\n` +
                    `Nivel de riesgo: ${blockDecision.riskLevel.toUpperCase()}\n\n` +
                    `Amenazas detectadas:\n` +
                    blockDecision.threats.map((t, i) => 
                        `${i + 1}. [${t.severity}] ${t.message}`
                    ).join('\n');
                
                alert(errorMsg);
                console.error('[Seguridad] Archivo bloqueado:', blockDecision);
                throw new Error(blockDecision.reason);
            }
            
            if (blockDecision.shouldWarn) {
                // ADVERTENCIA AL USUARIO (pero permite continuar)
                const warnMsg = `ADVERTENCIA DE SEGURIDAD\n\n` +
                    `${blockDecision.reason}\n` +
                    `Nivel de riesgo: ${blockDecision.riskLevel.toUpperCase()}\n\n` +
                    `¿Deseas continuar enviando este archivo?`;
                
                const userConfirmed = confirm(warnMsg);
                if (!userConfirmed) {
                    console.log('📋 Usuario canceló el envío del archivo');
                    return;
                }
                console.warn('[Seguridad] Usuario confirmó envío a pesar de advertencias');
            }
            
            // Archivo aprobado o usuario confirmó
            console.log('[Seguridad] Archivo aprobado para envío');
            console.log(`Análisis completado en ${analysisResult.processingTimeMs.toFixed(2)}ms`);
            
            // PASO 2: Leer el archivo como ArrayBuffer
            console.log('Leyendo archivo...');
            const fileBuffer = await file.arrayBuffer();
            
            // PASO 3: Encriptar el archivo con AES (E2EE)
            console.log('Encriptando archivo...');
            const encryptedFile = await cryptoService.encryptFile(fileBuffer);
            
            // PASO 4: Firmar el archivo encriptado con RSA
            console.log('Firmando archivo...');
            const signature = await cryptoService.signMessage(encryptedFile);
            
            // PASO 5: Obtener la clave pública para enviar
            const publicKeyPem = cryptoService.getPublicKeyPEM();
            
            // PASO 6: Enviar archivo encriptado con firma y clave pública
            console.log('Enviando archivo encriptado al servidor...');
            await socketService.sendFile(
                encryptedFile,
                file.type,
                file.name,
                signature,
                publicKeyPem
            );
            console.log('Archivo enviado correctamente');
        } catch (err) {
            console.error("Error enviando archivo:", err);
            // Re-lanzar el error para que MessageInput lo capture
            throw err;
        }
    };

    // --- Función para salir de la sala ---
    const handleLeaveRoom = async () => {
        // Salir inmediatamente sin esperar respuesta del servidor
        cryptoService.clearKeys();
        clearRoom();
        socketService.disconnect();
        navigate('/join', { replace: true });
    };

    // Si no hay info (aún cargando o error), no muestra nada
    if (!roomInfo) {
        return null; // O un <LoadingSpinner />
    }
    
    // Requisito: El clip solo si el tipo de sala lo permite
    const showAttachButton = roomInfo.type === 'text/media';

    // Filtrar solo mensajes con archivos (no texto)
    const fileMessages = messages.filter(msg => msg.contentType && msg.contentType !== 'text');

    return (
        <div className="chat-layout">
        {/* Mensaje de desconexión */}
        {disconnectMessage && (
            <div className="disconnect-overlay">
                <div className="disconnect-message">
                    <span className="disconnect-icon">⚠️</span>
                    <h3>{disconnectMessage}</h3>
                    <p>Redirigiendo...</p>
                </div>
            </div>
        )}
        
        {/* Columna 1: Chat (Versión Desktop: 2 Columnas) */}
        <div className="chat-column">
            
            {/* Header (Tu Spec) */}
            <header className="chat-header">
                <div className="header-info">
                    <h2>{roomTitle}</h2>
                    <span><span className="lock-icon">🔒</span> Cifrado E2EE</span>
                </div>
                <button onClick={handleLeaveRoom} className="leave-button">
                    Salir
                </button>
            </header>

            {/* Cuerpo del Chat */}
            <div className="chat-body" ref={chatBodyRef}>
            {messages.map((msg, index) => (
                <ChatBubble
                key={msg.id || index}
                message={msg}
                // Compara el 'username' hasheado del mensaje con el 'hashedNickname' guardado
                isMe={msg.username === hashedNickname}
                />
            ))}
            </div>
            
            {/* Input */}
            <MessageInput
            onSendMessage={handleSendMessage}
            onSendFile={handleSendFile}
            showAttach={showAttachButton}
            />
        </div>

        {/* Columna 2: Detalles (Tu Spec - Solo Desktop) */}
        <aside className="details-column">
            <h3>Usuarios Conectados ({participants.length})</h3>
            <div className="participants-list">
                {participants.map((participant, index) => {
                    const isMe = participant.hashedUsername === hashedNickname;
                    return (
                        <div key={index} className="participant-item">
                            <span className="participant-name">
                                {isMe ? nickname : `Usuario ${participant.hashedUsername.substring(0, 6)}`}
                            </span>
                            {isMe && <span className="participant-badge">Tu</span>}
                        </div>
                    );
                })}
                {participants.length === 0 && (
                    <p className="no-participants">Cargando participantes...</p>
                )}
            </div>
            
            {showAttachButton && (
            <>
                <hr />
                <h3>Archivos ({fileMessages.length})</h3>
                <div className="files-list">
                    {fileMessages.length > 0 ? (
                        fileMessages.map((msg, idx) => {
                            const isImage = msg.contentType && msg.contentType.startsWith('image/');
                            const filename = msg.filename || msg.content?.split('/').pop()?.replace(/^\d+_/, '') || 'archivo';
                            
                            return (
                                <div key={msg.id || idx} className="file-item">
                                    {isImage ? (
                                        <a href={msg.content} target="_blank" rel="noopener noreferrer" className="file-preview">
                                            <img 
                                                src={msg.content} 
                                                alt={filename}
                                                loading="lazy"
                                            />
                                        </a>
                                    ) : (
                                        <a href={msg.content} download={filename} className="file-preview file-icon-preview">
                                            <span>📄</span>
                                        </a>
                                    )}
                                    <div className="file-info">
                                        <span className="file-name" title={filename}>{filename}</span>
                                        <a 
                                            href={msg.content} 
                                            download={filename}
                                            className="file-download-btn"
                                            title="Descargar"
                                        >
                                            ⬇️
                                        </a>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="no-files">No hay archivos.</p>
                    )}
                </div>
            </>
            )}
        </aside>
        </div>
    );
};

export default ChatRoomPage;