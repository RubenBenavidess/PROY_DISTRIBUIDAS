/**
 * Servicio de Criptografía para Chat E2EE
 * Implementa AES-GCM para encriptación de mensajes y RSA para firma digital
 * El servidor NUNCA puede desencriptar los mensajes (End-to-End Encryption)
 */

class CryptoService {
    constructor() {
        this.rsaKeyPair = null; // Par de claves RSA del usuario (firma digital)
        this.aesKey = null; // Clave AES de la sala (encriptación)
        this.publicKeyPem = null; // Clave pública en formato Base64 para compartir
    }

    /**
     * Genera un par de claves RSA para el usuario
     * Usado para firma digital (verificar identidad)
     */
    async generateRSAKeyPair() {
        try {
            this.rsaKeyPair = await window.crypto.subtle.generateKey(
                {
                    name: 'RSASSA-PKCS1-v1_5',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: 'SHA-256',
                },
                true, // extractable
                ['sign', 'verify']
            );

            // Exportar clave pública para compartir con otros usuarios
            const publicKeyBuffer = await window.crypto.subtle.exportKey(
                'spki',
                this.rsaKeyPair.publicKey
            );
            this.publicKeyPem = this.arrayBufferToBase64(publicKeyBuffer);

            console.log('🔐 [Crypto] Par de claves RSA generado');
            return this.publicKeyPem;
        } catch (error) {
            console.error('❌ [Crypto] Error generando claves RSA:', error);
            throw error;
        }
    }

    /**
     * Deriva una clave AES-GCM desde roomId y PIN
     * Esta es la clave compartida de la sala (todos la calculan igual)
     * ⚠️ IMPORTANTE: El servidor NUNCA tiene acceso a esta clave
     */
    async deriveAESKey(roomId, pin) {
        try {
            // Combinar roomId y pin para generar semilla
            const seed = `${roomId}:${pin}`;
            const encoder = new TextEncoder();
            const seedBuffer = encoder.encode(seed);

            // Hash SHA-256 de la semilla
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', seedBuffer);

            // Importar como clave AES-GCM
            this.aesKey = await window.crypto.subtle.importKey(
                'raw',
                hashBuffer,
                { name: 'AES-GCM' },
                false, // no extractable por seguridad
                ['encrypt', 'decrypt']
            );

            console.log('🔑 [Crypto] Clave AES derivada de la sala (E2EE)');
            return this.aesKey;
        } catch (error) {
            console.error('❌ [Crypto] Error derivando clave AES:', error);
            throw error;
        }
    }

    /**
     * Encripta un mensaje con AES-GCM
     * @param {string} message - Mensaje en texto plano
     * @returns {string} Mensaje encriptado en Base64 (formato: iv:ciphertext)
     */
    async encryptMessage(message) {
        if (!this.aesKey) {
            throw new Error('Clave AES no inicializada. Llama a deriveAESKey primero.');
        }

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(message);

            // Generar IV aleatorio (12 bytes recomendados para GCM)
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            // Encriptar
            const ciphertext = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                this.aesKey,
                data
            );

            // Combinar IV + ciphertext y convertir a Base64
            const combined = new Uint8Array(iv.length + ciphertext.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(ciphertext), iv.length);

            const encrypted = this.arrayBufferToBase64(combined.buffer);
            console.log('🔒 [Crypto] Mensaje encriptado');
            return encrypted;
        } catch (error) {
            console.error('❌ [Crypto] Error encriptando mensaje:', error);
            throw error;
        }
    }

    /**
     * Desencripta un mensaje con AES-GCM
     * @param {string} encryptedMessage - Mensaje encriptado en Base64 (iv:ciphertext)
     * @returns {string} Mensaje en texto plano
     */
    async decryptMessage(encryptedMessage) {
        if (!this.aesKey) {
            throw new Error('Clave AES no inicializada. Llama a deriveAESKey primero.');
        }

        try {
            // Convertir de Base64 a ArrayBuffer
            const combined = this.base64ToArrayBuffer(encryptedMessage);
            const combinedArray = new Uint8Array(combined);

            // Extraer IV (primeros 12 bytes)
            const iv = combinedArray.slice(0, 12);

            // Extraer ciphertext (resto)
            const ciphertext = combinedArray.slice(12);

            // Desencriptar
            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                this.aesKey,
                ciphertext
            );

            const decoder = new TextDecoder();
            const message = decoder.decode(decrypted);
            console.log('🔓 [Crypto] Mensaje desencriptado');
            return message;
        } catch (error) {
            console.error('❌ [Crypto] Error desencriptando mensaje:', error);
            return '[❌ Error: No se pudo desencriptar el mensaje]';
        }
    }

    /**
     * Firma un mensaje con la clave privada RSA
     * @param {string} message - Mensaje a firmar
     * @returns {string} Firma en Base64
     */
    async signMessage(message) {
        if (!this.rsaKeyPair || !this.rsaKeyPair.privateKey) {
            throw new Error('Clave privada RSA no disponible. Llama a generateRSAKeyPair primero.');
        }

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(message);

            const signature = await window.crypto.subtle.sign(
                'RSASSA-PKCS1-v1_5',
                this.rsaKeyPair.privateKey,
                data
            );

            const signatureBase64 = this.arrayBufferToBase64(signature);
            console.log('✍️ [Crypto] Mensaje firmado');
            return signatureBase64;
        } catch (error) {
            console.error('❌ [Crypto] Error firmando mensaje:', error);
            throw error;
        }
    }

    /**
     * Verifica la firma de un mensaje con una clave pública RSA
     * @param {string} message - Mensaje original
     * @param {string} signatureBase64 - Firma en Base64
     * @param {string} publicKeyPem - Clave pública en Base64
     * @returns {boolean} true si la firma es válida
     */
    async verifySignature(message, signatureBase64, publicKeyPem) {
        try {
            // Importar clave pública
            const publicKeyBuffer = this.base64ToArrayBuffer(publicKeyPem);
            const publicKey = await window.crypto.subtle.importKey(
                'spki',
                publicKeyBuffer,
                {
                    name: 'RSASSA-PKCS1-v1_5',
                    hash: 'SHA-256',
                },
                false,
                ['verify']
            );

            // Verificar firma
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            const signature = this.base64ToArrayBuffer(signatureBase64);

            const isValid = await window.crypto.subtle.verify(
                'RSASSA-PKCS1-v1_5',
                publicKey,
                signature,
                data
            );

            if (isValid) {
                console.log('✅ [Crypto] Firma verificada correctamente');
            } else {
                console.warn('⚠️ [Crypto] Firma inválida');
            }

            return isValid;
        } catch (error) {
            console.error('❌ [Crypto] Error verificando firma:', error);
            return false;
        }
    }

    /**
     * Limpia todas las claves (al salir de la sala)
     */
    clearKeys() {
        this.rsaKeyPair = null;
        this.aesKey = null;
        this.publicKeyPem = null;
        console.log('🧹 [Crypto] Claves limpiadas');
    }

    /**
     * Obtiene la clave pública RSA en formato Base64
     * Para compartir con otros usuarios y verificar firmas
     */
    getPublicKeyPEM() {
        if (!this.publicKeyPem) {
            throw new Error('Clave pública no disponible. Llama a generateRSAKeyPair primero.');
        }
        return this.publicKeyPem;
    }

    // --- Utilidades de conversión ---

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// Exportar instancia singleton
export const cryptoService = new CryptoService();
