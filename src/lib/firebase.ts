import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocFromServer,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { CoffeeRecipe, SavedRecipeRecord } from '../types/coffee';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

function clampString(val: unknown, max: number, fallback = ''): string {
  const str = typeof val === 'string' && val.trim().length > 0 ? val.trim() : fallback;
  return str.slice(0, max);
}

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  return Math.min(max, Math.max(min, n));
}

export async function saveRecipeToJournal(
  userId: string,
  recipe: CoffeeRecipe,
  cravingSummary: string,
): Promise<string> {
  const recipeId = `brew_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const docPath = `users/${userId}/recipes/${recipeId}`;
  const docRef = doc(db, 'users', userId, 'recipes', recipeId);

  const sanitizedTastingNotes = (recipe.tastingNotes || ['Balanced', 'Rich'])
    .slice(0, 6)
    .map((n) => clampString(n, 60, 'Balanced'));

  const sanitizedSteps = (recipe.brewSteps || [])
    .slice(0, 12)
    .map((step, idx) => ({
      stepNumber: idx + 1,
      title: clampString(step.title, 100, `Step ${idx + 1}`),
      instruction: clampString(step.instruction, 400, 'Follow brew timing.'),
      durationSeconds: clampNumber(step.durationSeconds, 5, 3600, 30),
      ...(typeof step.targetWaterGrams === 'number'
        ? { targetWaterGrams: clampNumber(step.targetWaterGrams, 0, 3000, 0) }
        : {}),
    }));

  const sanitizedShopping = (recipe.shoppingList || [])
    .slice(0, 20)
    .map((item) => ({
      category: item.category,
      item: clampString(item.item, 120, 'Specialty Coffee'),
      quantity: clampString(item.quantity, 80, '1 bag'),
      note: clampString(item.note, 200, ''),
    }));

  const payload = {
    userId,
    drinkName: clampString(recipe.drinkName, 120, 'Custom Craft Brew'),
    tagline: clampString(recipe.tagline, 180, 'Tailored specialty coffee'),
    baristaNote: clampString(recipe.baristaNote, 2000, 'Crafted to your flavor profile.'),
    beanOrigin: clampString(recipe.beanOrigin, 240, 'Single-origin specialty beans'),
    roastProfile: clampString(recipe.roastProfile, 240, 'Balanced roast'),
    milkPairing: clampString(recipe.milkPairing, 240, 'Silky textured milk'),
    brewMethod: clampString(recipe.brewMethod, 120, 'Pour-Over'),
    vesselStyle: clampString(recipe.vesselStyle, 120, 'Ceramic mug'),
    cravingSummary: clampString(cravingSummary, 500, 'Custom flavor profile'),
    doseGrams: clampNumber(recipe.doseGrams, 1, 500, 18),
    waterOrYieldMl: clampNumber(recipe.waterOrYieldMl, 10, 3000, 250),
    milkMl: clampNumber(recipe.milkMl, 0, 1000, 0),
    waterTempC: clampNumber(recipe.waterTempC, 1, 100, 92),
    grindSetting: clampString(recipe.grindSetting, 80, 'Medium-fine'),
    totalBrewMinutesLabel: clampString(recipe.totalBrewMinutesLabel, 40, '3m 00s'),
    visualPromptSpec: clampString(recipe.visualPromptSpec, 600, 'Warm cafe pour in ceramic vessel'),
    tastingNotes: sanitizedTastingNotes.length > 0 ? sanitizedTastingNotes : ['Balanced'],
    palateProfile: {
      sweetness: clampNumber(recipe.palateProfile?.sweetness, 1, 10, 7),
      body: clampNumber(recipe.palateProfile?.body, 1, 10, 7),
      acidity: clampNumber(recipe.palateProfile?.acidity, 1, 10, 4),
      roastDepth: clampNumber(recipe.palateProfile?.roastDepth, 1, 10, 6),
    },
    brewSteps:
      sanitizedSteps.length > 0
        ? sanitizedSteps
        : [{ stepNumber: 1, title: 'Brew', instruction: 'Extract smoothly.', durationSeconds: 120 }],
    shoppingList:
      sanitizedShopping.length > 0
        ? sanitizedShopping
        : [{ category: 'Coffee Beans', item: 'Specialty Whole Beans', quantity: '250g', note: 'Fresh roast' }],
    isFavorite: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, payload);
    return recipeId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export function subscribeToRecipes(
  userId: string,
  onData: (records: SavedRecipeRecord[]) => void,
  onError: (err: Error) => void,
) {
  const path = `users/${userId}/recipes`;
  const q = query(collection(db, 'users', userId, 'recipes'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: SavedRecipeRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const createdAtTs = d.createdAt as Timestamp | undefined;
        const updatedAtTs = d.updatedAt as Timestamp | undefined;
        return {
          id: docSnap.id,
          userId: String(d.userId ?? userId),
          cravingSummary: String(d.cravingSummary ?? ''),
          isFavorite: Boolean(d.isFavorite),
          createdAtMs: createdAtTs?.toMillis ? createdAtTs.toMillis() : Date.now(),
          updatedAtMs: updatedAtTs?.toMillis ? updatedAtTs.toMillis() : Date.now(),
          recipe: {
            drinkName: String(d.drinkName ?? 'Untitled Brew'),
            tagline: String(d.tagline ?? ''),
            baristaNote: String(d.baristaNote ?? ''),
            beanOrigin: String(d.beanOrigin ?? ''),
            roastProfile: String(d.roastProfile ?? ''),
            milkPairing: String(d.milkPairing ?? ''),
            brewMethod: String(d.brewMethod ?? ''),
            vesselStyle: String(d.vesselStyle ?? ''),
            doseGrams: Number(d.doseGrams ?? 18),
            waterOrYieldMl: Number(d.waterOrYieldMl ?? 250),
            milkMl: Number(d.milkMl ?? 0),
            waterTempC: Number(d.waterTempC ?? 92),
            grindSetting: String(d.grindSetting ?? ''),
            totalBrewMinutesLabel: String(d.totalBrewMinutesLabel ?? ''),
            visualPromptSpec: String(d.visualPromptSpec ?? ''),
            tastingNotes: Array.isArray(d.tastingNotes) ? d.tastingNotes : [],
            palateProfile: d.palateProfile ?? { sweetness: 6, body: 7, acidity: 4, roastDepth: 6 },
            brewSteps: Array.isArray(d.brewSteps) ? d.brewSteps : [],
            shoppingList: Array.isArray(d.shoppingList) ? d.shoppingList : [],
          },
        };
      });
      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function toggleFavoriteRecipe(userId: string, recipeId: string, nextFavorite: boolean): Promise<void> {
  const path = `users/${userId}/recipes/${recipeId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'recipes', recipeId), {
      isFavorite: nextFavorite,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteRecipeFromJournal(userId: string, recipeId: string): Promise<void> {
  const path = `users/${userId}/recipes/${recipeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'recipes', recipeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
