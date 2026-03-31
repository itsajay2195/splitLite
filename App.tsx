import RootNavigation from './src/navigation/RootNavigation';
import { RealmProvider } from './src/realm/RealmContext';
import AlertProvider from './src/components/AlertProvider';

function App() {
  return (
    <RealmProvider>
      <AlertProvider>
        <RootNavigation />
      </AlertProvider>
    </RealmProvider>
  );
}

export default App;
