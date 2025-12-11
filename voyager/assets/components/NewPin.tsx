// newpin.tsx - modal form for adding a new pin/recommendation to the map
// features: location search with autocomplete, current location, draggable pin

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
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useTheme } from "../themes/themeMode";
import { palette } from "../themes/palette";
import { useAuth } from "../contexts/AuthContext";
import { createPost } from "../../lib/supabase/posts";
import { VALID_TAGS } from "../../lib/types/database.types";
import { MaterialIcons } from "@expo/vector-icons";

// type for search results from nominatim api
interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// props from map screen
interface NewPinProps {
  visible: boolean;
  onClose: () => void;
  onPinCreated: () => void;
  initialRegion: Region;
}

const NewPin: React.FC<NewPinProps> = ({
  visible,
  onClose,
  onPinCreated,
  initialRegion,
}) => {
  const { theme, themeMode } = useTheme();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  // form state
  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // debounce timer for search
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // search for places using nominatim (openstreetmap) api
  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5`,
        {
          headers: {
            "User-Agent": "VoyagerApp/1.0",
          },
        }
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data);
      setShowResults(data.length > 0);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // debounced search - waits 500ms after user stops typing
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setLocationName(text);

    // clear previous timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // set new timer
    searchTimerRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 500);
  };

  // when user selects a search result
  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    // use a shorter name if the full name is too long
    const shortName = result.display_name.split(",")[0];
    setLocationName(shortName);
    setSearchQuery(shortName);
    setCoords({ latitude: lat, longitude: lon });
    setShowResults(false);
    setSearchResults([]);

    // animate map to the selected location
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  };

  // get user's current location
  const handleUseCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      // request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please enable location services to use this feature."
        );
        return;
      }

      // get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setCoords({ latitude, longitude });

      // try to reverse geocode to get place name
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (address) {
          const placeName =
            address.name ||
            address.street ||
            `${address.city || address.region || "Current Location"}`;
          setLocationName(placeName);
          setSearchQuery(placeName);
        }
      } catch {
        // if reverse geocode fails, just use "Current Location"
        setLocationName("Current Location");
        setSearchQuery("Current Location");
      }

      // animate map to current location
      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert("Error", "Could not get your location. Please try again.");
    } finally {
      setGettingLocation(false);
    }
  };

  // handle marker drag end
  const handleMarkerDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoords({ latitude, longitude });
  };

  // reset form
  const resetForm = () => {
    setLocationName("");
    setSearchQuery("");
    setNotes("");
    setSelectedTags([]);
    setCoords(null);
    setSearchResults([]);
    setShowResults(false);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  // form submission
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to add a pin.");
      return;
    }

    if (!locationName.trim()) {
      Alert.alert("Missing Information", "Please enter a location name.");
      return;
    }

    if (!coords) {
      Alert.alert(
        "Missing Location",
        "Please search for a location or use your current location."
      );
      return;
    }

    if (selectedTags.length === 0) {
      Alert.alert(
        "Missing Tags",
        "Please select at least one tag for your recommendation."
      );
      return;
    }

    try {
      setSubmitting(true);
      const newPost = await createPost(user.id, {
        location_name: locationName.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        notes: notes.trim() || null,
        tags: selectedTags,
      });

      if (newPost) {
        Alert.alert(
          "Success!",
          "Your recommendation has been added to the map."
        );
        handleClose();
        onPinCreated();
      } else {
        Alert.alert("Error", "Failed to create pin. Please try again.");
      }
    } catch (error) {
      console.error("Error creating pin:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            Add Your Recommendation
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.closeButton, { backgroundColor: theme.hover }]}
          >
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* location search section */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: theme.text }]}>
              Location *
            </Text>

            {/* search input with icon */}
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor:
                    themeMode === "dark" ? theme.border : theme.accent,
                  borderColor: theme.border,
                },
              ]}
            >
              <MaterialIcons
                name="search"
                size={22}
                color={themeMode === "light" ? theme.text : theme.textSecondary}
              />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search for a place..."
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
                  style={{ marginLeft: 8 }}
                />
              )}
              {searchQuery.length > 0 && !searching && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    setLocationName("");
                    setSearchResults([]);
                    setShowResults(false);
                  }}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* search results dropdown */}
            {showResults && searchResults.length > 0 && (
              <View
                style={[
                  styles.resultsDropdown,
                  { backgroundColor: theme.bg, borderColor: theme.border },
                ]}
              >
                {searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.place_id}
                    style={[
                      styles.resultItem,
                      { borderBottomColor: theme.border },
                    ]}
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
              </View>
            )}

            {/* use current location button */}
            <TouchableOpacity
              style={[
                styles.currentLocationBtn,
                {
                  backgroundColor: theme.hover,
                  borderColor: theme.border,
                },
              ]}
              onPress={handleUseCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <>
                  <MaterialIcons
                    name="my-location"
                    size={20}
                    color={theme.text}
                  />
                  <Text
                    style={[styles.currentLocationText, { color: theme.text }]}
                  >
                    Use my current location
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* map for fine-tuning location */}
          {coords && (
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: theme.text }]}>
                Adjust Pin Location
              </Text>
              <Text style={[styles.formHelper, { color: theme.textSecondary }]}>
                Drag the pin to fine-tune the exact spot
              </Text>
              <View
                style={[styles.miniMapContainer, { borderColor: theme.border }]}
              >
                <MapView
                  ref={mapRef}
                  style={styles.miniMap}
                  initialRegion={{
                    ...initialRegion,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  mapType="standard"
                >
                  <Marker
                    coordinate={coords}
                    draggable
                    onDragEnd={handleMarkerDragEnd}
                    pinColor={
                      themeMode === "dark"
                        ? palette.darkBlueText
                        : palette.lightBlueAccent
                    }
                  />
                </MapView>
              </View>
              <Text style={[styles.coordsText, { color: theme.textSecondary }]}>
                📍 {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
              </Text>
            </View>
          )}

          {/* notes section */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: theme.text }]}>
              Your Notes & Recommendations
            </Text>
            <TextInput
              style={[
                styles.formTextArea,
                {
                  backgroundColor:
                    themeMode === "dark" ? theme.border : theme.accent,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Share your experience, tips, what you recommend..."
              placeholderTextColor={
                themeMode === "light" ? theme.text : theme.textSecondary
              }
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: theme.textSecondary }]}>
              {notes.length}/500
            </Text>
          </View>

          {/* tags section */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: theme.text }]}>
              Tags * (select at least one)
            </Text>
            <View style={styles.tagsGrid}>
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
                          : theme.hover,
                        borderColor: isSelected ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        { color: isSelected ? theme.accentText : theme.text },
                      ]}
                    >
                      {tag}
                    </Text>
                    {isSelected && (
                      <MaterialIcons
                        name="check"
                        size={16}
                        color={theme.accentText}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* submit button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: theme.accent,
                opacity: submitting ? 0.7 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.accentText} />
            ) : (
              <>
                <MaterialIcons
                  name="add-location"
                  size={24}
                  color={theme.accentText}
                />
                <Text
                  style={[styles.submitButtonText, { color: theme.accentText }]}
                >
                  Add Pin to Map
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
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
  scrollView: {
    flex: 1,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  formHelper: {
    fontSize: 13,
    marginBottom: 8,
  },
  // search input styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  // dropdown results
  resultsDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 200,
    overflow: "hidden",
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
  // current location button
  currentLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  currentLocationText: {
    fontSize: 15,
    fontWeight: "500",
  },
  // text area for notes
  formTextArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  // mini map
  miniMapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  miniMap: {
    flex: 1,
  },
  coordsText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  // tags
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // submit button
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
});

export default NewPin;
