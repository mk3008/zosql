export interface FormatterConfig {
  identifierEscape: {
    start: string;
    end: string;
  };
  parameterSymbol: string;
  parameterStyle: 'named' | 'positional';
  indentSize: number;
  indentChar: string;
  newline: string;
  keywordCase: 'upper' | 'lower';
  commaBreak: 'before' | 'after';
  andBreak: 'before' | 'after';
}

export const DEFAULT_FORMATTER_CONFIG: FormatterConfig = {
  identifierEscape: {
    start: "",
    end: ""
  },
  parameterSymbol: ":",
  parameterStyle: "named",
  indentSize: 4,
  indentChar: " ",
  newline: "\n",
  keywordCase: "lower",
  commaBreak: "before",
  andBreak: "before"
};

export function applyFormatterConfig(sql: string, config: FormatterConfig = DEFAULT_FORMATTER_CONFIG): string {
  let formatted = sql;
  
  // クォートを除去（identifierEscapeが空の場合）
  if (config.identifierEscape.start === "" && config.identifierEscape.end === "") {
    formatted = formatted.replace(/"/g, '');
  }
  
  // キーワードケースの変換
  if (config.keywordCase === 'lower') {
    // 基本的なSQLキーワードを小文字に変換
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'GROUP', 'BY', 'ORDER', 'HAVING', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AS', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DISTINCT', 'UNION', 'INTERSECT', 'EXCEPT'];
    
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, keyword.toLowerCase());
    }
  }
  
  return formatted;
}