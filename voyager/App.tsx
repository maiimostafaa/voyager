import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import { ThemeProvider, useTheme } from './assets/themes/themeMode';
import Header from './assets/components/Header';
import Map from './assets/components/Map';
import MyPins from './assets/components/MyPins';
import TripPlan from './assets/components/TripPlan';
import AuthScreen from './assets/components/AuthScreen';
import Footer from './assets/components/footer';

const AppContent: React.FC = () => {
  const { theme } = useTheme();

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.statusBar} />
      <Header />
      <View style={styles.content}>{renderContent()}</View>
      <Footer activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
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
});
