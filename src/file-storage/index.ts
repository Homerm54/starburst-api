/**
 * @author Omer Marquez <omer.marquezt@gmail.com>
 * @file Dropbox Connection File, all Dropbox related functions and types declared here.
 * @module FileStorageManager File Storage Module based on the **Dropbox** Service.
 */

/**
 * Check endpoints here!
 * https://dropbox.github.io/dropbox-api-v2-explorer/#check_app
 */

import axiosRaw from 'axios';
import { variables } from 'lib/config';
import { FileType, FolderType } from './types';
import { ServerError } from 'lib/error';
import { FileStorageError, FileStorageErrorCodes } from './error';
import { dropboxFileAPI, dropboxAuthAPI, log } from './constants';

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
    res = await dropboxAuthAPI.post(
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
    res = await dropboxAuthAPI.post(
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
    const res = await dropboxAuthAPI.post('/users/get_space_usage', null, {
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
    throw new FileStorageError(FileStorageErrorCodes.FATAL_ERROR);
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
    const res = await dropboxAuthAPI({
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
      throw new ServerError(
        500,
        FileStorageErrorCodes.FATAL_ERROR,
        'No access token present in Dropbox response'
      );
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
            FileStorageErrorCodes.INVALID_AUTH_CODE,
            'Authentication code is invalid or has expired, reauthtenticate'
          );
        }

        console.error(status, data);
      }
    }

    // Something happened in setting up the request that triggered an Error
    console.error(error);
    throw new ServerError(
      500,
      FileStorageErrorCodes.FATAL_ERROR,
      'unknown error'
    );
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
    const res = await dropboxAuthAPI({
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
        FileStorageErrorCodes.FATAL_ERROR,
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
            FileStorageErrorCodes.INVALID_REFRESH_TOKEN,
            'Refresh token is invalid or expired, reauthenticate to get a new one.'
          );
        }
        console.error(status, data);
      }
      console.error(error);
      throw new FileStorageError(FileStorageErrorCodes.FATAL_ERROR);
    }

    console.error(error);
    throw error;
  }
};

// Files Operations Section
/**
 * Upload a **new** file to Dropbox, or **overwrite** an existing one.
 * In order to overwrite, the file about to upload must have the same path
 * as an existing file.
 *
 * In case no overwrite, a new copy of the conflicted file is created with a "(1)"
 * in the name, or "(2)" depending on how many conflicted files are already.
 *
 * @param {string} accessToken The access token of the user account.
 * @param {Buffer} file The file that will be uploaded, must be in raw binary stream, or buffer, not in
 *  the file format
 * @param {string} path The path, inside the app folder, where the File will be uploaded
 * @param {boolean} [overwrite = false] If should overwrite the file in case of conflict.
 * @see https://www.dropbox.com/developers/documentation/http/documentation#files-upload for
 * information about the enpoint, and the conflict resolution methods.
 */
const uploadFile = async (
  accessToken: string,
  file: Buffer,
  path: string,
  overwrite = false
) => {
  const options = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mute: true,
        mode: {
          '.tag': overwrite ? 'overwrite' : 'add',
        },
        autorename: true,
        strict_conflict: false,
      }),
    },
  };

  try {
    const res = await dropboxFileAPI.post('/upload', file, options);

    // TODO: Check error in response data
    console.log(res.status, res.data);
  } catch (error) {
    if (axiosRaw.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx
        const status = error.response.status;
        const data = error.response.data;
        console.error(status, data);
      }
    }

    // Something happened in setting up the request that triggered an Error
    console.error(error);
    throw new FileStorageError(FileStorageErrorCodes.FATAL_ERROR);
  }
};

/**
 * Currently, there are 3 methods to access files in dropbox:
 * - Download the file directly
 * - Get a preview of the file
 * - Get a thumbnail
 *
 * Depending on the user needs, the files can be  sent to the client, the client
 * edits them, and then back to the API to save.
 * @see https://www.dropboxforum.com/t5/Dropbox-API-Support-Feedback/API-command-to-view-file-content-in-web-browser/td-p/283316
 *
 * Other interesting options are also:
 * - List Folder, to get the metadata of the folders, useful to show a preview of what's in the folder
 * - File Metadata
 * - Copy files
 * - Delete Batch
 * TODO: Check dropbox paper
 */
const getFile = async (accessToken: string, path: string) => {
  try {
    const res = await dropboxFileAPI.post('/download', null, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path }),
      },
    });

    console.log(res.status, res.headers, typeof res.data);
    return res.data;
  } catch (error) {
    if (error instanceof ServerError) {
      throw error;
    }

    if (axiosRaw.isAxiosError(error)) {
      if (error.response) {
        const data = error.response.data;
        const status = error.response.status;

        console.error(status, data);
      }
      console.error(error);
      throw new FileStorageError(FileStorageErrorCodes.FATAL_ERROR);
    }

    console.error(error);
    throw error;
  }
};
const getFilePreview = () => {
  // TODO:
};
const getFileThumbnail = () => {
  // TODO:
};
// files/uplad too, modify the mode param
const updateFile = () => {
  // check rev, from revision
  // this will determine the conflic
  // or use the overwrite force overwrite
};
// files/delete
const deleteFile = async (accessToken: string, path: string) => {
  try {
    const res = await dropboxAuthAPI.post(
      '/files/delete_v2',
      { path },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log(res.status, res.data);

    if (res.data.error) {
      const error = res.data.error['.tag'];
      // TODO: Throw error here!
    }
  } catch (error) {
    if (axiosRaw.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx
        const status = error.response.status;
        const data = error.response.data;
        console.error(status, data);
      }
    }

    // Something happened in setting up the request that triggered an Error
    console.error(error);
    throw new FileStorageError(FileStorageErrorCodes.FATAL_ERROR);
  }
};

// Export
const account = {
  getSpaceAnalitics,
  getNewAccessToken,
  finishAuthFlow,
};

const files = {
  upload: uploadFile,
  get: {
    file: getFile,
    thumbnail: getFileThumbnail,
    preview: getFilePreview,
  },
  update: updateFile,
  delete: deleteFile,
};
export { account, files };

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

 {
  metadata: {
    '.tag': 'file',
    name: '1.png',
    path_lower: '/a/1.png',
    path_display: '/a/1.png',
    id: 'id:St3LmJRPlZUAAAAAAAABbQ',
    client_modified: '2021-09-05T21:44:01Z',
    server_modified: '2022-01-27T01:53:32Z',
    rev: '5d68695eec9628c9436a1',
    size: 49141,
    is_downloadable: true,
    content_hash: 'e5a1cd68b52e4ec0c4920e3194c88ae7bc228512ede0d40d71982883cdc0427b'
  }
}
 */
