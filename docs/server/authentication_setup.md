# Authentication Setup Guide

This guide explains how to configure Google Identity Platform (Firebase Auth) for the RichPods server. The server uses both the Firebase Web SDK v9 (`firebase/auth`) for client-side authentication operations and the Firebase Admin SDK (`firebase-admin`) for server-side token verification.

## Prerequisites

1. A Google Cloud Project with Firebase enabled
2. Google Identity Platform API enabled
3. Firebase API Key configured

## Configuration Steps

### 1. Enable Authentication Providers

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Enable the following providers:
   - **Email/Password**: Click and enable
   - **Google**: 
     - Click and enable
     - Add your OAuth client ID and secret
     - Add `localhost` and `localhost:4000` to authorized domains

### 2. Configure Authorized Domains

1. In Firebase Console → Authentication → Settings
2. Add the following authorized domains:
   - `localhost`
   - `localhost:4000`
   - Your production domain (when deploying)

### 3. Get Firebase Configuration

1. Go to Firebase Console → Project Settings → Your apps
2. Create a Web app if you haven't already
3. Copy the Firebase configuration values
4. Add them to your `.env` file:

```env
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
```

### 4. Configure OAuth for Google Sign-In

For localhost testing with Google Sign-In:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Create or edit your OAuth 2.0 Client ID
4. Add authorized JavaScript origins:
   - `http://localhost`
   - `http://localhost:4000`
5. Add authorized redirect URIs:
   - `http://localhost/__/auth/handler`
   - `http://localhost:4000/__/auth/handler`

## Testing Authentication

### Testing with GraphQL Playground

1. Start the server: `pnpm --filter @richpods/server dev`
2. Open http://localhost:4000
3. Test sign-up mutation:

```graphql
mutation SignUp {
  signUp(input: {
    email: "test@example.com"
    password: "testpassword123"
  }) {
    token
    user {
      id
      publicName
    }
  }
}
```

4. Test sign-in mutation:

```graphql
mutation SignIn {
  signIn(input: {
    email: "test@example.com"
    password: "testpassword123"
  }) {
    token
    user {
      id
    }
  }
}
```

5. For Google sign-in, obtain an ID token from the client-side Firebase SDK first:

```graphql
mutation SignInWithGoogle {
  signInWithGoogle(idToken: "your-google-id-token") {
    token
    user {
      id
      publicName
    }
  }
}
```

### Using Authentication in Requests

Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

Protected mutations (createRichPod, updateRichPod, deleteRichPod, updateProfile) require authentication.

## Client-Side Integration

For client applications, use the Firebase Web SDK v9:

```javascript
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Email/Password sign-up
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();

// Email/Password sign-in
const userCredential = await signInWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();

// Google sign-in
const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
const idToken = await result.user.getIdToken();

// Use the idToken with the GraphQL mutations
```

## Architecture

The server uses Firebase Web SDK v9 (`firebase/auth`) for authentication operations and Firebase Admin SDK (`firebase-admin`) for server-side token verification:

- **User Registration**: `createUserWithEmailAndPassword` (Web SDK)
- **Email/Password Sign-in**: `signInWithEmailAndPassword` (Web SDK)
- **Google Sign-in**: `signInWithCredential` with `GoogleAuthProvider.credential` (Web SDK)
- **Token Verification**: `adminAuth.verifyIdToken()` (Admin SDK)
- **User Data**: Stored in Firestore with Firestore document references

## Security Considerations

1. Always use HTTPS in production
2. Implement rate limiting for authentication endpoints
3. Use strong password requirements
4. Regularly rotate Firebase API keys
5. Monitor authentication logs for suspicious activity
6. Keep Firebase SDK updated to the latest version

## Troubleshooting

### Common Issues

1. **"Invalid token" error**: Ensure the token hasn't expired (tokens expire after 1 hour)
2. **"Authentication required" error**: Include the Authorization header with Bearer token
3. **Google sign-in not working on localhost**: Check OAuth client configuration and authorized domains
4. **Build errors**: Ensure you're using Firebase Web SDK v9 syntax (`firebase/auth` imports)
5. **CORS issues**: Verify authorized domains are configured correctly in Firebase Console
