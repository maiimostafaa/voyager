import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../themes/themeMode';
import { useAuth } from '../contexts/AuthContext';
import { getTripPlans } from '../../lib/supabase/trips';
import { TripPlan as TripPlanType } from '../../lib/types/database.types';
import NewTrip from './NewTrip';

const TripPlan: React.FC = () => {
  const { theme, themeMode } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [tripPlans, setTripPlans] = useState<TripPlanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTrip, setShowNewTrip] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTripPlans();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchTripPlans = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const trips = await getTripPlans(user.id);
      setTripPlans(trips || []);
    } catch (error) {
      console.error('Error fetching trip plans:', error);
      setTripPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleTripPress = (trip: TripPlanType) => {
    // TODO: Navigate to trip detail view
    console.log('Trip pressed:', trip);
  };

  const handleNewTripClose = () => {
    setShowNewTrip(false);
    // Refresh trip plans when modal closes
    if (user?.id) {
      fetchTripPlans();
    }
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.bg }]}>
        <MaterialIcons name="lock" size={64} color={theme.textSecondary} />
        <Text style={[styles.loginMessage, { color: theme.textSecondary }]}>
          Log in to access trip planning
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          tripPlans.length === 0 && styles.scrollContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {tripPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="luggage" size={64} color={theme.text} />
            <Text style={[styles.emptyStateText, { color: theme.text }]}>
              No trip plans yet
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.text }]}>
              Tap the + button to create your first trip plan
            </Text>
          </View>
        ) : (
          <View style={styles.tripsContainer}>
            {tripPlans.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={[
                  styles.tripCard,
                  {
                    backgroundColor: themeMode === 'dark' ? theme.border : theme.accent,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => handleTripPress(trip)}
                activeOpacity={0.7}
              >
                <View style={styles.tripCardHeader}>
                  <MaterialIcons name="luggage" size={24} color={theme.text} />
                  <Text style={[styles.tripTitle, { color: theme.text }]} numberOfLines={1}>
                    {trip.title}
                  </Text>
                </View>
                <View style={styles.tripCardDates}>
                  <MaterialIcons name="calendar-today" size={16} color={theme.textSecondary} />
                  <Text style={[styles.tripDate, { color: theme.textSecondary }]}>
                    {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[
          styles.fabButton,
          {
            backgroundColor: themeMode === 'dark' ? theme.border : theme.accent,
          },
          theme.shadows,
        ]}
        onPress={() => setShowNewTrip(true)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color={themeMode === 'dark' ? theme.text : theme.accentText} />
      </TouchableOpacity>

      {/* New Trip Modal */}
      <Modal
        visible={showNewTrip}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleNewTripClose}
      >
        <NewTrip onClose={handleNewTripClose} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for FAB button
  },
  scrollContentEmpty: {
    flexGrow: 1,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    minHeight: 400,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  tripsContainer: {
    gap: 16,
  },
  tripCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
  },
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  tripCardDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    zIndex: 100,
  },
  loginMessage: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
});

export default TripPlan;
