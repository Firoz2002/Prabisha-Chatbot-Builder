// types/workspace.ts
export interface Workspace {
  id: string
  name: string
  createdAt: Date
  owner?: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
  role?: WorkspaceRole
  displayName?: string | null
}

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'