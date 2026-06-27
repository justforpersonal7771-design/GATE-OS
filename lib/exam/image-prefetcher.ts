import { RenderableQuestion } from "@/types/question.types";

export class ImagePrefetcher {
  private static prefetchedUrls = new Set<string>();

  public static prefetch(questions: (RenderableQuestion | null)[]) {
    if (typeof window === "undefined") return;

    questions.forEach((q) => {
      if (!q) return;

      // check content nodes
      q.contentAst.forEach((node) => {
        if (node.type === "image") {
          const urls = node.resolvedUrls?.length ? node.resolvedUrls : [node.resolvedUrl];
          urls.forEach(url => {
            if (url && !this.prefetchedUrls.has(url)) {
              this.prefetchUrl(url);
            }
          });
        }
      });

      // check options nodes
      if (q.options) {
        q.options.forEach((opt) => {
          opt.contentAst.forEach((node) => {
            if (node.type === "image") {
              const urls = node.resolvedUrls?.length ? node.resolvedUrls : [node.resolvedUrl];
              urls.forEach(url => {
                if (url && !this.prefetchedUrls.has(url)) {
                  this.prefetchUrl(url);
                }
              });
            }
          });
        });
      }
    });
  }

  private static prefetchUrl(url: string) {
    this.prefetchedUrls.add(url);
    const img = new Image();
    img.src = url;
  }
}
