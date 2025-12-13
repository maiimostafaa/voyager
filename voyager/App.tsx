import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import type { StatusBarStyle } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { ThemeProvider, useTheme } from './assets/themes/themeMode';
import { AuthProvider, useAuth } from './assets/contexts/AuthContext';
import Header from './assets/components/Header';
import Map from './assets/components/Map';
import Feed from './assets/components/Feed';
import TripPlan from './assets/components/TripPlan';
import AuthScreen from './assets/components/AuthScreen';
import LoginScreen from './assets/components/LoginScreen';
import Footer from './assets/components/footer';

type TabKey = 'Map' | 'MyPins' | 'TripPlan' | 'Settings';

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const { loading, user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('Map');

  const renderContent = () => {
    switch (activeTab) {
      case 'Map':
        return <Map />;
      case 'MyPins':
        return <Feed />;
      case 'TripPlan':
        return <TripPlan />;
      case 'Settings':
        return <AuthScreen onTripsPress={() => setActiveTab('TripPlan')} />;
      default:
        return <Map />;
    }
  };

  const handleProfilePress = () => {
    setActiveTab('Settings');
  };

  // Show loading screen while checking auth state
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

  // If user is not logged in, show only the login screen
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar style={theme.statusBar as StatusBarStyle} />
        <LoginScreen />
      </SafeAreaView>
    );
  }

  // User is logged in - show full app with navigation
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.statusBar as StatusBarStyle} />
      <Header onProfilePress={handleProfilePress} />
      <View style={styles.content}>{renderContent()}</View>
      <Footer activeTab={activeTab} onTabPress={setActiveTab} />
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
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
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

