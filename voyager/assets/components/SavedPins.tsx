import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  SafeAreaView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../themes/themeMode";
import { useAuth } from "../contexts/AuthContext";
import { VALID_TAGS } from "../../lib/types/database.types";
import {
  getSavedPostsWithDetails,
  SavedPostWithDetails,
  deletePost,
  updatePost,
  updatePostTags,
  getPostImages,
  uploadPostImage,
} from "../../lib/supabase/posts";

// max photos per pin
const MAX_PHOTOS = 5;

// type for pins displayed
type DisplayPin = {
  id: string;
  location_name: string;
  notes: string | null;
  latitude: number;
  longitude: number;
  tags: { tag_name: string }[];
  created_at: string;
  user_id: string;
  created_by?: { username: string; avatar_url?: string | null };
  also_recommended_by?: Array<{ username: string; avatar_url?: string | null }>;
};

interface SavedPinsProps {
  visible: boolean;
  onClose: () => void;
}

const SavedPins: React.FC<SavedPinsProps> = ({ visible, onClose }) => {
  const { theme, themeMode } = useTheme();
  const { user, profile } = useAuth();

  // data states
  const [myPins, setMyPins] = useState<SavedPostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // edit modal state
  const [editingPin, setEditingPin] = useState<DisplayPin | null>(null);
  const [editLocationName, setEditLocationName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editExistingPhotos, setEditExistingPhotos] = useState<string[]>([]); // existing photo URLs
  const [editNewPhotos, setEditNewPhotos] = useState<string[]>([]); // new photos to upload (local URIs)
  const [saving, setSaving] = useState(false);

  // fetch user's saved pins
  const fetchMyPins = async () => {
    if (!user) return;
    try {
      const savedPosts = await getSavedPostsWithDetails(user.id);
      setMyPins(savedPosts);
    } catch (error) {
      console.error("Error fetching my pins:", error);
    }
  };

  // fetch pins on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchMyPins();
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  // get current pins - convert SavedPostWithDetails to DisplayPin format
  const currentPins: DisplayPin[] = myPins.map((item) => ({
    id: item.post.id,
    location_name: item.post.location_name,
    notes: item.post.notes,
    latitude: item.post.latitude,
    longitude: item.post.longitude,
    tags: item.tags,
    created_at: item.post.created_at,
    user_id: item.post.user_id,
    created_by: item.created_by,
    also_recommended_by: item.also_recommended_by,
  }));

  // apply filters
  const filteredPins = currentPins.filter((pin) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      if (!pin.location_name.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (selectedTags.length > 0) {
      if (!pin.tags.some((tag) => selectedTags.includes(tag.tag_name))) {
        return false;
      }
    }
    return true;
  });

  // check if pin belongs to current user
  const isOwnPin = (pin: DisplayPin) => {
    return user && pin.user_id === user.id;
  };

  // handle delete
  const handleDelete = (pin: DisplayPin) => {
    Alert.alert(
      "Delete Pin",
      `Are you sure you want to delete "${pin.location_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user) return;
            const success = await deletePost(pin.id, user.id);
            if (success) {
              setMyPins((prev) => prev.filter((p) => p.post.id !== pin.id));
              Alert.alert("Deleted", "Pin has been removed.");
            } else {
              Alert.alert("Error", "Could not delete pin. Please try again.");
            }
          },
        },
      ]
    );
  };

  // open edit modal
  const handleEdit = async (pin: DisplayPin) => {
    setEditingPin(pin);
    setEditLocationName(pin.location_name);
    setEditNotes(pin.notes || "");
    setEditTags(pin.tags.map((t) => t.tag_name));
    setEditNewPhotos([]);

    // load existing photos
    try {
      const images = await getPostImages(pin.id);
      setEditExistingPhotos(images.map((img) => img.image_url));
    } catch (error) {
      console.error("Error loading photos:", error);
      setEditExistingPhotos([]);
    }
  };

  // pick photos for edit
  const pickEditPhotos = async () => {
    const totalPhotos = editExistingPhotos.length + editNewPhotos.length;
    if (totalPhotos >= MAX_PHOTOS) {
      Alert.alert(
        "Maximum Photos",
        `You can only have up to ${MAX_PHOTOS} photos.`
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: MAX_PHOTOS - totalPhotos,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map((asset) => asset.uri);
      setEditNewPhotos((prev) =>
        [...prev, ...newPhotos].slice(0, MAX_PHOTOS - editExistingPhotos.length)
      );
    }
  };

  // take photo for edit
  const takeEditPhoto = async () => {
    const totalPhotos = editExistingPhotos.length + editNewPhotos.length;
    if (totalPhotos >= MAX_PHOTOS) {
      Alert.alert(
        "Maximum Photos",
        `You can only have up to ${MAX_PHOTOS} photos.`
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need access to your camera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });

    if (!result.canceled && result.assets && result.assets[0]) {
      setEditNewPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  // remove existing photo
  const removeExistingPhoto = (index: number) => {
    setEditExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // remove new photo
  const removeNewPhoto = (index: number) => {
    setEditNewPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // save edits
  const handleSaveEdit = async () => {
    if (!editingPin || !user) return;

    if (!editLocationName.trim()) {
      Alert.alert("Error", "Location name is required.");
      return;
    }
    if (editTags.length === 0) {
      Alert.alert("Error", "Please select at least one tag.");
      return;
    }

    setSaving(true);
    try {
      // update post details
      const updatedPost = await updatePost(editingPin.id, user.id, {
        location_name: editLocationName.trim(),
        notes: editNotes.trim() || null,
      });

      // update tags
      await updatePostTags(editingPin.id, user.id, editTags);

      // upload new photos
      if (editNewPhotos.length > 0) {
        for (const photoUri of editNewPhotos) {
          try {
            await uploadPostImage(user.id, editingPin.id, photoUri);
          } catch (err) {
            console.error("Photo upload error:", err);
          }
        }
      }

      if (updatedPost) {
        // refresh the list
        await fetchMyPins();
        setEditingPin(null);
        Alert.alert("Success", "Pin updated!");
      } else {
        Alert.alert("Error", "Could not update pin.");
      }
    } catch (error) {
      console.error("Error updating pin:", error);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // toggle edit tag
  const toggleEditTag = (tagName: string) => {
    setEditTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const renderPinCard = ({ item }: { item: DisplayPin }) => {
    const canEdit = isOwnPin(item);

    return (
      <View
        style={[
          styles.pinCard,
          {
            backgroundColor: themeMode === "light" ? theme.accent : "#ffffff",
          },
        ]}
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

          {/* edit/delete buttons for own pins */}
          {canEdit && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleEdit(item)}
              >
                <MaterialIcons
                  name="edit"
                  size={20}
                  color={
                    themeMode === "light" ? theme.textSecondary : "#6b7280"
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDelete(item)}
              >
                <MaterialIcons name="delete" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.pinDate,
            { color: themeMode === "light" ? "#4b5563" : "#9ca3af" },
          ]}
        >
          {/* show creator: user's own pins show their username, dummy pins show created_by */}
          {isOwnPin(item) && profile?.username ? (
            <Text style={styles.creatorInline}>@{profile.username} • </Text>
          ) : item.created_by ? (
            <Text style={styles.creatorInline}>
              @{item.created_by.username} •{" "}
            </Text>
          ) : null}
          {new Date(item.created_at).toLocaleDateString()}
        </Text>

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
                key={tag.tag_name}
                style={[styles.pinTagChip, { backgroundColor: theme.hover }]}
              >
                <Text style={[styles.pinTagText, { color: theme.text }]}>
                  {tag.tag_name}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* show also recommended by for feed pins */}
        {item.also_recommended_by && item.also_recommended_by.length > 0 && (
          <View style={styles.recommendedSection}>
            <Text
              style={[
                styles.recommendedLabel,
                {
                  color: themeMode === "light" ? "#4b5563" : "#9ca3af",
                },
              ]}
            >
              Also recommended by:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendedList}
            >
              {item.also_recommended_by.map((friend, index) => (
                <View key={index} style={styles.friendItem}>
                  {friend.avatar_url ? (
                    <Image
                      source={{ uri: friend.avatar_url }}
                      style={styles.friendAvatarImage}
                    />
                  ) : (
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
                  )}
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
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView
        style={[styles.modalContainer, { backgroundColor: theme.bg }]}
      >
        {/* Drag handle indicator */}
        <View style={styles.dragHandleContainer}>
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: theme.textSecondary },
            ]}
          />
        </View>

        {/* Header with close button */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Saved Pins
          </Text>
          <View style={styles.headerSpacer} />
        </View>

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
              placeholderTextColor={
                themeMode === "light" ? "#9ca3af" : "#6b7280"
              }
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

        {/* Pins Count */}
        <View style={styles.listHeader}>
          <Text style={[styles.listHeaderText, { color: theme.text }]}>
            {filteredPins.length} {filteredPins.length === 1 ? "Pin" : "Pins"}
          </Text>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.text} />
          </View>
        ) : (
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
                <Text
                  style={[styles.emptySubtext, { color: theme.textSecondary }]}
                >
                  {searchQuery || selectedTags.length > 0
                    ? "Try adjusting your filters"
                    : "Add some pins on the map to see them here!"}
                </Text>
              </View>
            }
          />
        )}

        {/* Edit Modal */}
        <Modal
          visible={editingPin !== null}
          animationType="slide"
          onRequestClose={() => setEditingPin(null)}
        >
          <View style={[styles.editModal, { backgroundColor: theme.bg }]}>
            {/* Edit Header */}
            <View style={styles.editHeader}>
              <Text style={[styles.editTitle, { color: theme.text }]}>
                Edit Pin
              </Text>
              <TouchableOpacity
                onPress={() => setEditingPin(null)}
                style={[styles.closeButton, { backgroundColor: theme.hover }]}
              >
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editContent}>
              {/* Location Name */}
              <View style={styles.editSection}>
                <Text style={[styles.editLabel, { color: theme.text }]}>
                  Location Name *
                </Text>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      backgroundColor:
                        themeMode === "dark" ? theme.border : theme.accent,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={editLocationName}
                  onChangeText={setEditLocationName}
                  placeholder="Enter location name"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              {/* Notes */}
              <View style={styles.editSection}>
                <Text style={[styles.editLabel, { color: theme.text }]}>
                  Notes
                </Text>
                <TextInput
                  style={[
                    styles.editTextArea,
                    {
                      backgroundColor:
                        themeMode === "dark" ? theme.border : theme.accent,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Your notes..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Photos */}
              <View style={styles.editSection}>
                <Text style={[styles.editLabel, { color: theme.text }]}>
                  Photos ({editExistingPhotos.length + editNewPhotos.length}/
                  {MAX_PHOTOS})
                </Text>

                {/* photo buttons */}
                {editExistingPhotos.length + editNewPhotos.length <
                  MAX_PHOTOS && (
                  <View style={styles.editPhotoButtons}>
                    <TouchableOpacity
                      style={[
                        styles.editPhotoButton,
                        {
                          backgroundColor: theme.hover,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={pickEditPhotos}
                    >
                      <MaterialIcons
                        name="photo-library"
                        size={20}
                        color={theme.text}
                      />
                      <Text
                        style={[
                          styles.editPhotoButtonText,
                          { color: theme.text },
                        ]}
                      >
                        Choose
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.editPhotoButton,
                        {
                          backgroundColor: theme.hover,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={takeEditPhoto}
                    >
                      <MaterialIcons
                        name="camera-alt"
                        size={20}
                        color={theme.text}
                      />
                      <Text
                        style={[
                          styles.editPhotoButtonText,
                          { color: theme.text },
                        ]}
                      >
                        Camera
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* existing photos */}
                {editExistingPhotos.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.editPhotoScroll}
                  >
                    {editExistingPhotos.map((uri, index) => (
                      <View
                        key={`existing-${index}`}
                        style={styles.editPhotoContainer}
                      >
                        <Image
                          source={{ uri }}
                          style={styles.editPhotoPreview}
                        />
                        <TouchableOpacity
                          style={[
                            styles.editRemovePhotoBtn,
                            { backgroundColor: theme.accent },
                          ]}
                          onPress={() => removeExistingPhoto(index)}
                        >
                          <MaterialIcons
                            name="close"
                            size={14}
                            color={theme.accentText}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* new photos */}
                {editNewPhotos.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.editPhotoScroll}
                  >
                    {editNewPhotos.map((uri, index) => (
                      <View
                        key={`new-${index}`}
                        style={styles.editPhotoContainer}
                      >
                        <Image
                          source={{ uri }}
                          style={styles.editPhotoPreview}
                        />
                        <View
                          style={[
                            styles.newPhotoBadge,
                            { backgroundColor: theme.accent },
                          ]}
                        >
                          <Text
                            style={{ color: theme.accentText, fontSize: 10 }}
                          >
                            NEW
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.editRemovePhotoBtn,
                            { backgroundColor: theme.accent },
                          ]}
                          onPress={() => removeNewPhoto(index)}
                        >
                          <MaterialIcons
                            name="close"
                            size={14}
                            color={theme.accentText}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Tags */}
              <View style={styles.editSection}>
                <Text style={[styles.editLabel, { color: theme.text }]}>
                  Tags * (select at least one)
                </Text>
                <View style={styles.editTagsGrid}>
                  {VALID_TAGS.map((tag) => {
                    const isSelected = editTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => toggleEditTag(tag)}
                        style={[
                          styles.editTagChip,
                          {
                            backgroundColor: isSelected
                              ? theme.accent
                              : theme.hover,
                            borderColor: isSelected
                              ? theme.accent
                              : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.editTagText,
                            {
                              color: isSelected ? theme.accentText : theme.text,
                            },
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

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.accent, opacity: saving ? 0.7 : 1 },
                ]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.accentText} />
                ) : (
                  <Text
                    style={[styles.saveButtonText, { color: theme.accentText }]}
                  >
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  container: {
    flex: 1,
  },
  // header with back button
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 32,
  },
  // search
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
  // tags
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
  // list
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // pin card
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
    marginBottom: 4,
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
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  pinDate: {
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 32,
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
  creatorInline: {
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
  friendAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  friendUsername: {
    fontSize: 11,
    textAlign: "center",
  },
  // empty state
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
  // edit modal
  editModal: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
  },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  editTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  editContent: {
    flex: 1,
  },
  editSection: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  editTextArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 100,
  },
  editTagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  editTagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  editTagText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // edit photo styles
  editPhotoButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  editPhotoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  editPhotoButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  editPhotoScroll: {
    marginTop: 8,
  },
  editPhotoContainer: {
    marginRight: 10,
    position: "relative",
  },
  editPhotoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  editRemovePhotoBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  newPhotoBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
});

export default SavedPins;
