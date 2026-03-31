/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import RootNavigation from './src/navigation/RootNavigation';
import { RealmProvider } from './src/realm/RealmContext';

function App() {
  return (
    <RealmProvider>
      <RootNavigation />
    </RealmProvider>
  );
}

export default App;
