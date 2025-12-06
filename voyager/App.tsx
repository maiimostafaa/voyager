import React, { useState } from 'react';
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

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const { loading } = useAuth();

  const [activeTab, setActiveTab] = useState<'Map' | 'MyPins' | 'TripPlan' | 'Settings'>('Map');

  const renderContent = () => {
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.statusBar as StatusBarStyle} />
      <Header />
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

