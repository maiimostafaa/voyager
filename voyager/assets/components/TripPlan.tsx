import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../themes/themeMode';
import { palette } from '../themes/palette';


const TripPlan: React.FC = () => {
  const { theme, themeMode } = useTheme();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Parse date string (YYYY-MM-DD) to Date object in local timezone
  const parseDateString = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Calculate days when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = parseDateString(startDate);
      const end = parseDateString(endDate);
      
      if (end >= start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
        setDays(Array.from({ length: diffDays }, (_, i) => i + 1));
      } else {
        setDays([]);
      }
    } else {
      setDays([]);
    }
  }, [startDate, endDate]);

  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = parseDateString(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDayDate = (dayNumber: number): string => {
    if (!startDate) return '';
    const start = parseDateString(startDate);
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + dayNumber - 1);
    return dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const openDatePicker = (mode: 'start' | 'end') => {
    if (mode === 'start' && startDate) {
      setSelectedDate(parseDateString(startDate));
    } else if (mode === 'end' && endDate) {
      setSelectedDate(parseDateString(endDate));
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
          setStartDate(dateString);
        } else if (datePickerMode === 'end') {
          setEndDate(dateString);
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
      setStartDate(dateString);
    } else if (datePickerMode === 'end') {
      setEndDate(dateString);
    }
    setShowDatePicker(false);
    setDatePickerMode(null);
  };

  const cancelDatePicker = () => {
    setShowDatePicker(false);
    setDatePickerMode(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date & Location Selection Section */}
        <View style={[styles.selectionSection, { 
          backgroundColor: themeMode === 'dark' ? theme.border : theme.accent, 
          borderColor: theme.border 
        }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Plan Your Trip</Text>
          
          {/* Date Selection */}
          <View style={styles.dateRow}>
            <View style={styles.dateInputContainer}>
              <Text style={[styles.dateLabel, { color: theme.text }]}>Start Date</Text>
              <TouchableOpacity
                style={[styles.dateInputWrapper, { 
                  borderColor: theme.border, 
                  backgroundColor: themeMode === 'light' ? palette.darkBlue : theme.text 
                }]}
                onPress={() => openDatePicker('start')}
                activeOpacity={0.7}
              >
                <MaterialIcons name="calendar-today" size={20} color={themeMode === 'light' ? palette.darkBlueText : theme.bg} style={styles.inputIcon} />
                <Text style={[styles.dateInput, { color: themeMode === 'light' ? palette.darkBlueText : theme.bg }]}>
                  {startDate ? formatDateForDisplay(startDate) : 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateSeparator}>
              <MaterialIcons name="arrow-forward" size={24} color={theme.text} />
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={[styles.dateLabel, { color: theme.text }]}>End Date</Text>
              <TouchableOpacity
                style={[styles.dateInputWrapper, { 
                  borderColor: theme.border, 
                  backgroundColor: themeMode === 'light' ? palette.darkBlue : theme.text 
                }]}
                onPress={() => openDatePicker('end')}
                activeOpacity={0.7}
              >
                <MaterialIcons name="calendar-today" size={20} color={themeMode === 'light' ? palette.darkBlueText : theme.bg} style={styles.inputIcon} />
                <Text style={[styles.dateInput, { color: themeMode === 'light' ? palette.darkBlueText : theme.bg }]}>
                  {endDate ? formatDateForDisplay(endDate) : 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Location Input */}
          <View style={styles.locationContainer}>
            <Text style={[styles.dateLabel, { color: theme.text }]}>Location</Text>
            <View style={[styles.locationInputWrapper, { 
              borderColor: theme.border, 
              backgroundColor: themeMode === 'light' ? palette.darkBlue : theme.text 
            }]}>
              <MaterialIcons name="location-on" size={20} color={themeMode === 'light' ? palette.darkBlueText : theme.bg} style={styles.inputIcon} />
              <TextInput
                style={[styles.locationInput, { color: themeMode === 'light' ? palette.darkBlueText : theme.bg }]}
                value={location}
                onChangeText={setLocation}
                placeholder="Where are you going?"
                placeholderTextColor={themeMode === 'light' ? palette.darkBlueText : theme.bg}
              />
            </View>
          </View>
        </View>

        {/* Days Sections */}
        {days.length > 0 && (
          <View style={styles.daysContainer}>
            {days.map((dayNumber) => (
              <View key={dayNumber} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayTitle, { color: theme.text }]}>
                    Day {dayNumber}
                  </Text>
                  <Text style={[styles.dayDate, { color: theme.text }]}>
                    {getDayDate(dayNumber)}
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dayScrollContent}
                  style={styles.dayScrollView}
                >
                  {/* Circular Plus Button */}
                  <TouchableOpacity
                    style={[styles.circularAddButton, { 
                      backgroundColor: themeMode === 'dark' ? theme.border : theme.accent, 
                      borderColor: theme.border 
                    }]}
                    onPress={() => {
                      // Temporary - not functioning yet
                      console.log(`Add activity for Day ${dayNumber}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="add" size={28} color={theme.text} />
                  </TouchableOpacity>

                  {/* Placeholder for future activity cards */}
                  {/* Activity cards will be added here later */}
                </ScrollView>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {days.length === 0 && startDate && endDate && (
          <View style={styles.emptyState}>
            <MaterialIcons name="info-outline" size={48} color={theme.text} />
            <Text style={[styles.emptyStateText, { color: theme.text}]}>
              End date must be after start date
            </Text>
          </View>
        )}

        {!startDate && !endDate && (
          <View style={styles.emptyState}>
            <MaterialIcons name="luggage" size={48} color={theme.text} />
            <Text style={[styles.emptyStateText, { color: theme.text }]}>
              Select your travel dates to start planning
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
            <View style={[styles.modalContent, { 
              backgroundColor: themeMode === 'dark' ? theme.border : theme.accent, 
              borderColor: theme.border 
            }]}>
              <View style={[styles.modalHeader, { borderBottomColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Select {datePickerMode === 'start' ? 'Start' : 'End'} Date
                </Text>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={datePickerMode === 'end' && startDate ? new Date(startDate) : undefined}
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
                  style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.border }]}
                  onPress={confirmDate}
                >
                  <Text style={[styles.modalButtonText, { color: theme.text }]}>Confirm</Text>
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
          minimumDate={datePickerMode === 'end' && startDate ? new Date(startDate) : undefined}
          themeVariant={themeMode === 'dark' ? 'dark' : 'light'}
        />
      )}
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
    paddingBottom: 40,
  },
  selectionSection: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  inputIcon: {
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
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
  dateDisplay: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  dateSeparator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 28,
  },
  locationContainer: {
    marginTop: 4,
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
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
  dayDate: {
    fontSize: 14,
    fontWeight: '500',
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
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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
});

export default TripPlan;
