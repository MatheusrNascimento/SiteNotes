export interface Reference {
  id: string;
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateReferenceRequest {
  url: string;
  title: string;
  tags?: string[];
}

export interface UpdateReferenceRequest {
  url: string;
  title: string;
  tags?: string[];
}
