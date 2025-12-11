import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../themes/themeMode';
import { palette } from '../themes/palette';
import { useAuth } from '../contexts/AuthContext';
import { getLocationsTraveled } from '../../lib/supabase/locations';
import { getPosts } from '../../lib/supabase/posts';
import { getFriends } from '../../lib/supabase/friends';
import { supabase } from '../../lib/supabase';
import { LocationTraveled } from '../../lib/types/database.types';

interface ProfileScreenProps {
  onEditPress?: () => void;
  onSignOut?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onEditPress, onSignOut }) => {
  const { theme, themeMode } = useTheme();
  const { user, profile } = useAuth();
  const [locations, setLocations] = useState<LocationTraveled[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [postsCount, setPostsCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [tripsCount, setTripsCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadLocations();
      loadStats();
    }
  }, [user?.id]);

  const loadLocations = async () => {
    if (!user?.id) return;
    setLoadingLocations(true);
    const data = await getLocationsTraveled(user.id);
    setLocations(data);
    setLoadingLocations(false);
  };

  const loadStats = async () => {
    if (!user?.id) return;
    setLoadingStats(true);
    try {
      const [postsData, friendsData, tripsData] = await Promise.all([
        getPosts(user.id),
        getFriends(user.id),
        supabase.from('trip_plans').select('id').eq('user_id', user.id),
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

  if (!profile || !user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
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

        {(onEditPress || onSignOut) && (
          <View style={styles.buttonContainer}>
            {onEditPress && (
              <TouchableOpacity
                style={[
                  styles.editButton,
                  {
                    backgroundColor: themeMode === 'light' ? palette.darkBlue : theme.text,
                  },
                ]}
                onPress={onEditPress}
              >
                <MaterialIcons
                  name="edit"
                  size={18}
                  color={themeMode === 'light' ? palette.darkBlueText : theme.bg}
                />
                <Text
                  style={[
                    styles.editButtonText,
                    { color: themeMode === 'light' ? palette.darkBlueText : theme.bg },
                  ]}
                >
                  Edit Profile
                </Text>
              </TouchableOpacity>
            )}
            {onSignOut && (
              <TouchableOpacity
                style={[
                  styles.signOutButton,
                  {
                    backgroundColor: themeMode === 'light' ? palette.darkBlue : theme.text,
                  },
                ]}
                onPress={onSignOut}
              >
                <MaterialIcons
                  name="logout"
                  size={18}
                  color={themeMode === 'light' ? palette.darkBlueText : theme.bg}
                />
                <Text
                  style={[
                    styles.signOutButtonText,
                    { color: themeMode === 'light' ? palette.darkBlueText : theme.bg },
                  ]}
                >
                  Sign Out
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Stats Card - Instagram Style */}
      <View
        style={[
          styles.statsCard,
          {
            backgroundColor: themeMode === 'dark' ? theme.border : theme.accent,
          },
        ]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.text, fontFamily: theme.fonts.bold }]}>
            {loadingStats ? '-' : postsCount}
          </Text>
          <Text style={[styles.statLabel, { color: theme.text }]}>
            Posts
          </Text>
        </View>
        
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.text, fontFamily: theme.fonts.bold }]}>
            {loadingStats ? '-' : friendsCount}
          </Text>
          <Text style={[styles.statLabel, { color: theme.text }]}>
            Friends
          </Text>
        </View>
        
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.text, fontFamily: theme.fonts.bold }]}>
            {loadingStats ? '-' : tripsCount}
          </Text>
          <Text style={[styles.statLabel, { color: theme.text }]}>
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
              backgroundColor: themeMode === 'dark' ? theme.border : theme.accent,
            },
          ]}
        >
          <View style={styles.infoHeader}>
            <MaterialIcons name="info-outline" size={20} color={theme.text} />
            <Text style={[styles.infoTitle, { color: theme.text, fontFamily: theme.fonts.bold }]}>
              About Me
            </Text>
          </View>
          <Text style={[styles.infoValue, { color: theme.text }]}>
            {profile.bio}
          </Text>
        </View>
      )}

      {/* Account Info Section */}
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: themeMode === 'dark' ? theme.border : theme.accent,
          },
        ]}
      >
        <View style={styles.infoHeader}>
          <MaterialIcons name="account-circle" size={20} color={theme.text} />
          <Text style={[styles.infoTitle, { color: theme.text, fontFamily: theme.fonts.bold }]}>
            Account Info
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoRowLabel, { color: theme.text }]}>User ID</Text>
          <Text style={[styles.infoRowValue, { color: theme.text }]} numberOfLines={1}>
            {user.id.slice(0, 8)}...{user.id.slice(-4)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoRowLabel, { color: theme.text }]}>Email</Text>
          <Text style={[styles.infoRowValue, { color: theme.text }]} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </View>

      {/* Locations List */}
      {loadingLocations ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.text} />
        </View>
      ) : locations.length > 0 ? (
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: themeMode === 'dark' ? theme.border : theme.accent,
            },
          ]}
        >
          <View style={styles.infoHeader}>
            <MaterialIcons name="explore" size={20} color={theme.text} />
            <Text style={[styles.infoTitle, { color: theme.text, fontFamily: theme.fonts.bold }]}>
              Recent Adventures
            </Text>
          </View>
          {locations.slice(0, 10).map((location, index) => (
            <View
              key={location.id}
              style={[
                styles.locationItem,
                index < Math.min(locations.length, 10) - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <MaterialIcons name="place" size={20} color={theme.text} />
              <View style={styles.locationInfo}>
                <Text style={[styles.locationName, { color: theme.text }]}>
                  {location.location_name}
                </Text>
                {location.visited_at && (
                  <Text style={[styles.locationDate, { color: theme.text }]}>
                    {new Date(location.visited_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
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
            Start exploring and your travels will appear here!
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  signOutButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoRowLabel: {
    fontSize: 14,
  },
  infoRowValue: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
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
});

export default ProfileScreen;
