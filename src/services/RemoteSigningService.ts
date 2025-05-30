// src/services/RemoteSigningService.ts
// Handles remote client approval workflow

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getCurrentUser } from './SupabaseHTTPClient';
import { Job } from '../screens/HomeScreen';
import { Alert, Linking } from 'react-native';

// Local interface for job photos to avoid import conflicts
interface JobPhoto {
  id: string;
  uri: string;
  type: 'before' | 'during' | 'after';
  timestamp: string;
}

interface RemoteSigningRequest {
  id: string;
  jobId: string;
  userId: string;
  clientEmail?: string;
  clientPhone?: string;
  contactMethod: 'email' | 'sms';
  secureToken: string;
  expiresAt: string;
  status: 'pending' | 'viewed' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
  reviewedAt?: string;
  clientFeedback?: string;
  signatureData?: string;
  clientSignedName?: string;
}

interface RemoteSigningResponse {
  success: boolean;
  error?: string;
  reviewUrl?: string;
  requestId?: string;
}

class RemoteSigningService {
  private readonly EXPIRY_HOURS = 48;
  private readonly BASE_URL = 'https://your-domain.com/review'; // Replace with your actual domain

  // Generate UUID for request IDs (no external dependencies)
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Generate secure token for review link (no external dependencies)
  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Create remote signing request
  async createRemoteSigningRequest(
    job: Job,
    contactMethod: 'email' | 'sms',
    contactInfo: string
  ): Promise<RemoteSigningResponse> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Generate secure token and expiry
      const secureToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + this.EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

      // Create request record
      const request: RemoteSigningRequest = {
        id: this.generateUUID(),
        jobId: job.id,
        userId: user.id,
        clientEmail: contactMethod === 'email' ? contactInfo : undefined,
        clientPhone: contactMethod === 'sms' ? contactInfo : undefined,
        contactMethod,
        secureToken,
        expiresAt,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Store request locally first
      await this.storeRemoteSigningRequest(request);

      // Try to store in cloud (non-blocking)
      this.syncRemoteSigningRequestToCloud(request).catch(error => {
        console.warn('Failed to sync remote signing request to cloud:', error);
      });

      // Generate review URL
      const reviewUrl = `${this.BASE_URL}/${secureToken}`;

      // Send notification
      const sendResult = await this.sendRemoteSigningNotification(
        contactMethod,
        contactInfo,
        job,
        reviewUrl
      );

      if (!sendResult.success) {
        return { success: false, error: sendResult.error };
      }

      return {
        success: true,
        reviewUrl,
        requestId: request.id
      };

    } catch (error) {
      console.error('Error creating remote signing request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create remote signing request'
      };
    }
  }

  // Store request locally
  private async storeRemoteSigningRequest(request: RemoteSigningRequest): Promise<void> {
    try {
      const existingRequests = await AsyncStorage.getItem('remote_signing_requests');
      const requests: RemoteSigningRequest[] = existingRequests ? JSON.parse(existingRequests) : [];
      
      requests.push(request);
      
      await AsyncStorage.setItem('remote_signing_requests', JSON.stringify(requests));
    } catch (error) {
      console.error('Error storing remote signing request:', error);
      throw error;
    }
  }

  // Sync to cloud (non-blocking)
  private async syncRemoteSigningRequestToCloud(request: RemoteSigningRequest): Promise<void> {
    try {
      const result = await supabase.insert('remote_signing_requests', {
        id: request.id,
        job_id: request.jobId,
        user_id: request.userId,
        client_email: request.clientEmail,
        client_phone: request.clientPhone,
        contact_method: request.contactMethod,
        secure_token: request.secureToken,
        expires_at: request.expiresAt,
        status: request.status,
        created_at: request.createdAt,
      });

      if (result.error) {
        console.warn('Failed to sync remote signing request:', result.error);
      }
    } catch (error) {
      console.warn('Error syncing remote signing request to cloud:', error);
    }
  }

  // Send notification to client
  private async sendRemoteSigningNotification(
    method: 'email' | 'sms',
    contactInfo: string,
    job: Job,
    reviewUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (method === 'email') {
        return await this.sendEmailNotification(contactInfo, job, reviewUrl);
      } else {
        return await this.sendSMSNotification(contactInfo, job, reviewUrl);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification'
      };
    }
  }

  // Send email notification
  private async sendEmailNotification(
    email: string,
    job: Job,
    reviewUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    // For MVP, we'll use a simple API call
    // In production, you'd use a proper email service like SendGrid, Mailgun, etc.
    
    const emailData = {
      to: email,
      subject: 'Work Complete - Please Review',
      html: this.generateEmailTemplate(job, reviewUrl),
    };

    try {
      // This is a placeholder - replace with your actual email service
      console.log('Would send email:', emailData);
      
      // For now, just show the user what would be sent
      Alert.alert(
        'Email Would Be Sent',
        `To: ${email}\nSubject: Work Complete - Please Review\n\nReview URL: ${reviewUrl}`,
        [{ text: 'OK' }]
      );
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send email notification'
      };
    }
  }

  // Send SMS notification
  private async sendSMSNotification(
    phone: string,
    job: Job,
    reviewUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    const message = `Hi ${job.clientName}! We completed your ${job.serviceType}. Please review our work: ${reviewUrl}`;
    
    try {
      // For MVP, open SMS app with pre-filled message
      const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
        return { success: true };
      } else {
        return {
          success: false,
          error: 'SMS not available on this device'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send SMS notification'
      };
    }
  }

  // Generate email template
  private generateEmailTemplate(job: Job, reviewUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Work Complete - Please Review</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #007AFF; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .job-details { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #34C759; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Work Completed</h1>
            <p>Please review and approve</p>
          </div>
          <div class="content">
            <p>Hi ${job.clientName},</p>
            <p>We've just completed your ${job.serviceType} service. Please take a moment to review our work.</p>
            
            <div class="job-details">
              <h3>Service Details:</h3>
              <p><strong>Service:</strong> ${job.serviceType}</p>
              <p><strong>Address:</strong> ${job.address}</p>
              <p><strong>Completed:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Photos taken:</strong> ${job.photos.length}</p>
            </div>
            
            <p>Click the button below to view photos and approve the work:</p>
            
            <div style="text-align: center;">
              <a href="${reviewUrl}" class="button">Review Work</a>
            </div>
            
            <p><small>This link will expire in 48 hours. If you have any questions, please contact us directly.</small></p>
          </div>
          <div class="footer">
            <p>Thank you for your business!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Get pending remote signing requests
  async getPendingRequests(): Promise<RemoteSigningRequest[]> {
    try {
      const requests = await AsyncStorage.getItem('remote_signing_requests');
      if (!requests) return [];
      
      const allRequests: RemoteSigningRequest[] = JSON.parse(requests);
      const now = new Date().toISOString();
      
      // Filter for pending and non-expired requests
      return allRequests.filter(request => 
        request.status === 'pending' && request.expiresAt > now
      );
    } catch (error) {
      console.error('Error getting pending requests:', error);
      return [];
    }
  }

  // Update request status
  async updateRequestStatus(
    requestId: string,
    status: RemoteSigningRequest['status'],
    additionalData?: {
      clientFeedback?: string;
      signatureData?: string;
      clientSignedName?: string;
    }
  ): Promise<void> {
    try {
      const requests = await AsyncStorage.getItem('remote_signing_requests');
      if (!requests) return;
      
      const allRequests: RemoteSigningRequest[] = JSON.parse(requests);
      const requestIndex = allRequests.findIndex(r => r.id === requestId);
      
      if (requestIndex !== -1) {
        allRequests[requestIndex] = {
          ...allRequests[requestIndex],
          status,
          reviewedAt: new Date().toISOString(),
          ...additionalData
        };
        
        await AsyncStorage.setItem('remote_signing_requests', JSON.stringify(allRequests));
        
        // Sync to cloud (non-blocking)
        this.syncRequestStatusToCloud(allRequests[requestIndex]).catch(error => {
          console.warn('Failed to sync request status to cloud:', error);
        });
      }
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  }

  // Sync request status to cloud
  private async syncRequestStatusToCloud(request: RemoteSigningRequest): Promise<void> {
    try {
      const result = await supabase.update('remote_signing_requests', {
        status: request.status,
        reviewed_at: request.reviewedAt,
        client_feedback: request.clientFeedback,
        signature_data: request.signatureData,
        client_signed_name: request.clientSignedName,
      }, { id: request.id });

      if (result.error) {
        console.warn('Failed to sync request status:', result.error);
      }
    } catch (error) {
      console.warn('Error syncing request status to cloud:', error);
    }
  }

  // Check for expired requests and clean them up
  async cleanupExpiredRequests(): Promise<void> {
    try {
      const requests = await AsyncStorage.getItem('remote_signing_requests');
      if (!requests) return;
      
      const allRequests: RemoteSigningRequest[] = JSON.parse(requests);
      const now = new Date().toISOString();
      
      // Mark expired requests
      let hasChanges = false;
      allRequests.forEach(request => {
        if (request.status === 'pending' && request.expiresAt <= now) {
          request.status = 'expired';
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        await AsyncStorage.setItem('remote_signing_requests', JSON.stringify(allRequests));
      }
    } catch (error) {
      console.error('Error cleaning up expired requests:', error);
    }
  }

  // Get request by token (for client portal)
  async getRequestByToken(token: string): Promise<RemoteSigningRequest | null> {
    try {
      const requests = await AsyncStorage.getItem('remote_signing_requests');
      if (!requests) return null;
      
      const allRequests: RemoteSigningRequest[] = JSON.parse(requests);
      const request = allRequests.find(r => r.secureToken === token);
      
      if (!request) return null;
      
      // Check if expired
      if (request.expiresAt <= new Date().toISOString()) {
        await this.updateRequestStatus(request.id, 'expired');
        return null;
      }
      
      return request;
    } catch (error) {
      console.error('Error getting request by token:', error);
      return null;
    }
  }
}

export const remoteSigningService = new RemoteSigningService();