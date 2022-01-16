# Starburst API

This API is part of the Starburst project, and thus, represents the Back End, RESTful API that the client software uses to interact with, mostly, the Database, make connections and delegate tasks.

The API especification, along with the documentation resides in the `openapi.json` file, that follows the Open Api Specifications Version 3.0, and in the interactive HTLM page in the `docs/index.html`, which contains information about the endpoints, results, headers, authentication methods, and every other technical aspect.

The following sections are part of what this API is does, how it does it, and what services are needed for it. The [last section](#Get-it-running) shows how to clone, start the application, and build it for production.

## Systems

### Authentication System

The authentication system is the first and most important security wall, that guards private, or protected routes agains malicious requests. The system is based on the **Access - Refresh Token approach**, and thus, uses a Bearer Token Authentication, any request to the API, must come with the Authentication Token, called in the API context the Access Token.

The System also uses a Refresh Token, allowing to create new Access Tokens when the client sees fit (after closing local session or after the Access Token expires, for example). This Refresh Token comes with a Rotatory System, which seals the absolute token pair lifespam to the lifespam of the Access Token, but also allows using the Refresh Token at least once in a very long period.

This rotatory token system also allows to invalidate any refresh token compromised, since using a token more than once (reuse detection system) yields in the sign out of the user in all the devices, invalidating any token pair issued and requesting a new sign in.

This tokens are the barebone of the API security, and the source code related to it resides in the `auth/` folder.

- Methods

Currently, the system only have one authentication method, email + password, new methods will be added in subsequent releases, since the Token Session Sytem doesn't neeeds to change, it easy to implement new methods that the client acan opt to at any time.

## Services the API uses

### Database Service

The API make use of **MongoDB** as the central database where all the persisten data is stored, the multiples services make use of the Database through models, that represents the single source of interaction with the Database code, hence, no Mongo related imports or manipulations are done outside of the `/database` folder.

- Server Status
  To make it easy to the client to detect any connection problems beforehand, the `status` endpoint is available, which checks the database state, in case of any error that make it imposible to handle requests, the error status is send.

All the database related code is inside the `/database` folder, and the services imports the models in this folder to get, create, update, delete or delete documents, as well as access special functions, validators, and any other feature needed by the service.

### Dropbox Service

The Database only store data, JSON like structures limited to 10MB currently, so, to fill the neeeds to store actual files used by the client, the Dropbox API is used, presented to the systems via the `/fileStorage` folder in the source code. This allows the systems in the API to interact as needed with the File Storage API.

The connection between this API and the Dropbox API is done **with** the User account, not the account in the database, but their Dropbox account, allowing then to see the files saved on their account, interact with them, and create a transparency policy be letting the user be in control.
