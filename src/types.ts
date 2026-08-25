export type ArticleStatus = 'draft' | 'published' | 'archived';
export type ArticleMode = 'standard' | 'custom';

export interface Article {
  id: string;
  slug: string;
  title: string;
  objectClass: string;
  description: string;
  tags: string[];
  dateAdded: string;
  status: ArticleStatus;
  contentWarnings: string[];
  sources?: Array<{
    title: string;
    author: string;
    url: string;
  }>;
  displayOrder?: number;
  mode: ArticleMode;
  hasStyle: boolean;
  hasScript: boolean;
  contentPath: string;
  assetBase: string;
}
