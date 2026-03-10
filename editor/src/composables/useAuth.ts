import { ref, computed, onMounted, onUnmounted } from "vue";
import { auth, type User } from "@/lib/firebase";
import { onAuthStateChanged, type Unsubscribe } from "firebase/auth";

const user = ref<User | null>(null);
const isLoading = ref(true);

export function useAuth() {
    let unsubscribe: Unsubscribe | null = null;

    onMounted(() => {
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            user.value = firebaseUser;
            isLoading.value = false;
        });
    });

    onUnmounted(() => {
        if (unsubscribe) {
            unsubscribe();
        }
    });

    return {
        user,
        isLoading,
        isAuthenticated: computed(() => !!user.value),
    };
}

// Global auth state
export const globalAuth = {
    user,
    isLoading,
};
