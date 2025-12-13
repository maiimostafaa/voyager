import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../themes/themeMode';
import { palette } from '../themes/palette';
import { useAuth } from '../contexts/AuthContext';
import { getFriends } from '../../lib/supabase/friends';
import { Profile } from '../../lib/types/database.types';

interface MyFriendsProps {
  visible: boolean;
  onClose: () => void;
}

const MyFriends: React.FC<MyFriendsProps> = ({ visible, onClose }) => {
  const { theme, themeMode } = useTheme();
  const { user } = useAuth();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible && user?.id) {
      fetchFriends();
    }
  }, [visible, user?.id]);

  useEffect(() => {
    filterFriends();
  }, [searchQuery, friends]);

  const fetchFriends = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setRefreshing(true);
    try {
      const userFriends = await getFriends(user.id);
      setFriends(userFriends);
      setFilteredFriends(userFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriends([]);
      setFilteredFriends([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterFriends = () => {
    let filtered = [...friends];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (friend) =>
          friend.username.toLowerCase().includes(query) ||
          (friend.full_name && friend.full_name.toLowerCase().includes(query))
      );
    }

    setFilteredFriends(filtered);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.backButton, { backgroundColor: theme.hover }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              My Friends
            </Text>
          </View>
          <TouchableOpacity
            onPress={fetchFriends}
            style={[styles.refreshButton, { backgroundColor: theme.hover }]}
            activeOpacity={0.7}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <MaterialIcons name="refresh" size={24} color={theme.text} />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              {
                backgroundColor: themeMode === 'dark' ? theme.border : theme.accent,
                borderColor: theme.border,
              },
            ]}
          >
            <MaterialIcons
              name="search"
              size={20}
              color={theme.text}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search friends..."
              placeholderTextColor={theme.text}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <MaterialIcons
                  name="close"
                  size={18}
                  color={theme.text}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Friends Count */}
        <View style={styles.countContainer}>
          <Text style={[styles.countText, { color: theme.text }]}>
            {filteredFriends.length} {filteredFriends.length === 1 ? 'Friend' : 'Friends'}
          </Text>
        </View>

        {/* Friends List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.text} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Loading your friends...
            </Text>
          </View>
        ) : filteredFriends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="people-outline"
              size={64}
              color={theme.text}
              style={{ opacity: 0.5 }}
            />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {searchQuery
                ? 'No friends match your search'
                : 'No friends yet'}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.text }]}>
              {searchQuery
                ? 'Try adjusting your search'
                : 'Start connecting with other travelers!'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredFriends.map((friend) => (
              <View
                key={friend.id}
                style={[
                  styles.friendCard,
                  {
                    backgroundColor:
                      themeMode === 'dark' ? theme.border : theme.accent,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.friendContent}>
                  {/* Avatar */}
                  <View
                    style={[
                      styles.avatarContainer,
                      {
                        borderColor:
                          themeMode === 'dark'
                            ? palette.lightBlueHover
                            : palette.lightBlueAccent,
                      },
                    ]}
                  >
                    {friend.avatar_url ? (
                      <Image
                        source={{ uri: friend.avatar_url }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.avatarPlaceholder,
                          {
                            backgroundColor:
                              themeMode === 'dark'
                                ? palette.lightBlueHover
                                : palette.lightBlueAccent,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name="person"
                          size={32}
                          color={
                            themeMode === 'dark'
                              ? palette.lightBlueText
                              : palette.lightBlueText
                          }
                        />
                      </View>
                    )}
                  </View>

                  {/* Friend Info */}
                  <View style={styles.friendInfo}>
                    <Text
                      style={[styles.friendUsername, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      @{friend.username}
                    </Text>
                    {friend.full_name && (
                      <Text
                        style={[styles.friendFullName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {friend.full_name}
                      </Text>
                    )}
                    {friend.bio && (
                      <Text
                        style={[styles.friendBio, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {friend.bio}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  countContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  friendCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  friendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendInfo: {
    flex: 1,
  },
  friendUsername: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  friendFullName: {
    fontSize: 14,
    marginBottom: 4,
  },
  friendBio: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});

export default MyFriends;
