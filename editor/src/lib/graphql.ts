import { GraphQLClient } from "graphql-request";
import { auth } from "./firebase";
import { getSdk } from "../graphql/generated";

// Create the GraphQL client
const client = new GraphQLClient(import.meta.env.VITE_GRAPHQL_ENDPOINT);

// Create the SDK with authentication wrapper
export const graphqlSdk = getSdk(client, async (action) => {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    
    const headers: Record<string, string> = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    
    return action(headers);
});

export const DEFAULT_PAGE_SIZE = 20;

// Export all types from generated file for easy access
export * from "../graphql/generated";