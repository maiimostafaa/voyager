import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  Dimensions,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../themes/themeMode";
import { palette } from "../themes/palette";
import { useAuth } from "../contexts/AuthContext";
import { getPostsWithTags, PostWithTags, getPostImages, deletePost } from "../../lib/supabase/posts";
import { VALID_TAGS } from "../../lib/types/database.types";

const { width } = Dimensions.get("window");

// Extended type to include images
interface PostWithTagsAndImages extends PostWithTags {
  images: string[];
}

interface MyPinsProps {
  visible: boolean;
  onClose: () => void;
}

const MyPins: React.FC<MyPinsProps> = ({ visible, onClose }) => {
  const { theme, themeMode } = useTheme();
  const { user } = useAuth();
  const [pins, setPins] = useState<PostWithTagsAndImages[]>([]);
  const [filteredPins, setFilteredPins] = useState<PostWithTagsAndImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible && user?.id) {
      fetchPins();
    }
  }, [visible, user?.id]);

  useEffect(() => {
    filterPins();
  }, [searchQuery, selectedTags, pins]);

  const fetchPins = async () => {
    if (!user?.id) return;

    setLoading(true);
    setRefreshing(true);
    try {
      const userPins = await getPostsWithTags(user.id);
      
      // Fetch images for each pin
      const pinsWithImages = await Promise.all(
        userPins.map(async (pin) => {
          const images = await getPostImages(pin.id);
          return {
            ...pin,
            images: images.map((img) => img.image_url),
          };
        })
      );
      
      setPins(pinsWithImages);
      setFilteredPins(pinsWithImages);
    } catch (error) {
      console.error("Error fetching pins:", error);
      setPins([]);
      setFilteredPins([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterPins = () => {
    let filtered = [...pins];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (pin) =>
          pin.location_name.toLowerCase().includes(query) ||
          (pin.notes && pin.notes.toLowerCase().includes(query))
      );
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((pin) =>
        pin.tags.some((tag) => selectedTags.includes(tag.tag_name))
      );
    }

    setFilteredPins(filtered);
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleDelete = (pin: PostWithTagsAndImages) => {
    Alert.alert(
      "Delete Pin",
      `Are you sure you want to delete "${pin.location_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user?.id) return;
            const success = await deletePost(pin.id, user.id);
            if (success) {
              // Remove from local state
              setPins((prev) => prev.filter((p) => p.id !== pin.id));
              setFilteredPins((prev) => prev.filter((p) => p.id !== pin.id));
              Alert.alert("Deleted", "Pin has been removed.");
            } else {
              Alert.alert("Error", "Could not delete pin. Please try again.");
            }
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.backButton, { backgroundColor: theme.hover }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              My Pins
            </Text>
          </View>
          <TouchableOpacity
            onPress={fetchPins}
            style={[styles.refreshButton, { backgroundColor: theme.hover }]}
            activeOpacity={0.7}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <MaterialIcons name="refresh" size={24} color={theme.text} />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              {
                backgroundColor:
                  themeMode === "dark" ? theme.border : theme.accent,
                borderColor: theme.border,
              },
              theme.shadows,
            ]}
          >
            <MaterialIcons
              name="search"
              size={24}
              color={themeMode === "light" ? theme.text : theme.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search your pins..."
              placeholderTextColor={
                themeMode === "light" ? theme.text : theme.textSecondary
              }
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={
                    themeMode === "light" ? theme.text : theme.textSecondary
                  }
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
                      ? palette.lightBlueAccent
                      : themeMode === "dark"
                      ? theme.hover
                      : "#e8eef7",
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tagText,
                    {
                      color: isSelected
                        ? "#ffffff"
                        : themeMode === "dark"
                        ? theme.text
                        : palette.darkBlueAccent,
                    },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Pins Count */}
        <View style={styles.countContainer}>
          <Text style={[styles.countText, { color: theme.text }]}>
            {filteredPins.length} {filteredPins.length === 1 ? "Pin" : "Pins"}
          </Text>
        </View>

        {/* Pins List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.text} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Loading your pins...
            </Text>
          </View>
        ) : filteredPins.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="location-off"
              size={64}
              color={theme.text}
              style={{ opacity: 0.5 }}
            />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {searchQuery || selectedTags.length > 0
                ? "No pins match your filters"
                : "No pins yet"}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.text }]}>
              {searchQuery || selectedTags.length > 0
                ? "Try adjusting your search or filters"
                : "Add pins on the map to see them here!"}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredPins.map((pin) => (
              <View
                key={pin.id}
                style={[
                  styles.pinCard,
                  {
                    backgroundColor:
                      themeMode === "dark" ? theme.border : theme.accent,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.pinHeader}>
                  <View style={styles.pinHeaderLeft}>
                    <MaterialIcons
                      name="place"
                      size={24}
                      color={
                        themeMode === "dark"
                          ? palette.lightBlueHover
                          : palette.lightBlueAccent
                      }
                    />
                    <Text
                      style={[styles.pinLocation, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {pin.location_name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(pin)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="delete" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                {/* Images Carousel */}
                {pin.images && pin.images.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.imageCarousel}
                    contentContainerStyle={styles.imageCarouselContent}
                  >
                    {pin.images.map((imageUri, index) => (
                      <View key={index} style={styles.imageContainer}>
                        <Image source={{ uri: imageUri }} style={styles.pinImage} />
                      </View>
                    ))}
                  </ScrollView>
                )}

                {pin.notes && (
                  <Text
                    style={[styles.pinNotes, { color: theme.text }]}
                    numberOfLines={3}
                  >
                    {pin.notes}
                  </Text>
                )}

                {pin.tags.length > 0 && (
                  <View style={styles.pinTags}>
                    {pin.tags.map((tag, index) => (
                      <View
                        key={`${pin.id}-${tag.tag_name}-${index}`}
                        style={[
                          styles.pinTagChip,
                          {
                            backgroundColor: theme.hover,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pinTagText,
                            {
                              color:
                                themeMode === "light"
                                  ? palette.lightBlueText
                                  : theme.text,
                            },
                          ]}
                        >
                          {tag.tag_name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.pinFooter}>
                  <Text style={[styles.pinDate, { color: theme.text }]}>
                    {new Date(pin.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
    borderWidth: 1,
    elevation: 5,
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
    paddingBottom: 15,
  },
  tagChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "600",
  },
  countContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  countText: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pinCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  pinHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  pinHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 10,
  },
  pinLocation: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  imageCarousel: {
    marginBottom: 12,
    marginHorizontal: -16,
  },
  imageCarouselContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  pinImage: {
    width: width - 100,
    height: (width - 100) * 0.6,
    borderRadius: 12,
    resizeMode: "cover",
  },
  pinNotes: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  pinTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  pinFooter: {
    marginTop: 8,
  },
  pinDate: {
    fontSize: 12,
  },
});

export default MyPins;
