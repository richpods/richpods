# Input Validation with Joi

GraphQL operations validate user input with [Joi](https://joi.dev/) before calling service logic. The same validation helpers are also used by selected REST routes, such as hosted podcast metadata and hosted episode creation.

## Validation Features

- **Email validation** with proper format checking
- **Password strength requirements** (minimum 8 characters)
- **URL validation** for links and media URLs
- **String length limits** to prevent oversized data
- **Required field validation**
- **Type validation** (strings, numbers, arrays)
- **Custom error messages** that are user-friendly

## Authentication Mutations

### Sign Up

```graphql
mutation SignUp {
  signUp(input: {
    email: "user@example.com"     # Valid email required
    password: "password123"       # Minimum 8 characters
  }) {
    token
    user { id publicName }
  }
}
```

**Validation Rules:**

- `email`: Must be a valid email format
- `password`: Minimum 8 characters required

**Example Validation Errors:**

```json
{
  "errors": [{
    "message": "Validation failed"
  }]
}
```

### Sign In

```graphql
mutation SignIn {
  signIn(input: {
    email: "user@example.com"     # Valid email required
    password: "password123"       # Required
  }) {
    token
    user { id }
  }
}
```

### Google Sign In

```graphql
mutation SignInWithGoogle {
  signInWithGoogle(idToken: "google-jwt-token") {  # Non-empty token required
    token
    user { id publicName }
  }
}
```

## Profile Management

### Update Profile

```graphql
mutation UpdateProfile {
  updateProfile(input: {
    publicName: "New Name"               # Optional, max 50 chars
    biography: "My bio..."               # Optional, max 500 chars
    website: "https://example.com"       # Optional, must be valid URL
    publicEmail: "public@example.com"    # Optional, valid email
    editorLanguage: "en"                 # Optional, "en" or "de"
    socialAccounts: [                    # Optional array, max 10 URLs
      "https://twitter.com/user",
      "https://github.com/user"
    ]
  }) {
    id publicName biography
  }
}
```

**Validation Rules:**

- `publicName`: Maximum 50 characters
- `biography`: Maximum 500 characters
- `website`: Must be valid HTTP/HTTPS URL
- `publicEmail`: Must be valid email format
- `editorLanguage`: Must be `en` or `de`
- `socialAccounts`: Array of valid URLs, maximum 10 items

## RichPod Management

### Create RichPod

```graphql
mutation CreateRichPod {
  createRichPod(input: {
    title: "My Podcast Episode"          # Required, 1-200 chars
    description: "Episode about..."      # Required, 1-1000 chars
    origin: {
      title: "Podcast Title"             # Required, non-empty
      link: "https://podcast.com"        # Optional, valid URL or empty string
      feedUrl: "https://podcast.com/rss" # Required, valid URL
      artworkUrl: "https://podcast.com/cover.jpg"
      episode: {
        guid: "episode-123"              # Required, non-empty
        title: "Episode Title"           # Required, non-empty
        link: "https://podcast.com/ep"   # Optional, valid URL or empty string
        pubDate: "2026-01-15T12:00:00.000Z"
        media: {
          url: "https://cdn.com/audio.mp3" # Required, valid URL
          type: "audio/mpeg"               # Required, valid audio MIME type
          length: 3600000                  # Required, positive integer (bytes)
          checksum: "sha256hash..."        # Required, non-empty
        }
      }
    }
  }) {
    id title description
    origin { feedUrl verified }
  }
}
```

**Validation Rules:**

- `title`: Required, 1-200 characters
- `description`: Required, 1-1000 characters
- `origin.title`: Required, non-empty string
- `origin.link`: Optional valid HTTP/HTTPS URL or empty string
- `origin.feedUrl`: Required valid HTTP/HTTPS URL
- `origin.artworkUrl`: Optional valid HTTP/HTTPS URL
- `origin.episode.guid`: Required, non-empty string
- `origin.episode.title`: Required, non-empty string
- `origin.episode.link`: Optional valid HTTP/HTTPS URL or empty string
- `origin.episode.pubDate`: Optional ISO 8601 date
- `origin.episode.media.url`: Required valid HTTP/HTTPS URL
- `origin.episode.media.type`: Must be one of: `audio/mpeg`, `audio/mp3`, `audio/mp4`, `audio/m4a`, `audio/wav`, `audio/ogg`, `audio/aac`, `audio/flac`, `audio/x-m4a`
- `origin.episode.media.length`: Required, positive integer
- `origin.episode.media.checksum`: Required, non-empty string

The service also fetches the RSS feed, requires a valid RSS 2.0 feed, rejects locked feeds, checks that the selected episode GUID exists, and stores an immutable feed snapshot. Feed downloads use the shared maximum feed size, currently 40 MB in 2026 and increasing by 1 MB per year after that.

### Update RichPod

```graphql
mutation UpdateRichPod {
  updateRichPod(
    id: "richpod-id"                    # Required, safe document ID
    sessionId: "4f67b8c2-4f8c-4a0e-b8d7-78d4016a53ff"
    input: {
      title: "Updated Title"            # Optional, 1-200 chars
      description: "Updated desc"       # Optional, 1-1000 chars
      state: published                  # Optional, draft or published
      explicit: false                   # Optional
    }
  ) {
    id title description
    state explicit
  }
}
```

**Validation Rules:**

- `id`: Required document ID matching `^[A-Za-z0-9_-]{1,128}$`
- `sessionId`: Required UUID v4 lock session ID
- At least one field (`title`, `description`, `state`, or `explicit`) must be provided
- `title`: If provided, 1-200 characters
- `description`: If provided, 1-1000 characters
- `state`: If provided, must be `draft` or `published`
- `explicit`: If provided, must be a boolean

### Delete RichPod

```graphql
mutation DeleteRichPod {
  deleteRichPod(id: "richpod-id")  # Required, safe document ID
}
```

**Validation Rules:**

- `id`: Required document ID matching `^[A-Za-z0-9_-]{1,128}$`

## Error Handling

When validation fails, the standard GraphQL response includes the validation error message:

```json
{
  "errors": [{
    "message": "Validation failed"
  }]
}
```

The server throws a `ValidationError` with a `details` array containing individual field errors. The standard GraphQL error response only includes the `message` field.

## Implementation Details

- **Schema Validation**: Each input type has a corresponding Joi schema
- **Custom Messages**: User-friendly error messages for common validation failures
- **Type Safety**: TypeScript integration ensures type safety throughout
- **Performance**: Validation happens before business logic, failing fast
- **Security**: Prevents malicious or malformed data from reaching services

## Testing Validation

You can test validation by intentionally providing invalid data:

```graphql
# This will fail validation
mutation TestValidation {
  signUp(input: {
    email: "not-an-email"        # Invalid email format
    password: "123"              # Too short
  }) {
    token
    user { id }
  }
}
```

The validation system rejects the request before service logic runs.
