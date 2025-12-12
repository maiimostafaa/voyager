import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../themes/themeMode";
import { useAuth } from "../contexts/AuthContext";
import {
  searchUsers,
  addFriendDirectly,
  removeFriend,
  getFriends,
} from "../../lib/supabase/friends";
import { Profile } from "../../lib/types/database.types";

type UserWithFriendship = Profile & { is_friend: boolean };

interface AddFriendsModalProps {
  visible: boolean;
  onClose: () => void;
}

const AddFriendsModal: React.FC<AddFriendsModalProps> = ({ visible, onClose }) => {
  const { theme, themeMode } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserWithFriendship[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());

  // Load friends list when modal opens
  useEffect(() => {
    if (visible && user?.id) {
      loadFriendsList();
    }
  }, [visible, user?.id]);

  // Search users when query changes
  useEffect(() => {
    if (user?.id && searchQuery.trim()) {
      searchForUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery, user?.id]);

  const loadFriendsList = async () => {
    if (!user?.id) return;
    
    try {
      const friendsData = await getFriends(user.id);
      const friendIdsSet = new Set(friendsData.map((f) => f.id));
      setFriendIds(friendIdsSet);
    } catch (error) {
      console.error("Error loading friends list:", error);
    }
  };

  const searchForUsers = async () => {
    if (!user?.id || !searchQuery.trim()) return;

    setLoading(true);
    try {
      const searchResults = await searchUsers(searchQuery.trim(), user.id);
      
      // Check which users are friends
      const usersWithFriendship = searchResults.map((u) => ({
        ...u,
        is_friend: friendIds.has(u.id),
      }));

      setUsers(usersWithFriendship);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = async (targetUserId: string) => {
    if (!user?.id) return;

    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) return;

    // Optimistically update UI
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUserId ? { ...u, is_friend: !u.is_friend } : u
      )
    );

    try {
      if (targetUser.is_friend) {
        // Remove friend
        const success = await removeFriend(user.id, targetUserId);
        if (success) {
          setFriendIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(targetUserId);
            return newSet;
          });
        } else {
          // Revert on failure
          setUsers((prev) =>
            prev.map((u) =>
              u.id === targetUserId ? { ...u, is_friend: true } : u
            )
          );
        }
      } else {
        // Add friend
        const success = await addFriendDirectly(user.id, targetUserId);
        if (success) {
          setFriendIds((prev) => new Set(prev).add(targetUserId));
        } else {
          // Revert on failure
          setUsers((prev) =>
            prev.map((u) =>
              u.id === targetUserId ? { ...u, is_friend: false } : u
            )
          );
        }
      }
    } catch (error) {
      console.error("Error toggling friend:", error);
      // Revert on error
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? { ...u, is_friend: !targetUser.is_friend }
            : u
        )
      );
    }
  };

  const renderUser = ({ item }: { item: UserWithFriendship }) => (
    <View style={[styles.userCard, { borderBottomColor: theme.border }]}>
      <View style={styles.userInfo}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.hover }]}>
            <MaterialIcons name="person" size={24} color={theme.text} />
          </View>
        )}
        <Text style={[styles.username, { color: theme.text }]}>
          {item.username}
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.addButton,
          {
            backgroundColor: item.is_friend
              ? theme.hover
              : themeMode === "light"
              ? theme.accent
              : theme.text,
          },
        ]}
        onPress={() => toggleFriend(item.id)}
      >
        {item.is_friend ? (
          <>
            <MaterialIcons
              name="check"
              size={18}
              color={theme.text}
            />
            <Text style={[styles.buttonText, { color: theme.text }]}>
              Friends
            </Text>
          </>
        ) : (
          <>
            <MaterialIcons
              name="person-add"
              size={18}
              color={themeMode === "light" ? theme.accentText : theme.bg}
            />
            <Text
              style={[
                styles.buttonText,
                { color: themeMode === "light" ? theme.accentText : theme.bg },
              ]}
            >
              Add Friend
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        setSearchQuery("");
        onClose();
      }}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Add Friends</Text>
          <TouchableOpacity 
            onPress={() => {
              setSearchQuery("");
              onClose();
            }} 
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
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
              size={20}
              color={themeMode === "light" ? "#6b7280" : "#9ca3af"}
              style={styles.searchIcon}
            />
            <TextInput
              style={[
                styles.searchInput,
                { color: themeMode === "light" ? "#1f2937" : "#f3f4f6" },
              ]}
              placeholder="Search for users..."
              placeholderTextColor={themeMode === "light" ? "#9ca3af" : "#6b7280"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={false}
            />
            {searchQuery !== "" && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <MaterialIcons
                  name="close"
                  size={18}
                  color={themeMode === "light" ? "#6b7280" : "#9ca3af"}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Users List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.text} />
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons
                  name="person-search"
                  size={64}
                  color={theme.textSecondary}
                />
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  {searchQuery ? "No users found" : "Search for users"}
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                  {searchQuery
                    ? "Try searching with a different username"
                    : "Start typing to find friends to add"}
                </Text>
              </View>
            }
          />
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
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
});

export default AddFriendsModal;

