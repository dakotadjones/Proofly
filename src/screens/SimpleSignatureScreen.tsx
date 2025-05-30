import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';

interface JobPhoto {
  id: string;
  uri: string;
  type: string;
}

interface SimpleSignatureScreenProps {
  jobId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  photos?: JobPhoto[];
  onJobComplete?: (data: { 
    clientSignedName: string; 
    jobSatisfaction?: string; 
    signature?: string;
    completionMethod: 'in-person' | 'remote';
    remoteSigningData?: {
      sentTo: string;
      sentVia: 'email' | 'sms';
      sentAt: string;
    };
  }) => void;
}

export default function SimpleSignatureScreen({
  jobId = 'temp-job',
  clientName = 'Test Client',
  clientEmail,
  clientPhone,
  photos = [],
  onJobComplete
}: SimpleSignatureScreenProps) {
  const [signature, setSignature] = useState<string | null>(null);
  const [clientSignedName, setClientSignedName] = useState('');
  const [jobSatisfaction, setJobSatisfaction] = useState('');
  const [completionMethod, setCompletionMethod] = useState<'in-person' | 'remote'>('in-person');
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteContactMethod, setRemoteContactMethod] = useState<'email' | 'sms'>('email');
  const [customEmail, setCustomEmail] = useState(clientEmail || '');
  const [customPhone, setCustomPhone] = useState(clientPhone || '');
  const signatureRef = useRef<any>(null);

  const handleSignature = (signatureBase64: string) => {
    console.log('Signature captured successfully!');
    setSignature(signatureBase64);
  };

  const handleEmpty = () => {
    console.log('Signature cleared');
    setSignature(null);
  };

  const clearSignature = () => {
    signatureRef.current?.clearSignature();
    setSignature(null);
  };

  const completeJobInPerson = () => {
    console.log('Complete job in-person called');
    
    if (!signature || signature.trim() === '') {
      Alert.alert(
        'Signature Required',
        'Please have the client sign and tap "Save" before completing the job.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!clientSignedName.trim()) {
      Alert.alert(
        'Client Name Required',
        'Please enter the client\'s printed name.',
        [{ text: 'OK' }]
      );
      return;
    }

    const signatureData = {
      clientSignedName,
      jobSatisfaction,
      signature,
      completionMethod: 'in-person' as const,
    };

    if (onJobComplete) {
      onJobComplete(signatureData);
    } else {
      Alert.alert(
        'Job Completed!',
        `Job for ${clientName} has been completed successfully.`,
        [{ text: 'OK' }]
      );
    }
  };

  const initiateRemoteSignin = () => {
    setShowRemoteModal(true);
  };

  const sendRemoteSigningRequest = () => {
    const contactInfo = remoteContactMethod === 'email' ? customEmail : customPhone;
    
    if (!contactInfo.trim()) {
      Alert.alert(
        'Contact Info Required',
        `Please enter a ${remoteContactMethod === 'email' ? 'valid email address' : 'phone number'}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Basic validation
    if (remoteContactMethod === 'email' && !contactInfo.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (remoteContactMethod === 'sms' && contactInfo.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number.');
      return;
    }

    // Close modal
    setShowRemoteModal(false);

    // Generate remote signing link and send
    const remoteSigningData = {
      clientSignedName: clientName, // Pre-fill with known name
      jobSatisfaction: '', // Will be filled by client
      completionMethod: 'remote' as const,
      remoteSigningData: {
        sentTo: contactInfo,
        sentVia: remoteContactMethod,
        sentAt: new Date().toISOString(),
      }
    };

    // Show confirmation
    Alert.alert(
      'Remote Signing Initiated',
      `Review link sent to ${contactInfo} via ${remoteContactMethod}.\n\nThe client has 48 hours to review and approve the work. You'll be notified when they respond.`,
      [{ text: 'OK' }]
    );

    if (onJobComplete) {
      onJobComplete(remoteSigningData);
    }
  };

  const signatureStyle = `
    .signature-pad {
      width: 100%;
      height: 200px;
      border: 2px dashed #007AFF;
      border-radius: 8px;
    }
    .signature-pad canvas {
      border-radius: 8px;
    }
  `;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Job</Text>
        <Text style={styles.headerSubtitle}>{clientName}</Text>
      </View>

      {/* Job Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Job Summary</Text>
        <Text style={styles.summaryText}>
          Photos taken: {photos.length}
        </Text>
        <Text style={styles.summaryText}>
          Completed: {new Date().toLocaleDateString()}
        </Text>
      </View>

      {/* Completion Method Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How would you like to complete this job?</Text>
        
        <View style={styles.methodButtons}>
          <TouchableOpacity 
            style={[
              styles.methodButton, 
              completionMethod === 'in-person' && styles.methodButtonActive
            ]}
            onPress={() => setCompletionMethod('in-person')}
          >
            <Text style={styles.methodButtonIcon}>✍️</Text>
            <Text style={[
              styles.methodButtonText,
              completionMethod === 'in-person' && styles.methodButtonTextActive
            ]}>
              In-Person Signature
            </Text>
            <Text style={styles.methodButtonDesc}>Client signs here now</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.methodButton, 
              completionMethod === 'remote' && styles.methodButtonActive
            ]}
            onPress={() => setCompletionMethod('remote')}
          >
            <Text style={styles.methodButtonIcon}>📱</Text>
            <Text style={[
              styles.methodButtonText,
              completionMethod === 'remote' && styles.methodButtonTextActive
            ]}>
              Remote Approval
            </Text>
            <Text style={styles.methodButtonDesc}>Email/text client to approve</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* In-Person Signature Section */}
      {completionMethod === 'in-person' && (
        <>
          {/* Client Satisfaction */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How was the service? (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Any feedback or notes from the client..."
              value={jobSatisfaction}
              onChangeText={setJobSatisfaction}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Signature Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Signature *</Text>
            <Text style={styles.instructionText}>
              Please have the client sign below to confirm work completion
            </Text>
            
            <View style={styles.signatureContainer}>
              <SignatureScreen
                ref={signatureRef}
                onOK={handleSignature}
                onEmpty={handleEmpty}
                onClear={handleEmpty}
                autoClear={false}
                descriptionText=""
                clearText=""
                confirmText=""
                webStyle={signatureStyle}
                style={styles.signaturePad}
              />
            </View>

            <View style={styles.signatureControls}>
              <TouchableOpacity 
                style={styles.captureSignatureButton} 
                onPress={() => signatureRef.current?.readSignature()}
              >
                <Text style={styles.captureSignatureText}>Save Signature</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearButton} onPress={clearSignature}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {signature ? (
              <View style={styles.signatureStatus}>
                <Text style={styles.signatureStatusText}>✓ Signature captured successfully!</Text>
              </View>
            ) : (
              <View style={styles.signatureInstructions}>
                <Text style={styles.signatureInstructionsText}>
                  1. Have client sign in the box above
                  2. Tap "Save Signature" to confirm
                </Text>
              </View>
            )}
          </View>

          {/* Client Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Printed Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Client's full name (printed)"
              value={clientSignedName}
              onChangeText={setClientSignedName}
              autoCapitalize="words"
            />
          </View>

          {/* Complete Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.completeButton} onPress={completeJobInPerson}>
              <Text style={styles.completeButtonText}>Complete Job</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Remote Signing Section */}
      {completionMethod === 'remote' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Remote Client Approval</Text>
          <Text style={styles.instructionText}>
            Send a review link to your client. They'll see the photos and can approve the work remotely.
          </Text>

          <View style={styles.remoteInfoBox}>
            <Text style={styles.remoteInfoTitle}>How it works:</Text>
            <Text style={styles.remoteInfoText}>
              1. Client gets email/text with review link{'\n'}
              2. They see photos and approve work{'\n'}
              3. They sign electronically{'\n'}
              4. You get notified when complete
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.remoteButton} onPress={initiateRemoteSignin}>
              <Text style={styles.remoteButtonText}>📧 Send Review Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Remote Signing Modal */}
      <Modal
        visible={showRemoteModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send Review Link</Text>
            <TouchableOpacity onPress={() => setShowRemoteModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Contact Method Selection */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>How should we contact {clientName}?</Text>
              
              <View style={styles.contactMethodButtons}>
                <TouchableOpacity 
                  style={[
                    styles.contactMethodButton,
                    remoteContactMethod === 'email' && styles.contactMethodButtonActive
                  ]}
                  onPress={() => setRemoteContactMethod('email')}
                >
                  <Text style={styles.contactMethodIcon}>📧</Text>
                  <Text style={styles.contactMethodText}>Email</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.contactMethodButton,
                    remoteContactMethod === 'sms' && styles.contactMethodButtonActive
                  ]}
                  onPress={() => setRemoteContactMethod('sms')}
                >
                  <Text style={styles.contactMethodIcon}>💬</Text>
                  <Text style={styles.contactMethodText}>Text (SMS)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Contact Info Input */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                {remoteContactMethod === 'email' ? 'Email Address' : 'Phone Number'}
              </Text>
              
              {remoteContactMethod === 'email' ? (
                <TextInput
                  style={styles.modalInput}
                  placeholder="client@example.com"
                  value={customEmail}
                  onChangeText={setCustomEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              ) : (
                <TextInput
                  style={styles.modalInput}
                  placeholder="(555) 123-4567"
                  value={customPhone}
                  onChangeText={setCustomPhone}
                  keyboardType="phone-pad"
                />
              )}
            </View>

            {/* Preview */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Preview Message</Text>
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>
                  {remoteContactMethod === 'email' ? 
                    `Hi ${clientName}, we just finished your service. Please review our work: [Review Link]` :
                    `Hi ${clientName}! Work complete. Please review: [Review Link]`
                  }
                </Text>
              </View>
            </View>

            {/* Send Button */}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalSendButton} onPress={sendRemoteSigningRequest}>
                <Text style={styles.modalSendButtonText}>
                  Send {remoteContactMethod === 'email' ? 'Email' : 'Text'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Legal Disclaimer */}
      <View style={styles.disclaimerSection}>
        <Text style={styles.disclaimerText}>
          By completing this job, the client acknowledges that the work has been performed 
          as agreed and authorizes payment according to the service terms.
        </Text>
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
  summarySection: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  // Method Selection Styles
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  methodButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e7f3ff',
  },
  methodButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  methodButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  methodButtonTextActive: {
    color: '#007AFF',
  },
  methodButtonDesc: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  // In-Person Signature Styles
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  signatureContainer: {
    height: 220,
    marginBottom: 15,
  },
  signaturePad: {
    flex: 1,
  },
  signatureControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  captureSignatureButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  captureSignatureText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  signatureStatus: {
    backgroundColor: '#d4edda',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  signatureStatusText: {
    color: '#155724',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  signatureInstructions: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  signatureInstructionsText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Remote Signing Styles
  remoteInfoBox: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  remoteInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5a2d',
    marginBottom: 8,
  },
  remoteInfoText: {
    fontSize: 14,
    color: '#2d5a2d',
    lineHeight: 20,
  },
  remoteButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  remoteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Button Styles
  buttonContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  completeButton: {
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
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingTop: 60,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  contactMethodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactMethodButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  contactMethodButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e7f3ff',
  },
  contactMethodIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  contactMethodText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  previewBox: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  previewText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modalButtonContainer: {
    marginTop: 20,
  },
  modalSendButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSendButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimerSection: {
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});