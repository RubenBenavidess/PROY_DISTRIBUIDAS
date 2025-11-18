/**
 * XSS Validation Service
 * Validates and sanitizes user input BEFORE encryption
 * Runs on client-side to detect malicious patterns
 */

/**
 * Patterns to detect XSS attempts
 */
const XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onload, etc.
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /<svg.*onload/gi,
    /<img.*onerror/gi,
    /eval\(/gi,
    /expression\(/gi,
];

/**
 * Validates text content for XSS patterns
 * @param {string} text - Text to validate
 * @returns {Object} {isValid: boolean, threats: Array}
 */
export function validateTextContent(text) {
    if (!text || typeof text !== 'string') {
        return { isValid: true, threats: [] };
    }

    const threats = [];

    for (const pattern of XSS_PATTERNS) {
        if (pattern.test(text)) {
            threats.push({
                type: 'XSS_PATTERN',
                pattern: pattern.source,
                severity: 'high'
            });
        }
    }

    return {
        isValid: threats.length === 0,
        threats
    };
}

/**
 * Sanitizes text by removing dangerous patterns
 * WARNING: This is a basic sanitizer. For production, use DOMPurify
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    let sanitized = text;

    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // Remove dangerous tags
    sanitized = sanitized.replace(/<(iframe|object|embed|link|meta|svg|img)/gi, '&lt;$1');

    return sanitized;
}

/**
 * Validates message content before sending
 * @param {string} content - Message content
 * @param {Object} options - Validation options
 * @returns {Object} {isValid: boolean, sanitized: string, threats: Array}
 */
export function validateMessage(content, options = {}) {
    const {
        autoSanitize = false,
        maxLength = 10000
    } = options;

    const result = {
        isValid: true,
        sanitized: content,
        threats: [],
        warnings: []
    };

    // Check length
    if (content.length > maxLength) {
        result.isValid = false;
        result.threats.push({
            type: 'CONTENT_TOO_LONG',
            severity: 'medium',
            message: `Message exceeds maximum length (${maxLength} characters)`
        });
    }

    // Check for XSS patterns
    const xssCheck = validateTextContent(content);
    if (!xssCheck.isValid) {
        result.threats.push(...xssCheck.threats);
        
        if (autoSanitize) {
            result.sanitized = sanitizeText(content);
            result.warnings.push('Content was automatically sanitized');
        } else {
            result.isValid = false;
        }
    }

    return result;
}
