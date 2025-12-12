import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../themes/themeMode";
import { Post, PostTag } from "../../lib/types/database.types";

const { width } = Dimensions.get("window");

interface LocationCorkboardProps {
  locationName: string;
  posts: Array<{
    post: Post;
    tags: PostTag[];
    username: string;
    avatar_url: string | null;
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

  const getStickyNoteColor = (index: number) => {
    return STICKY_NOTE_COLORS[index % STICKY_NOTE_COLORS.length];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
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
      </View>

      {/* Subheader */}
      <View style={styles.subheader}>
        <Text style={[styles.subheaderText, { color: theme.textSecondary }]}>
          {posts.length} {posts.length === 1 ? "recommendation" : "recommendations"} from friends
        </Text>
      </View>

      {/* Corkboard */}
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
                <View style={styles.userInfo}>
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
                </View>
                <Text style={styles.noteDate}>
                  {new Date(item.post.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>

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
            </View>
          );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
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
  subheader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  subheaderText: {
    fontSize: 14,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  corkboard: {
    padding: 20,
    paddingTop: 10,
  },
  stickyNote: {
    width: width - 60,
    minHeight: 180,
    padding: 16,
    paddingTop: 20,
    borderRadius: 4,
    marginBottom: 20,
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
});

export default LocationCorkboard;

