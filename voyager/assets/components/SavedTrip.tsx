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
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../themes/themeMode';
import { palette } from '../themes/palette';
import { useAuth } from '../contexts/AuthContext';
import { getTripPlanWithDays, updateTripPlan, updateTripDay, deleteTripPlan, addTripDay, deleteTripDay } from '../../lib/supabase/trips';
import { TripPlan, TripPlanDay } from '../../lib/types/database.types';
import { getPostWithDetails, PostWithTags } from '../../lib/supabase/posts';
import { Post } from '../../lib/types/database.types';
import { getWeatherForecast, ForecastData, getWeatherIconName, geocodeLocation } from '../../lib/weather';
import SelectActivity from './SelectActivity';

interface SavedTripProps {
  tripPlanId: string;
  onClose: () => void;
  onTripUpdated?: () => void;
}

interface DayWithPost extends TripPlanDay {
  post?: Post;
}

const SavedTrip: React.FC<SavedTripProps> = ({ tripPlanId, onClose, onTripUpdated }) => {
  const { theme, themeMode } = useTheme();
  const { user } = useAuth();
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [days, setDays] = useState<DayWithPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<Map<string, ForecastData>>(new Map());
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  const [showSelectActivity, setShowSelectActivity] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedDayOrder, setSelectedDayOrder] = useState<number | null>(null);
  const [activityRefreshKey, setActivityRefreshKey] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch trip plan and days
  useEffect(() => {
    fetchTripData();
  }, [tripPlanId]);

  // Fetch weather when trip plan is loaded or updated
  useEffect(() => {
    if (tripPlan && tripPlan.start_date && tripPlan.end_date) {
      fetchWeather();
    }
  }, [tripPlan?.id, tripPlan?.start_date, tripPlan?.end_date, tripPlan?.title]);

  const fetchTripData = async () => {
    setLoading(true);
    try {
      const result = await getTripPlanWithDays(tripPlanId);
      if (!result) {
        console.error('Trip plan not found');
        setLoading(false);
        return;
      }

      setTripPlan(result.tripPlan);

      // Fetch posts for days that have post_id
      const daysWithPosts = await Promise.all(
        result.days.map(async (day) => {
          if (day.post_id) {
            const postData = await getPostWithDetails(day.post_id);
            return {
              ...day,
              post: postData?.post,
            };
          }
          return { ...day };
        })
      );

      setDays(daysWithPosts);
      
      // Initialize edit fields
      setEditTitle(result.tripPlan.title);
      setEditStartDate(result.tripPlan.start_date);
      setEditEndDate(result.tripPlan.end_date);
    } catch (error) {
      console.error('Error fetching trip data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    if (!tripPlan) return;

    setLoadingWeather(true);
    try {
      // Geocode location (trip title is the location)
      const coords = await geocodeLocation(tripPlan.title);
      if (!coords) {
        setWeatherData(new Map());
        setLocationCoords(null);
        setLoadingWeather(false);
        return;
      }

      setLocationCoords(coords);

      // Fetch weather forecast
      const forecast = await getWeatherForecast(
        coords.lat,
        coords.lon,
        tripPlan.start_date,
        tripPlan.end_date
      );
      setWeatherData(forecast);
    } catch (error) {
      console.error('Error fetching weather:', error);
      setWeatherData(new Map());
    } finally {
      setLoadingWeather(false);
    }
  };

  // Parse date string (YYYY-MM-DD) to Date object in local timezone
  const parseDateString = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = parseDateString(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDayDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = parseDateString(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getWeatherForDay = (dateString: string): ForecastData | null => {
    if (!dateString) return null;
    
    // Ensure date is in YYYY-MM-DD format
    // Database dates should already be in this format, but normalize to be safe
    let normalizedDate: string;
    
    // If dateString is already in YYYY-MM-DD format, use it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      normalizedDate = dateString;
    } else {
      // Parse and reformat the date
      const date = parseDateString(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return null;
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      normalizedDate = `${year}-${month}-${day}`;
    }
    
    // Try exact match first
    let weather = weatherData.get(normalizedDate);
    if (weather) {
      return weather;
    }
    
    return null;
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = parseDateString(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleDelete = async () => {
    if (!user?.id || !tripPlan) return;

    setDeleting(true);
    try {
      const success = await deleteTripPlan(tripPlanId, user.id);
      if (success) {
        // Notify parent component to refresh trip list
        if (onTripUpdated) {
          onTripUpdated();
        }
        // Close the modal
        onClose();
      } else {
        console.error('Failed to delete trip plan');
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Error deleting trip:', error);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    if (tripPlan) {
      setEditTitle(tripPlan.title);
      setEditStartDate(tripPlan.start_date);
      setEditEndDate(tripPlan.end_date);
    }
    setIsEditMode(false);
    setShowDatePicker(false);
    setDatePickerMode(null);
  };

  const openDatePicker = (mode: 'start' | 'end') => {
    if (mode === 'start' && editStartDate) {
      setSelectedDate(parseDateString(editStartDate));
    } else if (mode === 'end' && editEndDate) {
      setSelectedDate(parseDateString(editEndDate));
    } else {
      setSelectedDate(new Date());
    }
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && date) {
        const dateString = formatDateForInput(date);
        if (datePickerMode === 'start') {
          setEditStartDate(dateString);
        } else if (datePickerMode === 'end') {
          setEditEndDate(dateString);
        }
      }
      setDatePickerMode(null);
    } else {
      if (date) {
        setSelectedDate(date);
      }
    }
  };

  const confirmDate = () => {
    const dateString = formatDateForInput(selectedDate);
    if (datePickerMode === 'start') {
      setEditStartDate(dateString);
    } else if (datePickerMode === 'end') {
      setEditEndDate(dateString);
    }
    setShowDatePicker(false);
    setDatePickerMode(null);
  };

  const cancelDatePicker = () => {
    setShowDatePicker(false);
    setDatePickerMode(null);
  };

  const handleSave = async () => {
    if (!user?.id || !tripPlan) return;

    if (!editTitle.trim() || !editStartDate || !editEndDate) {
      console.error('Missing required fields');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateTripPlan(tripPlanId, user.id, {
        title: editTitle.trim(),
        start_date: editStartDate,
        end_date: editEndDate,
      });

      if (updated) {
        setTripPlan(updated);
        setIsEditMode(false);
        // Refresh data to update days if dates changed
        await fetchTripData();
        // Refetch weather with new dates
        if (updated.start_date && updated.end_date) {
          await fetchWeather();
        }
        // Notify parent component to refresh trip list
        if (onTripUpdated) {
          onTripUpdated();
        }
      } else {
        console.error('Failed to update trip plan');
      }
    } catch (error) {
      console.error('Error saving trip:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.text} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading trip...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tripPlan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.previousButton, { backgroundColor: theme.hover }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Trip Not Found</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>
            Trip plan not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header with Previous Button */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={isEditMode ? handleCancel : onClose}
          style={[styles.previousButton, { backgroundColor: theme.hover }]}
          activeOpacity={0.7}
        >
          <MaterialIcons name={isEditMode ? "close" : "arrow-back"} size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {isEditMode ? 'Edit Trip' : tripPlan.title}
          </Text>
        </View>
        {!isEditMode ? (
          <TouchableOpacity
            onPress={handleEdit}
            style={[styles.editButton, { backgroundColor: theme.hover }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={24} color={theme.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: themeMode === 'dark' ? palette.lightBlueHover : theme.border }]}
            activeOpacity={0.7}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={themeMode === 'dark' ? palette.lightBlueText : theme.text} />
            ) : (
              <MaterialIcons 
                name="check" 
                size={24} 
                color={themeMode === 'dark' ? palette.lightBlueText : theme.text} 
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trip Info Section */}
        <View
          style={[
            styles.infoSection,
            {
              backgroundColor: themeMode === 'dark' ? theme.border : theme.accent,
              borderColor: theme.border,
            },
          ]}
        >
          {isEditMode ? (
            <>
              <View style={styles.editRow}>
                <MaterialIcons name="location-on" size={20} color={theme.text} />
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      color: themeMode === 'light' ? palette.darkBlueText : theme.bg,
                      backgroundColor: themeMode === 'light' ? palette.darkBlue : theme.text,
                    },
                  ]}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Location"
                  placeholderTextColor={themeMode === 'light' ? palette.darkBlueText : theme.bg}
                />
              </View>
              <View style={styles.editRow}>
                <MaterialIcons name="calendar-today" size={20} color={theme.text} />
                <TouchableOpacity
                  style={[
                    styles.dateInputWrapper,
                    {
                      borderColor: theme.border,
                      backgroundColor: themeMode === 'light' ? palette.darkBlue : theme.text,
                    },
                  ]}
                  onPress={() => openDatePicker('start')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dateInputText,
                      { color: themeMode === 'light' ? palette.darkBlueText : theme.bg },
                    ]}
                  >
                    {editStartDate ? formatDateForDisplay(editStartDate) : 'Select start date'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.editRow}>
                <MaterialIcons name="calendar-today" size={20} color={theme.text} />
                <TouchableOpacity
                  style={[
                    styles.dateInputWrapper,
                    {
                      borderColor: theme.border,
                      backgroundColor: themeMode === 'light' ? palette.darkBlue : theme.text,
                    },
                  ]}
                  onPress={() => openDatePicker('end')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dateInputText,
                      { color: themeMode === 'light' ? palette.darkBlueText : theme.bg },
                    ]}
                  >
                    {editEndDate ? formatDateForDisplay(editEndDate) : 'Select end date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <MaterialIcons name="calendar-today" size={20} color={theme.text} />
                <Text style={[styles.infoText, { color: theme.text }]}>
                  {formatDate(tripPlan.start_date)} - {formatDate(tripPlan.end_date)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={20} color={theme.text} />
                <Text style={[styles.infoText, { color: theme.text }]}>{tripPlan.title}</Text>
              </View>
            </>
          )}
        </View>

        {/* Days Sections - Group by order */}
        {(() => {
          // Group days by order
          const daysByOrder = new Map<number, DayWithPost[]>();
          days.forEach((day) => {
            const existing = daysByOrder.get(day.order) || [];
            daysByOrder.set(day.order, [...existing, day]);
          });
          
          // Get unique orders and sort
          const uniqueOrders = Array.from(daysByOrder.keys()).sort((a, b) => a - b);
          
          return uniqueOrders.length > 0 ? (
            <View style={styles.daysContainer}>
              {uniqueOrders.map((order) => {
                const dayGroup = daysByOrder.get(order)!;
                const firstDay = dayGroup[0]; // Use first day for date/weather display
                const activities = dayGroup.filter(d => d.post); // Activities with posts
                
                return (
                  <View key={`day-${order}`} style={styles.daySection}>
                    <View style={styles.dayHeader}>
                      <Text style={[styles.dayTitle, { color: theme.text }]}>
                        Day {order}
                      </Text>
                      <View style={styles.dayDateContainer}>
                        <Text style={[styles.dayDate, { color: theme.text }]}>
                          {formatDayDate(firstDay.date)}
                        </Text>
                        {(() => {
                          if (!tripPlan.title) return null;
                          
                          const weather = getWeatherForDay(firstDay.date);
                          if (loadingWeather) {
                            return (
                              <ActivityIndicator
                                size="small"
                                color={theme.textSecondary}
                                style={styles.weatherIcon}
                              />
                            );
                          }
                          if (weather) {
                            return (
                              <View style={styles.weatherContainer}>
                                <MaterialIcons
                                  name={getWeatherIconName(weather.main, weather.description) as any}
                                  size={24}
                                  color={theme.text}
                                  style={styles.weatherIcon}
                                />
                              </View>
                            );
                          }
                          return null;
                        })()}
                      </View>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.dayScrollContent}
                      style={styles.dayScrollView}
                    >
                      {/* Always show plus button on the left */}
                      <TouchableOpacity
                        style={[
                          styles.circularAddButton,
                          {
                            backgroundColor: themeMode === 'dark' ? theme.border : theme.accent,
                            borderColor: themeMode === 'dark' ? theme.text : theme.border,
                            borderStyle: 'dashed',
                          },
                        ]}
                        onPress={() => {
                          setSelectedDayOrder(order);
                          setSelectedDayId(null); // New activity, not editing existing
                          setActivityRefreshKey(Date.now());
                          setShowSelectActivity(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="add" size={28} color={theme.text} />
                      </TouchableOpacity>
                      
                      {/* Show all activities for this day */}
                      {activities.map((day) => (
                        <View key={day.id} style={styles.activityCardContainer}>
                          <TouchableOpacity
                            style={[
                              styles.activityCard,
                              {
                                backgroundColor: themeMode === 'dark' ? theme.bg : theme.accent,
                                borderColor: theme.border,
                              },
                            ]}
                            onPress={() => {
                              setSelectedDayId(day.id);
                              setSelectedDayOrder(order);
                              setActivityRefreshKey(Date.now());
                              setShowSelectActivity(true);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.activityCardHeader}>
                              <MaterialIcons name="place" size={20} color={theme.text} />
                              <Text
                                style={[styles.activityLocation, { color: theme.text }]}
                                numberOfLines={1}
                              >
                                {day.post?.location_name}
                              </Text>
                            </View>
                            {day.post?.notes && (
                              <Text
                                style={[styles.activityNotes, { color: theme.textSecondary }]}
                                numberOfLines={2}
                              >
                                {day.post.notes}
                              </Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.deleteActivityButton,
                              { backgroundColor: theme.hover },
                            ]}
                            onPress={async () => {
                              const success = await deleteTripDay(day.id);
                              if (success) {
                                await fetchTripData();
                                if (onTripUpdated) {
                                  onTripUpdated();
                                }
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="delete" size={16} color={theme.text} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                );
              })}
            </View>
          ) : null;
        })()}

        {/* Delete Trip Button - Only show when not in edit mode and there are days */}
        {!isEditMode && days.length > 0 && (
          <View style={styles.deleteTripContainer}>
            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(true)}
              style={[styles.deleteTripButton, { backgroundColor: theme.hover }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.deleteTripButtonText, { color: theme.text }]}>
                Delete Trip
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {days.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="event" size={48} color={theme.text} />
            <Text style={[styles.emptyStateText, { color: theme.text }]}>
              No days added to this trip yet
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={cancelDatePicker}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: themeMode === 'dark' ? theme.border : theme.accent,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  {
                    borderBottomColor:
                      themeMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  },
                ]}
              >
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Select {datePickerMode === 'start' ? 'Start' : 'End'} Date
                </Text>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={datePickerMode === 'end' && editStartDate ? parseDateString(editStartDate) : undefined}
                style={styles.datePicker}
                textColor={theme.text}
                themeVariant={themeMode === 'dark' ? 'dark' : 'light'}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.hover }]}
                  onPress={cancelDatePicker}
                >
                  <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.confirmButton,
                    { backgroundColor: themeMode === 'dark' ? palette.lightBlueHover : theme.border },
                  ]}
                  onPress={confirmDate}
                >
                  <Text
                    style={[
                      styles.modalButtonText,
                      { color: themeMode === 'dark' ? palette.lightBlueText : theme.text },
                    ]}
                  >
                    Confirm
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Android Date Picker */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={datePickerMode === 'end' && editStartDate ? parseDateString(editStartDate) : undefined}
          themeVariant={themeMode === 'dark' ? 'dark' : 'light'}
        />
      )}

      {/* Select Activity Modal */}
      {showSelectActivity && tripPlan && (
        <Modal
          visible={showSelectActivity}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowSelectActivity(false);
            setSelectedDayId(null);
            setSelectedDayOrder(null);
          }}
        >
          {selectedDayOrder !== null ? (
            <SelectActivity
              location={tripPlan.title}
              refreshKey={activityRefreshKey}
              onSelect={async (post: PostWithTags) => {
                if (user?.id && tripPlan && selectedDayOrder !== null) {
                  if (selectedDayId) {
                    // Editing existing activity - update it
                    const updated = await updateTripDay(selectedDayId, {
                      post_id: post.id,
                    });
                    if (updated) {
                      await fetchTripData();
                      if (onTripUpdated) {
                        onTripUpdated();
                      }
                    }
                  } else {
                    // Adding new activity - create new trip day entry
                    // Find a day with this order to get the date, or calculate from trip dates
                    let dayDate: string;
                    let dayOrder: number = selectedDayOrder;
                    
                    const dayWithOrder = days.find(d => d.order === selectedDayOrder);
                    if (dayWithOrder) {
                      dayDate = dayWithOrder.date;
                    } else {
                      // Calculate date from trip start date and order
                      if (tripPlan.start_date) {
                        const start = parseDateString(tripPlan.start_date);
                        const currentDate = new Date(start);
                        currentDate.setDate(start.getDate() + selectedDayOrder - 1);
                        dayDate = formatDateForInput(currentDate);
                      } else {
                        // Fallback to today if no start date
                        dayDate = formatDateForInput(new Date());
                      }
                    }
                    
                    const newDay = await addTripDay(tripPlan.id, {
                      date: dayDate,
                      order: dayOrder,
                      post_id: post.id,
                    });
                    if (newDay) {
                      await fetchTripData();
                      if (onTripUpdated) {
                        onTripUpdated();
                      }
                    }
                  }
                }
                setShowSelectActivity(false);
                setSelectedDayId(null);
                setSelectedDayOrder(null);
              }}
              onClose={() => {
                setShowSelectActivity(false);
                setSelectedDayId(null);
                setSelectedDayOrder(null);
              }}
              selectedPostId={selectedDayId ? days.find((d) => d.id === selectedDayId)?.post_id || null : null}
            />
          ) : (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <MaterialIcons name="error-outline" size={48} color={theme.textSecondary} />
              <Text style={{ color: theme.text, marginTop: 16, textAlign: 'center' }}>
                Unable to add activity. Please try again.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSelectActivity(false);
                  setSelectedDayId(null);
                  setSelectedDayOrder(null);
                }}
                style={{ marginTop: 20, padding: 12, backgroundColor: theme.hover, borderRadius: 8 }}
              >
                <Text style={{ color: theme.text }}>Close</Text>
              </TouchableOpacity>
            </SafeAreaView>
          )}
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View
            style={[
              styles.deleteModalContent,
              {
                backgroundColor: themeMode === 'dark' ? theme.border : theme.accent,
                borderColor: theme.border,
              },
            ]}
          >
            <MaterialIcons
              name="warning"
              size={48}
              color={themeMode === 'dark' ? palette.lightBlueHover : theme.border}
              style={styles.deleteModalIcon}
            />
            <Text style={[styles.deleteModalTitle, { color: theme.text }]}>
              Delete Trip?
            </Text>
            <Text style={[styles.deleteModalText, { color: theme.text }]}>
              Are you sure you want to delete "{tripPlan?.title}"? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelDeleteButton, { backgroundColor: theme.hover }]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                <Text style={[styles.deleteModalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteModalButton,
                  styles.confirmDeleteButton,
                  {
                    backgroundColor: themeMode === 'dark' ? palette.lightBlueHover : theme.border,
                  },
                ]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator
                    size="small"
                    color={themeMode === 'dark' ? palette.lightBlueText : theme.text}
                  />
                ) : (
                  <Text
                    style={[
                      styles.deleteModalButtonText,
                      { color: themeMode === 'dark' ? palette.lightBlueText : theme.text },
                    ]}
                  >
                    Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
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
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  previousButton: {
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    zIndex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  infoSection: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateInputWrapper: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateInputText: {
    fontSize: 16,
    fontWeight: '500',
  },
  daysContainer: {
    paddingHorizontal: 20,
  },
  daySection: {
    marginBottom: 32,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    gap: 12,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dayDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  weatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherIcon: {
    marginRight: 4,
  },
  dayScrollView: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  dayScrollContent: {
    paddingRight: 20,
    alignItems: 'center',
    minHeight: 80,
  },
  circularAddButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  deleteActivityButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  activityCardContainer: {
    position: 'relative',
    marginRight: 16,
  },
  activityCard: {
    width: 200,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
  },
  activityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  activityLocation: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  activityNotes: {
    fontSize: 14,
    lineHeight: 20,
  },
  deleteTripContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  deleteTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  deleteTripButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingBottom: 40,
    ...Platform.select({
      ios: {
        paddingBottom: 40,
      },
      android: {
        paddingBottom: 20,
      },
    }),
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  datePicker: {
    height: 200,
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    opacity: 0.8,
  },
  confirmButton: {
    opacity: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  deleteModalIcon: {
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDeleteButton: {
    opacity: 0.8,
  },
  confirmDeleteButton: {
    opacity: 1,
  },
  deleteModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SavedTrip;
