export class Utilities {
  /**
   * Delays the execution of the subsequent lines of code.
   * @param ms The time to sleep in milliseconds.
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
