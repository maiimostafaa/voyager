import React, { useState, useEffect, useRef } from "react";
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
import NewPin from "./NewPin";
import { DUMMY_PINS } from "../../lib/data/dummyPins";

const { width, height } = Dimensions.get("window");

// fixed initial region - San Francisco area
const INITIAL_REGION: Region = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

// type for nominatim search results
interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

// type for selected location from search
interface SelectedLocation {
  name: string;
  fullName: string;
  latitude: number;
  longitude: number;
}

const Map: React.FC = () => {
  const { theme, themeMode } = useTheme();
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<PostWithTags[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostWithTags | null>(null);
  const [showNewPin, setShowNewPin] = useState(false);

  // search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [searchContext, setSearchContext] = useState<string | null>(null); // Dynamic city/context from address

  // selected location from search
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // pre-fill data for new pin from search
  const [prefillLocation, setPrefillLocation] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Filter posts when tags change
  useEffect(() => {
    filterPosts();
  }, [selectedTags, posts]);

  // cleanup search timer
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const fetchedPosts = await getPostsWithTags();
      const allPosts = [...fetchedPosts, ...DUMMY_PINS];
      setPosts(allPosts);
      setFilteredPosts(allPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setPosts(DUMMY_PINS);
      setFilteredPosts(DUMMY_PINS);
    } finally {
      setLoading(false);
    }
  };

  const filterPosts = () => {
    let filtered = [...posts];

    if (selectedTags.length > 0) {
      filtered = filtered.filter((post) =>
        post.tags.some((tag) => selectedTags.includes(tag.tag_name))
      );
    }

    setFilteredPosts(filtered);
  };

  // Extract city from address data
  const extractCityFromAddress = (result: SearchResult): string | null => {
    if (result.address) {
      return result.address.city || result.address.town || result.address.village || null;
    }
    // Fallback: try to extract from display_name (format: "Name, City, State, Country")
    const parts = result.display_name.split(',');
    if (parts.length >= 2) {
      // Usually city is the second part
      return parts[1]?.trim() || null;
    }
    return null;
  };

  // search for places using nominatim api
  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    try {
      // Use search context if available, otherwise use query as-is
      const enrichedQuery = searchContext ? `${query} ${searchContext}` : query;

      // bias results to the current region (rough bounding box around INITIAL_REGION)
      const viewbox = [
        INITIAL_REGION.longitude - INITIAL_REGION.longitudeDelta,
        INITIAL_REGION.latitude + INITIAL_REGION.latitudeDelta,
        INITIAL_REGION.longitude + INITIAL_REGION.longitudeDelta,
        INITIAL_REGION.latitude - INITIAL_REGION.latitudeDelta,
      ].join(",");

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&q=${encodeURIComponent(
          enrichedQuery
        )}&limit=10&viewbox=${viewbox}&bounded=0&countrycodes=us`,
        {
          headers: {
            "User-Agent": "VoyagerApp/1.0",
          },
        }
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data);
      setShowResults(data.length > 0);
      
      // Extract city from first result if available and update search context
      if (data.length > 0 && !searchContext) {
        const city = extractCityFromAddress(data[0]);
        if (city) {
          setSearchContext(city);
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // debounced search
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (text.length >= 3) {
      searchTimerRef.current = setTimeout(() => {
        searchPlaces(text);
      }, 500);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  // when user selects a search result
  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const shortName = result.display_name.split(",")[0];
    
    // Extract and store city from address for future searches
    const city = extractCityFromAddress(result);
    if (city && !searchContext) {
      setSearchContext(city);
    }

    setSelectedLocation({
      name: shortName,
      fullName: result.display_name,
      latitude: lat,
      longitude: lon,
    });
    setShowLocationModal(true);
    setShowResults(false);
    setSearchQuery(shortName);
  };

  // check if a location has been pinned by others (within ~100m)
  const findNearbyPins = (lat: number, lon: number) => {
    const threshold = 0.001; // roughly 100m
    return posts.filter(
      (post) =>
        Math.abs(post.latitude - lat) < threshold &&
        Math.abs(post.longitude - lon) < threshold
    );
  };

  // check if user has pinned this location
  const userHasPinned = (lat: number, lon: number) => {
    if (!user) return false;
    const threshold = 0.001;
    return posts.some(
      (post) =>
        post.user_id === user.id &&
        Math.abs(post.latitude - lat) < threshold &&
        Math.abs(post.longitude - lon) < threshold
    );
  };

  // handle creating a pin from search result
  const handleCreatePinFromSearch = () => {
    if (!selectedLocation) return;
    setPrefillLocation({
      name: selectedLocation.name,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    });
    setShowLocationModal(false);
    setShowNewPin(true);
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleMarkerPress = (post: PostWithTags) => {
    setSelectedPost(post);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  // Extract city from existing pins to set initial search context
  useEffect(() => {
    if (posts.length > 0 && !searchContext) {
      // Try to reverse geocode the first pin to get city
      const firstPost = posts[0];
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${firstPost.latitude}&lon=${firstPost.longitude}&addressdetails=1`,
        {
          headers: {
            "User-Agent": "VoyagerApp/1.0",
          },
        }
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.address) {
            const city = data.address.city || data.address.town || data.address.village;
            if (city) {
              setSearchContext(city);
            }
          }
        })
        .catch((err) => console.error("Reverse geocode error:", err));
    }
  }, [posts, searchContext]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  // get nearby pins for selected location
  const nearbyPins = selectedLocation
    ? findNearbyPins(selectedLocation.latitude, selectedLocation.longitude)
    : [];
  const userAlreadyPinned = selectedLocation
    ? userHasPinned(selectedLocation.latitude, selectedLocation.longitude)
    : false;

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={INITIAL_REGION}
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

      {/* Search Bar with Autocomplete */}
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
            placeholder="Search for a location..."
            placeholderTextColor={
              themeMode === "light" ? theme.text : theme.textSecondary
            }
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
          {searching && (
            <ActivityIndicator
              size="small"
              color={theme.textSecondary}
              style={{ marginRight: 8 }}
            />
          )}
          {searchQuery && !searching && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <MaterialIcons
                name="close"
                size={20}
                color={themeMode === "light" ? theme.text : theme.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <ScrollView
            style={[
              styles.resultsDropdown,
              { backgroundColor: theme.bg, borderColor: theme.border },
            ]}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.place_id}
                style={[styles.resultItem, { borderBottomColor: theme.border }]}
                onPress={() => handleSelectResult(result)}
              >
                <MaterialIcons
                  name="place"
                  size={20}
                  color={theme.textSecondary}
                />
                <Text
                  style={[styles.resultText, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {result.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
                { backgroundColor: isSelected ? theme.accent : theme.bg },
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

      {/* Location Details Modal (from search) */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {selectedLocation?.name}
              </Text>
              <TouchableOpacity
                onPress={() => setShowLocationModal(false)}
                style={[styles.closeButton, { backgroundColor: theme.hover }]}
              >
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {selectedLocation && (
              <View style={styles.locationModalBody}>
                <Text
                  style={[
                    styles.locationFullName,
                    { color: themeMode === "light" ? "#4b5563" : "#9ca3af" },
                  ]}
                  numberOfLines={3}
                >
                  {selectedLocation.fullName}
                </Text>

                {/* Show if pinned by others */}
                {nearbyPins.length > 0 ? (
                  <View
                    style={[
                      styles.pinnedSection,
                      {
                        backgroundColor: theme.hover,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.pinnedInfo}>
                      <Text style={[styles.pinnedTitle, { color: theme.text }]}>
                        {nearbyPins.length}{" "}
                        {nearbyPins.length === 1 ? "person has" : "people have"}{" "}
                        pinned this location
                      </Text>
                      <Text
                        style={[
                          styles.pinnedNames,
                          {
                            color:
                              themeMode === "light" ? "#4b5563" : "#9ca3af",
                          },
                        ]}
                      >
                        {nearbyPins
                          .slice(0, 3)
                          .map((p) => p.location_name)
                          .join(", ")}
                        {nearbyPins.length > 3 &&
                          ` +${nearbyPins.length - 3} more`}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.noPinsSection,
                      { borderColor: theme.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.noPinsText,
                        {
                          color: themeMode === "light" ? "#4b5563" : "#9ca3af",
                        },
                      ]}
                    >
                      No one has pinned this location yet. Be the first!
                    </Text>
                  </View>
                )}

                {/* Show if user has already pinned */}
                {userAlreadyPinned && (
                  <View
                    style={[
                      styles.userPinnedBadge,
                      { backgroundColor: theme.accent },
                    ]}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={18}
                      color={theme.accentText}
                    />
                    <Text
                      style={[
                        styles.userPinnedText,
                        { color: theme.accentText },
                      ]}
                    >
                      You've pinned this location
                    </Text>
                  </View>
                )}

                {/* Create pin button */}
                {!userAlreadyPinned && (
                  <TouchableOpacity
                    style={[
                      styles.createPinButton,
                      { backgroundColor: theme.accent },
                    ]}
                    onPress={handleCreatePinFromSearch}
                  >
                    <MaterialIcons
                      name="add-location"
                      size={24}
                      color={theme.accentText}
                    />
                    <Text
                      style={[
                        styles.createPinText,
                        { color: theme.accentText },
                      ]}
                    >
                      Add Your Recommendation
                    </Text>
                  </TouchableOpacity>
                )}

                {/* View existing pins button */}
                {nearbyPins.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.viewPinsButton,
                      { borderColor: theme.border },
                    ]}
                    onPress={() => {
                      setShowLocationModal(false);
                      if (nearbyPins[0]) {
                        setSelectedPost(nearbyPins[0]);
                      }
                    }}
                  >
                    <MaterialIcons
                      name="visibility"
                      size={20}
                      color={theme.text}
                    />
                    <Text style={[styles.viewPinsText, { color: theme.text }]}>
                      View Existing Recommendations
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

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
            )}
          </View>
        </View>
      </Modal>

      {/* New Pin Modal */}
      <NewPin
        visible={showNewPin}
        onClose={() => {
          setShowNewPin(false);
          setPrefillLocation(null);
        }}
        onPinCreated={fetchPosts}
        initialRegion={INITIAL_REGION}
        prefillLocation={prefillLocation}
      />
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
  resultsDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 200,
    elevation: 5,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
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
    maxHeight: height * 0.7,
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
  locationModalBody: {
    gap: 12,
  },
  locationFullName: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
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
    marginTop: 5,
  },
  modalCoordinatesText: {
    fontSize: 14,
  },
  pinnedSection: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  pinnedInfo: {
    flex: 1,
  },
  pinnedTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  pinnedNames: {
    fontSize: 13,
    marginTop: 4,
  },
  noPinsSection: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  noPinsText: {
    fontSize: 14,
    textAlign: "center",
  },
  userPinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  userPinnedText: {
    fontSize: 14,
    fontWeight: "500",
  },
  createPinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createPinText: {
    fontSize: 16,
    fontWeight: "600",
  },
  viewPinsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  viewPinsText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default Map;
