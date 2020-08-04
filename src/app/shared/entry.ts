import { Timestamp } from '@firebase/firestore-types';

export interface FileUrl {
  title: string,
  type: string,
  size: number,
  url: string,
  path: string
}

export interface ImageUrl {
  url: string,
  path: string
}
export interface Entry {
  titles: string[],
  position: string,
  fullNameEN: string,
  fullNameTH: string,
  department: string,
  division: string,
  educations: {
    certification: string,
    place: string,
    year: number
  }[],
  background: string,
  keywords: string[],
  publications: string[],
  awards: {
    year: number,
    name: string
  }[],
  emails: string[],
  phoneNumbers: string[],
  fileUrls: FileUrl[],
  imageUrl: ImageUrl,
  links: {
    title: string,
    url: string
  }[],
  remarks: string,
  dateAdded: Timestamp,
  lastUpdated: Timestamp,
  complete: boolean,
  authorID: string,
  deleted?: boolean
}
