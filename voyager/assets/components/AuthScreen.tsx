import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../themes/themeMode';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from './LoginScreen';
import ProfileScreen from './ProfileScreen';
import EditProfileScreen from './EditProfileScreen';
import MyPins from './MyPins';

type ViewMode = 'profile' | 'edit';

const AuthScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user, profile, loading, signOut } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('profile');
  const [showMyPins, setShowMyPins] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            setViewMode('profile');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  if (!user || !profile) {
    return <LoginScreen />;
  }

  if (viewMode === 'edit') {
    return (
      <EditProfileScreen
        onSave={() => setViewMode('profile')}
        onCancel={() => setViewMode('profile')}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ProfileScreen 
        onEditPress={() => setViewMode('edit')}
        onSignOut={handleLogout}
        onMyPinsPress={() => setShowMyPins(true)}
      />
      
      {/* My Pins Modal */}
      <MyPins 
        visible={showMyPins}
        onClose={() => setShowMyPins(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AuthScreen;

