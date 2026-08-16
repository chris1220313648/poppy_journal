import type { AiProvider, BackgroundRemovalProvider } from "./types";

export class DisabledAiProvider implements AiProvider {
  private unavailable(): never {
    throw new Error("AI 功能将在后续版本开放");
  }
  async generateDraft() {
    return this.unavailable();
  }
  async rewrite() {
    return this.unavailable();
  }
  async suggestLayout() {
    return this.unavailable();
  }
}

export class DisabledBackgroundRemovalProvider implements BackgroundRemovalProvider {
  async removeBackground(): Promise<Blob> {
    throw new Error("自动抠图将在后续版本开放");
  }
}
