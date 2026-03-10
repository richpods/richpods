# Input Validation with Joi

All GraphQL mutations now include comprehensive input validation using [Joi](https://joi.dev/). This ensures data integrity and provides meaningful error messages.

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
- `socialAccounts`: Array of valid URLs, maximum 10 items

## RichPod Management

### Create RichPod
```graphql
mutation CreateRichPod {
  createRichPod(input: {
    title: "My Podcast Episode"      # Required, 1-200 chars
    description: "Episode about..."  # Required, 1-1000 chars
    origin: {
      guid: "episode-123"            # Required, non-empty
      link: "https://podcast.com/ep" # Required, valid URL
      media: {
        url: "https://cdn.com/audio.mp3"  # Required, valid URL
        type: "audio/mpeg"                # Required, valid audio MIME type
        length: 3600000                   # Required, positive integer (bytes)
        checksum: "sha256hash..."         # Required, non-empty
      }
    }
  }) {
    id title description
    editor { displayName }
  }
}
```

**Validation Rules:**
- `title`: Required, 1-200 characters
- `description`: Required, 1-1000 characters
- `origin.guid`: Required, non-empty string
- `origin.link`: Required, valid HTTP/HTTPS URL
- `media.url`: Required, valid HTTP/HTTPS URL
- `media.type`: Must be one of: `audio/mpeg`, `audio/mp3`, `audio/mp4`, `audio/m4a`, `audio/wav`, `audio/ogg`, `audio/aac`, `audio/flac`, `audio/x-m4a`
- `media.length`: Required, positive integer
- `media.checksum`: Required, non-empty string

### Update RichPod
```graphql
mutation UpdateRichPod {
  updateRichPod(
    id: "richpod-id"               # Required, non-empty
    input: {
      title: "Updated Title"       # Optional, 1-200 chars
      description: "Updated desc"  # Optional, 1-1000 chars
    }
  ) {
    id title description
  }
}
```

**Validation Rules:**
- `id`: Required, non-empty string
- At least one field (`title` or `description`) must be provided
- `title`: If provided, 1-200 characters
- `description`: If provided, 1-1000 characters

### Delete RichPod
```graphql
mutation DeleteRichPod {
  deleteRichPod(id: "richpod-id")  # Required, non-empty
}
```

## Error Handling

When validation fails, you'll receive a GraphQL error with detailed information:

```json
{
  "errors": [{
    "message": "Validation failed"
  }]
}
```

The server throws a `ValidationError` with a `details` array containing individual field errors. However, the standard GraphQL error response only includes the `message` field.

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

The validation system will return detailed errors explaining exactly what's wrong with each field.