# RichPods User Flows

## Main User Flow

The following diagram shows the end-to-end journey a user takes through RichPods — from initial visit through authentication, role-based routing, and content creation. Regular users can create RichPods from external podcast feeds, with additional capabilities unlocked after verifying feed ownership. Privileged users (Editors and Super Admins) bypass verification restrictions and can additionally create self-hosted podcasts with uploaded episodes.

```mermaid
flowchart TD
    Start([User visits RichPods]) --> IsAuth{Authenticated?}

    IsAuth -->|No| ViewOnly["View published RichPods"]
    IsAuth -->|Yes| RoleCheck{Role?}

    %% ── Role branching ──
    RoleCheck -->|No role| RegularUser
    RoleCheck -->|Editor| PrivilegedUser
    RoleCheck -->|Super Admin| PrivilegedUser

    %% ══════════════════════════════════════
    %% REGULAR USER
    %% ══════════════════════════════════════
    subgraph RegularUser["Regular User (no role)"]
        direction TB
        SearchPodcast["Search external podcast episode"]
        SearchPodcast --> CreateDraft["Create RichPod (draft)"]
        CreateDraft --> IsVerified{Feed verified?}

        %% ── Unverified path ──
        IsVerified -->|No| UnverifiedFlow
        subgraph UnverifiedFlow["1. Unverified RichPod"]
            direction TB
            BasicChapters["Add chapters:<br/>Markdown · Chart · GeoMap<br/>Card · Factbox"]
            BasicChapters --> NoUpload["Image uploads blocked"]
            BasicChapters --> NoAdvanced["Slideshow &amp; Poll blocked"]
            NoUpload --> PublishUnverified["Publish RichPod"]
            NoAdvanced --> PublishUnverified
        end

        %% ── Verification process ──
        IsVerified -->|"Start verification"| VerifyProcess
        subgraph VerifyProcess["Verification Process"]
            direction TB
            StartVerify["Start verification<br/>(provide feed URL)"]
            StartVerify --> FetchEmail["Server extracts itunes:email<br/>from RSS feed"]
            FetchEmail --> SendCode["8-digit code sent<br/>to podcast owner via Postmark"]
            SendCode --> EnterCode["User enters code<br/>(10-minute window)"]
            EnterCode --> VerifyResult{Code valid?}
            VerifyResult -->|No| VerifyFailed["Verification failed"]
            VerifyResult -->|Yes| VerifySuccess["Feed verified"]
        end

        VerifySuccess --> VerifiedFlow
        subgraph VerifiedFlow["2. Verified RichPod"]
            direction TB
            AllChapters["Add chapters:<br/>Markdown · Chart · GeoMap<br/>Card · Factbox<br/><strong>Slideshow · Poll</strong>"]
            AllChapters --> UploadImages["Upload images"]
            UploadImages --> PublishVerified["Publish RichPod"]
        end
    end

    %% ══════════════════════════════════════
    %% PRIVILEGED USER
    %% ══════════════════════════════════════
    subgraph PrivilegedUser["Privileged User (Editor / Super Admin)"]
        direction TB

        PrivChoice{Flow?}

        PrivChoice -->|External feed| PrivExternal["Create RichPod from feed<br/>(all chapters &amp; uploads allowed<br/>regardless of verification)"]
        PrivExternal --> PrivPublish["Publish RichPod"]

        PrivChoice -->|Self-hosted| HostedFlow
        subgraph HostedFlow["3. Hosted RichPod"]
            direction TB
            CreatePodcast["Create Hosted Podcast<br/>(title, description, cover image)"]
            CreatePodcast --> UploadEpisode["Upload MP3 episode<br/>(up to 500 MB)"]
            UploadEpisode --> AsyncValidation["Async MP3 validation<br/>(Cloud Function)"]
            AsyncValidation --> ValidationResult{Valid?}
            ValidationResult -->|No| Invalid["Episode marked invalid"]
            ValidationResult -->|Yes| Valid["Episode marked valid"]
            Valid --> AutoDraft["RichPod auto-created<br/>in draft state"]
            AutoDraft --> EditHosted["Add chapters<br/>(all types allowed)"]
            EditHosted --> PublishHosted["Publish RichPod"]
            PublishHosted --> FeedUpdate["Episode appears in<br/>auto-generated RSS feed"]
        end
    end

    %% ── Common outcomes ──
    PublishUnverified --> Published
    PublishVerified --> Published
    PrivPublish --> Published
    FeedUpdate --> Published

    Published(["RichPod published<br/>visible to all users"])
```

## Role Assignment

Roles are managed through **Firebase Authentication custom claims** — they are not stored in Firestore. There are two possible role values: `editor` and `super_admin`. Users without an explicitly assigned role are treated as regular users. Both `editor` and `super_admin` are considered privileged roles and currently grant identical permissions.

Roles are assigned manually via a CLI script on the server:

```bash
pnpm --filter @richpods/server exec tsx scripts/set-user-role.ts <firebaseUid> <super_admin|editor|none>
```

The underlying service (`server/src/services/role-claims.service.ts`) calls `adminAuth.setCustomUserClaims()` to write the `role` claim. On each API request, the server reads the role from the decoded ID token (`server/src/services/auth.service.ts`). Role changes take effect when the client presents a fresh ID token (e.g. after token refresh or re-login).

## Capabilities by Role

The matrix below summarizes which actions are available to each role. Key distinctions: regular users without a verified feed cannot upload images or use Slideshow/Poll chapters, while Editors and Super Admins have full access to all chapter types and can create hosted podcasts.

```mermaid
block-beta
    columns 4

    space header1["No Role"] header2["Editor"] header3["Super Admin"]

    row1["View published RichPods"]:1 y1["✓"]:1 y2["✓"]:1 y3["✓"]:1
    row2["Create RichPod from feed"]:1 y4["✓"]:1 y5["✓"]:1 y6["✓"]:1
    row3["Basic chapters"]:1 y7["✓"]:1 y8["✓"]:1 y9["✓"]:1
    row4["Start feed verification"]:1 y10["✓"]:1 y11["✓"]:1 y12["✓"]:1
    row5["Upload images (unverified)"]:1 n1["✗"]:1 y13["✓"]:1 y14["✓"]:1
    row6["Slideshow & Poll (unverified)"]:1 n2["✗"]:1 y15["✓"]:1 y16["✓"]:1
    row7["Upload images (verified)"]:1 y17["✓"]:1 y18["✓"]:1 y19["✓"]:1
    row8["Slideshow & Poll (verified)"]:1 y20["✓"]:1 y21["✓"]:1 y22["✓"]:1
    row9["Create hosted podcast"]:1 n3["✗"]:1 y23["✓"]:1 y24["✓"]:1
    row10["Upload hosted episodes"]:1 n4["✗"]:1 y25["✓"]:1 y26["✓"]:1

    style n1 fill:#fee,color:#c00
    style n2 fill:#fee,color:#c00
    style n3 fill:#fee,color:#c00
    style n4 fill:#fee,color:#c00
```
