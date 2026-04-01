import RootNavigation from './src/navigation/RootNavigation';
import { RealmProvider } from './src/realm/RealmContext';
import AlertProvider from './src/components/AlertProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function App() {
  return (
    <SafeAreaProvider>
      <RealmProvider>
        <AlertProvider>
          <RootNavigation />
        </AlertProvider>
      </RealmProvider>
    </SafeAreaProvider>
  );
}

export default App;
