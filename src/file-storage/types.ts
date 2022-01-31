type BasicEntityType = {
  name: string;
  id: string;

  /** Complete name of the folder in the user account */
  path_lower: string;
  path_display: string;

  sharing_info: {
    read_only: boolean;
    parent_shared_folder_id: string;
    traverse_only: boolean;
    no_access: boolean;
  };

  property_groups: [
    {
      template_id: string;
      fields: [
        {
          name: string;
          value: string;
        }
      ];
    }
  ];
};

export type FileType = BasicEntityType & {
  '.tag': 'folder';
  client_modified: string;
  server_modified: string;
  rev: string;

  /** Size of the File, in bytes */
  size: boolean;
};

export type FolderType = BasicEntityType & {
  '.tag': 'file';
  client_modified: string;
  server_modified: string;
  rev: string;
  is_downloadable: boolean;

  /** Size of the File, in bytes */
  size: number;
};

/** Timestamp in the %Y-%m-%dT%H:%M:%SZ format */
type Timestamp = string;

/**
 * @see media_info The is this field tha containt metadata info for image or video
 */
export type FileMetadata = {
  /** The mime type of the file, in case needed as part of the metadata of the file */
  mimetype: string;

  /** The last component of the path (including extension). This never contains a slash. */
  name: string;

  /** The last time the file was modified on Dropbox */
  server_modified: Timestamp;

  /** A unique identifier for the current revision of a file.
   * This field is the same rev as elsewhere in the API and can be used to detect
   * changes and avoid conflicts
   */
  rev: string;

  /** The file size in bytes */
  size: number;

  /**  A unique identifier for the file, useful for fetching by id, instead of path */
  id: string;
};

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

* From Upload - 200 - res.data:
{
  name: 'hola.txt',
  path_lower: '/a/hola.txt',
  path_display: '/a/hola.txt',
  id: 'id:St3LmJRPlZUAAAAAAAABbw',
  client_modified: '2022-01-29T02:28:24Z',
  server_modified: '2022-01-29T02:28:25Z',
  rev: '5d6af4e5087558c9436a1',
  size: 175,
  is_downloadable: true,
  content_hash: 'e8fabc98b2697b328201ab699ef1bd11a971cb934aa1254eebcd3ac86980152f'
}

* From download - error - error.data:
data: { error_summary: 'path/not_found/', error: [Object] }

* From download - 200 - headers['dropbox-api-result']:
{"name": "hola.txt", 
"path_lower": "/a/hola.txt", 
"path_display": "/a/hola.txt", 
"id": "id:St3LmJRPlZUAAAAAAAABbw", 
"client_modified": "2022-01-29T02:28:24Z", 
"server_modified": "2022-01-29T02:28:25Z", 
"rev": "5d6af4e5087558c9436a1", 
"size": 175, 
"is_downloadable": true,
 "content_hash": "e8fabc98b2697b328201ab699ef1bd11a971cb934aa1254eebcd3ac86980152f"
}

* Delete Operation - ok - response
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
