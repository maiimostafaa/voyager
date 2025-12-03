import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../themes/themeMode';

const MyPins: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.placeholderText, { color: theme.text }]}>
        My Pins incoming
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: '600',
  },
});

export default MyPins;


