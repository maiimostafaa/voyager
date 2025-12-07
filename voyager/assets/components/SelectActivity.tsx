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
}

const SelectActivity: React.FC<SelectActivityProps> = ({
  location,
  onSelect,
  onClose,
  selectedPostId,
}) => {
  const { theme, themeMode } = useTheme();
  const [posts, setPosts] = useState<PostWithTags[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [searchQuery, selectedTags, posts]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const allPosts = await getPostsWithTags();
      // Filter posts by location (case-insensitive partial match)
      const locationLower = location.toLowerCase().trim();
      const locationPosts = allPosts.filter((post) => {
        const postLocation = post.location_name.toLowerCase().trim();
        // Check if location matches (either exact match or contains the trip location)
        return (
          postLocation === locationLower ||
          postLocation.includes(locationLower) ||
          locationLower.includes(postLocation)
        );
      });
      setPosts(locationPosts);
      setFilteredPosts(locationPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
      setFilteredPosts([]);
    } finally {
      setLoading(false);
    }
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
        <View style={styles.headerSpacer} />
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
