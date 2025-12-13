import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../themes/themeMode';
import { palette } from '../themes/palette';
import { getLocationsTraveled } from '../../lib/supabase/locations';
import { getPosts, getPostsWithTags, getPostImages, PostWithTags } from '../../lib/supabase/posts';
import { getFriends } from '../../lib/supabase/friends';
import { supabase } from '../../lib/supabase';
import { LocationTraveled, Profile } from '../../lib/types/database.types';

const { width } = Dimensions.get("window");

interface UserProfileViewProps {
  visible: boolean;
  userId: string;
  username: string;
  onClose: () => void;
}

const UserProfileView: React.FC<UserProfileViewProps> = ({
  visible,
  userId,
  username,
  onClose,
}) => {
  const { theme, themeMode } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [locations, setLocations] = useState<LocationTraveled[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [postsCount, setPostsCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [tripsCount, setTripsCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<Array<{ post: PostWithTags; images: string[] }>>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (visible && userId) {
      loadUserProfile();
      loadLocations();
      loadStats();
      loadUserPosts();
    }
  }, [visible, userId]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    setLoadingLocations(true);
    const data = await getLocationsTraveled(userId);
    setLocations(data);
    setLoadingLocations(false);
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const [postsData, friendsData, tripsData] = await Promise.all([
        getPosts(userId),
        getFriends(userId),
        supabase.from('trip_plans').select('id').eq('user_id', userId),
      ]);
      setPostsCount(postsData.length);
      setFriendsCount(friendsData.length);
      setTripsCount(tripsData.data?.length || 0);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadUserPosts = async () => {
    setLoadingPosts(true);
    try {
      const postsWithTags = await getPostsWithTags(userId);
      
      // Fetch images for each post
      const postsWithImages = await Promise.all(
        postsWithTags.map(async (post) => {
          const images = await getPostImages(post.id);
          return {
            post,
            images: images.map((img) => img.image_url),
          };
        })
      );
      
      setUserPosts(postsWithImages);
    } catch (error) {
      console.error('Error loading user posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return date.toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header with Close Button */}
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.text} />
          </View>
        ) : profile ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Profile Header */}
            <View style={styles.header}>
              <View style={[styles.avatarContainer, { borderColor: theme.border }]}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      {
                        backgroundColor:
                          themeMode === 'light' ? palette.darkBlue : theme.text,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="person"
                      size={48}
                      color={themeMode === 'light' ? palette.darkBlueText : theme.bg}
                    />
                  </View>
                )}
              </View>

              <Text style={[styles.username, { color: theme.text, fontFamily: theme.fonts.bold }]}>
                {profile.username}
              </Text>
              {profile.full_name && (
                <Text style={[styles.fullName, { color: theme.text }]}>
                  {profile.full_name}
                </Text>
              )}
            </View>

            {/* Stats Card */}
            <View
              style={[
                styles.statsCard,
                {
                  backgroundColor: '#FFFFFF',
                },
              ]}
            >
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#1f2937', fontFamily: theme.fonts.bold }]}>
                  {loadingStats ? '-' : postsCount}
                </Text>
                <Text style={[styles.statLabel, { color: '#1f2937' }]}>
                  Posts
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: '#e5e7eb' }]} />

              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#1f2937', fontFamily: theme.fonts.bold }]}>
                  {loadingStats ? '-' : friendsCount}
                </Text>
                <Text style={[styles.statLabel, { color: '#1f2937' }]}>
                  Friends
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: '#e5e7eb' }]} />

              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#1f2937', fontFamily: theme.fonts.bold }]}>
                  {loadingStats ? '-' : tripsCount}
                </Text>
                <Text style={[styles.statLabel, { color: '#1f2937' }]}>
                  Trips
                </Text>
              </View>
            </View>

            {/* Bio Section */}
            {profile.bio && (
              <View
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: '#FFFFFF',
                  },
                ]}
              >
                <View style={styles.infoHeader}>
                  <MaterialIcons name="info-outline" size={20} color="#1f2937" />
                  <Text style={[styles.infoTitle, { color: '#1f2937', fontFamily: theme.fonts.bold }]}>
                    About Me
                  </Text>
                </View>
                <Text style={[styles.infoValue, { color: '#1f2937' }]}>
                  {profile.bio}
                </Text>
              </View>
            )}

            {/* User Posts Section */}
            {loadingPosts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.text} />
              </View>
            ) : userPosts.length > 0 ? (
              <View style={styles.postsSection}>
                <View style={styles.infoHeader}>
                  <MaterialIcons name="article" size={20} color={theme.text} />
                  <Text style={[styles.infoTitle, { color: theme.text, fontFamily: theme.fonts.bold }]}>
                    Posts
                  </Text>
                </View>
                {userPosts.map((item) => (
                  <View
                    key={item.post.id}
                    style={[
                      styles.postCard,
                      {
                        backgroundColor: '#FFFFFF',
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    {/* Post Header */}
                    <View style={styles.postHeader}>
                      <Text style={[styles.postLocationName, { color: '#1f2937' }]}>
                        {item.post.location_name}
                      </Text>
                      <Text style={[styles.timeAgo, { color: '#6b7280' }]}>
                        {formatTimeAgo(item.post.created_at)}
                      </Text>
                    </View>

                    {/* Images */}
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
                      <Text style={[styles.notes, { color: '#1f2937' }]}>
                        {item.post.notes}
                      </Text>
                    )}

                    {/* Tags */}
                    {item.post.tags.length > 0 && (
                      <View style={styles.tagsContainer}>
                        {item.post.tags.map((tag) => (
                          <View
                            key={tag.tag_name}
                            style={[styles.tagChip, { backgroundColor: theme.hover }]}
                          >
                            <Text style={[styles.tagText, { color: theme.text }]}>
                              {tag.tag_name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: themeMode === 'dark' ? theme.border : theme.accent,
                  },
                ]}
              >
                <MaterialIcons name="flight-takeoff" size={48} color={theme.text} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: theme.fonts.bold }]}>
                  No adventures yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.text }]}>
                  They haven't started exploring yet!
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color={theme.text} />
            <Text style={[styles.errorText, { color: theme.text }]}>
              Unable to load profile
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    marginBottom: 16,
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
  username: {
    fontSize: 24,
    marginBottom: 4,
  },
  fullName: {
    fontSize: 16,
    marginBottom: 16,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  statDivider: {
    width: 1,
    height: 40,
    opacity: 0.3,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  locationDate: {
    fontSize: 12,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
  },
  postsSection: {
    marginBottom: 16,
  },
  postCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postLocationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 12,
  },
  imageCarousel: {
    marginBottom: 12,
  },
  imageCarouselContent: {
    gap: 12,
  },
  imageContainer: {
    width: width - 96,
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  notes: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default UserProfileView;

