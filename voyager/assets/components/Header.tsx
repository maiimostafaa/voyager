import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../themes/themeMode';

const Header: React.FC = () => {
  const { theme, themeMode, toggleTheme } = useTheme();

  const logoSource = themeMode === 'light' 
    ? require('../images/darklogo.png')
    : require('../images/lightlogo.png');

  return (
    <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
      <View style={styles.titleContainer}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: theme.text }]}>Voyager</Text>
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.hover }]}
        onPress={toggleTheme}
      >
        <Text style={[styles.buttonText, { color: theme.text }]}>
          {themeMode === 'light' ? '☀️' : '🌙'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default Header;

