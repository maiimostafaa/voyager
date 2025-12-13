import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FetchErrorContextType {
  error: string | null;
  hasError: boolean;
  setFetchError: (error: string | null) => void;
  clearError: () => void;
  handleFetchError: (error: unknown, customMessage?: string) => void;
}

const FetchErrorContext = createContext<FetchErrorContextType | undefined>(undefined);

interface FetchErrorProviderProps {
  children: ReactNode;
}

export const FetchErrorProvider: React.FC<FetchErrorProviderProps> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);

  const setFetchError = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleFetchError = useCallback((error: unknown, customMessage?: string) => {
    console.error('Fetch error:', error);
    
    let message = customMessage || 'Something went wrong while loading data.';
    
    // Handle different error types
    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('Network request failed') || 
          error.message.includes('Failed to fetch') ||
          error.message.includes('network')) {
        message = 'Unable to connect. Please check your internet connection.';
      }
      // Timeout errors
      else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        message = 'Request timed out. Please try again.';
      }
      // Supabase/server errors
      else if (error.message.includes('PGRST') || error.message.includes('JWT')) {
        message = 'Server error. Please try again later.';
      }
    }
    
    setError(message);
  }, []);

  return (
    <FetchErrorContext.Provider
      value={{
        error,
        hasError: error !== null,
        setFetchError,
        clearError,
        handleFetchError,
      }}
    >
      {children}
    </FetchErrorContext.Provider>
  );
};

export const useFetchError = (): FetchErrorContextType => {
  const context = useContext(FetchErrorContext);
  if (context === undefined) {
    throw new Error('useFetchError must be used within a FetchErrorProvider');
  }
  return context;
};

// Utility function to wrap async operations with error handling
export const withFetchErrorHandling = async <T,>(
  operation: () => Promise<T>,
  onError: (error: unknown) => void,
  customMessage?: string
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    onError(error);
    return null;
  }
};
