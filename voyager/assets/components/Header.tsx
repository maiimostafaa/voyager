import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../themes/themeMode";

interface HeaderProps {
  onProfilePress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onProfilePress }) => {
  const { theme, themeMode, toggleTheme } = useTheme();

  const logoSource =
    themeMode === "light"
      ? require("../images/darklogo.png")
      : require("../images/lightlogo.png");

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.bg, borderBottomColor: theme.border },
      ]}
    >
      <View style={styles.titleContainer}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <Text
          style={[
            styles.title,
            { color: theme.text, fontFamily: theme.fonts.bold },
          ]}
        >
          Voyager
        </Text>
      </View>
      <View style={styles.headerButtons}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.hover }]}
          onPress={toggleTheme}
        >
          <Ionicons
            name={themeMode === "light" ? "sunny" : "moon"}
            size={22}
            color={theme.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.hover }]}
          onPress={onProfilePress}
        >
          <MaterialIcons name="account-circle" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 34,
    includeFontPadding: false,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Header;
