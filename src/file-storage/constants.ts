import debug from 'debug';
import { basicErrorInterceptor } from './error';
import axios from 'axios';

const log = debug('file-system');

const APP_FOLDER_NAME = 'starburst-data';

const dropboxAuthAPI = axios.create({
  baseURL: 'https://api.dropboxapi.com/2',
  headers: {
    'Content-Type': 'application/json',
  },
});

const dropboxFileAPI = axios.create({
  baseURL: 'https://content.dropboxapi.com/2/files',
  headers: {
    'Content-Type': 'application/octet-stream',
  },

  // Tell axios not to parse the response of the server as JSON or something like that,
  // since all the responses from this enpoints are file streams
  responseType: 'arraybuffer',
});

dropboxAuthAPI.interceptors.response.use(
  (value) => value,
  basicErrorInterceptor
);
dropboxFileAPI.interceptors.response.use(
  (value) => value,
  basicErrorInterceptor
);

export { log, APP_FOLDER_NAME, dropboxAuthAPI, dropboxFileAPI };
