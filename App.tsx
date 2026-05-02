import { useEffect } from 'react';
import RootNavigation from './src/navigation/RootNavigation';
import { RealmProvider } from './src/realm/RealmContext';
import AlertProvider from './src/components/AlertProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { requestNotificationPermission } from './src/utils/reminderService';
import { UserProvider } from './src/context/UserContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import CrashReporter from './src/components/CrashReporter';

function App() {
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <UserProvider>
          <RealmProvider>
            <AlertProvider>
              <CrashReporter />
              <RootNavigation />
            </AlertProvider>
          </RealmProvider>
        </UserProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;
