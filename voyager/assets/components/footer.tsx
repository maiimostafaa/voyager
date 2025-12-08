import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { MaterialIcons, FontAwesome5, Feather } from "@expo/vector-icons";
import { useTheme } from "../themes/themeMode";

type TabKey = "Map" | "MyPins" | "TripPlan" | "Settings";

interface FooterProps {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
}

type TabConfig = {
  key: TabKey;
  label: string;
  icon: (color: string) => React.ReactNode;
};

const Footer: React.FC<FooterProps> = ({ activeTab, onTabPress }) => {
  const { theme, themeMode } = useTheme();

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        key: "Map",
        label: "Map",
        icon: (color) => <MaterialIcons name="map" size={24} color={color} />,
      },
      {
        key: "MyPins",
        label: "Pins",
        icon: (color) => (
          <MaterialIcons name="push-pin" size={24} color={color} />
        ),
      },
      {
        key: "TripPlan",
        label: "Trips",
        icon: (color) => (
          <MaterialIcons name="luggage" size={26} color={color} />
        ),
      },
      {
        key: "Settings",
        label: "Profile",
        icon: (color) => (
          <MaterialIcons name="account-circle" size={26} color={color} />
        ),
      },
    ],
    []
  );

  const animationRefs = useRef<Record<TabKey, Animated.Value>>(
    tabs.reduce(
      (acc, tab) => ({
        ...acc,
        [tab.key]: new Animated.Value(tab.key === activeTab ? 1 : 0),
      }),
      {} as Record<TabKey, Animated.Value>
    )
  );

  useEffect(() => {
    tabs.forEach((tab) => {
      Animated.timing(animationRefs.current[tab.key], {
        toValue: tab.key === activeTab ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    });
  }, [activeTab, tabs]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg,
          borderTopColor: theme.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const color = isActive ? theme.text : `${theme.text}CC`;
        const labelProgress = animationRefs.current[tab.key];
        const targetLabelWidth = Math.max(28, tab.label.length * 7);
        const pillWidth = labelProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 50 + targetLabelWidth + 20],
        });

        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.button,
              {
                backgroundColor: "transparent",
              },
            ]}
            onPress={() => onTabPress(tab.key)}
          >
            <Animated.View
              style={[
                styles.pill,
                {
                  backgroundColor: theme.bg,
                  borderColor: isActive ? theme.border : "transparent",
                  shadowColor: themeMode === "light" ? "#000" : "#000",
                  shadowOpacity: isActive ? 0.08 : 0,
                  shadowRadius: isActive ? 6 : 0,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: isActive ? 2 : 0,
                  width: pillWidth,
                },
              ]}
            >
              {tab.icon(color)}
              <Animated.View
                style={[
                  styles.labelWrapper,
                  {
                    opacity: labelProgress,
                    width: labelProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, targetLabelWidth],
                    }),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.label,
                    {
                      color,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </Animated.View>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    marginHorizontal: 0,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "center",
  },
  iconLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  labelWrapper: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    alignItems: "center",
  },
});

export default Footer;
