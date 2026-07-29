/**
 * FBR IRIS API Error Codes
 * Reference: https://docs.fbr.gov.pk/pos-integration-error-codes
 */

export interface FbrErrorInfo {
  code: string;
  message: string;
  retriable: boolean;
  userMessage: string;
  action?: string;
}

export const FBR_ERROR_CODES: Record<string, FbrErrorInfo> = {
  // ═══ Success ═══
  '00': { code: '00', message: 'Success', retriable: false, userMessage: 'Invoice accepted' },

  // ═══ Authentication (Not Retriable) ═══
  '01': { code: '01', message: 'Invalid Token', retriable: false,
    userMessage: 'API Token galat hai — FBR portal se naya token lo',
    action: 'REGENERATE_TOKEN' },
  '02': { code: '02', message: 'Token Expired', retriable: false,
    userMessage: 'Token expire ho gaya — FBR portal se refresh karo',
    action: 'REGENERATE_TOKEN' },
  '03': { code: '03', message: 'Unauthorized POS', retriable: false,
    userMessage: 'POS ID FBR mein register nahi — POS ID check karo',
    action: 'CHECK_POS_ID' },

  // ═══ Validation (Not Retriable — Fix Data) ═══
  '10': { code: '10', message: 'Invalid NTN', retriable: false,
    userMessage: 'NTN format galat — 7-15 digits check karo' },
  '11': { code: '11', message: 'Invalid Invoice Format', retriable: false,
    userMessage: 'Invoice data mein error — support se contact karo' },
  '12': { code: '12', message: 'Duplicate Invoice', retriable: false,
    userMessage: 'Ye invoice pehle submit ho chuki hai — safe to ignore' },
  '13': { code: '13', message: 'Missing HS Code', retriable: false,
    userMessage: 'Product HS code missing — product settings mein add karo' },
  '14': { code: '14', message: 'Invalid Tax Rate', retriable: false,
    userMessage: 'Tax rate 0-100 hona chahiye' },
  '15': { code: '15', message: 'Buyer info incomplete', retriable: false,
    userMessage: 'Customer NTN/CNIC add karo' },

  // ═══ Server / Network (Retriable) ═══
  '50': { code: '50', message: 'Server Error', retriable: true,
    userMessage: 'FBR server issue — automatic retry hoga' },
  '51': { code: '51', message: 'Timeout', retriable: true,
    userMessage: 'FBR server timeout — retry hoga' },
  '52': { code: '52', message: 'Service Unavailable', retriable: true,
    userMessage: 'FBR maintenance mode — thodi der mein retry hoga' },
  '53': { code: '53', message: 'Rate Limit', retriable: true,
    userMessage: 'Zyada requests bhej diye — cool down mein retry hoga' },

  // ═══ Business Logic (Not Retriable) ═══
  '99': { code: '99', message: 'Unknown Error', retriable: false,
    userMessage: 'Unknown FBR error — logs check karo aur support se rabta' },
};

/**
 * Parse FBR response and return standardized error info.
 */
export function parseFbrResponse(response: any): {
  success: boolean;
  errorInfo?: FbrErrorInfo;
  invoiceNumber?: string;
  qrCode?: string;
} {
  // Success case
  if (response?.validationResponse?.statusCode === '00' || response?.invoiceNumber) {
    return {
      success: true,
      invoiceNumber: response.invoiceNumber ?? response.validationResponse?.invoiceNumber,
      qrCode: response.qrCode ?? response.validationResponse?.qrCode,
    };
  }

  // Extract error code
  const code = response?.validationResponse?.statusCode
    ?? response?.errorCode
    ?? response?.code
    ?? '99';

  const knownError = FBR_ERROR_CODES[code] ?? FBR_ERROR_CODES['99'];

  // Enhance with actual error message from FBR if available
  const fbrMessage = response?.validationResponse?.error
    ?? response?.error
    ?? response?.message;

  return {
    success: false,
    errorInfo: {
      ...knownError,
      message: fbrMessage ?? knownError.message,
    },
  };
}

/**
 * Should we auto-retry this error?
 */
export function shouldRetry(errorCode: string): boolean {
  return FBR_ERROR_CODES[errorCode]?.retriable ?? false;
}
