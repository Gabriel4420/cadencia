import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import calendarOAuthConfig from '../../firebase-calendar-oauth-config.json';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

// Primary Firebase App: Firestore real-time sync + offline persistence + Firebase Auth
const existingDefault = getApps().find((a) => a.name === '[DEFAULT]');
const app: FirebaseApp = existingDefault ?? initializeApp(firebaseConfig);
export const auth = getAuth(app);

const firestoreDbId = firebaseConfig.firestoreDatabaseId;

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      firestoreDbId
    );
  } catch {
    return getFirestore(app, firestoreDbId);
  }
}

export const db: Firestore = createFirestoreInstance();

// Dedicated Google Calendar OAuth App (provisioned via Workspace OAuth)
const CALENDAR_APP_NAME = 'calendar-oauth';
const existingCalendarApp = getApps().find((a) => a.name === CALENDAR_APP_NAME);
const calendarApp: FirebaseApp =
  existingCalendarApp ?? initializeApp(calendarOAuthConfig, CALENDAR_APP_NAME);
const calendarAuth = getAuth(calendarApp);

const syncProvider = new GoogleAuthProvider();
const calendarProvider = new GoogleAuthProvider();
for (const scope of GOOGLE_CALENDAR_SCOPES) {
  calendarProvider.addScope(scope);
}

let isSigningInCalendar = false;
// Strict in-memory token cache (never stored in localStorage/sessionStorage)
let cachedCalendarAccessToken: string | null = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  rethrow = false
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (rethrow) {
    throw new Error(JSON.stringify(errInfo));
  }
  return errInfo;
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    // Permission denied on /test/connection confirms Firestore server reachability
    return true;
  }
}

export function initAuth(onUserChange: (user: User | null) => void): () => void {
  const unsubPrimary = onAuthStateChanged(auth, (user) => {
    onUserChange(user);
  });
  const unsubCalendar = onAuthStateChanged(calendarAuth, (calUser) => {
    if (!calUser && !isSigningInCalendar) {
      cachedCalendarAccessToken = null;
    }
  });
  return () => {
    unsubPrimary();
    unsubCalendar();
  };
}

export async function googleSignIn(): Promise<{ user: User }> {
  const result = await signInWithPopup(auth, syncProvider);
  return { user: result.user };
}

export async function connectGoogleCalendar(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningInCalendar = true;
    const result = await signInWithPopup(calendarAuth, calendarProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google Calendar.');
    }
    cachedCalendarAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedCalendarAccessToken };
  } finally {
    isSigningInCalendar = false;
  }
}

export function getAccessToken(): string | null {
  return cachedCalendarAccessToken;
}

export async function logoutGoogle(): Promise<void> {
  cachedCalendarAccessToken = null;
  await Promise.allSettled([auth.signOut(), calendarAuth.signOut()]);
}
