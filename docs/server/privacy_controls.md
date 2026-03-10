# User Privacy Controls

The GraphQL API enforces privacy controls at the service and resolver layers so sensitive user data is not exposed.

## Fields Never Exposed in `User`

The following `UserDocument` fields are internal and are never part of the GraphQL `User` type:

- `state`
- `firebaseUid`
- `createdAt`
- `updatedAt`

In addition, the authentication email address is not exposed on the GraphQL `User` type.

## GraphQL `User` Schema

```graphql
type User {
    id: ID!
    publicName: String
    biography: String
    website: String
    publicEmail: String
    socialAccounts: [String!]!
    editorLanguage: String
    role: String
    usedQuotaBytes: Int
    totalQuotaBytes: Int
}
```

## Conditional Field Exposure

The user service uses a single `mapToGraphQL(id, data, isCurrentUser)` function.

- Always mapped: `id`, `publicName`, `biography`, `website`, `publicEmail`, `socialAccounts`
- Current-user only (`isCurrentUser = true`): `editorLanguage`, `usedQuotaBytes`, `totalQuotaBytes`
- Added only by `currentUser` resolver: `role` (from verified Firebase custom claims)

## Query and Mutation Behavior

- `currentUser` query
  - Loads context user via `getUserByFirebaseUid(uid, true)`
  - Returns current-user fields and enriches response with `role`
- `user(id)` query
  - Uses `getUserById(id, false)`
  - Returns only public profile fields
- `RichPod.editor` field
  - Uses `getUserById(id, false)`
  - Returns only public profile fields
- Authentication mutations (`signUp`, `signIn`, `signInWithGoogle`)
  - Return `AuthPayload.user` using current-user mapping (`isCurrentUser = true`)
  - Do not enrich `role` in the mutation resolver

## Example Queries

### Current User

```graphql
query GetCurrentUser {
    currentUser {
        id
        publicName
        publicEmail
        editorLanguage
        usedQuotaBytes
        totalQuotaBytes
        role
    }
}
```

Expected behavior:

- `editorLanguage`, `usedQuotaBytes`, and `totalQuotaBytes` are populated
- `role` is populated when a valid custom claim is present

### Public User

```graphql
query GetUser {
    user(id: "other-user-id") {
        id
        publicName
        publicEmail
        editorLanguage
        usedQuotaBytes
        totalQuotaBytes
        role
    }
}
```

Expected behavior:

- `publicName` and `publicEmail` are visible when set
- `editorLanguage`, `usedQuotaBytes`, `totalQuotaBytes`, and `role` are `null`

## Additional Protections

- Blocked users are hidden from public lookup:
  - `getUserById` returns `null` for blocked users
  - `getUserByFirebaseUid` only queries users with `state = ACTIVE`
- Privacy rules are enforced server-side before GraphQL responses are created
