import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../themes/themeMode';
import { useFetchError } from '../contexts/FetchErrorContext';

interface FetchErrorBannerProps {
  onRetry?: () => void;
}

const FetchErrorBanner: React.FC<FetchErrorBannerProps> = ({ onRetry }) => {
  const { theme } = useTheme();
  const { error, hasError, clearError } = useFetchError();

  if (!hasError) {
    return null;
  }

  const handleRetry = () => {
    clearError();
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#dc2626' }]}>
      <View style={styles.contentContainer}>
        <MaterialIcons name="error-outline" size={24} color="#ffffff" />
        <View style={styles.textContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.subText}>Please refresh and try again.</Text>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
          activeOpacity={0.8}
        >
          <MaterialIcons name="refresh" size={18} color="#dc2626" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={clearError}
          activeOpacity={0.8}
        >
          <MaterialIcons name="close" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  retryButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
});

export default FetchErrorBanner;
