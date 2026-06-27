export type ASTNodeType =
  | 'text'
  | 'latex-inline'
  | 'latex-display'
  | 'image'
  | 'html'
  | 'table'
  | 'reference'
  | 'code';

export interface BaseNode {
  type: ASTNodeType;
  id?: string;
}

export interface TextNode extends BaseNode {
  type: 'text';
  content: string;
}

export interface MathInlineNode extends BaseNode {
  type: 'latex-inline';
  content: string;
}

export interface MathDisplayNode extends BaseNode {
  type: 'latex-display';
  content: string;
}

export interface ImageNode extends BaseNode {
  type: 'image';
  originalToken: string;
  resolvedUrl: string;
  resolvedUrls?: string[];
  altText?: string;
  hasError?: boolean;
}

export interface HtmlNode extends BaseNode {
  type: 'html';
  content: string;
}

export interface TableNode extends BaseNode {
  type: 'table';
  rows: string[][];
}

export interface ReferenceNode extends BaseNode {
  type: 'reference';
  targetId: string;
}

export interface CodeNode extends BaseNode {
  type: 'code';
  language: string;
  content: string;
}

export type RenderNode =
  | TextNode
  | MathInlineNode
  | MathDisplayNode
  | ImageNode
  | HtmlNode
  | TableNode
  | ReferenceNode
  | CodeNode;
