// src/lib/types.ts
export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

export interface FileContents {
  [path: string]: string;
}
