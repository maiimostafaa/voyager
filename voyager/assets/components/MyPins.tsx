import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../themes/themeMode";
import { VALID_TAGS } from "../../lib/types/database.types";

// Dummy data for demonstration
const DUMMY_PINS = [
  {
    id: "1",
    location_name: "Golden Gate Bridge",
    notes: "Amazing views at sunset! Perfect spot for photos.",
    latitude: 37.8199,
    longitude: -122.4783,
    tags: ["Photo Spot", "Nature"],
    created_at: "2024-01-15",
    recommended_by: [
      { username: "sarah_travels", avatar_url: null },
      { username: "john_doe", avatar_url: null },
      { username: "emma_w", avatar_url: null },
    ],
  },
  {
    id: "2",
    location_name: "Tartine Bakery",
    notes: "Best morning buns in SF. Get there early, lines are long!",
    latitude: 37.7614,
    longitude: -122.4241,
    tags: ["Food Spot"],
    created_at: "2024-01-10",
    recommended_by: [
      { username: "foodie_mike", avatar_url: null },
      { username: "lisa_eats", avatar_url: null },
    ],
  },
  {
    id: "3",
    location_name: "The Fillmore",
    notes:
      "Iconic music venue with incredible acoustics. Saw an amazing show here!",
    latitude: 37.7835,
    longitude: -122.4334,
    tags: ["Live Music", "Bar"],
    created_at: "2024-01-05",
    recommended_by: [{ username: "music_lover", avatar_url: null }],
  },
  {
    id: "4",
    location_name: "Muir Woods",
    notes: "Peaceful hike among the redwoods. Take the Cathedral Grove trail.",
    latitude: 37.8913,
    longitude: -122.5811,
    tags: ["Nature"],
    created_at: "2024-01-20",
    recommended_by: [
      { username: "hiker_alex", avatar_url: null },
      { username: "nature_photos", avatar_url: null },
      { username: "outdoor_life", avatar_url: null },
      { username: "trail_blazer", avatar_url: null },
    ],
  },
  {
    id: "5",
    location_name: "The Independent",
    notes: "Great indie venue with a laid-back vibe. Great sound system!",
    latitude: 37.7749,
    longitude: -122.4194,
    tags: ["Live Music", "Club"],
    created_at: "2024-01-12",
    recommended_by: [
      { username: "concert_king", avatar_url: null },
      { username: "indie_fan", avatar_url: null },
    ],
  },
  {
    id: "6",
    location_name: "SFMOMA",
    notes:
      "World-class modern art museum. Don't miss the rooftop sculpture garden.",
    latitude: 37.7857,
    longitude: -122.4011,
    tags: ["Museum"],
    created_at: "2024-01-08",
    recommended_by: [{ username: "art_enthusiast", avatar_url: null }],
  },
];

const MyPins: React.FC = () => {
  const { theme, themeMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pins] = useState(DUMMY_PINS);

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const filteredPins = pins.filter((pin) => {
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      if (!pin.location_name.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      if (!pin.tags.some((tag) => selectedTags.includes(tag))) {
        return false;
      }
    }

    return true;
  });

  const renderPinCard = ({ item }: { item: (typeof DUMMY_PINS)[0] }) => (
    <TouchableOpacity
      style={[
        styles.pinCard,
        {
          backgroundColor: themeMode === "light" ? theme.accent : "#ffffff",
        },
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.pinHeader}>
        <View style={styles.pinTitleContainer}>
          <MaterialIcons
            name="place"
            size={24}
            color={themeMode === "light" ? theme.text : "#1f2937"}
          />
          <Text
            style={[
              styles.pinTitle,
              { color: themeMode === "light" ? theme.text : "#1f2937" },
            ]}
          >
            {item.location_name}
          </Text>
        </View>
        <Text
          style={[
            styles.pinDate,
            { color: themeMode === "light" ? theme.textSecondary : "#6b7280" },
          ]}
        >
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      {item.notes && (
        <Text
          style={[
            styles.pinNotes,
            { color: themeMode === "light" ? theme.text : "#374151" },
          ]}
          numberOfLines={2}
        >
          {item.notes}
        </Text>
      )}

      {item.tags.length > 0 && (
        <View style={styles.pinTags}>
          {item.tags.map((tag) => (
            <View
              key={tag}
              style={[styles.pinTagChip, { backgroundColor: theme.hover }]}
            >
              <Text style={[styles.pinTagText, { color: theme.text }]}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      )}

      {item.recommended_by && item.recommended_by.length > 0 && (
        <View style={styles.recommendedSection}>
          <Text
            style={[
              styles.recommendedLabel,
              {
                color: themeMode === "light" ? theme.textSecondary : "#6b7280",
              },
            ]}
          >
            Recommended by:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendedList}
          >
            {item.recommended_by.map((friend, index) => (
              <View key={index} style={styles.friendItem}>
                <View
                  style={[
                    styles.friendAvatar,
                    {
                      backgroundColor:
                        themeMode === "light" ? theme.hover : "#e5e7eb",
                      borderColor:
                        themeMode === "light" ? theme.border : "#d1d5db",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="person"
                    size={16}
                    color={themeMode === "light" ? theme.text : "#1f2937"}
                  />
                </View>
                <Text
                  style={[
                    styles.friendUsername,
                    { color: themeMode === "light" ? theme.text : "#374151" },
                  ]}
                  numberOfLines={1}
                >
                  {friend.username}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: themeMode === "light" ? "#ffffff" : "#1a1a1a",
            },
          ]}
        >
          <MaterialIcons
            name="search"
            size={24}
            color={themeMode === "light" ? "#6b7280" : "#9ca3af"}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              { color: themeMode === "light" ? "#1f2937" : "#f3f4f6" },
            ]}
            placeholder="Search your pins..."
            placeholderTextColor={themeMode === "light" ? "#9ca3af" : "#6b7280"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={false}
          />
          {searchQuery && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={themeMode === "light" ? "#6b7280" : "#9ca3af"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tag Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tagsContainer}
        contentContainerStyle={styles.tagsContent}
      >
        {VALID_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[
                styles.tagChip,
                {
                  backgroundColor: isSelected
                    ? theme.accent
                    : themeMode === "light"
                    ? "#ffffff"
                    : "#2d2d2d",
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  {
                    color: isSelected
                      ? theme.accentText
                      : themeMode === "light"
                      ? "#122f60"
                      : "#f3f4f6",
                  },
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Pins List */}
      <View style={styles.listHeader}>
        <Text style={[styles.listHeaderText, { color: theme.text }]}>
          {filteredPins.length} {filteredPins.length === 1 ? "Pin" : "Pins"}
        </Text>
      </View>

      <FlatList
        data={filteredPins}
        renderItem={renderPinCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="location-off"
              size={64}
              color={theme.textSecondary}
              style={{ opacity: 0.5 }}
            />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              No pins found
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              {searchQuery || selectedTags.length > 0
                ? "Try adjusting your filters"
                : "Start adding locations to see them here"}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 5,
    marginLeft: 5,
  },
  tagsContainer: {
    maxHeight: 50,
    marginBottom: 10,
  },
  tagsContent: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 0,
    paddingBottom: 15,
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 34,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pinCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pinHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  pinTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  pinTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  pinDate: {
    fontSize: 12,
    marginLeft: 8,
  },
  pinNotes: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.9,
  },
  pinTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  pinTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pinTagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  recommendedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  recommendedLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  recommendedList: {
    flexDirection: "row",
    gap: 12,
  },
  friendItem: {
    alignItems: "center",
    maxWidth: 60,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 4,
  },
  friendUsername: {
    fontSize: 11,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});

export default MyPins;
