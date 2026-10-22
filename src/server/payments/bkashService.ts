import { serverDb, type PaymentOrder } from '../db.ts';

export interface BkashMerchantStatus {
  isConfigured: boolean;
  isSandbox: boolean;
  merchantApprovalStatus: 'pending_approval' | 'ready';
  message: string;
}

export interface BkashInitiationResult {
  success: boolean;
  order: PaymentOrder;
  paymentId?: string;
  bkashURL?: string;
  isSimulated?: boolean;
  pendingApproval?: boolean;
  message?: string;
  error?: string;
}

export interface BkashVerificationResult {
  success: boolean;
  order?: PaymentOrder;
  trxId?: string;
  isSimulated?: boolean;
  message?: string;
  error?: string;
}

class BkashService {
  /**
   * Evaluates whether official bKash merchant credentials are fully configured on the server
   */
  public isBkashConfigured(): boolean {
    const { BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD } = process.env;
    return !!(
      BKASH_APP_KEY &&
      BKASH_APP_SECRET &&
      BKASH_USERNAME &&
      BKASH_PASSWORD &&
      BKASH_APP_KEY.trim() !== '' &&
      BKASH_APP_SECRET.trim() !== ''
    );
  }

  /**
   * Returns current bKash merchant integration status and pending approval state
   */
  public getMerchantStatus(): BkashMerchantStatus {
    const configured = this.isBkashConfigured();
    const baseUrl = process.env.BKASH_BASE_URL || '';
    const isSandbox = !baseUrl.includes('pay.bka.sh') || baseUrl.includes('sandbox');

    if (!configured) {
      return {
        isConfigured: false,
        isSandbox,
        merchantApprovalStatus: 'pending_approval',
        message:
          'bKash Business application submitted. Live checkout will be enabled as soon as merchant integration credentials (App Key & Secret) are confirmed.'
      };
    }

    return {
      isConfigured: true,
      isSandbox,
      merchantApprovalStatus: 'ready',
      message: 'bKash Merchant integration is configured and ready for checkout initiation.'
    };
  }

  /**
   * Prepares and initiates a payment order for bKash.
   * If credentials are not yet approved/configured, creates a pending order but securely halts live gateway redirection.
   */
  public async initiatePayment(params: {
    userId: string;
    planId: 'pro' | 'master';
    billingInterval?: 'monthly' | 'yearly';
    callbackUrl?: string;
  }): Promise<BkashInitiationResult> {
    // 1. Create authoritative server-controlled pending order
    const order = serverDb.createPaymentOrder({
      userId: params.userId,
      planId: params.planId,
      billingInterval: params.billingInterval || 'monthly',
      provider: 'bkash',
      metadata: {
        clientCallbackUrl: params.callbackUrl
      }
    });

    // 2. Check if merchant credentials are verified
    if (!this.isBkashConfigured()) {
      return {
        success: false,
        pendingApproval: true,
        order,
        message:
          'Order created. bKash Merchant approval and production credentials are currently pending verification. Live bKash checkout will be activated upon merchant approval.',
        error: 'bKash merchant credentials not configured on the server.'
      };
    }

    // 3. Official bKash Tokenized Checkout API flow (when credentials are provided)
    try {
      const baseUrl = process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v2.0-preview';
      const token = await this.grantToken(baseUrl);

      const response = await fetch(`${baseUrl}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-APP-Key': process.env.BKASH_APP_KEY || ''
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: params.userId,
          callbackURL: params.callbackUrl,
          amount: order.amount.toString(),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: order.orderId
        })
      });

      const data = await response.json();
      if (data.statusCode === '0000' && data.paymentID && data.bkashURL) {
        serverDb.updatePaymentOrderStatus(order.orderId, 'initiated', {
          providerPaymentId: data.paymentID
        });

        return {
          success: true,
          order,
          paymentId: data.paymentID,
          bkashURL: data.bkashURL
        };
      }

      const errMsg = data.statusMessage || 'Failed to initiate bKash checkout.';
      serverDb.updatePaymentOrderStatus(order.orderId, 'failed', { errorMessage: errMsg });
      return {
        success: false,
        order,
        error: errMsg
      };
    } catch (err: any) {
      serverDb.updatePaymentOrderStatus(order.orderId, 'failed', { errorMessage: err.message });
      return {
        success: false,
        order,
        error: err.message || 'Network exception while connecting to bKash gateway.'
      };
    }
  }

  /**
   * Verifies payment completion using the official provider verification mechanism.
   * Subscription is granted only when the server has verified a successful transaction.
   */
  public async verifyAndExecutePayment(params: {
    orderId: string;
    userId: string;
    paymentId?: string;
    trxId?: string;
  }): Promise<BkashVerificationResult> {
    const order = serverDb.findPaymentOrder(params.orderId);
    if (!order) {
      return { success: false, error: `Order ${params.orderId} does not exist.` };
    }

    // Enforce strict order ownership
    if (order.userId !== params.userId) {
      return {
        success: false,
        error: 'Unauthorized: order ownership mismatch.'
      };
    }

    // Idempotency: if already completed, return existing success state
    if (order.status === 'completed') {
      return {
        success: true,
        order,
        trxId: order.providerTrxId,
        message: 'Order was already verified and completed.'
      };
    }

    if (!this.isBkashConfigured()) {
      return {
        success: false,
        error: 'bKash merchant credentials pending. Transaction verification cannot proceed without merchant keys.'
      };
    }

    try {
      const baseUrl = process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v2.0-preview';
      const token = await this.grantToken(baseUrl);
      const paymentId = params.paymentId || order.providerPaymentId;

      if (!paymentId) {
        return { success: false, error: 'Missing bKash paymentID for execution verification.' };
      }

      const response = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-APP-Key': process.env.BKASH_APP_KEY || ''
        },
        body: JSON.stringify({ paymentID: paymentId })
      });

      const data = await response.json();
      if (data.statusCode === '0000' && data.transactionStatus === 'Completed') {
        const updateResult = serverDb.updatePaymentOrderStatus(order.orderId, 'completed', {
          providerPaymentId: data.paymentID,
          providerTrxId: data.trxID,
          metadata: {
            customerMsisdn: data.customerMsisdn,
            verificationTime: Date.now()
          }
        });

        return {
          success: true,
          order: updateResult.order,
          trxId: data.trxID,
          message: 'bKash payment successfully verified and subscription activated.'
        };
      }

      serverDb.updatePaymentOrderStatus(order.orderId, 'failed', {
        errorMessage: data.statusMessage || 'bKash payment execution failed'
      });

      return {
        success: false,
        order,
        error: data.statusMessage || 'bKash transaction verification failed.'
      };
    } catch (err: any) {
      return {
        success: false,
        order,
        error: err.message || 'Error executing bKash verification.'
      };
    }
  }

  /**
   * Helper to fetch bKash grant token from official endpoint
   */
  private async grantToken(baseUrl: string): Promise<string> {
    const res = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        username: process.env.BKASH_USERNAME || '',
        password: process.env.BKASH_PASSWORD || ''
      },
      body: JSON.stringify({
        app_key: process.env.BKASH_APP_KEY || '',
        app_secret: process.env.BKASH_APP_SECRET || ''
      })
    });

    if (!res.ok) {
      throw new Error(`bKash token grant HTTP error: ${res.status}`);
    }

    const data = await res.json();
    if (data.statusCode !== '0000' || !data.id_token) {
      throw new Error(data.statusMessage || 'Failed to grant bKash token');
    }

    return data.id_token;
  }
}

export const bkashService = new BkashService();
