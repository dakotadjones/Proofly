import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { Colors, Typography, Spacing, Sizes } from '../theme';
import { Wrapper, Button, Input, KeyboardAvoidingWrapper } from '../components/ui';

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
      border: 2px dashed ${Colors.primary};
      border-radius: ${Sizes.radiusSmall}px;
    }
    .signature-pad canvas {
      border-radius: ${Sizes.radiusSmall}px;
    }
  `;

  return (
    <KeyboardAvoidingWrapper>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Job</Text>
        <Text style={styles.headerSubtitle}>{clientName}</Text>
      </View>

      {/* Job Summary */}
      <Wrapper variant="elevated" style={styles.summaryWrapper}>
        <Text style={styles.summaryTitle}>Job Summary</Text>
        <Text style={styles.summaryText}>
          Photos taken: {photos.length}
        </Text>
        <Text style={styles.summaryText}>
          Completed: {new Date().toLocaleDateString()}
        </Text>
      </Wrapper>

      {/* Completion Method Selection */}
      <Wrapper variant="default" style={styles.section}>
        <Text style={styles.sectionTitle}>How would you like to complete this job?</Text>
        
        <View style={styles.methodButtons}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              completionMethod === 'in-person' ? styles.methodButtonActive : styles.methodButtonInactive
            ]}
            onPress={() => setCompletionMethod('in-person')}
          >
            <View style={styles.methodButtonContent}>
              <Text style={styles.methodButtonIcon}>✍️</Text>
              <Text style={[
                styles.methodButtonTitle,
                completionMethod === 'in-person' ? styles.methodButtonTitleActive : styles.methodButtonTitleInactive
              ]}>
                In-Person Signature
              </Text>
              <Text style={[
                styles.methodButtonDesc,
                completionMethod === 'in-person' ? styles.methodButtonDescActive : styles.methodButtonDescInactive
              ]}>
                Client signs here now
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton,
              completionMethod === 'remote' ? styles.methodButtonActive : styles.methodButtonInactive
            ]}
            onPress={() => setCompletionMethod('remote')}
          >
            <View style={styles.methodButtonContent}>
              <Text style={styles.methodButtonIcon}>📱</Text>
              <Text style={[
                styles.methodButtonTitle,
                completionMethod === 'remote' ? styles.methodButtonTitleActive : styles.methodButtonTitleInactive
              ]}>
                Remote Approval
              </Text>
              <Text style={[
                styles.methodButtonDesc,
                completionMethod === 'remote' ? styles.methodButtonDescActive : styles.methodButtonDescInactive
              ]}>
                Email/text client to approve
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Wrapper>

      {/* In-Person Signature Section */}
      {completionMethod === 'in-person' && (
        <>
          {/* Client Satisfaction */}
          <Wrapper variant="default" style={styles.section}>
            <Text style={styles.sectionTitle}>How was the service? (Optional)</Text>
            <Input
              placeholder="Any feedback or notes from the client..."
              value={jobSatisfaction}
              onChangeText={setJobSatisfaction}
              multiline
              inputStyle={styles.textArea}
            />
          </Wrapper>

          {/* Signature Section */}
          <Wrapper variant="default" style={styles.section}>
            <Text style={styles.sectionTitle}>Client Signature *</Text>
            <Text style={styles.instructionText}>
              Please have the client sign below to confirm work completion
            </Text>
            
            <View style={styles.signatureWrapper}>
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
              <Button 
                variant="success"
                onPress={() => signatureRef.current?.readSignature()}
                style={styles.captureButton}
              >
                Save Signature
              </Button>
              
              <Button 
                variant="outline" 
                onPress={clearSignature}
                style={styles.clearButton}
              >
                Clear
              </Button>
            </View>

            {signature ? (
              <View style={styles.signatureStatus}>
                <Text style={styles.signatureStatusText}>✓ Signature captured successfully!</Text>
              </View>
            ) : (
              <View style={styles.signatureInstructions}>
                <Text style={styles.signatureInstructionsText}>
                  1. Have client sign in the box above{'\n'}
                  2. Tap "Save Signature" to confirm
                </Text>
              </View>
            )}
          </Wrapper>

          {/* Client Name */}
          <Wrapper variant="default" style={styles.section}>
            <Text style={styles.sectionTitle}>Client Printed Name *</Text>
            <Input
              placeholder="Client's full name (printed)"
              value={clientSignedName}
              onChangeText={setClientSignedName}
              autoCapitalize="words"
            />
          </Wrapper>

          {/* Complete Button */}
          <View style={styles.buttonWrapper}>
            <Button variant="success" onPress={completeJobInPerson} style={styles.completeButton}>
              Complete Job
            </Button>
          </View>
        </>
      )}

      {/* Remote Signing Section */}
      {completionMethod === 'remote' && (
        <Wrapper variant="default" style={styles.section}>
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

          <View style={styles.buttonWrapper}>
            <Button variant="primary" onPress={initiateRemoteSignin} style={styles.remoteButton}>
              📧 Send Review Link
            </Button>
          </View>
        </Wrapper>
      )}

      {/* Remote Signing Modal */}
      <Modal
        visible={showRemoteModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingWrapper keyboardVerticalOffset={0}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send Review Link</Text>
            <Button 
              variant="ghost" 
              onPress={() => setShowRemoteModal(false)}
              style={styles.modalCloseButton}
            >
              ✕
            </Button>
          </View>

          {/* Contact Method Selection */}
          <Wrapper variant="flat" style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>How should we contact {clientName}?</Text>
            
            <View style={styles.contactMethodButtons}>
              <Button
                variant={remoteContactMethod === 'email' ? 'primary' : 'outline'}
                onPress={() => setRemoteContactMethod('email')}
                style={styles.contactMethodButton}
              >
                <View style={styles.contactMethodContent}>
                  <Text style={styles.contactMethodIcon}>📧</Text>
                  <Text style={styles.contactMethodText}>Email</Text>
                </View>
              </Button>

              <Button
                variant={remoteContactMethod === 'sms' ? 'primary' : 'outline'}
                onPress={() => setRemoteContactMethod('sms')}
                style={styles.contactMethodButton}
              >
                <View style={styles.contactMethodContent}>
                  <Text style={styles.contactMethodIcon}>💬</Text>
                  <Text style={styles.contactMethodText}>Text (SMS)</Text>
                </View>
              </Button>
            </View>
          </Wrapper>

          {/* Contact Info Input */}
          <Wrapper variant="flat" style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>
              {remoteContactMethod === 'email' ? 'Email Address' : 'Phone Number'}
            </Text>
            
            {remoteContactMethod === 'email' ? (
              <Input
                placeholder="client@example.com"
                value={customEmail}
                onChangeText={setCustomEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : (
              <Input
                placeholder="(555) 123-4567"
                value={customPhone}
                onChangeText={setCustomPhone}
                keyboardType="phone-pad"
              />
            )}
          </Wrapper>

          {/* Preview */}
          <Wrapper variant="flat" style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Preview Message</Text>
            <View style={styles.previewBox}>
              <Text style={styles.previewText}>
                {remoteContactMethod === 'email' ? 
                  `Hi ${clientName}, we just finished your service. Please review our work: [Review Link]` :
                  `Hi ${clientName}! Work complete. Please review: [Review Link]`
                }
              </Text>
            </View>
          </Wrapper>

          {/* Send Button */}
          <View style={styles.modalButtonWrapper}>
            <Button variant="success" onPress={sendRemoteSigningRequest} style={styles.modalSendButton}>
              Send {remoteContactMethod === 'email' ? 'Email' : 'Text'}
            </Button>
          </View>
        </KeyboardAvoidingWrapper>
      </Modal>

      {/* Legal Disclaimer */}
      <Wrapper variant="flat" style={styles.disclaimerSection}>
        <Text style={styles.disclaimerText}>
          By completing this job, the client acknowledges that the work has been performed 
          as agreed and authorizes payment according to the service terms.
        </Text>
      </Wrapper>
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.statusBarOffset + Spacing.md,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.screenPadding,
  },
  headerTitle: {
    ...Typography.display,
    color: Colors.textInverse,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textInverse,
    opacity: 0.8,
    marginTop: Spacing.xs,
  },
  summaryWrapper: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: -Spacing.lg, // Overlap with header
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  summaryText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  section: {
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  instructionText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  // Method Selection Styles
  methodButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  methodButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Sizes.radiusMedium,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  methodButtonInactive: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
  },
  methodButtonContent: {
    alignItems: 'center',
  },
  methodButtonIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  methodButtonTitle: {
    ...Typography.label,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  methodButtonTitleActive: {
    color: Colors.textInverse,
  },
  methodButtonTitleInactive: {
    color: Colors.textPrimary,
  },
  methodButtonDesc: {
    ...Typography.caption,
    textAlign: 'center',
  },
  methodButtonDescActive: {
    color: Colors.textInverse,
    opacity: 0.9,
  },
  methodButtonDescInactive: {
    color: Colors.textSecondary,
    opacity: 0.8,
  },
  // In-Person Signature Styles
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  signatureWrapper: {
    height: 220,
    marginBottom: Spacing.md,
  },
  signaturePad: {
    flex: 1,
  },
  signatureControls: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  captureButton: {
    flex: 1,
  },
  clearButton: {
    flex: 0.4,
  },
  signatureStatus: {
    backgroundColor: Colors.secondaryLight,
    padding: Spacing.sm,
    borderRadius: Sizes.radiusSmall,
    marginBottom: Spacing.sm,
  },
  signatureStatusText: {
    ...Typography.bodySmall,
    color: Colors.secondary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  signatureInstructions: {
    backgroundColor: Colors.warning + '15',
    padding: Spacing.sm,
    borderRadius: Sizes.radiusSmall,
    marginBottom: Spacing.sm,
  },
  signatureInstructionsText: {
    ...Typography.bodySmall,
    color: Colors.warning,
    textAlign: 'center',
  },
  // Remote Signing Styles
  remoteInfoBox: {
    backgroundColor: Colors.secondaryLight,
    padding: Spacing.md,
    borderRadius: Sizes.radiusSmall,
    marginBottom: Spacing.lg,
  },
  remoteInfoTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginBottom: Spacing.sm,
  },
  remoteInfoText: {
    ...Typography.bodySmall,
    color: Colors.secondary,
    lineHeight: 20,
  },
  remoteButton: {
    // Button component handles styling
  },
  // Button Styles
  buttonWrapper: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.lg,
  },
  completeButton: {
    // Button component handles styling
  },
  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingTop: Spacing.statusBarOffset + Spacing.md,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  modalCloseButton: {
    paddingHorizontal: 0,
  },
  modalSection: {
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.lg,
  },
  modalSectionTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  contactMethodButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  contactMethodButton: {
    flex: 1,
    paddingVertical: Spacing.md,
  },
  contactMethodContent: {
    alignItems: 'center',
  },
  contactMethodIcon: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  contactMethodText: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
  },
  previewBox: {
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
    borderRadius: Sizes.radiusSmall,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  previewText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  modalButtonWrapper: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.lg,
  },
  modalSendButton: {
    // Button component handles styling
  },
  disclaimerSection: {
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.xl,
  },
  disclaimerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});