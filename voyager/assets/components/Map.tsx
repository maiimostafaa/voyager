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
import { palette } from "../themes/palette";
import { useAuth } from "../contexts/AuthContext";
import {
  getFriendsPostsWithTags,
  PostWithTags,
  getPostsByLocation,
  getPostsWithTags,
} from "../../lib/supabase/posts";
import { VALID_TAGS } from "../../lib/types/database.types";
import { MaterialIcons } from "@expo/vector-icons";
import NewPin from "./NewPin";
import LocationCorkboard from "./LocationCorkboard";
import { supabase } from "../../lib/supabase";

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
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [locationPosts, setLocationPosts] = useState<
    Array<{
      post: PostWithTags;
      username: string;
      avatar_url: string | null;
    }>
  >([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);

  // search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [searchContext, setSearchContext] = useState<string | null>(null); // Dynamic city/context from address

  // map ref for controlling region
  const mapRef = useRef<MapView>(null);

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
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch both user's own posts and friends' posts
      const [userPosts, friendsPosts] = await Promise.all([
        getPostsWithTags(user.id),
        getFriendsPostsWithTags(user.id),
      ]);

      // Combine and remove duplicates (in case of any)
      const allPosts = [...userPosts, ...friendsPosts];
      const uniquePosts = allPosts.filter(
        (post, index, self) => index === self.findIndex((p) => p.id === post.id)
      );

      console.log(
        `Map: Fetched ${userPosts.length} user posts and ${friendsPosts.length} friends posts`
      );
      setPosts(uniquePosts);
      setFilteredPosts(uniquePosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setPosts([]);
      setFilteredPosts([]);
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
      return (
        result.address.city ||
        result.address.town ||
        result.address.village ||
        null
      );
    }
    // Fallback: try to extract from display_name (format: "Name, City, State, Country")
    const parts = result.display_name.split(",");
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

    // Extract and store city from address for future searches
    const city = extractCityFromAddress(result);
    if (city && !searchContext) {
      setSearchContext(city);
    }

    // Animate map to location
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000
      );
    }

    setShowResults(false);
    setSearchQuery("");
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleMarkerPress = async (post: PostWithTags) => {
    console.log("Marker pressed for location:", post.location_name);
    setLoadingLocation(true);
    setSelectedLocation(post.location_name);

    try {
      // Fetch all posts for this location
      const postsForLocation = await getPostsByLocation(post.location_name);
      console.log("Found posts for location:", postsForLocation.length);

      // Fetch user profiles for each post
      const userIds = postsForLocation.map((p) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      console.log("Found profiles:", profiles?.length);

      const profileMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, { username: string; avatar_url: string | null }>);

      const postsWithUsers = postsForLocation.map((post) => ({
        post,
        username: profileMap[post.user_id]?.username || "Unknown",
        avatar_url: profileMap[post.user_id]?.avatar_url || null,
      }));

      console.log("Posts with users:", postsWithUsers.length);
      setLocationPosts(postsWithUsers);
    } catch (error) {
      console.error("Error loading location posts:", error);
    } finally {
      setLoadingLocation(false);
    }
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
            const city =
              data.address.city || data.address.town || data.address.village;
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

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
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
            onCalloutPress={() => handleMarkerPress(post)}
            onPress={(e) => {
              e.stopPropagation();
              handleMarkerPress(post);
            }}
          >
            <View style={styles.markerContainer}>
              <MaterialIcons name="place" size={40} color="#122f60" />
            </View>
          </Marker>
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

      {/* Location Corkboard Modal */}
      <Modal
        visible={selectedLocation !== null}
        animationType="slide"
        onRequestClose={() => {
          setSelectedLocation(null);
          setLocationPosts([]);
        }}
      >
        {loadingLocation ? (
          <View
            style={[styles.loadingContainer, { backgroundColor: theme.bg }]}
          >
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Loading recommendations...
            </Text>
          </View>
        ) : selectedLocation ? (
          <LocationCorkboard
            locationName={selectedLocation}
            posts={locationPosts.map((item) => ({
              post: item.post,
              tags: item.post.tags,
              username: item.username,
              avatar_url: item.avatar_url,
            }))}
            onClose={() => {
              setSelectedLocation(null);
              setLocationPosts([]);
            }}
          />
        ) : null}
      </Modal>

      {/* Floating Add Pin Button */}
      <TouchableOpacity
        style={[
          styles.fabButton,
          {
            backgroundColor: themeMode === "dark" ? theme.border : theme.accent,
            borderColor: themeMode === "dark" ? theme.text : theme.border,
            borderStyle: "dashed",
          },
          theme.shadows,
        ]}
        onPress={() => setShowNewPin(true)}
        activeOpacity={0.8}
      >
        <MaterialIcons
          name="add"
          size={28}
          color={themeMode === "dark" ? theme.text : palette.lightBlueText}
        />
      </TouchableOpacity>

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
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  fabButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    zIndex: 100,
  },
});

export default Map;
