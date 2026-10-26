import webpush from 'web-push';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { Server } from 'socket.io';

// Configure Web Push with VAPID keys
if (ENV.VAPID_PUBLIC_KEY && ENV.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      ENV.VAPID_SUBJECT,
      ENV.VAPID_PUBLIC_KEY,
      ENV.VAPID_PRIVATE_KEY
    );
  } catch (err) {
    console.warn('[NotificationService] VAPID initialization warning:', err);
  }
}

export interface NotificationPayload {
  studentId: string;
  tripId: string;
  type: 'APPROACHING_2KM' | 'APPROACHING_2STOPS' | 'TRIP_STARTED' | 'TRIP_ENDED' | 'SERVICE_DISRUPTION';
  title: string;
  message: string;
  busId?: string;
  busNumber?: string;
  etaMinutes?: number;
  distanceKm?: string;
}

export interface MessagingProvider {
  sendSms(to: string, text: string): Promise<{ success: boolean; id?: string; error?: string }>;
  sendWhatsApp(to: string, text: string): Promise<{ success: boolean; id?: string; error?: string }>;
}

// Mask phone number for security in logs (+91 98*** **210)
function maskPhone(phone: string): string {
  if (phone.length <= 4) return '***';
  return phone.slice(0, 3) + '***' + phone.slice(-3);
}

// Mock Messaging Provider (Reliable local development and simulation)
class MockMessagingProvider implements MessagingProvider {
  async sendSms(to: string, text: string) {
    console.log(`[SMS-MOCK] Sent to ${maskPhone(to)}: "${text.slice(0, 80)}..."`);
    return { success: true, id: `mock_sms_${Date.now()}` };
  }

  async sendWhatsApp(to: string, text: string) {
    console.log(`[WHATSAPP-MOCK] Sent to ${maskPhone(to)}: "${text.slice(0, 80)}..."`);
    return { success: true, id: `mock_wa_${Date.now()}` };
  }
}

// Twilio Messaging Provider (Active when TWILIO credentials are provided in .env)
class TwilioMessagingProvider implements MessagingProvider {
  private sid = ENV.TWILIO_ACCOUNT_SID;
  private token = ENV.TWILIO_AUTH_TOKEN;
  private fromNumber = ENV.TWILIO_PHONE_NUMBER;
  private waNumber = ENV.WHATSAPP_PHONE_NUMBER || ENV.TWILIO_PHONE_NUMBER;

  async sendSms(to: string, text: string) {
    if (!this.sid || !this.token || !this.fromNumber) {
      console.warn('[Twilio-SMS] Missing TWILIO credentials. Falling back to mock.');
      return new MockMessagingProvider().sendSms(to, text);
    }

    try {
      const auth = Buffer.from(`${this.sid}:${this.token}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', this.fromNumber);
      params.append('Body', text);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Twilio-SMS] Error response:', errorText);
        return { success: false, error: errorText };
      }

      const data = await res.json() as any;
      return { success: true, id: data.sid };
    } catch (err: any) {
      console.error('[Twilio-SMS] Network error:', err.message);
      return { success: false, error: err.message };
    }
  }

  async sendWhatsApp(to: string, text: string) {
    if (!this.sid || !this.token || !this.waNumber) {
      console.warn('[Twilio-WhatsApp] Missing TWILIO credentials. Falling back to mock.');
      return new MockMessagingProvider().sendWhatsApp(to, text);
    }

    try {
      const auth = Buffer.from(`${this.sid}:${this.token}`).toString('base64');
      const params = new URLSearchParams();
      const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      const formattedFrom = this.waNumber.startsWith('whatsapp:') ? this.waNumber : `whatsapp:${this.waNumber}`;

      params.append('To', formattedTo);
      params.append('From', formattedFrom);
      params.append('Body', text);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Twilio-WhatsApp] Error response:', errorText);
        return { success: false, error: errorText };
      }

      const data = await res.json() as any;
      return { success: true, id: data.sid };
    } catch (err: any) {
      console.error('[Twilio-WhatsApp] Network error:', err.message);
      return { success: false, error: err.message };
    }
  }
}

// Select active provider
const messagingProvider: MessagingProvider =
  ENV.SMS_PROVIDER === 'TWILIO' && ENV.TWILIO_ACCOUNT_SID
    ? new TwilioMessagingProvider()
    : new MockMessagingProvider();

/**
 * Dispatch notification through all student-configured channels:
 * 1. In-App Notification (Database + Socket.IO real-time event)
 * 2. Web Push Notification (via Web Push VAPID protocol)
 * 3. SMS Alert (if student opted in)
 * 4. WhatsApp Alert (if student opted in)
 */
export async function dispatchMultiChannelNotification(
  io: Server | null,
  payload: NotificationPayload
) {
  try {
    // 1. Fetch student along with user & notification preferences
    const student = await prisma.student.findUnique({
      where: { id: payload.studentId },
      include: {
        user: {
          include: {
            pushSubscriptions: true,
          },
        },
        preferences: true,
      },
    });

    if (!student) return;

    const prefs = student.preferences;
    // Default to enabled if preferences record not yet created
    const busArrivalAlerts = prefs ? prefs.busArrivalAlerts : true;
    const enableWebPush = prefs ? prefs.enableWebPush : true;
    const enableSms = prefs ? prefs.enableSms : false;
    const enableWhatsApp = prefs ? prefs.enableWhatsApp : false;
    const targetPhone = prefs?.phoneNumber || student.user.phone || null;

    if (!busArrivalAlerts && payload.type !== 'SERVICE_DISRUPTION') {
      return; // Student opted out of arrival alerts
    }

    // 2. In-App Database Record
    const notification = await prisma.notification.create({
      data: {
        studentId: payload.studentId,
        tripId: payload.tripId,
        type: payload.type,
        channel: 'IN_APP',
        message: payload.message,
        busId: payload.busId,
        busNumber: payload.busNumber,
        status: 'SENT',
      },
    });

    // 3. Socket.IO Real-time Emit
    if (io) {
      io.to(`student_${student.id}`).emit('notification:new', {
        id: notification.id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        busId: payload.busId,
        busNumber: payload.busNumber,
        etaMinutes: payload.etaMinutes,
        distanceKm: payload.distanceKm,
        sentAt: notification.sentAt.toISOString(),
      });
    }

    // 4. Web Push Notification to all active student devices
    if (enableWebPush && student.user.pushSubscriptions.length > 0) {
      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.message,
        busNumber: payload.busNumber,
        busId: payload.busId,
        url: '/student/dashboard',
        tag: `arrival_${payload.tripId}`,
        timestamp: Date.now(),
      });

      for (const sub of student.user.pushSubscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushPayload
          );
        } catch (pushErr: any) {
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            // Subscription expired or revoked by browser - remove from DB
            await prisma.pushSubscriptionRecord.deleteMany({
              where: { endpoint: sub.endpoint },
            });
          }
        }
      }
    }

    // 5. SMS Notification
    if (enableSms && targetPhone) {
      await messagingProvider.sendSms(targetPhone, `${payload.title}: ${payload.message}`);
    }

    // 6. WhatsApp Notification
    if (enableWhatsApp && targetPhone) {
      await messagingProvider.sendWhatsApp(targetPhone, `${payload.title}: ${payload.message}`);
    }
  } catch (error) {
    console.error('[NotificationService] Error in dispatchMultiChannelNotification:', error);
  }
}
