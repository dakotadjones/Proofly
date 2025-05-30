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
import { generateUUID } from '../utils/JobUtils';
import { mvpStorageService } from '../services/MVPStorageService';
import { Colors, Typography, Spacing, Sizes } from '../theme';
import { Button, Badge } from '../components/ui';

const { width, height } = Dimensions.get('window');

export interface JobPhoto {
  id: string;
  uri: string;
  type: 'before' | 'during' | 'after';
  timestamp: string;
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
    })();
  }, []);

  // MVP: Check photo limits before taking picture
  const checkPhotoLimit = async () => {
    const limitCheck = await mvpStorageService.canAddPhoto(photos.length);
    if (!limitCheck.allowed) {
      Alert.alert(
        'Photo Limit Reached',
        limitCheck.reason,
        [
          { text: 'OK', style: 'cancel' },
          { 
            text: 'Upgrade Plan', 
            onPress: () => {
              Alert.alert(
                'Upgrade to Starter Plan', 
                'Get unlimited photos, 200 jobs, and 2GB storage for just $19/month!\n\nPerfect for growing service businesses.',
                [
                  { text: 'Maybe Later', style: 'cancel' },
                  { text: 'Learn More', onPress: () => {
                    Alert.alert('Coming Soon!', 'Upgrade flow will be available soon. Contact support for early access.');
                  }}
                ]
              );
            }
          }
        ]
      );
      return false;
    }
    return true;
  };

  const takePicture = async () => {
    if (!isCameraReady) {
      Alert.alert('Camera Not Ready', 'Please wait for the camera to initialize');
      return;
    }

    // MVP: Check photo limits before taking picture
    const canAdd = await checkPhotoLimit();
    if (!canAdd) return;

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });

        if (photo?.uri) {
          await MediaLibrary.saveToLibraryAsync(photo.uri);

          const newPhoto: JobPhoto = {
            id: generateUUID(),
            uri: photo.uri,
            type: activePhotoType,
            timestamp: new Date().toISOString(),
          };

          setPhotos(prev => {
            const newPhotos = [...prev, newPhoto];
            if (onPhotosChange) {
              onPhotosChange(newPhotos);
            }
            return newPhotos;
          });
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
        console.error('Camera error:', error);
      }
    }
  };

  const pickImage = async () => {
    // MVP: Check photo limits before picking image too
    const canAdd = await checkPhotoLimit();
    if (!canAdd) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhoto: JobPhoto = {
          id: generateUUID(),
          uri: result.assets[0].uri,
          type: activePhotoType,
          timestamp: new Date().toISOString(),
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
    if (onPhotosComplete) {
      onPhotosComplete(photos);
    } else {
      Alert.alert('Photos Saved', `${photos.length} photos have been saved to this job.`);
    }
  };

  if (permission === null) {
    return (
      <View style={styles.Wrapper}>
        <Text style={styles.messageText}>Requesting camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.Wrapper}>
        <View style={styles.permissionWrapper}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionMessage}>
            Proofly needs camera access to take photos for job documentation.
          </Text>
          <Button variant="primary" onPress={requestPermission} style={styles.permissionButton}>
            Enable Camera
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.Wrapper}>
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
      <View style={styles.cameraWrapper}>
        <CameraView
          style={styles.camera}
          facing={cameraType}
          ref={cameraRef}
          onCameraReady={() => setIsCameraReady(true)}
        />
        
        <View style={styles.cameraOverlay}>
          <Button
            variant="ghost"
            size="small"
            onPress={() => {
              setCameraType(cameraType === 'back' ? 'front' : 'back');
            }}
            style={styles.flipButton}
            textStyle={styles.flipButtonText}
          >
            Flip
          </Button>
        </View>
      </View>

      {/* Camera Controls */}
      <View style={styles.controls}>
        <Button 
          variant="outline" 
          size="small" 
          onPress={pickImage}
          style={styles.controlButton}
        >
          Gallery
        </Button>

        <TouchableOpacity 
          style={[styles.captureButton, !isCameraReady && styles.captureButtonDisabled]} 
          onPress={takePicture}
          disabled={!isCameraReady}
        >
          <View style={[styles.captureButtonInner, !isCameraReady && styles.captureButtonInnerDisabled]} />
        </TouchableOpacity>

        <Button 
          variant="success" 
          size="small" 
          onPress={completeJob}
          style={styles.controlButton}
        >
          Save Photos
        </Button>
      </View>

      {/* Photo Preview */}
      {photos.length > 0 && (
        <View style={styles.photoPreviewWrapper}>
          <ScrollView horizontal style={styles.photoPreview} showsHorizontalScrollIndicator={false}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoPreviewItem}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreviewImage} />
                <Badge variant="primary" size="small" style={styles.photoTypeBadge}>
                  {photo.type}
                </Badge>
                <TouchableOpacity
                  style={styles.deletePhotoButton}
                  onPress={() => deletePhoto(photo.id)}
                >
                  <Text style={styles.deletePhotoButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  Wrapper: {
    flex: 1,
    backgroundColor: Colors.gray900,
  },
  messageText: {
    ...Typography.body,
    color: Colors.textInverse,
    textAlign: 'center',
  },
  permissionWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    backgroundColor: Colors.background,
  },
  permissionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  permissionMessage: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  permissionButton: {
    minWidth: 200,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.statusBarOffset + Spacing.md,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.screenPadding,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.textInverse,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textInverse,
    opacity: 0.8,
    marginTop: Spacing.xs,
  },
  photoTypeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.gray800,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  photoTypeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: Spacing.xs,
    borderRadius: Sizes.radiusSmall,
    backgroundColor: Colors.gray700,
  },
  photoTypeButtonActive: {
    backgroundColor: Colors.primary,
  },
  photoTypeButtonText: {
    ...Typography.caption,
    color: Colors.gray300,
    textAlign: 'center',
    fontWeight: '500',
  },
  photoTypeButtonTextActive: {
    color: Colors.textInverse,
    fontWeight: 'bold',
  },
  cameraWrapper: {
    flex: 1,
    margin: Spacing.sm,
    borderRadius: Sizes.radiusMedium,
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
    padding: Spacing.lg,
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  flipButtonText: {
    color: Colors.textInverse,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.screenPadding,
    backgroundColor: Colors.gray800,
  },
  controlButton: {
    minWidth: 80,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.textInverse,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.textInverse,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInnerDisabled: {
    backgroundColor: Colors.gray400,
    borderColor: Colors.gray600,
  },
  photoPreviewWrapper: {
    backgroundColor: Colors.gray800,
  },
  photoPreview: {
    paddingVertical: Spacing.sm,
  },
  photoPreviewItem: {
    marginLeft: Spacing.sm,
    alignItems: 'center',
    position: 'relative',
  },
  photoPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: Sizes.radiusSmall,
  },
  photoTypeBadge: {
    position: 'absolute',
    bottom: -Spacing.xs,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: -Spacing.xs,
    right: -Spacing.xs,
    backgroundColor: Colors.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePhotoButtonText: {
    ...Typography.caption,
    color: Colors.textInverse,
    fontWeight: 'bold',
  },
});