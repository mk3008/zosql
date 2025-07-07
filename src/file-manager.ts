export class FileManager {
  private files: Map<string, string> = new Map();

  writeFile(filename: string, content: string): void {
    this.files.set(filename, content);
  }

  readFile(filename: string): string | undefined {
    return this.files.get(filename);
  }

  exists(filename: string): boolean {
    return this.files.has(filename);
  }

  listFiles(): string[] {
    return Array.from(this.files.keys()).sort();
  }

  deleteFile(filename: string): boolean {
    return this.files.delete(filename);
  }

  clear(): void {
    this.files.clear();
  }

  getFileCount(): number {
    return this.files.size;
  }
}