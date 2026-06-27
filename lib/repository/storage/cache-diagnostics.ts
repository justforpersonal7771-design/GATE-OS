export interface CacheDiagnostics {
  cacheAvailable: boolean;
  questionCount: number;
  datasetHash?: string;
  astVersion?: string;
}
