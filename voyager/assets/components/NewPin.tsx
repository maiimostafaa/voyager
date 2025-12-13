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
  Image,
} from "react-native";
import { Region } from "react-native-maps";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../themes/themeMode";
import { useAuth } from "../contexts/AuthContext";
import { createPost, uploadPostImage } from "../../lib/supabase/posts";
import { VALID_TAGS } from "../../lib/types/database.types";
import { MaterialIcons } from "@expo/vector-icons";

// max photos per pin
const MAX_PHOTOS = 5;

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
  prefillLocation?: {
    name: string;
    latitude: number;
    longitude: number;
  } | null;
}

const NewPin: React.FC<NewPinProps> = ({
  visible,
  onClose,
  onPinCreated,
  initialRegion,
  prefillLocation,
}) => {
  const { theme, themeMode } = useTheme();
  const { user } = useAuth();

  // form state
  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

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
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert("Error", "Could not get your location. Please try again.");
    } finally {
      setGettingLocation(false);
    }
  };

  // pick photos from library
  const pickPhotos = async () => {
    if (selectedPhotos.length >= MAX_PHOTOS) {
      Alert.alert(
        "Maximum Photos",
        `You can only add up to ${MAX_PHOTOS} photos.`
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need access to your photos to add them to your pin."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: MAX_PHOTOS - selectedPhotos.length,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map((asset) => asset.uri);
      setSelectedPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
    }
  };

  // take a photo with camera
  const takePhoto = async () => {
    if (selectedPhotos.length >= MAX_PHOTOS) {
      Alert.alert(
        "Maximum Photos",
        `You can only add up to ${MAX_PHOTOS} photos.`
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need access to your camera to take photos."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setSelectedPhotos((prev) =>
        [...prev, result.assets[0].uri].slice(0, MAX_PHOTOS)
      );
    }
  };

  // remove a photo
  const removePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // reset form
  const resetForm = () => {
    setLocationName("");
    setSearchQuery("");
    setNotes("");
    setSelectedTags([]);
    setCoords(null);
    setSelectedPhotos([]);
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
        // upload photos if any
        if (selectedPhotos.length > 0) {
          let uploadedCount = 0;
          for (const photoUri of selectedPhotos) {
            try {
              const url = await uploadPostImage(user.id, newPost.id, photoUri);
              if (url) uploadedCount++;
            } catch (err) {
              console.error("Photo upload error:", err);
            }
          }
          if (uploadedCount < selectedPhotos.length) {
            Alert.alert(
              "Partial Success",
              `Pin created! ${uploadedCount}/${selectedPhotos.length} photos uploaded.`
            );
          } else {
            Alert.alert(
              "Success!",
              "Your recommendation has been added to the map."
            );
          }
        } else {
          Alert.alert(
            "Success!",
            "Your recommendation has been added to the map."
          );
        }
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

  // prefill location if passed from map search
  useEffect(() => {
    if (visible && prefillLocation) {
      setLocationName(prefillLocation.name);
      setSearchQuery(prefillLocation.name);
      setCoords({
        latitude: prefillLocation.latitude,
        longitude: prefillLocation.longitude,
      });
    }
  }, [visible, prefillLocation]);

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
                  style={{ marginRight: 8 }}
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
                  style={styles.clearButton}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={themeMode === "light" ? theme.text : theme.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* search results dropdown */}
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
              </ScrollView>
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

          {/* show selected location */}
          {coords && (
            <View
              style={[
                styles.selectedLocation,
                { backgroundColor: theme.hover, borderColor: theme.border },
              ]}
            >
              <MaterialIcons name="place" size={24} color={theme.accent} />
              <View style={styles.selectedLocationText}>
                <Text
                  style={[styles.selectedLocationName, { color: theme.text }]}
                >
                  {locationName || "Selected Location"}
                </Text>
                <Text
                  style={[styles.coordsText, { color: theme.textSecondary }]}
                >
                  📍 {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setCoords(null);
                  setLocationName("");
                  setSearchQuery("");
                }}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
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

          {/* photos section */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: theme.text }]}>
              Photos ({selectedPhotos.length}/{MAX_PHOTOS})
            </Text>

            {/* photo buttons */}
            <View style={styles.photoButtons}>
              <TouchableOpacity
                style={[
                  styles.photoButton,
                  { backgroundColor: theme.hover, borderColor: theme.border },
                ]}
                onPress={pickPhotos}
                disabled={selectedPhotos.length >= MAX_PHOTOS}
              >
                <MaterialIcons
                  name="photo-library"
                  size={22}
                  color={theme.text}
                />
                <Text style={[styles.photoButtonText, { color: theme.text }]}>
                  Choose Photos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.photoButton,
                  { backgroundColor: theme.hover, borderColor: theme.border },
                ]}
                onPress={takePhoto}
                disabled={selectedPhotos.length >= MAX_PHOTOS}
              >
                <MaterialIcons name="camera-alt" size={22} color={theme.text} />
                <Text style={[styles.photoButtonText, { color: theme.text }]}>
                  Take Photo
                </Text>
              </TouchableOpacity>
            </View>

            {/* photo previews */}
            {selectedPhotos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoPreviewScroll}
              >
                {selectedPhotos.map((uri, index) => (
                  <View key={uri + index} style={styles.photoPreviewContainer}>
                    <Image source={{ uri }} style={styles.photoPreview} />
                    <TouchableOpacity
                      style={[
                        styles.removePhotoBtn,
                        { backgroundColor: theme.accent },
                      ]}
                      onPress={() => removePhoto(index)}
                    >
                      <MaterialIcons
                        name="close"
                        size={16}
                        color={theme.accentText}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
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
  // search input styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  // selected location display
  selectedLocation: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 20,
    gap: 12,
  },
  selectedLocationText: {
    flex: 1,
  },
  selectedLocationName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
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
  coordsText: {
    fontSize: 13,
  },
  // photos
  photoButtons: {
    flexDirection: "row",
    gap: 10,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  photoPreviewScroll: {
    marginTop: 12,
  },
  photoPreviewContainer: {
    marginRight: 10,
    position: "relative",
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removePhotoBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
