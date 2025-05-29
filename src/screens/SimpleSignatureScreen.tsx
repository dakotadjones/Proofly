import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';

export interface JobPhoto {
  id: string;
  uri: string;
  type: string;
}

interface SimpleSignatureScreenProps {
  jobId?: string;
  clientName?: string;
  photos?: JobPhoto[];
  onJobComplete?: (data: { clientSignedName: string; jobSatisfaction?: string; signature: string }) => void;
}

export default function SimpleSignatureScreen({
  jobId = 'temp-job',
  clientName = 'Test Client',
  photos = [],
  onJobComplete
}: SimpleSignatureScreenProps) {
  const [signature, setSignature] = useState<string | null>(null);
  const [clientSignedName, setClientSignedName] = useState('');
  const [jobSatisfaction, setJobSatisfaction] = useState('');
  const signatureRef = useRef<any>(null);

  const handleSignature = (signatureBase64: string) => {
    console.log('Signature captured successfully!');
    console.log('Signature length:', signatureBase64.length);
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

  const saveSignature = () => {
    console.log('Complete job called. Signature state:', !!signature);
    console.log('Signature exists:', signature ? 'YES' : 'NO');
    
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
    };

    if (onJobComplete) {
      onJobComplete(signatureData);
    } else {
      // Fallback for standalone testing
      Alert.alert(
        'Job Completed!',
        `Job for ${clientName} has been completed successfully.`,
        [
          {
            text: 'Generate Report',
            onPress: () => {
              console.log('Job completed with data:', signatureData);
            },
          },
        ]
      );
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
        <Text style={styles.headerTitle}>Client Signature</Text>
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
            <Text style={styles.captureSignatureText}>Capture Signature</Text>
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
              1. Sign in the box above
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

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={saveSignature}>
          <Text style={styles.saveButtonText}>Save Signature</Text>
        </TouchableOpacity>
      </View>

      {/* Legal Disclaimer */}
      <View style={styles.disclaimerSection}>
        <Text style={styles.disclaimerText}>
          By signing above, the client acknowledges that the work has been completed 
          to their satisfaction and as described in the service agreement.
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
  buttonContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  saveButton: {
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
  saveButtonText: {
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