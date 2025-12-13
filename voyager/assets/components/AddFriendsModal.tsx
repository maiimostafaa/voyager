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
import { useFetchError } from "../contexts/FetchErrorContext";
import {
  searchUsers,
  addFriendDirectly,
  removeFriend,
  getFriends,
} from "../../lib/supabase/friends";
import { Profile } from "../../lib/types/database.types";
import UserProfileView from "./UserProfileView";

type UserWithFriendship = Profile & { is_friend: boolean };

interface AddFriendsModalProps {
  visible: boolean;
  onClose: () => void;
}

const AddFriendsModal: React.FC<AddFriendsModalProps> = ({ visible, onClose }) => {
  const { theme, themeMode } = useTheme();
  const { user } = useAuth();
  const { handleFetchError } = useFetchError();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserWithFriendship[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [selectedProfile, setSelectedProfile] = useState<UserWithFriendship | null>(null);
  const [profileViewVisible, setProfileViewVisible] = useState(false);

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
      handleFetchError(error, "Unable to load friends list.");
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
      handleFetchError(error, "Unable to search for users.");
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

  const openProfileView = (profile: UserWithFriendship) => {
    setSelectedProfile(profile);
    setProfileViewVisible(true);
  };

  const renderUser = ({ item }: { item: UserWithFriendship }) => (
    <View style={[styles.userCard, { borderBottomColor: theme.border }]}>
      <TouchableOpacity 
        style={styles.userInfo}
        onPress={() => openProfileView(item)}
        activeOpacity={0.7}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.hover }]}>
            <MaterialIcons name="person" size={24} color={theme.text} />
          </View>
        )}
        <View style={styles.userNameContainer}>
          <Text style={[styles.username, { color: theme.text }]}>
            {item.username}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </TouchableOpacity>
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
              placeholder="Search for users..."
              placeholderTextColor={
                themeMode === "light" ? theme.text : theme.textSecondary
              }
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
                  size={20}
                  color={themeMode === "light" ? theme.text : theme.textSecondary}
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
                  {searchQuery ? "No matching profiles found" : "Search for users"}
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                  {searchQuery
                    ? "Try a different name or username"
                    : "Start typing to find friends to add"}
                </Text>
              </View>
            }
          />
        )}

        {/* User Profile View Modal */}
        {selectedProfile && (
          <UserProfileView
            visible={profileViewVisible}
            userId={selectedProfile.id}
            username={selectedProfile.username}
            onClose={() => {
              setProfileViewVisible(false);
              setSelectedProfile(null);
            }}
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
  userNameContainer: {
    flexDirection: "row",
    alignItems: "center",
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

