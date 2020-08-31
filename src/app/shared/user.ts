export interface Roles {
  admin?: boolean
}

export interface User {
  uid: string,
  displayName: string,
  email: string,
  photoURL: string,
  roles: Roles
}
