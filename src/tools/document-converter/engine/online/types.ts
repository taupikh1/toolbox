/** Arsitektur provider konversi online. */

export interface OnlineProvider {
  providerId: string;
  providerName: string;
  baseUrl: string;
  supportedConversions: string[];
  isAvailable: boolean;
  requiresApiKey: boolean;
  requiresAuthentication: boolean;
  maximumFileSize: number; // bytes
  supportsBrowserCors: boolean;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  notes: string;
}

export interface ConversionRequest {
  file: File;
  conversionId: string; // e.g. 'pptx-to-pdf'
  signal?: AbortSignal;
  onProgress?: (msg: string) => void;
}

export interface ConversionResult {
  blob: Blob;
  fileName: string;
  contentType: string;
}
