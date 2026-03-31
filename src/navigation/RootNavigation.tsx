import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen/HomeScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen/CreateGroupScreen';
import GroupScreen from '../screens/GroupScreen/GroupScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen/AddExpenseScreen';
import ShareGroupScreen from '../screens/ShareGroupScreen/ShareGroupScreen';
import ImportGroupScreen from '../screens/ImportGroupScreen/ImportGroupScreen';
import { NavigationContainer } from '@react-navigation/native';

const Stack = createNativeStackNavigator();

export default function RootNavigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
        <Stack.Screen name="Group" component={GroupScreen} />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
        <Stack.Screen name="ShareGroup" component={ShareGroupScreen} />
        <Stack.Screen name="ImportGroup" component={ImportGroupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
