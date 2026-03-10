import { ref } from "vue";
import { auth, type User } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// Global reactive auth state
export const user = ref<User | null>(null);
export const isAuthReady = ref(false);

// Initialize auth state listener immediately
onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser;
    isAuthReady.value = true;
});

// Composable for components that need auth state
export function useAuthState() {
    return {
        user,
        isAuthReady,
        isAuthenticated: () => !!user.value,
    };
}
