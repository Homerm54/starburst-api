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
