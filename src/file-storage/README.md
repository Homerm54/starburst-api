# Dropbox File Storage Service

# How this Works

This module can be seen as a Dropbox "SDK" that exposes the functions, constants and tools needed for the services to access the File Storage System, thus, this folder contains all the Dropbox related logic, and no direct dropbox import, or call shall be outside of this module, all the operations are done through functions calls.
The connection with Dropbox is done via the HTTP API, and the authentication is done via an unique
access token, this token is a relationship between this Application, the Dropbox account of the user,
and the allowed scopes where this application can act on.

The token is stored in the user account, and is requested by the functions, then, operatoins are performed using the stored token as the only authorization and identification mechanism.

This is just the File Storage **service**, so no use of database here, in case any **system** needs to keep a file and metadata in the database, such system will need to create a model and make uses of the functions provided by this service.

# How to get the token TODO: Move this to client

The user must authorize the app to perform operations on the user account, so the user must be redirected to the Dropbox Authorization page, a token is returned, and the user must introduce the token in the client.

# Features

- Account Authentication
- CRUD operations on files in Dropbox
- Basic Account Information retrival
