import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen/HomeScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen/CreateGroupScreen';
import GroupScreen from '../screens/GroupScreen/GroupScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen/AddExpenseScreen';
import ShareGroupScreen from '../screens/ShareGroupScreen/ShareGroupScreen';
import ImportGroupScreen from '../screens/ImportGroupScreen/ImportGroupScreen';
import EditGroupScreen from '../screens/EditGroupScreen/EditGroupScreen';
import OnboardingScreen from '../screens/OnboardingScreen/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen/LoginScreen';
import { NavigationContainer } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import { onAuthStateChanged, type FirebaseUser } from '../utils/firebaseAuth';

const Stack = createNativeStackNavigator();

export default function RootNavigation() {
  const { userName, userLoaded } = useUser();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null | undefined>(undefined);

  useEffect(() => {
    return onAuthStateChanged(user => setFirebaseUser(user));
  }, []);

  // Wait for both local storage and Firebase auth to resolve
  if (!userLoaded || firebaseUser === undefined) return null;

  // Determine initial route:
  // - Firebase user exists → straight to Home
  // - No Firebase user, has local username → Home (guest mode)
  // - Nothing → Login
  let initialRoute: string;
  if (firebaseUser) {
    initialRoute = 'Home';
  } else if (userName) {
    initialRoute = 'Home';
  } else {
    initialRoute = 'Login';
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
        <Stack.Screen name="Group" component={GroupScreen} />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
        <Stack.Screen name="ShareGroup" component={ShareGroupScreen} />
        <Stack.Screen name="ImportGroup" component={ImportGroupScreen} />
        <Stack.Screen name="EditGroup" component={EditGroupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
