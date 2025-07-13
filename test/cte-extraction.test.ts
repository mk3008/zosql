import { describe, it, expect } from 'vitest';

/**
 * CTE除去とメインクエリ抽出のテストスイート
 * 
 * 問題: WITH句の除去が不完全で、CTEの定義部分が残ってしまう
 * 期待値: メインクエリのみが抽出されること
 */

describe('CTE Extraction and Main Query Isolation', () => {
  
  const simpleReportSql = `WITH user_orders AS (
    SELECT 
        user_id,
        COUNT(*) as order_count,
        SUM(amount) as total_amount
    FROM orders 
    WHERE created_at >= '2024-01-01'
    GROUP BY user_id
),
active_users AS (
    SELECT 
        user_id,
        email,
        region
    FROM users 
    WHERE last_login >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
    au.region,
    COUNT(DISTINCT au.user_id) as user_count,
    SUM(uo.order_count) as total_orders,
    SUM(uo.total_amount) as total_revenue
FROM active_users au
LEFT JOIN user_orders uo ON au.user_id = uo.user_id
GROUP BY au.region
ORDER BY total_revenue DESC`;

  const expectedMainQuery = `SELECT 
    au.region,
    COUNT(DISTINCT au.user_id) as user_count,
    SUM(uo.order_count) as total_orders,
    SUM(uo.total_amount) as total_revenue
FROM active_users au
LEFT JOIN user_orders uo ON au.user_id = uo.user_id
GROUP BY au.region
ORDER BY total_revenue DESC`;

  describe('Manual String Extraction', () => {
    
    function extractMainQueryManually(sql: string): string {
      // Find WITH clause boundaries
      const withStart = sql.toUpperCase().indexOf('WITH ');
      if (withStart === -1) {
        return sql;
      }
      
      // Extract the content after WITH
      const afterWith = sql.substring(withStart + 5); // Skip "WITH "
      
      // Find where the main SELECT starts (after all CTEs)
      let parenCount = 0;
      let inCTE = false;
      let mainSelectStart = -1;
      
      for (let i = 0; i < afterWith.length; i++) {
        const char = afterWith[i];
        
        if (char === '(') {
          parenCount++;
          if (!inCTE) {
            inCTE = true;
          }
        } else if (char === ')') {
          parenCount--;
          if (parenCount === 0 && inCTE) {
            inCTE = false;
            // Look for next SELECT after this CTE
            const remaining = afterWith.substring(i + 1).trim();
            if (remaining.toUpperCase().startsWith('SELECT')) {
              mainSelectStart = i + 1;
              break;
            }
          }
        }
      }
      
      if (mainSelectStart > -1) {
        return afterWith.substring(mainSelectStart).trim();
      }
      
      return sql; // Fallback
    }

    it('should extract main query correctly from simple CTE', () => {
      const result = extractMainQueryManually(simpleReportSql);
      
      console.log('=== CTE Extraction Test ===');
      console.log('Input SQL length:', simpleReportSql.length);
      console.log('Expected main query length:', expectedMainQuery.length);
      console.log('Actual result length:', result.length);
      console.log('\n--- Expected ---');
      console.log(expectedMainQuery);
      console.log('\n--- Actual ---');
      console.log(result);
      console.log('\n--- Match ---');
      console.log('Matches expected:', result.trim() === expectedMainQuery.trim());
      
      expect(result.trim()).toBe(expectedMainQuery.trim());
    });

    it('should handle SQL without WITH clause', () => {
      const simpleSelect = 'SELECT * FROM users WHERE id = 1';
      const result = extractMainQueryManually(simpleSelect);
      expect(result).toBe(simpleSelect);
    });

    it('should handle nested parentheses in CTEs', () => {
      const complexCte = `WITH complex_cte AS (
        SELECT user_id, 
               CASE WHEN (status = 'active' AND (created_at > '2023-01-01')) THEN 1 ELSE 0 END as is_active
        FROM users 
        WHERE region IN ('US', 'EU')
      )
      SELECT * FROM complex_cte WHERE is_active = 1`;
      
      const result = extractMainQueryManually(complexCte);
      expect(result).toBe('SELECT * FROM complex_cte WHERE is_active = 1');
    });
  });

  describe('CTE Position Detection', () => {
    
    function findCTEPositions(sql: string): Array<{name: string, start: number, end: number}> {
      const positions: Array<{name: string, start: number, end: number}> = [];
      const ctePattern = /(\w+)\s+AS\s*\(/gi;
      let match;
      
      while ((match = ctePattern.exec(sql)) !== null) {
        const name = match[1];
        const start = match.index;
        
        // Find the opening parenthesis
        const openParen = sql.indexOf('(', start);
        if (openParen === -1) continue;
        
        // Find matching closing parenthesis
        let parenCount = 1;
        let pos = openParen + 1;
        let end = -1;
        
        while (pos < sql.length && parenCount > 0) {
          if (sql[pos] === '(') parenCount++;
          if (sql[pos] === ')') parenCount--;
          if (parenCount === 0) {
            end = pos;
            break;
          }
          pos++;
        }
        
        if (end > -1) {
          positions.push({ name, start, end });
        }
      }
      
      return positions;
    }

    it('should detect CTE positions correctly', () => {
      const positions = findCTEPositions(simpleReportSql);
      
      console.log('\n=== CTE Position Detection ===');
      console.log('Found CTEs:', positions.length);
      positions.forEach((cte, index) => {
        console.log(`CTE ${index}: ${cte.name} at ${cte.start}-${cte.end}`);
        const cteContent = simpleReportSql.substring(cte.start, cte.end + 1);
        console.log(`Content: ${cteContent.substring(0, 100)}...`);
      });
      
      expect(positions).toHaveLength(2);
      expect(positions[0].name).toBe('user_orders');
      expect(positions[1].name).toBe('active_users');
    });
  });

  describe('Integration Test', () => {
    
    function extractCTEsAndMainQuery(sql: string): {
      ctes: Array<{name: string, query: string}>,
      mainQuery: string
    } {
      const ctes: Array<{name: string, query: string}> = [];
      
      // Find WITH clause boundaries
      const withStart = sql.toUpperCase().indexOf('WITH ');
      if (withStart === -1) {
        return { ctes: [], mainQuery: sql };
      }
      
      const afterWith = sql.substring(withStart + 5);
      
      // Extract CTEs
      const ctePattern = /(\w+)\s+AS\s*\(/gi;
      let match;
      const ctePositions: Array<{name: string, start: number}> = [];
      
      while ((match = ctePattern.exec(afterWith)) !== null) {
        ctePositions.push({
          name: match[1],
          start: match.index
        });
      }
      
      for (const ctePos of ctePositions) {
        const openParen = afterWith.indexOf('(', ctePos.start);
        if (openParen === -1) continue;
        
        let parenCount = 1;
        let pos = openParen + 1;
        let cteEnd = -1;
        
        while (pos < afterWith.length && parenCount > 0) {
          if (afterWith[pos] === '(') parenCount++;
          if (afterWith[pos] === ')') parenCount--;
          if (parenCount === 0) {
            cteEnd = pos;
            break;
          }
          pos++;
        }
        
        if (cteEnd > -1) {
          const cteQuery = afterWith.substring(openParen + 1, cteEnd).trim();
          ctes.push({ name: ctePos.name, query: cteQuery });
        }
      }
      
      // Extract main query
      let parenCount = 0;
      let inCTE = false;
      let mainSelectStart = -1;
      
      for (let i = 0; i < afterWith.length; i++) {
        const char = afterWith[i];
        
        if (char === '(') {
          parenCount++;
          if (!inCTE) inCTE = true;
        } else if (char === ')') {
          parenCount--;
          if (parenCount === 0 && inCTE) {
            inCTE = false;
            const remaining = afterWith.substring(i + 1).trim();
            if (remaining.toUpperCase().startsWith('SELECT')) {
              mainSelectStart = i + 1;
              break;
            }
          }
        }
      }
      
      const mainQuery = mainSelectStart > -1 
        ? afterWith.substring(mainSelectStart).trim() 
        : sql;
      
      return { ctes, mainQuery };
    }

    it('should extract both CTEs and main query correctly', () => {
      const result = extractCTEsAndMainQuery(simpleReportSql);
      
      console.log('\n=== Integration Test Results ===');
      console.log('CTEs found:', result.ctes.length);
      result.ctes.forEach((cte, index) => {
        console.log(`CTE ${index}: ${cte.name}`);
        console.log(`Query: ${cte.query.substring(0, 100)}...`);
      });
      
      console.log('\nMain query length:', result.mainQuery.length);
      console.log('Main query:', result.mainQuery);
      console.log('Expected length:', expectedMainQuery.length);
      console.log('Matches expected:', result.mainQuery.trim() === expectedMainQuery.trim());
      
      expect(result.ctes).toHaveLength(2);
      expect(result.ctes[0].name).toBe('user_orders');
      expect(result.ctes[1].name).toBe('active_users');
      expect(result.mainQuery.trim()).toBe(expectedMainQuery.trim());
    });
  });
});