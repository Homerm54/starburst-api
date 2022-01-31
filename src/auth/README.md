# Authentication and Authorization Service

---

## Tokens

The auth service is token drived, which means that request to secured routes are checked with the **authorization** token in the header of the request. Two types of tokens are used, **Access Token** and **Refresh Tokens**.

### Access Tokens

This tokens are short live (less that an hour), and are the one that carries the information needed to
see who is requesting, access level, and other details needed to process the request. Anyone who holds this token can interact with the API and it's routes, hence, it's important to keep then safetly store.

Because of the power of this tokens they are short lived, if an evil user intercepts the token, there's only a short frame for what the user can do.

### Refresh Tokens

Once an Access Token expires, a new one must be generated to keep interacting with the API. To avoid having to reauthenticate every 15 minutes or so, a Refresh token is also issued along with the Access Token when authenticated, using this token, a new Access Token can be generated without the need to send credentials again to the server.
The refresh token has a lifespam of up to 1 month, this way, a user can be singed client side up to 1 month, without requiring to sign in again (authenticate again).

### Rotatory Refresh Token System

Because of the power of generating infinite access tokens, a **Rotatory Refresh Token System** is implemented, this way, the absolute lifespam of the token pair is reduced, an in case an evil user intercepts any of the tokens, the system can identify when a refresh token is reused, and log the user out of the system for security.

This method lets the user by forever authenticated, as long as no token re-use is detected by the auth system or no refesh token is expired due to **max inactive time**.

The system will work storing the tokens in the database, keeping a "token history" for every user. How many tokens are stored determines for how long the system is able to detect a reutilization of tokens.

## Sign Out

The sign out process just invalidates any active token, needing to sign in again on every device.
