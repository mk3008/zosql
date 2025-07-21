/**
 * SQL Formatter Config Storage Adapter
 * Infrastructure Layer - LocalStorage Implementation
 */

import { FormatterStoragePort, FormatterConfig } from '@core/usecases/formatter-manager';

const STORAGE_KEY = 'zosql-formatter-config';

export class FormatterConfigStorage implements FormatterStoragePort {
  /**
   * フォーマッター設定を保存
   * @param config - 保存する設定
   */
  async saveConfig(config: FormatterConfig): Promise<void> {
    try {
      const serialized = JSON.stringify(config, null, 2);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      throw new Error(`Failed to save formatter config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * フォーマッター設定を読み込み
   * @returns 保存された設定またはnull
   */
  async loadConfig(): Promise<FormatterConfig | null> {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return null;
      }
      
      return JSON.parse(serialized) as FormatterConfig;
    } catch (error) {
      console.warn('Failed to load formatter config, returning null:', error);
      return null;
    }
  }

  /**
   * フォーマッター設定を削除
   */
  async clearConfig(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      throw new Error(`Failed to clear formatter config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}