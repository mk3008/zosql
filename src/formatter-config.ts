export interface FormatterConfig {
  identifierEscape: {
    start: string;
    end: string;
  };
  parameterSymbol: string;
  parameterStyle: 'named' | 'positional';
  indentSize: number;
  indentChar: ' ' | '\t';
  newline: '\n' | '\r\n' | ' ';
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
  
  // 構造化されたフォーマットを適用
  formatted = formatSqlStructure(formatted, config);
  
  return formatted;
}

function formatSqlStructure(sql: string, config: FormatterConfig): string {
  const indent = config.indentChar.repeat(config.indentSize);
  let formatted = sql;
  
  // 順序を修正：細かい置換から大きな置換へ
  
  // 1. SELECTの後に改行とインデント
  formatted = formatted.replace(/\bselect\s+/gi, `select${config.newline}${indent}`);
  
  // 2. カンマの処理（before の場合）
  if (config.commaBreak === 'before') {
    formatted = formatted.replace(/,\s*/g, `${config.newline}${indent}, `);
  } else {
    formatted = formatted.replace(/,\s*/g, `, ${config.newline}${indent}`);
  }
  
  // 3. FROMの前に改行
  formatted = formatted.replace(/\s+from\s+/gi, `${config.newline}from${config.newline}${indent}`);
  
  // 4. WHEREの前に改行
  formatted = formatted.replace(/\s+where\s+/gi, `${config.newline}where${config.newline}${indent}`);
  
  // 5. ANDの処理（before の場合）
  if (config.andBreak === 'before') {
    formatted = formatted.replace(/\s+and\s+/gi, `${config.newline}${indent}and `);
  } else {
    formatted = formatted.replace(/\s+and\s+/gi, ` and${config.newline}${indent}`);
  }
  
  // 6. GROUP BYの前に改行
  formatted = formatted.replace(/\s+group\s+by\s+/gi, `${config.newline}group by${config.newline}${indent}`);
  
  // 7. ORDER BYの前に改行
  formatted = formatted.replace(/\s+order\s+by\s+/gi, `${config.newline}order by${config.newline}${indent}`);
  
  // 8. HAVINGの前に改行
  formatted = formatted.replace(/\s+having\s+/gi, `${config.newline}having${config.newline}${indent}`);
  
  return formatted.trim();
}