import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../themes/themeMode';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, uploadAvatar } from '../../lib/supabase/profiles';

interface EditProfileScreenProps {
  onSave?: () => void;
  onCancel?: () => void;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ onSave, onCancel }) => {
  const { theme } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url || null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!user?.id || !profile) return;

    if (!username.trim()) {
      Alert.alert('Validation Error', 'Username is required.');
      return;
    }

    setSaving(true);

    try {
      let avatarUrl = profile.avatar_url;

      // Upload new avatar if changed
      if (avatarUri && avatarUri !== profile.avatar_url && avatarUri.startsWith('file://')) {
        setUploadingImage(true);
        const uploadedUrl = await uploadAvatar(user.id, avatarUri);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
        setUploadingImage(false);
      }

      // Update profile
      const updated = await updateProfile(user.id, {
        username: username.trim(),
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      });

      if (updated) {
        await refreshProfile();
        Alert.alert('Success', 'Profile updated successfully!');
        onSave?.();
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatarContainer, { borderColor: theme.border }]}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.accent }]}>
              <MaterialIcons name="person" size={48} color={theme.text} />
            </View>
          )}
          {uploadingImage && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color={theme.text} />
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.changeAvatarButton, { backgroundColor: theme.accent }]}
          onPress={pickImage}
          disabled={uploadingImage}
        >
          <MaterialIcons name="camera-alt" size={20} color={theme.text} />
          <Text style={[styles.changeAvatarText, { color: theme.text }]}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Username */}
      <View style={styles.inputSection}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Username *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.accent, color: theme.text, borderColor: theme.border }]}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
          placeholderTextColor={theme.textSecondary}
          editable={!saving}
        />
      </View>

      {/* Full Name */}
      <View style={styles.inputSection}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.accent, color: theme.text, borderColor: theme.border }]}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          placeholderTextColor={theme.textSecondary}
          editable={!saving}
        />
      </View>

      {/* Bio */}
      <View style={styles.inputSection}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Bio</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: theme.accent, color: theme.text, borderColor: theme.border },
          ]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!saving}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {onCancel && (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
            onPress={onCancel}
            disabled={saving}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.saveButton, { backgroundColor: theme.accent }]}
          onPress={handleSave}
          disabled={saving || uploadingImage}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.text }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  changeAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  saveButton: {
    // Styled via backgroundColor
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditProfileScreen;

