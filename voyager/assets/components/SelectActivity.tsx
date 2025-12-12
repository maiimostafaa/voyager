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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../themes/themeMode';
import { palette } from '../themes/palette';
import { getPostsWithTags, PostWithTags } from '../../lib/supabase/posts';
import { VALID_TAGS } from '../../lib/types/database.types';

interface SelectActivityProps {
  location: string;
  onSelect: (post: PostWithTags) => void;
  onClose: () => void;
  selectedPostId?: string | null;
  refreshKey?: number; // triggers refetch when modal opens
}

const SelectActivity: React.FC<SelectActivityProps> = ({
  location,
  onSelect,
  onClose,
  selectedPostId,
  refreshKey,
}) => {
  const { theme, themeMode } = useTheme();
  const [posts, setPosts] = useState<PostWithTags[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  // Re-fetch when parent requests refresh (e.g., modal just opened)
  useEffect(() => {
    if (refreshKey !== undefined) {
      fetchPosts();
    }
  }, [refreshKey]);

  useEffect(() => {
    filterPosts();
  }, [searchQuery, selectedTags, posts]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const allPosts = await getPostsWithTags();
      const locationLower = location.toLowerCase().trim();
      
      // First, try simple name matching
      let locationPosts = allPosts.filter((post) => {
        const postLocation = post.location_name.toLowerCase().trim();
        return (
          postLocation === locationLower ||
          postLocation.includes(locationLower) ||
          locationLower.includes(postLocation)
        );
      });

      // If no matches or few matches, also try matching by city using reverse geocoding
      // Get city from trip location using geocoding
      let tripCity: string | null = null;
      let tripCoords: { lat: number; lon: number } | null = null;
      
      try {
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1&addressdetails=1`,
          {
            headers: {
              "User-Agent": "VoyagerApp/1.0",
            },
          }
        );
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.length > 0) {
          if (geocodeData[0].address) {
            tripCity = (geocodeData[0].address.city || 
                       geocodeData[0].address.town || 
                       geocodeData[0].address.village || 
                       '').toLowerCase();
          }
          tripCoords = {
            lat: parseFloat(geocodeData[0].lat),
            lon: parseFloat(geocodeData[0].lon),
          };
        }
      } catch (geocodeError) {
        console.error('Geocoding error:', geocodeError);
      }

      // If we have a city, also include posts in the same city
      if (tripCity) {
        const postsByCity = await Promise.all(
          allPosts.map(async (post) => {
            // Skip if already matched by name
            const postLocation = post.location_name.toLowerCase().trim();
            const nameMatched = (
              postLocation === locationLower ||
              postLocation.includes(locationLower) ||
              locationLower.includes(postLocation)
            );
            
            if (nameMatched) {
              return { post, match: true };
            }

            // Try reverse geocoding to get city
            try {
              const reverseResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${post.latitude}&lon=${post.longitude}&addressdetails=1`,
                {
                  headers: {
                    "User-Agent": "VoyagerApp/1.0",
                  },
                }
              );
              const reverseData = await reverseResponse.json();
              if (reverseData.address) {
                const postCity = (reverseData.address.city || 
                                 reverseData.address.town || 
                                 reverseData.address.village || 
                                 '').toLowerCase();
                return { post, match: postCity === tripCity };
              }
            } catch (err) {
              // If reverse geocode fails, check proximity if we have trip coords
              if (tripCoords) {
                // Calculate distance (rough approximation)
                const latDiff = Math.abs(post.latitude - tripCoords.lat);
                const lonDiff = Math.abs(post.longitude - tripCoords.lon);
                // Within ~50km (roughly 0.5 degrees)
                const isNearby = latDiff < 0.5 && lonDiff < 0.5;
                return { post, match: isNearby };
              }
            }
            return { post, match: false };
          })
        );

        // Combine name-matched and city-matched posts
        const cityMatchedPosts = postsByCity
          .filter(({ match }) => match)
          .map(({ post }) => post);
        
        // Merge and deduplicate
        const allMatched = [...locationPosts, ...cityMatchedPosts];
        const uniquePosts = Array.from(
          new Map(allMatched.map(post => [post.id, post])).values()
        );
        locationPosts = uniquePosts;
      }

      setPosts(locationPosts);
      setFilteredPosts(locationPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
      setFilteredPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const filterPosts = () => {
    let filtered = [...posts];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (post) =>
          post.location_name.toLowerCase().includes(query) ||
          (post.notes && post.notes.toLowerCase().includes(query))
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((post) =>
        post.tags.some((tag) => selectedTags.includes(tag.tag_name))
      );
    }

    setFilteredPosts(filtered);
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeButton, { backgroundColor: theme.hover }]}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Select Activity
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {location}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          style={[styles.refreshButton, { backgroundColor: theme.hover }]}
          activeOpacity={0.7}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <MaterialIcons name="refresh" size={22} color={theme.text} />
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor:
                themeMode === 'dark' ? theme.border : theme.accent,
              borderColor: theme.border,
            },
            theme.shadows,
          ]}
        >
          <MaterialIcons
            name="search"
            size={24}
            color={themeMode === 'light' ? theme.text : theme.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search activities..."
            placeholderTextColor={
              themeMode === 'light' ? theme.text : theme.textSecondary
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={false}
          />
          {searchQuery && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={themeMode === 'light' ? theme.text : theme.textSecondary}
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
                    ? themeMode === 'dark'
                      ? palette.lightBlueHover
                      : palette.lightBlueAccent
                    : theme.bg,
                  borderColor: theme.border,
                },
                theme.shadows,
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  {
                    color: isSelected
                      ? themeMode === 'dark'
                        ? palette.lightBlueText
                        : palette.lightBlue
                      : themeMode === 'light'
                      ? palette.lightBlueText
                      : theme.text,
                  },
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Posts List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : filteredPosts.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="event-busy" size={64} color={theme.text} />
          <Text style={[styles.emptyStateText, { color: theme.text }]}>
            {posts.length === 0
              ? `No activities found in ${location}`
              : 'No activities match your filters'}
          </Text>
          {(searchQuery || selectedTags.length > 0) && (
            <TouchableOpacity
              onPress={clearFilters}
              style={[styles.clearFiltersButton, { backgroundColor: theme.hover }]}
            >
              <Text style={[styles.clearFiltersText, { color: theme.text }]}>
                Clear Filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredPosts.map((post) => {
            const isSelected = selectedPostId === post.id;
            return (
              <TouchableOpacity
                key={post.id}
                style={[
                  styles.postCard,
                  {
                    backgroundColor:
                      themeMode === 'dark' ? theme.border : theme.accent,
                    borderColor: isSelected
                      ? themeMode === 'dark'
                        ? palette.lightBlueHover
                        : theme.border
                      : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                  theme.shadows,
                ]}
                onPress={() => onSelect(post)}
                activeOpacity={0.7}
              >
                <View style={styles.postCardHeader}>
                  <MaterialIcons
                    name="place"
                    size={24}
                    color={theme.text}
                    style={styles.postIcon}
                  />
                  <View style={styles.postCardContent}>
                    <Text
                      style={[styles.postLocation, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {post.location_name}
                    </Text>
                    {post.notes && (
                      <Text
                        style={[
                          styles.postNotes,
                          { color: theme.textSecondary },
                        ]}
                        numberOfLines={2}
                      >
                        {post.notes}
                      </Text>
                    )}
                    {post.tags.length > 0 && (
                      <View style={styles.postTags}>
                        {post.tags.slice(0, 3).map((tag) => (
                          <View
                            key={tag.tag_name}
                            style={[
                              styles.postTagChip,
                              { backgroundColor: theme.hover },
                            ]}
                          >
                            <Text
                              style={[
                                styles.postTagText,
                                { color: theme.text },
                              ]}
                            >
                              {tag.tag_name}
                            </Text>
                          </View>
                        ))}
                        {post.tags.length > 3 && (
                          <Text
                            style={[
                              styles.postTagMore,
                              { color: theme.textSecondary },
                            ]}
                          >
                            +{post.tags.length - 3}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  {isSelected && (
                    <MaterialIcons
                      name="check-circle"
                      size={24}
                      color={
                        themeMode === 'dark'
                          ? palette.lightBlueHover
                          : theme.border
                      }
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    zIndex: 1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    zIndex: 1,
  },
  headerSpacer: {
    width: 48,
    zIndex: 1,
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  tagsContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  tagsContent: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 0,
    paddingBottom: 8,
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    borderWidth: 1,
    elevation: 3,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  clearFiltersButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
  },
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
  },
  postCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  postIcon: {
    marginTop: 2,
  },
  postCardContent: {
    flex: 1,
  },
  postLocation: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  postNotes: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  postTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  postTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  postTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  postTagMore: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default SelectActivity;
