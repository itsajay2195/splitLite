import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '288483077004-1pf63abacsijh0sj3abbjcj0hl69r2vd.apps.googleusercontent.com',
});

export type FirebaseUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

function toFirebaseUser(user: any): FirebaseUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

export function getCurrentUser(): FirebaseUser | null {
  const user = auth().currentUser;
  return user ? toFirebaseUser(user) : null;
}

export function onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
  return auth().onAuthStateChanged(user => {
    callback(user ? toFirebaseUser(user) : null);
  });
}

export async function signInWithGoogle(): Promise<FirebaseUser> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult.data?.idToken;
  if (!idToken) throw new Error('No ID token from Google');
  const credential = auth.GoogleAuthProvider.credential(idToken);
  const result = await auth().signInWithCredential(credential);
  return toFirebaseUser(result.user);
}

export async function signOut() {
  await GoogleSignin.signOut();
  await auth().signOut();
}
