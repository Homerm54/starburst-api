/**
 * Same OAuth 2.0 Flow
 * @module FileStorageManager File Storage Module based on the **Dropbox** Service.
 *
 * # How this Works
 * This module can be seen as a Dropbox "SDK" that exposes the functions, constants and tools needed for
 * the services to access the File Storage System, thus, this folder contains all the Dropbox related
 * logic, and no direct dropbox import, or call shall be outside of this module, all the operations are
 * done through functions calls.
 *
 * The connection with Dropbox is done via the HTTP API, and the authentication is done via an unique
 * access token, this token is a relationship between this Application, the Dropbox account of the user,
 * and the allowed scopes where this application can act on.
 *
 * The token is stored in the user account, and is requested by the functions, then, operatoins are performed
 * using the stored token as the only authorization and identification mechanism.
 *
 * This is just the File Storage **service**, so no use of database here, in case any **system** needs to
 * keep a file and metadata in the database, such system will need to create a model and make uses of the
 * functions provided by this service.
 *
 * # How to get the token TODO: Move this to client
 * The user must authorize the app to perform operations on the user account, so the user must be redirected
 * to the Dropbox Authorization page, a token is returned, and the user must introduce the token in the client.
 * - Link: https://developers.dropbox.com/oauth-guide, see Implementing Code Flow
 *
 * # Features
 * - Account Authentication
 * - CRUD operations on files in Dropbox
 * - Basic Account Information retrival
 */

/**
 * Check endpoints here!
 * https://dropbox.github.io/dropbox-api-v2-explorer/#check_app
 */

import axiosRaw from 'axios';
import { variables } from 'lib/config';
import { ServerError } from 'middlewares/errors';
import { FileType, FolderType } from './types';
import debug from 'debug';

const log = debug('file-system:index');

// Constants and objects
const APP_FOLDER_NAME = 'starburst-data';
const axios = axiosRaw.create({
  baseURL: 'https://api.dropboxapi.com/2',
  headers: {
    'Content-Type': 'application/json',
  },
});

axios.interceptors.response.use(
  (value) => value,
  function (error) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 401: {
        // Bad or expired access token
        throw new ServerError(
          401,
          'token-error',
          'token has expired or has been revoked by the user'
        );
      }

      case 403: {
        // Account access error, user isn't allowed
        throw new ServerError(
          403,
          'access-denied',
          'No token present in response'
        );
      }

      case 429: {
        // Too many request for this app, try again latter
        throw new ServerError(
          429,
          'too-many-requests',
          `Too many request from this API, try again in ${data.retry_after} seconds`
        );
      }

      default:
        throw error;
    }
  }
);

class FileServiceError extends Error {
  code: string;
  message: string;

  constructor(code: string, message?: string) {
    super();
    this.code = code;
    this.message = message || '';
  }
}

// Account Operations and Authorization Section
/** Total size of the folder passed, with subfolders, in bytes  */
type TotalSize = number;
/** Number of files inside the given folder, and it's subfolders  */
type TotalFiles = number;
/**
 * Calculates the number of files in any given folder, along with the total
 * size used by said folder.
 * **This function works recursively**, meaning that the whole folder and subfolder will
 * be traversed.
 *
 * @param accessToken The access token to authenticate
 * @param data.path The name, or path, of folder name that will be analyzed.
 */
const getFolderAnalitics = async (
  accessToken: string,
  data: { cursor?: string; path: string }
): Promise<[TotalSize, TotalFiles]> => {
  let files: TotalFiles = 0;
  let totalSize: TotalSize = 0;
  const subFolders: string[] = [];
  let res;

  if (data.cursor) {
    log(
      `Getting more that from the folder ${data.path}, with cursor: ${data.cursor}`
    );
    // If cursor passed, get the files and folders that couldn't be
    // fetched on the last call to the endpoint
    res = await axios.post(
      '/files/list_folder/continue',
      { cursor: data.cursor, path: data.path },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } else {
    // If no cursor, then get the files and folders from the passed path
    log(`Getting data from the folder: ${data.path}`);
    res = await axios.post(
      '/files/list_folder',
      { path: data.path },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  }

  // Analyze the data retrieved from calling the endpoint, and add them to the
  // accumulators variables
  res.data.entries.forEach((item: FileType | FolderType) => {
    if (item['.tag'] === 'file') {
      files++;
      totalSize += item.size || 0;
    } else if (item['.tag'] === 'folder') {
      subFolders.push(item.path_lower);
    }
  });

  // In case that files and subfolders **from the current folder in data.path**
  // couldn't be retrieved, call this function again with the cursor, and then add
  // the result, this way, this function will call itself recursively until all the files
  // from the same top folder are retrieved and analyzed
  if (res.data.has_more && res.data.cursor) {
    const [accumulativeFiles, accumulativeSize] = await getFolderAnalitics(
      accessToken,
      {
        path: data.path,
        cursor: res.data.cursor,
      }
    );

    files += accumulativeFiles;
    totalSize += accumulativeSize;
  }

  log('Total Subfolders:', ...subFolders);

  // After finishing with the cursor, call this function again for all the subfolders
  // found, until all of them are retrieved and done
  if (subFolders.length > 0) {
    await Promise.all(
      subFolders.map(async (folder) => {
        const [accumulativeFiles, accumulativeSize] = await getFolderAnalitics(
          accessToken,
          {
            path: folder,
          }
        );

        files += accumulativeFiles;
        totalSize += accumulativeSize;
      })
    );
  }

  log('Total: ', totalSize, files);
  return [totalSize, files];
};

/**
 * Returns disk space metrics related to the Dropbox User Account.
 * @see [Doc Link](https://www.dropbox.com/developers/documentation/http/documentation#users-get_space_usage)
 */
const getSpaceAnalitics = async (accessToken: string) => {
  try {
    const res = await axios.post('/users/get_space_usage', null, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Results from the Dropbox API returns in bytes
    const used = parseInt(res.data.used, 10);
    const total = parseInt(res.data.allocation.allocated, 10);
    const remain = total - used;

    // The Folder Scoped Apps has all the path params relative to the app folder,
    // so that passing an empty string is the way to indicate the app's root folder
    const [files, spaceUsed] = await getFolderAnalitics(accessToken, {
      path: ``,
    });

    return {
      used: {
        gb: (used / 1e9).toFixed(3),
        mb: (used / 1e6).toFixed(3),
        kb: (used / 1e3).toFixed(3),
      },
      total: {
        gb: (total / 1e9).toFixed(3),
        mb: (total / 1e6).toFixed(3),
        kb: (total / 1e3).toFixed(3),
      },
      remain: {
        gb: (remain / 1e9).toFixed(3),
        mb: (remain / 1e6).toFixed(3),
        kb: (remain / 1e3).toFixed(3),
      },

      files,

      spaceUsed: {
        gb: (spaceUsed / 1e9).toFixed(3),
        mb: (spaceUsed / 1e6).toFixed(3),
        kb: (spaceUsed / 1e3).toFixed(3),
      },
    };
  } catch (error) {
    if (error instanceof ServerError) {
      throw error;
    }

    console.error(error);
    throw new FileServiceError('unknow', 'New error, check logs for details');
  }
};

// Auth functions - @see https://www.dropbox.com/developers/documentation/http/documentation#oauth2-token
/**
 * Generates the tokens needed to finish the authentication flow
 * started by the client, this function calls the endpoints needed and returns
 * the tokens to be stored in the database.
 */
const finishAuthFlow = async (code: string) => {
  const data = new URLSearchParams();
  data.append('code', code);
  data.append('grant_type', 'authorization_code');

  try {
    const res = await axios({
      url: 'https://api.dropboxapi.com/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      auth: {
        username: variables.DROPBOX_APP_KEY,
        password: variables.DROPBOX_APP_SECRET,
      },
      data,
    });

    if (!res.data.access_token || !res.data.refresh_token) {
      throw new ServerError(500, 'api-error', 'No token present in response');
    }

    return {
      access_token: res.data.access_token as string,
      refresh_token: res.data.refresh_token as string,
      serviceAccountId: (res.data.account_id as string) || null,
    };
  } catch (error: any) {
    if (axiosRaw.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx
        const status = error.response.status;
        const data = error.response.data;

        if (data.error === 'invalid_grant') {
          throw new ServerError(
            400,
            'invalid-code',
            "Code expired or doesn't Exist"
          );
        }

        console.error(status, data);
      }
    }

    // Something happened in setting up the request that triggered an Error
    console.error(error);
    throw new ServerError(500, 'unknow');
  }
};

/**
 * Creates a brand new Access Token without the need for the user to reautehenticate and
 * call again the authorization_code version of this endpoint.
 *
 * @param refresh_token The long-live refresh token that will be used to create new access tokens.
 */
const getNewAccessToken = async (refresh_token: string) => {
  // For some reason the endpoint works with urlencoded and not json, so data holds
  // the interface to add the required params to perfom the operation
  const data = new URLSearchParams();
  data.append('refresh_token', refresh_token);
  data.append('grant_type', 'refresh_token');

  try {
    const res = await axios({
      url: 'https://api.dropboxapi.com/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      auth: {
        // Basic HTTP Authentication with username and password, nothing fancy
        username: variables.DROPBOX_APP_KEY,
        password: variables.DROPBOX_APP_SECRET,
      },
      data,
    });

    if (!res.data.access_token) {
      throw new ServerError(
        500,
        'service-error',
        'No token present in response'
      );
    }

    return res.data.access_token as string;
  } catch (error) {
    if (error instanceof ServerError) {
      throw error;
    }

    if (axiosRaw.isAxiosError(error)) {
      if (error.response) {
        const data = error.response.data;
        const status = error.response.status;

        if (status === 400) {
          throw new ServerError(
            400,
            'invalid-token',
            'Refresh token is invalid or expired, either way, reauthenticate to get a new one.'
          );
        }
        console.error(status, data);
      }
      console.error(error);
      throw new FileServiceError('unkwon');
    }

    console.error(error);
    throw error;
  }
};

// Files Operations

const account = {
  getSpaceAnalitics,
  getNewAccessToken,
  finishAuthFlow,
};

export { FileServiceError, APP_FOLDER_NAME, account };

/**
 * This is with no redirect_uri
 * Dropbox responds with the code: MDyQ1TYEicgAAAAAAAAANHG4nsAn1ZgLAYAITbrD6PA
 * https://www.dropbox.com/oauth2/authorize?client_id=kif0d4fv1k8zfqa&token_access_type=offline&response_type=code
 * 
 * Response from finish auth flow:
 {
    "access_token": "sl.BAi3MYZoL_aJIvllju-GyHnA0Gg5W9Jss-Oq5SfYxRndtPl8Hsb40bdb1Lp4zlHG3nueh8GfiGpBYaGMU6VF_2UPonwe4GmnPp7pbDXlPgXruqwUQbgf9pckh3XjOBFHNf_NoKY",
    "token_type": "bearer",
    "expires_in": 14400,
    "refresh_token": "wOnByKf4HWkAAAAAAAAAAZ5LbeNphzaoeFnpfMyA76i1PpwTJrID9G87YTKT5IWM",
    "scope": "account_info.read files.content.read files.content.write files.metadata.read files.metadata.write",
    "uid": "4317086384",
    "account_id": "dbid:AADrp8AjFZd-e_qd1yQ77NCdu6gmrU5T6qA"
}

 * Response from generating a new access token
{
    "access_token": "sl.BAiMQHJt495E1hgjr1ggOh9uyRRnnQQlysgJ3WLtWGSiG23iMcs3tLKUkD-twBU6hUP8TjlXgEy6iu3Tlt8Pbpk9F9TJP8O1mTD3LcdYto8NdhlrWbkTj3uV9tJwRNZGRJww010",
    "token_type": "bearer",
    "expires_in": 14400
}
 */
