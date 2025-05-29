import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

// Simple UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface JobPhoto {
  id: string;
  uri: string;
  type: 'before' | 'during' | 'after';
  timestamp: string; // Changed to string for serialization
}

interface CameraScreenProps {
  jobId?: string;
  clientName?: string;
  onPhotosComplete?: (photos: JobPhoto[]) => void;
  initialPhotos?: JobPhoto[];
  onPhotosChange?: (photos: JobPhoto[]) => void;
}

export default function CameraScreen({ 
  jobId = 'temp-job', 
  clientName = 'Test Client',
  onPhotosComplete,
  initialPhotos = [],
  onPhotosChange
}: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [photos, setPhotos] = useState<JobPhoto[]>(initialPhotos);
  const [activePhotoType, setActivePhotoType] = useState<'before' | 'during' | 'after'>('before');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    (async () => {
      const mediaLibraryStatus = await MediaLibrary.requestPermissionsAsync();
      // Permission is handled by useCameraPermissions hook
    })();
  }, []);

  const takePicture = async () => {
    if (!isCameraReady) {
      Alert.alert('Camera Not Ready', 'Please wait for the camera to initialize');
      return;
    }

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });

        if (photo?.uri) {
          // Save to device gallery
          await MediaLibrary.saveToLibraryAsync(photo.uri);

          // Add to our photos array - USE UUID INSTEAD OF Date.now()
          const newPhoto: JobPhoto = {
            id: generateUUID(), // CHANGED: Use UUID instead of Date.now().toString()
            uri: photo.uri,
            type: activePhotoType,
            timestamp: new Date().toISOString(), // Store as ISO string
          };

          setPhotos(prev => {
            const newPhotos = [...prev, newPhoto];
            if (onPhotosChange) {
              onPhotosChange(newPhotos);
            }
            return newPhotos;
          });
          // Auto-save will trigger from useEffect
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
        console.error('Camera error:', error);
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhoto: JobPhoto = {
          id: generateUUID(), // CHANGED: Use UUID instead of Date.now().toString()
          uri: result.assets[0].uri,
          type: activePhotoType,
          timestamp: new Date().toISOString(), // Store as ISO string
        };

        setPhotos(prev => [...prev, newPhoto]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', error);
    }
  };

  const deletePhoto = (photoId: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPhotos(prev => {
              const newPhotos = prev.filter(photo => photo.id !== photoId);
              if (onPhotosChange) {
                onPhotosChange(newPhotos);
              }
              return newPhotos;
            });
          },
        },
      ]
    );
  };

  const getPhotosByType = (type: 'before' | 'during' | 'after') => {
    return photos.filter(photo => photo.type === type);
  };

  const completeJob = () => {
    // Always save photos when user wants to complete/go back
    if (onPhotosComplete) {
      onPhotosComplete(photos);
    } else {
      Alert.alert('Photos Saved', `${photos.length} photos have been saved to this job.`);
    }
  };

  if (permission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Photos</Text>
        <Text style={styles.headerSubtitle}>{clientName}</Text>
      </View>

      {/* Photo Type Selector */}
      <View style={styles.photoTypeSelector}>
        {(['before', 'during', 'after'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.photoTypeButton,
              activePhotoType === type && styles.photoTypeButtonActive,
            ]}
            onPress={() => setActivePhotoType(type)}
          >
            <Text
              style={[
                styles.photoTypeButtonText,
                activePhotoType === type && styles.photoTypeButtonTextActive,
              ]}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} ({getPhotosByType(type).length})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={cameraType}
          ref={cameraRef}
          onCameraReady={() => setIsCameraReady(true)}
        />
        
        {/* Camera Overlay - positioned absolutely over camera */}
        <View style={styles.cameraOverlay}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => {
              setCameraType(cameraType === 'back' ? 'front' : 'back');
            }}
          >
            <Text style={styles.flipButtonText}>Flip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
          <Text style={styles.controlButtonText}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.captureButton, !isCameraReady && styles.captureButtonDisabled]} 
          onPress={takePicture}
          disabled={!isCameraReady}
        >
          <View style={[styles.captureButtonInner, !isCameraReady && styles.captureButtonInnerDisabled]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={completeJob}
        >
          <Text style={styles.controlButtonText}>Save Photos</Text>
        </TouchableOpacity>
      </View>

      {/* Photo Preview */}
      {photos.length > 0 && (
        <ScrollView horizontal style={styles.photoPreview} showsHorizontalScrollIndicator={false}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoPreviewItem}>
              <Image source={{ uri: photo.uri }} style={styles.photoPreviewImage} />
              <Text style={styles.photoPreviewType}>{photo.type}</Text>
              <TouchableOpacity
                style={styles.deletePhotoButton}
                onPress={() => deletePhoto(photo.id)}
              >
                <Text style={styles.deletePhotoButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 15,
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
  photoTypeSelector: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
  },
  photoTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  photoTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  photoTypeButtonText: {
    color: '#ccc',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  photoTypeButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 20,
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  flipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1a',
  },
  galleryButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#007AFF',
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInnerDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#999',
  },
  completeButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  photoPreview: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
  },
  photoPreviewItem: {
    marginLeft: 10,
    alignItems: 'center',
    position: 'relative',
  },
  photoPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  photoPreviewType: {
    color: 'white',
    fontSize: 10,
    marginTop: 4,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff3b30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePhotoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});