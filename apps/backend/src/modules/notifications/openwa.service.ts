import { env } from '../../config/env';

export interface OpenWaSessionStatus {
  available: boolean;
  sessionId: string | null;
  name: string;
  status: 'offline' | 'created' | 'initializing' | 'qr_ready' | 'authenticating' | 'ready' | 'disconnected' | 'failed';
  phone: string | null;
  pushName: string | null;
  qrCode: string | null;
  dashboardUrl: string;
  errorMessage?: string | null;
}

export class OpenWaService {
  private apiUrl: string;
  private apiKey: string;
  private sessionName: string;

  constructor() {
    this.apiUrl = env.OPENWA_API_URL.replace(/\/+$/, '');
    this.apiKey = env.OPENWA_API_KEY;
    this.sessionName = env.OPENWA_SESSION_NAME;
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  /**
   * Format any international or domestic phone number into WhatsApp chatId format (...@c.us)
   */
  formatChatId(phone: string): string {
    if (!phone) throw new Error('Phone number is required');
    let cleaned = phone.replace(/[^0-9]/g, '');

    // Common handling for 10-digit Indian phone numbers without country code
    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }

    // Strip leading zeroes if any
    cleaned = cleaned.replace(/^0+/, '');

    return `${cleaned}@c.us`;
  }

  /**
   * Find or create the default WhatsApp session in OpenWA
   */
  async getOrCreateSession(): Promise<{ id: string; name: string; status: string; phone?: string | null; pushName?: string | null }> {
    try {
      // 1. List existing sessions
      const res = await fetch(`${this.apiUrl}/api/sessions`, {
        headers: this.headers,
      });

      if (!res.ok) {
        throw new Error(`OpenWA sessions request failed with status ${res.status}`);
      }

      const sessions = (await res.json()) as any[];
      const existing = sessions.find((s) => s.name === this.sessionName);

      if (existing) {
        return existing;
      }

      // 2. Create new session if none found
      const createRes = await fetch(`${this.apiUrl}/api/sessions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ name: this.sessionName }),
      });

      if (!createRes.ok) {
        throw new Error(`Failed to create OpenWA session (${createRes.status})`);
      }

      const created = (await createRes.json()) as any;

      // 3. Immediately trigger start so QR code generates
      await fetch(`${this.apiUrl}/api/sessions/${created.id}/start`, {
        method: 'POST',
        headers: this.headers,
      }).catch((err) => {
        console.warn('[OpenWA] Failed to start new session:', err?.message);
      });

      return created;
    } catch (err: any) {
      console.error('[OpenWA] getOrCreateSession error:', err?.message);
      throw err;
    }
  }

  /**
   * Get detailed WhatsApp gateway status, including live QR code if ready for scanning
   */
  async getStatus(): Promise<OpenWaSessionStatus> {
    const dashboardUrl = this.apiUrl;
    try {
      const session = await this.getOrCreateSession();
      let qrCode: string | null = null;

      // If status is created or disconnected, trigger start to get to qr_ready
      if (session.status === 'created' || session.status === 'disconnected') {
        try {
          const startRes = await fetch(`${this.apiUrl}/api/sessions/${session.id}/start`, {
            method: 'POST',
            headers: this.headers,
          });
          if (startRes.ok) {
            const started = (await startRes.json()) as any;
            session.status = started.status;
          }
        } catch {
          // ignore start failure and report current status
        }
      }

      // If status is qr_ready, fetch the QR code
      if (session.status === 'qr_ready') {
        try {
          const qrRes = await fetch(`${this.apiUrl}/api/sessions/${session.id}/qr`, {
            headers: this.headers,
          });
          if (qrRes.ok) {
            const qrData = (await qrRes.json()) as any;
            qrCode = qrData.qrCode;
          }
        } catch (qrErr: any) {
          console.warn('[OpenWA] Failed to fetch QR code:', qrErr?.message);
        }
      }

      return {
        available: true,
        sessionId: session.id,
        name: session.name,
        status: (session.status as any) || 'unknown',
        phone: session.phone || null,
        pushName: session.pushName || null,
        qrCode,
        dashboardUrl,
      };
    } catch (err: any) {
      return {
        available: false,
        sessionId: null,
        name: this.sessionName,
        status: 'offline',
        phone: null,
        pushName: null,
        qrCode: null,
        dashboardUrl,
        errorMessage: err?.message || 'OpenWA gateway offline',
      };
    }
  }

  /**
   * Disconnect or log out current WhatsApp session
   */
  async disconnect(): Promise<void> {
    const session = await this.getOrCreateSession();
    await fetch(`${this.apiUrl}/api/sessions/${session.id}/logout`, {
      method: 'POST',
      headers: this.headers,
    }).catch(async () => {
      await fetch(`${this.apiUrl}/api/sessions/${session.id}/stop`, {
        method: 'POST',
        headers: this.headers,
      });
    });
  }

  /**
   * Send WhatsApp text message to a recipient
   */
  async sendTextMessage(toPhone: string, text: string): Promise<{ success: boolean; messageId?: string }> {
    const session = await this.getOrCreateSession();

    if (session.status !== 'ready') {
      throw new Error(
        `WhatsApp session is not authenticated (Status: ${session.status}). Please link your WhatsApp in Settings by scanning the QR code.`,
      );
    }

    const chatId = this.formatChatId(toPhone);

    const res = await fetch(`${this.apiUrl}/api/sessions/${session.id}/messages/send-text`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        chatId,
        text,
      }),
    });

    if (!res.ok) {
      const errJson = (await res.json().catch(() => null)) as any;
      throw new Error(
        errJson?.message || errJson?.error || `OpenWA send message failed with status ${res.status}`,
      );
    }

    const data = (await res.json()) as any;
    return {
      success: true,
      messageId: data.id || data.messageId,
    };
  }
}

export const openwaService = new OpenWaService();
