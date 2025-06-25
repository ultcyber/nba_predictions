import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AppState {
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Filters state
  selectedDate: string | null;
  selectedTeam: string | null;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedTeam: (team: string | null) => void;
  clearFilters: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // Initial state
      isLoading: false,
      error: null,
      selectedDate: null,
      selectedTeam: null,

      // Actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSelectedTeam: (team) => set({ selectedTeam: team }),
      clearFilters: () => set({ selectedDate: null, selectedTeam: null }),
    }),
    {
      name: 'nba-predictions-store',
    }
  )
);