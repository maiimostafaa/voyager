import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import type { StatusBarStyle } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { ThemeProvider, useTheme } from './assets/themes/themeMode';
import { AuthProvider, useAuth } from './assets/contexts/AuthContext';
import Header from './assets/components/Header';
import Map from './assets/components/Map';
import MyPins from './assets/components/MyPins';
import TripPlan from './assets/components/TripPlan';
import AuthScreen from './assets/components/AuthScreen';
import Footer from './assets/components/footer';

type TabKey = 'Map' | 'MyPins' | 'TripPlan' | 'Settings';

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const { loading, isNewUser, user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('Map');

  // Redirect first-time users to the profile/settings page for onboarding
  useEffect(() => {
    if (isNewUser) {
      setActiveTab('Settings');
    }
  }, [isNewUser]);

  // Redirect unauthenticated users to the login/profile page
  useEffect(() => {
    if (!user) {
      setActiveTab('Settings');
    }
  }, [user]);

  const renderContent = () => {
    // If user is not logged in, only show AuthScreen (which displays LoginScreen)
    if (!user) {
      return <AuthScreen />;
    }

    switch (activeTab) {
      case 'Map':
        return <Map />;
      case 'MyPins':
        return <MyPins />;
      case 'TripPlan':
        return <TripPlan />;
      case 'Settings':
        return <AuthScreen />;
      default:
        return <Map />;
    }
  };

  const handleProfilePress = () => {
    setActiveTab('Settings');
  };

  // Wrapped tab press handler that prevents navigation for unauthenticated users
  const handleTabPress = (tab: TabKey) => {
    if (!user) {
      // If not logged in, always redirect to Settings (login screen)
      setActiveTab('Settings');
      return;
    }
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar style={theme.statusBar as StatusBarStyle} />
        <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      </SafeAreaView>
    );
  }

  // If user is not logged in, show a simplified layout without header/footer navigation
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar style={theme.statusBar as StatusBarStyle} />
        <View style={styles.content}>{renderContent()}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.statusBar as StatusBarStyle} />
      <Header onProfilePress={handleProfilePress} />
      <View style={styles.content}>{renderContent()}</View>
      <Footer activeTab={activeTab as any} onTabPress={handleTabPress as any} />
    </SafeAreaView>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    'Bodoni-Regular': require('./assets/fonts/BodoniflfRoman-vmAD.ttf'),
    'Bodoni-Bold': require('./assets/fonts/BodoniflfBold-MVZx.ttf'),
    'Bodoni-Italic': require('./assets/fonts/BodoniflfItalic-2OEw.ttf'),
    'Bodoni-BoldItalic': require('./assets/fonts/BodoniflfBolditalic-K7dD.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

