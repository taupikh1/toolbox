import type { OnlineProvider } from './types';

/**
 * Provider publik yang dievaluasi.
 * Status supportsBrowserCors = false karena verifikasi aktual menunjukkan
 * tidak ada header Access-Control-Allow-Origin pada demo Gotenberg.
 */
export const GOTENBERG_DEMO: OnlineProvider = {
  providerId: 'gotenberg-demo',
  providerName: 'Gotenberg Public Demo',
  baseUrl: 'https://demo.gotenberg.dev',
  supportedConversions: ['pptx-to-pdf', 'docx-to-pdf', 'xlsx-to-pdf'],
  isAvailable: false,
  requiresApiKey: false,
  requiresAuthentication: false,
  maximumFileSize: 5 * 1048576, // 5 MB (batas demo yang terdokumentasi)
  supportsBrowserCors: false,
  privacyPolicyUrl: 'https://gotenberg.dev/docs/getting-started/installation',
  termsUrl: 'https://gotenberg.dev/docs',
  notes: 'Public demo. Availability and limits may change. CORS tidak didukung dari browser (tidak ada Access-Control-Allow-Origin). Tidak cocok untuk dokumen rahasia. Rate limit ~2 req/detik.',
};

export const ONLINE_PROVIDERS: OnlineProvider[] = [GOTENBERG_DEMO];

export function getProvider(id: string): OnlineProvider | undefined {
  return ONLINE_PROVIDERS.find((p) => p.providerId === id);
}
