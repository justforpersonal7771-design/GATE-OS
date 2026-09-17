export class RateLimiter {
  private static queue: (() => Promise<void>)[] = [];
  private static isProcessing = false;
  private static lastRequestTime = 0;
  private static minCooldownMs = 1000; // 1 second between requests
  private static activeControllers = new Map<string, AbortController>();

  /**
   * Enqueue a request callback.
   * Ensures requests are spaced by cooldown limits and executes retries with backoff.
   */
  public static enqueue<T>(
    requestId: string,
    requestFn: (signal: AbortSignal) => Promise<T>,
    retries = 3,
    backoffMs = 1500
  ): Promise<T> {
    // 1. Duplicate Request Detection & Cancellation (AbortController)
    if (this.activeControllers.has(requestId)) {
      const existingController = this.activeControllers.get(requestId);
      existingController?.abort();
      this.activeControllers.delete(requestId);
    }

    const controller = new AbortController();
    this.activeControllers.set(requestId, controller);

    return new Promise<T>((resolve, reject) => {
      const task = async () => {
        try {
          // 2. Cooldown calculation
          const now = Date.now();
          const elapsed = now - this.lastRequestTime;
          if (elapsed < this.minCooldownMs) {
            await new Promise(r => setTimeout(r, this.minCooldownMs - elapsed));
          }

          if (controller.signal.aborted) {
            reject(new Error("Request aborted"));
            return;
          }

          this.lastRequestTime = Date.now();
          let attempt = 0;

          const execute = async (): Promise<T> => {
            try {
              return await requestFn(controller.signal);
            } catch (err: any) {
              if (controller.signal.aborted) {
                throw new Error("Request aborted");
              }
              if (attempt < retries) {
                attempt++;
                const delay = backoffMs * Math.pow(2, attempt - 1);
                console.warn(`Gemini Request failed. Retrying in ${delay}ms...`, err);
                await new Promise(r => setTimeout(r, delay));
                return execute();
              }
              throw err;
            }
          };

          const result = await execute();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.activeControllers.delete(requestId);
        }
      };

      this.queue.push(task);
      this.processQueue();
    });
  }

  private static async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        await nextTask();
      }
    }

    this.isProcessing = false;
  }

  /**
   * Cancel an active request.
   */
  public static cancelRequest(requestId: string) {
    if (this.activeControllers.has(requestId)) {
      this.activeControllers.get(requestId)?.abort();
      this.activeControllers.delete(requestId);
    }
  }

  /**
   * Cancel all pending/active requests.
   */
  public static cancelAll() {
    this.activeControllers.forEach(controller => controller.abort());
    this.activeControllers.clear();
    this.queue = [];
  }
}
