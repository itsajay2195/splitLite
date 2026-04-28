import { useEffect } from 'react';
import RootNavigation from './src/navigation/RootNavigation';
import { RealmProvider } from './src/realm/RealmContext';
import AlertProvider from './src/components/AlertProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { requestNotificationPermission } from './src/utils/reminderService';
import { UserProvider } from './src/context/UserContext';

function App() {
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <SafeAreaProvider>
      <UserProvider>
        <RealmProvider>
          <AlertProvider>
            <RootNavigation />
          </AlertProvider>
        </RealmProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}

export default App;
