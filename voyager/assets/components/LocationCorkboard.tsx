import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ImageBackground,
  Dimensions,
  SafeAreaView,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../themes/themeMode";
import { useAuth } from "../contexts/AuthContext";
import { Post, PostTag } from "../../lib/types/database.types";
import { savePost, unsavePost, isPostSaved, likePost, unlikePost, isPostLiked } from "../../lib/supabase/posts";
import UserProfileView from "./UserProfileView";

const { width } = Dimensions.get("window");

interface LocationCorkboardProps {
  locationName: string;
  posts: Array<{
    post: Post;
    tags: PostTag[];
    username: string;
    avatar_url: string | null;
    user_id: string;
    images?: string[];
  }>;
  onClose: () => void;
}

const STICKY_NOTE_COLORS = [
  "#fef08a", // yellow
  "#fda4af", // pink
  "#a7f3d0", // green
  "#bfdbfe", // blue
  "#e9d5ff", // purple
  "#fed7aa", // orange
  "#fecaca", // light red
  "#d1fae5", // mint
];

const LocationCorkboard: React.FC<LocationCorkboardProps> = ({
  locationName,
  posts,
  onClose,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>("");

  useEffect(() => {
    checkSavedPosts();
    checkLikedPosts();
  }, [posts, user]);

  const checkSavedPosts = async () => {
    if (!user?.id || posts.length === 0) return;
    
    const savedIds = new Set<string>();
    for (const item of posts) {
      const isSaved = await isPostSaved(item.post.id, user.id);
      if (isSaved) {
        savedIds.add(item.post.id);
      }
    }
    setSavedPostIds(savedIds);
  };

  const checkLikedPosts = async () => {
    if (!user?.id || posts.length === 0) return;
    
    const likedIds = new Set<string>();
    for (const item of posts) {
      const isLiked = await isPostLiked(item.post.id, user.id);
      if (isLiked) {
        likedIds.add(item.post.id);
      }
    }
    setLikedPostIds(likedIds);
  };

  const handleSaveLocation = async () => {
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to save locations.");
      return;
    }

    if (posts.length === 0) {
      Alert.alert("Error", "No recommendations to save.");
      return;
    }

    const firstPost = posts[0].post;
    const isSaved = savedPostIds.has(firstPost.id);

    setSavingPostId(firstPost.id);
    try {
      if (isSaved) {
        await unsavePost(firstPost.id, user.id);
        setSavedPostIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(firstPost.id);
          return newSet;
        });
      } else {
        await savePost(firstPost.id, user.id);
        setSavedPostIds((prev) => new Set(prev).add(firstPost.id));
      }
    } catch (error) {
      console.error("Error saving/unsaving post:", error);
      Alert.alert("Error", "Failed to save location.");
    } finally {
      setSavingPostId(null);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to like posts.");
      return;
    }

    const isLiked = likedPostIds.has(postId);
    setLikingPostId(postId);

    // Optimistic update
    if (isLiked) {
      setLikedPostIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } else {
      setLikedPostIds((prev) => new Set(prev).add(postId));
    }

    try {
      if (isLiked) {
        await unlikePost(postId, user.id);
      } else {
        await likePost(postId, user.id);
      }
    } catch (error) {
      console.error("Error liking/unliking post:", error);
      // Revert on error
      if (isLiked) {
        setLikedPostIds((prev) => new Set(prev).add(postId));
      } else {
        setLikedPostIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      }
    } finally {
      setLikingPostId(null);
    }
  };

  const handleUserPress = (userId: string, username: string) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
  };

  const getStickyNoteColor = (index: number) => {
    return STICKY_NOTE_COLORS[index % STICKY_NOTE_COLORS.length];
  };

  const isAnySaved = savedPostIds.size > 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <MaterialIcons name="place" size={24} color={theme.text} />
              <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                {locationName}
              </Text>
            </View>
          </View>
          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSaveLocation}
            style={styles.saveButton}
            disabled={savingPostId !== null || posts.length === 0}
          >
            {savingPostId !== null ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <MaterialIcons
                name={isAnySaved ? "bookmark" : "bookmark-border"}
                size={24}
                color={theme.text}
              />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Corkboard Background */}
      <ImageBackground
        source={require("../graphics/corkboard.png")}
        style={styles.backgroundImage}
        resizeMode="repeat"
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.corkboard, posts.length === 0 && styles.emptyContainer]}
          showsVerticalScrollIndicator={false}
        >
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="push-pin" size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.text }]}>
                No recommendations yet
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                Be the first to recommend this location!
              </Text>
            </View>
          ) : (
            posts.map((item, index) => {
            const rotation = (Math.random() - 0.5) * 6; // Random rotation -3 to 3 degrees
            const noteColor = getStickyNoteColor(index);

            return (
              <View
                key={item.post.id}
                style={[
                  styles.stickyNote,
                  {
                    backgroundColor: noteColor,
                    transform: [{ rotate: `${rotation}deg` }],
                  },
                ]}
              >
              {/* Pin at top */}
              <View style={styles.pinContainer}>
                <View style={styles.pin} />
              </View>

              {/* User info */}
              <View style={styles.noteHeader}>
                <TouchableOpacity
                  style={styles.userInfo}
                  onPress={() => handleUserPress(item.user_id, item.username)}
                  activeOpacity={0.7}
                >
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.userAvatar} />
                  ) : (
                    <View style={styles.userAvatarPlaceholder}>
                      <MaterialIcons name="person" size={16} color="#666" />
                    </View>
                  )}
                  <Text style={styles.username} numberOfLines={1}>
                    @{item.username}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.noteDate}>
                  {new Date(item.post.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>

              {/* Images */}
              {item.images && item.images.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.noteImageCarousel}
                  contentContainerStyle={styles.noteImageCarouselContent}
                >
                  {item.images.map((imageUri, imgIndex) => (
                    <Image
                      key={imgIndex}
                      source={{ uri: imageUri }}
                      style={styles.noteImage}
                    />
                  ))}
                </ScrollView>
              )}

              {/* Notes */}
              {item.post.notes && (
                <Text style={styles.noteText} numberOfLines={6}>
                  {item.post.notes}
                </Text>
              )}

              {/* Tags */}
              {item.tags.length > 0 && (
                <View style={styles.noteTags}>
                  {item.tags.slice(0, 3).map((tag) => (
                    <View key={tag.tag_name} style={styles.noteTag}>
                      <Text style={styles.noteTagText}>{tag.tag_name}</Text>
                    </View>
                  ))}
                  {item.tags.length > 3 && (
                    <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
                  )}
                </View>
              )}

              {/* Like Button */}
              <TouchableOpacity
                style={styles.likeButton}
                onPress={() => handleLikePost(item.post.id)}
                disabled={likingPostId === item.post.id}
              >
                <MaterialIcons
                  name={likedPostIds.has(item.post.id) ? "favorite" : "favorite-border"}
                  size={24}
                  color="#dc2626"
                />
              </TouchableOpacity>
            </View>
            );
            })
          )}
        </ScrollView>
      </ImageBackground>

      {/* User Profile View Modal */}
      {selectedUserId && (
        <UserProfileView
          visible={selectedUserId !== null}
          userId={selectedUserId}
          username={selectedUsername}
          onClose={() => {
            setSelectedUserId(null);
            setSelectedUsername("");
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#8B7355",
  },
  safeArea: {
    // backgroundColor will be set by theme
  },
  backgroundImage: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
  },
  saveButton: {
    padding: 4,
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  corkboard: {
    padding: 20,
    paddingTop: 30,
    alignItems: "center",
  },
  stickyNote: {
    width: width - 60,
    padding: 16,
    paddingTop: 20,
    borderRadius: 4,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pinContainer: {
    position: "absolute",
    top: -8,
    left: "50%",
    marginLeft: -10,
    zIndex: 10,
  },
  pin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    borderWidth: 2,
    borderColor: "#991b1b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
  },
  userAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  noteDate: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  noteImageCarousel: {
    marginBottom: 12,
    marginHorizontal: -16,
  },
  noteImageCarouselContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  noteImage: {
    width: width - 120,
    height: (width - 120) * 0.6,
    borderRadius: 8,
    resizeMode: "cover",
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1f2937",
    marginBottom: 12,
  },
  noteTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  noteTag: {
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  noteTagText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "500",
  },
  moreTagsText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  likeButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    padding: 4,
  },
});

export default LocationCorkboard;

