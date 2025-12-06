import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { useTheme } from "../themes/themeMode";
import { useAuth } from "../contexts/AuthContext";
import { getPostsWithTags, PostWithTags } from "../../lib/supabase/posts";
import { VALID_TAGS } from "../../lib/types/database.types";
import { MaterialIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const Map: React.FC = () => {
  const { theme, themeMode } = useTheme();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithTags[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostWithTags | null>(null);
  const [showNewPin, setShowNewPin] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 50,
    longitudeDelta: 50,
  });

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Filter posts when search query or tags change
  useEffect(() => {
    filterPosts();
  }, [searchQuery, selectedTags, posts]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const fetchedPosts = await getPostsWithTags();
      setPosts(fetchedPosts);
      setFilteredPosts(fetchedPosts);

      // Calculate initial region to show all posts
      if (fetchedPosts.length > 0) {
        const latitudes = fetchedPosts.map((p) => p.latitude);
        const longitudes = fetchedPosts.map((p) => p.longitude);
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);

        const latDelta = Math.max((maxLat - minLat) * 1.5, 0.1);
        const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.1);

        setRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        });
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterPosts = () => {
    let filtered = [...posts];

    // Filter by search query (location name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((post) =>
        post.location_name.toLowerCase().includes(query)
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((post) =>
        post.tags.some((tag) => selectedTags.includes(tag.tag_name))
      );
    }

    setFilteredPosts(filtered);
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
  };

  const handleMarkerPress = (post: PostWithTags) => {
    setSelectedPost(post);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        mapType="standard"
      >
        {filteredPosts.map((post) => (
          <Marker
            key={post.id}
            coordinate={{
              latitude: post.latitude,
              longitude: post.longitude,
            }}
            title={post.location_name}
            description={post.notes || undefined}
            onPress={() => handleMarkerPress(post)}
          />
        ))}
      </MapView>

      {/* Search Bar - Floating */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: themeMode === "light" ? "#ffffff" : "#1a1a1a",
            },
            theme.shadows,
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
              {
                color: themeMode === "light" ? "#1f2937" : "#f3f4f6",
              },
            ]}
            placeholder="Search for a location..."
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

      {/* Tag Filters - Floating */}
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
                  backgroundColor: isSelected ? theme.accent : theme.bg,
                },
                theme.shadows,
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
                      : theme.text,
                  },
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Post Details Modal */}
      <Modal
        visible={selectedPost !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {selectedPost?.location_name}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedPost(null)}
                style={[styles.closeButton, { backgroundColor: theme.hover }]}
              >
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {selectedPost && (
              <>
                <View style={styles.modalBody}>
                  {selectedPost.notes && (
                    <Text style={[styles.modalNotes, { color: theme.text }]}>
                      {selectedPost.notes}
                    </Text>
                  )}

                  {selectedPost.tags.length > 0 && (
                    <View style={styles.modalTags}>
                      <Text
                        style={[
                          styles.modalTagsLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Tags:
                      </Text>
                      <View style={styles.modalTagsList}>
                        {selectedPost.tags.map((tag) => (
                          <View
                            key={tag.tag_name}
                            style={[
                              styles.modalTagChip,
                              { backgroundColor: theme.accent },
                            ]}
                          >
                            <Text
                              style={[
                                styles.modalTagText,
                                { color: theme.accentText },
                              ]}
                            >
                              {tag.tag_name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.modalCoordinates}>
                    <Text
                      style={[
                        styles.modalCoordinatesText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      📍 {selectedPost.latitude.toFixed(4)},{" "}
                      {selectedPost.longitude.toFixed(4)}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[
          styles.fabButton,
          { backgroundColor: theme.accent },
          theme.shadows,
        ]}
        onPress={() => setShowNewPin(true)}
      >
        <MaterialIcons name="add" size={28} color={theme.accentText} />
      </TouchableOpacity>

      {/* New Pin Modal */}
      <Modal
        visible={showNewPin}
        animationType="slide"
        onRequestClose={() => setShowNewPin(false)}
      >
        <View style={[styles.newPinContainer, { backgroundColor: theme.bg }]}>
          <View style={styles.newPinHeader}>
            <Text style={[styles.newPinTitle, { color: theme.text }]}>
              Add New Location
            </Text>
            <TouchableOpacity
              onPress={() => setShowNewPin(false)}
              style={[styles.closeButton, { backgroundColor: theme.hover }]}
            >
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <Text
            style={[styles.placeholderText, { color: theme.textSecondary }]}
          >
            New Pin page coming soon...
          </Text>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: "absolute",
    top: 15,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
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
    position: "absolute",
    top: 68,
    left: 0,
    right: 0,
    maxHeight: 50,
    zIndex: 9,
  },
  tagsContent: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 0,
    paddingBottom: 8,
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 34,
    elevation: 3,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.6,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    gap: 15,
  },
  modalNotes: {
    fontSize: 16,
    lineHeight: 24,
  },
  modalTags: {
    gap: 8,
  },
  modalTagsLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalTagsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  modalTagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  modalCoordinates: {
    marginTop: 10,
  },
  modalCoordinatesText: {
    fontSize: 14,
  },
  fabButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    zIndex: 100,
  },
  newPinContainer: {
    flex: 1,
    padding: 20,
  },
  newPinHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 20,
  },
  newPinTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  placeholderText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
});

export default Map;
