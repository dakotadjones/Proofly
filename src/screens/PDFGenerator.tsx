import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Share,
  Linking,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system';

export interface JobData {
  jobId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceType: string;
  description?: string;
  address: string;
  photos: Array<{ id: string; uri: string; type: string }>;
  clientSignedName: string;
  jobSatisfaction?: string;
  signature: string;
  completedAt: string;
  status?: string;
}

interface PDFGeneratorProps {
  jobData: JobData;
  onNewJob?: () => void;
  onPDFGenerated?: () => void;
}

export default function PDFGenerator({ jobData, onNewJob, onPDFGenerated }: PDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [hasGeneratedBefore, setHasGeneratedBefore] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (jobData.status === 'completed') {
      setHasGeneratedBefore(true);
    }
  }, [jobData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const convertImageToBase64 = async (imageUri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error converting image:', error);
      return '';
    }
  };

  const buildHTML = async (): Promise<string> => {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Service Completion Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          background-color: #007AFF;
          color: white;
          padding: 20px;
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .section {
          margin-bottom: 25px;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #fafafa;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #333;
          margin-bottom: 15px;
          border-bottom: 2px solid #007AFF;
          padding-bottom: 5px;
        }
        .info-row {
          margin-bottom: 10px;
        }
        .info-label {
          font-weight: bold;
          color: #555;
        }
        .info-value {
          color: #333;
          margin-left: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Service Completion Report</h1>
        <p>Professional Service Documentation</p>
      </div>

      <div class="section">
        <div class="section-title">Job Information</div>
        <div class="info-row">
          <span class="info-label">Job ID:</span>
          <span class="info-value">${jobData.jobId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Service Type:</span>
          <span class="info-value">${jobData.serviceType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Address:</span>
          <span class="info-value">${jobData.address}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Completed:</span>
          <span class="info-value">${formatDate(jobData.completedAt)}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Client Information</div>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${jobData.clientName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Phone:</span>
          <span class="info-value">${jobData.clientPhone || 'Not provided'}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Documentation</div>
        <div class="info-row">
          <span class="info-label">Photos Taken:</span>
          <span class="info-value">${jobData.photos.length}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client Signature:</span>
          <span class="info-value">${jobData.signature ? 'Yes' : 'No'}</span>
        </div>
      </div>`;

    // Add photos if they exist
    if (jobData.photos && jobData.photos.length > 0) {
      console.log('Adding photos to PDF...');
      
      html += `<div class="section">
        <div class="section-title">Service Documentation Photos (${jobData.photos.length})</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">`;

      for (const photo of jobData.photos) {
        const base64Image = await convertImageToBase64(photo.uri);
        if (base64Image) {
          html += `<div style="text-align: center;">
            <img src="${base64Image}" alt="${photo.type} photo" style="width: 100%; max-width: 200px; height: 150px; object-fit: cover; border: 2px solid #ddd; border-radius: 8px;" />
            <div style="margin-top: 5px; font-weight: bold; color: #007AFF; text-transform: uppercase; font-size: 12px;">${photo.type}</div>
          </div>`;
        }
      }

      html += `</div></div>`;
      console.log(`Added ${jobData.photos.length} photos to PDF`);
    }

    // Add feedback if it exists
    if (jobData.jobSatisfaction) {
      html += `<div class="section">
        <div class="section-title">Client Feedback</div>
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; font-style: italic; color: #2d5a2d;">
          "${jobData.jobSatisfaction}"
        </div>
      </div>`;
    }

    // Add signature if it exists
    if (jobData.signature && jobData.clientSignedName) {
      html += `<div class="section">
        <div class="section-title">Client Approval & Signature</div>
        <div style="text-align: center; padding: 20px;">
          <p>The client has reviewed and approved the completed work:</p>
          <img src="${jobData.signature}" style="max-width: 300px; max-height: 150px; border: 2px solid #007AFF; border-radius: 8px; margin: 10px auto; display: block;" alt="Client Signature" />
          <div style="font-size: 16px; font-weight: bold; margin-top: 10px; color: #333;">
            Signed by: ${jobData.clientSignedName}
          </div>
          <p style="margin-top: 15px; color: #666; font-size: 14px;">
            Date: ${formatDate(jobData.completedAt)}
          </p>
        </div>
      </div>`;
    }

    // Add footer
    html += `<div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
        <p>Generated by Proofly on ${formatDate(new Date().toISOString())}</p>
      </div>
    </body>
    </html>`;

    return html;
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const htmlContent = await buildHTML();
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      setPdfUri(uri);
      setHasGeneratedBefore(true);
      
      if (onPDFGenerated) {
        onPDFGenerated();
      }
      
    } catch (error: any) {
      Alert.alert('Error', `Failed to generate PDF: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const previewPDF = async (uri: string) => {
    try {
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert('Error', 'Failed to preview PDF');
    }
  };

  const sharePDF = async (uri: string) => {
    try {
      await Share.share({
        url: uri,
        message: `Service completion report for ${jobData.clientName}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share PDF');
    }
  };

  // NEW: One-click email to client
  const emailToClient = async (uri: string) => {
    if (!jobData.clientEmail) {
      Alert.alert(
        'No Email Address', 
        'No email address found for this client. Please add an email address to the job or use the regular share option.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSharing(true);
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('Email Not Available', 'Please install a mail app to send emails.');
        return;
      }

      await MailComposer.composeAsync({
        recipients: [jobData.clientEmail],
        subject: `Service Completion Report - ${jobData.serviceType}`,
        body: `Dear ${jobData.clientName},

Thank you for choosing our services! Please find attached your service completion report for the ${jobData.serviceType} work completed at ${jobData.address}.

Report Summary:
• Service Type: ${jobData.serviceType}
• Completed: ${formatDate(jobData.completedAt)}
• Photos Documented: ${jobData.photos.length}
• Client Signature: ✓ Captured

${jobData.jobSatisfaction ? `\nYour feedback: "${jobData.jobSatisfaction}"\n` : ''}
We appreciate your business and look forward to serving you again!

Best regards,
Your Service Team

---
Generated by Proofly - Professional Service Documentation`,
        attachments: [uri],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to compose email');
    } finally {
      setIsSharing(false);
    }
  };

  // NEW: One-click SMS to client with options
  const smsToClient = async () => {
    if (!jobData.clientPhone) {
      Alert.alert(
        'No Phone Number', 
        'No phone number found for this client. Please add a phone number to the job.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show options for SMS communication
    Alert.alert(
      'Send SMS Update',
      'Choose how to notify your client:',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Text + Email PDF',
          onPress: () => sendSMSWithEmailPrompt()
        },
        {
          text: 'Just Text Update',
          onPress: () => sendSimpleSMS()
        }
      ]
    );
  };

  const sendSimpleSMS = async () => {
    const message = `Hi ${jobData.clientName}! Your ${jobData.serviceType} service has been completed. ${jobData.photos.length} photos documented and report ready. ${jobData.clientEmail ? 'Check your email for the full report!' : 'Call us for your detailed report.'} Thanks for choosing us! - Proofly Service Team`;
    
    const smsUrl = `sms:${jobData.clientPhone}?body=${encodeURIComponent(message)}`;
    
    try {
      const supported = await Linking.canOpenURL(smsUrl);
      if (supported) {
        await Linking.openURL(smsUrl);
      } else {
        Alert.alert('SMS Not Available', 'SMS is not available on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open SMS');
    }
  };

  const sendSMSWithEmailPrompt = async () => {
    if (!jobData.clientEmail) {
      Alert.alert(
        'No Email Address',
        'Cannot send PDF - no email address on file. Would you like to send just the text update?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send Text Only', onPress: sendSimpleSMS }
        ]
      );
      return;
    }

    // Send SMS first
    const message = `Hi ${jobData.clientName}! Your ${jobData.serviceType} service is complete. Full PDF report with ${jobData.photos.length} photos is being emailed to ${jobData.clientEmail}. Thanks! - Proofly Service Team`;
    
    const smsUrl = `sms:${jobData.clientPhone}?body=${encodeURIComponent(message)}`;
    
    try {
      const supported = await Linking.canOpenURL(smsUrl);
      if (supported) {
        await Linking.openURL(smsUrl);
        
        // After SMS, prompt to send email with PDF
        setTimeout(() => {
          Alert.alert(
            'Send Email Too?',
            'SMS sent! Would you like to also send the PDF report via email?',
            [
              { text: 'Skip Email', style: 'cancel' },
              { 
                text: 'Send Email + PDF', 
                onPress: () => pdfUri && emailToClient(pdfUri)
              }
            ]
          );
        }, 1000);
      } else {
        Alert.alert('SMS Not Available', 'SMS is not available on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open SMS');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Generate Report</Text>
        <Text style={styles.headerSubtitle}>Job for {jobData.clientName}</Text>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Report Summary</Text>
        <Text style={styles.summaryItem}>📋 Service: {jobData.serviceType}</Text>
        <Text style={styles.summaryItem}>📸 Photos: {jobData.photos.length}</Text>
        <Text style={styles.summaryItem}>✍️ Signature: {jobData.signature ? '✓ Captured' : '○ Not captured'}</Text>
        <Text style={styles.summaryItem}>📅 Completed: {new Date(jobData.completedAt).toLocaleDateString()}</Text>
        <Text style={styles.summaryItem}>📧 Client Email: {jobData.clientEmail || 'Not provided'}</Text>
        <Text style={styles.summaryItem}>📱 Client Phone: {jobData.clientPhone || 'Not provided'}</Text>
      </View>

      <View style={styles.actions}>
        {!hasGeneratedBefore ? (
          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={generatePDF}
            disabled={isGenerating}
          >
            <Text style={styles.generateButtonText}>
              {isGenerating ? 'Generating PDF...' : 'Generate PDF Report'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.refreshButton, isGenerating && styles.generateButtonDisabled]}
              onPress={generatePDF}
              disabled={isGenerating}
            >
              <Text style={styles.refreshButtonText}>
                {isGenerating ? 'Updating PDF...' : '🔄 Refresh PDF Report'}
              </Text>
            </TouchableOpacity>
            
            {/* ONE-CLICK CLIENT COMMUNICATION */}
            <View style={styles.clientActionsSection}>
              <View style={styles.successIndicator}>
                <Text style={styles.successText}>✅ PDF Report Ready!</Text>
                <Text style={styles.successSubtext}>Send directly to your client</Text>
              </View>
              
              <Text style={styles.shareSectionTitle}>📤 Send to Client</Text>
              <View style={styles.clientButtons}>
                <TouchableOpacity 
                  style={[styles.clientButton, styles.emailButton, !jobData.clientEmail && styles.disabledButton]} 
                  onPress={() => pdfUri && emailToClient(pdfUri)}
                  disabled={!jobData.clientEmail || isSharing}
                >
                  <Text style={[styles.clientButtonText, !jobData.clientEmail && styles.disabledText]}>
                    {isSharing ? '📧 Sending...' : '📧 Email Report'}
                  </Text>
                  {jobData.clientEmail && (
                    <Text style={styles.clientContactText}>{jobData.clientEmail}</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.clientButton, styles.smsButton, !jobData.clientPhone && styles.disabledButton]} 
                  onPress={smsToClient}
                  disabled={!jobData.clientPhone}
                >
                  <Text style={[styles.clientButtonText, !jobData.clientPhone && styles.disabledText]}>
                    💬 SMS + Email Option
                  </Text>
                  {jobData.clientPhone && (
                    <Text style={styles.clientContactText}>{jobData.clientPhone}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            
            {/* GENERAL SHARING OPTIONS */}
            <View style={styles.shareSection}>
              <Text style={styles.shareSectionTitle}>📤 Other Sharing Options</Text>
              <View style={styles.pdfActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => pdfUri && previewPDF(pdfUri)}>
                  <Text style={styles.actionButtonText}>👁️ Preview</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton} onPress={() => pdfUri && sharePDF(pdfUri)}>
                  <Text style={styles.actionButtonText}>📤 Share</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => pdfUri && emailToClient(pdfUri)}
                >
                  <Text style={styles.actionButtonText}>📧 Custom Email</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  summary: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryItem: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  actions: {
    paddingHorizontal: 15,
  },
  generateButton: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 20,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clientActionsSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 15,
  },
  shareSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  successIndicator: {
    backgroundColor: '#d4edda',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 4,
  },
  successSubtext: {
    fontSize: 14,
    color: '#155724',
  },
  clientButtons: {
    gap: 12,
  },
  clientButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emailButton: {
    backgroundColor: '#34C759',
  },
  smsButton: {
    backgroundColor: '#FF9500',
  },
  disabledButton: {
    backgroundColor: '#e9ecef',
  },
  clientButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  disabledText: {
    color: '#6c757d',
  },
  clientContactText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  pdfActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});