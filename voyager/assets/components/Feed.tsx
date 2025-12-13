import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../themes/themeMode";
import { useAuth } from "../contexts/AuthContext";
import AddFriendsModal from "./AddFriendsModal";
import UserProfileView from "./UserProfileView";
import {
  getFriendsFeed,
  FeedPost,
  likePost,
  unlikePost,
  savePost,
  unsavePost,
} from "../../lib/supabase/posts";

const { width } = Dimensions.get("window");

const Feed: React.FC = () => {
  const { theme, themeMode } = useTheme();
  const { user } = useAuth();
  const [feedData, setFeedData] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>("");

  useEffect(() => {
    if (user?.id) {
      loadFeed();
    }
  }, [user?.id]);

  const loadFeed = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const feed = await getFriendsFeed(user.id);
      console.log(`Feed: Fetched ${feed.length} posts from friends`);
      setFeedData(feed);
    } catch (error) {
      console.error("Error loading feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else if (diffInWeeks < 4) {
      return `${diffInWeeks}w ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user?.id) return;

    const post = feedData.find((p) => p.post.id === postId);
    if (!post) return;

    // Optimistic UI update
    setFeedData((prev) =>
      prev.map((p) =>
        p.post.id === postId
          ? {
              ...p,
              is_liked: !p.is_liked,
              likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p
      )
    );

    try {
      if (post.is_liked) {
        await unlikePost(postId, user.id);
      } else {
        await likePost(postId, user.id);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert on error
      setFeedData((prev) =>
        prev.map((p) =>
          p.post.id === postId
            ? {
                ...p,
                is_liked: post.is_liked,
                likes_count: post.likes_count,
              }
            : p
        )
      );
    }
  };

  const toggleSave = async (postId: string) => {
    if (!user?.id) return;

    const post = feedData.find((p) => p.post.id === postId);
    if (!post) return;

    // Optimistic UI update
    setFeedData((prev) =>
      prev.map((p) =>
        p.post.id === postId ? { ...p, is_saved: !p.is_saved } : p
      )
    );

    try {
      if (post.is_saved) {
        await unsavePost(postId, user.id);
      } else {
        await savePost(postId, user.id);
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      // Revert on error
      setFeedData((prev) =>
        prev.map((p) =>
          p.post.id === postId ? { ...p, is_saved: post.is_saved } : p
        )
      );
    }
  };

  const handleUserPress = (userId: string, username: string) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
  };

  const renderPost = ({ item }: { item: FeedPost }) => (
    <View
      style={[
        styles.postCard,
        {
          backgroundColor: themeMode === "light" ? "#ffffff" : theme.border,
        },
      ]}
    >
      {/* User Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => handleUserPress(item.user.id, item.user.username)}
          activeOpacity={0.7}
        >
          {item.user.avatar_url ? (
            <Image
              source={{ uri: item.user.avatar_url }}
              style={styles.userAvatar}
            />
          ) : (
            <View
              style={[
                styles.userAvatarPlaceholder,
                { backgroundColor: theme.hover },
              ]}
            >
              <MaterialIcons name="person" size={20} color={theme.text} />
            </View>
          )}
          <View style={styles.userTextContainer}>
            <Text style={[styles.pinnedText, { color: theme.text }]}>
              <Text style={styles.username}>{item.user.username}</Text>
              <Text style={styles.justPinned}> just pinned </Text>
              <Text style={styles.locationName}>{item.post.location_name}</Text>
            </Text>
            <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>
              {formatTimeAgo(item.post.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Images Carousel */}
      {item.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageCarousel}
          contentContainerStyle={styles.imageCarouselContent}
        >
          {item.images.map((imageUri, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.postImage} />
            </View>
          ))}
        </ScrollView>
      )}

      {/* Notes */}
      {item.post.notes && (
        <Text style={[styles.notes, { color: theme.text }]}>
          {item.post.notes}
        </Text>
      )}

      {/* Tags and Action Buttons Row */}
      <View style={styles.bottomRow}>
        {/* Tags */}
        <View style={styles.tagsContainer}>
          {item.tags.map((tag) => (
            <View
              key={tag.tag_name}
              style={[styles.tag, { backgroundColor: theme.hover }]}
            >
              <Text style={[styles.tagText, { color: theme.text }]}>
                {tag.tag_name}
              </Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={() => toggleLike(item.post.id)}
            style={styles.actionButton}
          >
            <MaterialIcons
              name={item.is_liked ? "favorite" : "favorite-border"}
              size={22}
              color={item.is_liked ? "#ef4444" : theme.text}
            />
            {item.likes_count > 0 && (
              <Text
                style={[
                  styles.actionText,
                  { color: item.is_liked ? "#ef4444" : theme.text },
                ]}
              >
                {item.likes_count}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => toggleSave(item.post.id)}
            style={styles.actionButton}
          >
            <MaterialIcons
              name={item.is_saved ? "bookmark" : "bookmark-border"}
              size={22}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Feed</Text>
        <TouchableOpacity
          style={[
            styles.addFriendsButton,
            {
              backgroundColor:
                themeMode === "light" ? theme.accent : theme.text,
            },
          ]}
          onPress={() => setShowAddFriendsModal(true)}
        >
          <MaterialIcons
            name="person-add"
            size={20}
            color={themeMode === "light" ? theme.accentText : theme.bg}
          />
          <Text
            style={[
              styles.addFriendsText,
              { color: themeMode === "light" ? theme.accentText : theme.bg },
            ]}
          >
            Add Friends
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feed List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.text} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading your feed...
          </Text>
        </View>
      ) : (
        <FlatList
          data={feedData}
          renderItem={renderPost}
          keyExtractor={(item) => item.post.id}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.text}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="people-outline"
                size={64}
                color={theme.textSecondary}
              />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                No posts yet
              </Text>
              <Text
                style={[styles.emptySubtext, { color: theme.textSecondary }]}
              >
                Add friends to see their travel recommendations
              </Text>
            </View>
          }
        />
      )}

      {/* Add Friends Modal */}
      <AddFriendsModal
        visible={showAddFriendsModal}
        onClose={() => {
          setShowAddFriendsModal(false);
          // Refresh feed when modal closes in case friends were added
          loadFeed();
        }}
      />

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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  addFriendsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  addFriendsText: {
    fontSize: 14,
    fontWeight: "600",
  },
  feedContent: {
    paddingVertical: 8,
  },
  postCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  userTextContainer: {
    flexDirection: "column",
    flex: 1,
  },
  pinnedText: {
    fontSize: 15,
    lineHeight: 20,
  },
  username: {
    fontWeight: "600",
  },
  justPinned: {
    fontWeight: "400",
  },
  locationName: {
    fontWeight: "600",
  },
  timeAgo: {
    fontSize: 12,
    marginTop: 2,
  },
  imageCarousel: {
    marginBottom: 12,
    marginHorizontal: -16,
  },
  imageCarouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  postImage: {
    width: width - 80,
    height: (width - 80) * 0.75,
    resizeMode: "cover",
    borderRadius: 16,
  },
  notes: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default Feed;
