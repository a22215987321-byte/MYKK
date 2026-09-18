# Guest authentication security rules

EVONCHAT stores anonymous users outside the member collections:

```text
guest_users/{anonymousUid}
guest_users/{anonymousUid}/chats/{chatId}
guest_users/{anonymousUid}/chats/{chatId}/messages/{messageId}
```

The client always builds these paths from `request.auth.uid`, but client-side
path scoping is not an authorization boundary. Merge the following block into
the existing production Firestore rules before enabling the feature:

```rules
function isAnonymousOwner(uid) {
  return request.auth != null
    && request.auth.uid == uid
    && request.auth.token.firebase.sign_in_provider == "anonymous";
}

match /guest_users/{guestUid} {
  allow create: if isAnonymousOwner(guestUid)
    && request.resource.data.ownerId == guestUid
    && request.resource.data.isGuest == true
    && request.resource.data.accountType == "guest";
  allow get, update, delete: if isAnonymousOwner(guestUid);
  allow list: if false;

  match /chats/{chatId} {
    allow get, list, delete: if isAnonymousOwner(guestUid);
    allow create: if isAnonymousOwner(guestUid)
      && request.resource.data.ownerId == guestUid;
    allow update: if isAnonymousOwner(guestUid)
      && resource.data.ownerId == guestUid
      && request.resource.data.ownerId == guestUid;

    match /messages/{messageId} {
      allow get, list, delete: if isAnonymousOwner(guestUid);
      allow create: if isAnonymousOwner(guestUid)
        && request.resource.data.ownerId == guestUid
        && request.resource.data.senderId == guestUid
        && request.resource.data.senderType == "guest";
      allow update: if false;
    }
  }
}
```

Important: if the current production rules contain a broad fallback such as
`allow read, write: if request.auth != null`, anonymous users will still match
that fallback. Update every member-only fallback to exclude anonymous tokens,
for example:

```rules
function isSignedInMember() {
  return request.auth != null
    && request.auth.token.firebase.sign_in_provider != "anonymous";
}
```

Use `isSignedInMember()` for the existing member, public-chat, feed, profile,
file, AI, donation, and administration collections. Do not deploy the guest
block as the only rules file: the repository does not contain the current
production rules, so replacing them would risk breaking existing member flows.

Firebase Authentication must also have **Anonymous** enabled under
Authentication → Sign-in method.
