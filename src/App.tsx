import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { Toast } from './components/Toast';
import { LoginScreen } from './screens/LoginScreen';
import { TripsScreen } from './screens/TripsScreen';
import { CreateTripScreen } from './screens/CreateTripScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { ExpenseListScreen } from './screens/ExpenseListScreen';
import { MoneyScreen } from './screens/MoneyScreen';
import { AddExpenseScreen } from './screens/AddExpenseScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function AppShell() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      <AppRoutes />
      <Toast />
    </div>
  );
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) return null;

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<LoginScreen />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/trips" replace />} />
      <Route path="/trips" element={<TripsScreen />} />
      <Route path="/trips/new" element={<CreateTripScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/trip/:tripId" element={<DashboardScreen />} />
      <Route path="/trip/:tripId/list" element={<ExpenseListScreen />} />
      <Route path="/trip/:tripId/money" element={<MoneyScreen />} />
      <Route path="/trip/:tripId/add" element={<AddExpenseScreen />} />
      <Route path="*" element={<Navigate to="/trips" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppShell />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
