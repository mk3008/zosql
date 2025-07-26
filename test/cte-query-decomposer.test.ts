import { describe, it, expect } from 'vitest';
import { SelectQueryParser, CTEQueryDecomposer } from 'rawsql-ts';

describe('CTEQueryDecomposer Tests', () => {
  
  it('should correctly decompose simple CTE query', () => {
    const sql = `
      WITH user_data AS (
        SELECT id, name FROM users WHERE active = true
      )
      SELECT * FROM user_data
    `;
    
    const query = SelectQueryParser.parse(sql);
    const simpleQuery = query.toSimpleQuery();
    
    const decomposer = new CTEQueryDecomposer({
      addComments: true,
      exportComment: true,
      preset: 'postgres',
      withClauseStyle: 'full-oneline'
    });
    
    const decomposedCTEs = decomposer.decompose(simpleQuery);
    
    expect(decomposedCTEs).toHaveLength(1);
    expect(decomposedCTEs[0].name).toBe('user_data');
    expect(decomposedCTEs[0].dependencies).toEqual([]);
    expect(decomposedCTEs[0].query).toContain('select "id", "name" from "users"');
  });

  it('should handle CTE with dependencies', () => {
    const sql = `
      WITH base_users AS (
        SELECT id, name FROM users WHERE active = true
      ),
      user_stats AS (
        SELECT user_id, COUNT(*) as order_count 
        FROM orders 
        GROUP BY user_id
      ),
      enriched_users AS (
        SELECT bu.id, bu.name, us.order_count
        FROM base_users bu
        LEFT JOIN user_stats us ON bu.id = us.user_id
      )
      SELECT * FROM enriched_users
    `;
    
    const query = SelectQueryParser.parse(sql);
    const simpleQuery = query.toSimpleQuery();
    
    const decomposer = new CTEQueryDecomposer({
      addComments: true,
      exportComment: true,
      preset: 'postgres',
      withClauseStyle: 'full-oneline'
    });
    
    const decomposedCTEs = decomposer.decompose(simpleQuery);
    
    expect(decomposedCTEs).toHaveLength(3);
    
    // Check CTE names
    const cteNames = decomposedCTEs.map(cte => cte.name);
    expect(cteNames).toContain('base_users');
    expect(cteNames).toContain('user_stats');
    expect(cteNames).toContain('enriched_users');
    
    // Check dependencies
    const enrichedUsersCte = decomposedCTEs.find(cte => cte.name === 'enriched_users');
    expect(enrichedUsersCte?.dependencies).toEqual(['base_users', 'user_stats']);
    
    // Check that each CTE has its own executable query
    for (const cte of decomposedCTEs) {
      expect(cte.query).toBeTruthy();
      expect(cte.query.length).toBeGreaterThan(0);
      
      // Each CTE query is just the SELECT part with comments
      expect(cte.query).toContain('select');
    }
  });

  it('should handle complex CTE with multiple dependencies', () => {
    const sql = `
      WITH session_data AS (
        SELECT user_id, session_id, start_time 
        FROM user_sessions 
        WHERE start_time >= current_date - INTERVAL '7 days'
      ),
      user_engagement AS (
        SELECT user_id, COUNT(distinct session_id) as total_sessions
        FROM session_data 
        GROUP BY user_id
      ),
      conversion_events AS (
        SELECT user_id, event_type, event_time
        FROM events 
        WHERE event_time >= current_date - INTERVAL '7 days'
      ),
      funnel_analysis AS (
        SELECT ce.user_id, 
               MAX(CASE WHEN ce.event_type = 'signup' THEN 1 ELSE 0 END) as has_signup
        FROM conversion_events ce 
        GROUP BY ce.user_id
      ),
      final_analysis AS (
        SELECT ue.user_id, ue.total_sessions, fa.has_signup
        FROM user_engagement ue
        LEFT JOIN funnel_analysis fa ON ue.user_id = fa.user_id
      )
      SELECT * FROM final_analysis
    `;
    
    const query = SelectQueryParser.parse(sql);
    const simpleQuery = query.toSimpleQuery();
    
    const decomposer = new CTEQueryDecomposer({
      addComments: true,
      exportComment: true, 
      preset: 'postgres',
      withClauseStyle: 'full-oneline'
    });
    
    const decomposedCTEs = decomposer.decompose(simpleQuery);
    
    expect(decomposedCTEs).toHaveLength(5);
    
    // Verify all CTEs are present
    const cteNames = decomposedCTEs.map(cte => cte.name);
    expect(cteNames).toContain('session_data');
    expect(cteNames).toContain('user_engagement');
    expect(cteNames).toContain('conversion_events');
    expect(cteNames).toContain('funnel_analysis');
    expect(cteNames).toContain('final_analysis');
    
    // Check specific dependencies
    const userEngagementCte = decomposedCTEs.find(cte => cte.name === 'user_engagement');
    expect(userEngagementCte?.dependencies).toEqual(['session_data']);
    
    const funnelAnalysisCte = decomposedCTEs.find(cte => cte.name === 'funnel_analysis');
    expect(funnelAnalysisCte?.dependencies).toEqual(['conversion_events']);
    
    const finalAnalysisCte = decomposedCTEs.find(cte => cte.name === 'final_analysis');
    expect(finalAnalysisCte?.dependencies).toEqual(['user_engagement', 'funnel_analysis']);
    
    // Verify each CTE produces executable SQL
    for (const cte of decomposedCTEs) {
      expect(cte.query).toBeTruthy();
      expect(cte.query).toContain('select');
      
      // Comments may contain references to dependents
      // This is expected behavior for dependency tracking
      
      // Should contain Auto-generated comment
      expect(cte.query).toContain('/* Auto-generated by CTE decomposer */');
    }
  });

  it('should handle query without CTEs', () => {
    const sql = 'SELECT id, name FROM users WHERE active = true';
    
    const query = SelectQueryParser.parse(sql);
    const simpleQuery = query.toSimpleQuery();
    
    const decomposer = new CTEQueryDecomposer({
      addComments: true,
      exportComment: true,
      preset: 'postgres',
      withClauseStyle: 'full-oneline'
    });
    
    const decomposedCTEs = decomposer.decompose(simpleQuery);
    
    expect(decomposedCTEs).toHaveLength(0);
  });

  it('should produce different queries for different CTEs', () => {
    const sql = `
      WITH users_active AS (
        SELECT id, name FROM users WHERE active = true
      ),
      orders_recent AS (
        SELECT id, user_id, amount FROM orders WHERE created_at >= current_date - INTERVAL '30 days'
      ),
      user_orders AS (
        SELECT u.name, COUNT(o.id) as order_count
        FROM users_active u
        LEFT JOIN orders_recent o ON u.id = o.user_id
        GROUP BY u.name
      )
      SELECT * FROM user_orders
    `;
    
    const query = SelectQueryParser.parse(sql);
    const simpleQuery = query.toSimpleQuery();
    
    const decomposer = new CTEQueryDecomposer({
      addComments: true,
      exportComment: true,
      preset: 'postgres',
      withClauseStyle: 'full-oneline'
    });
    
    const decomposedCTEs = decomposer.decompose(simpleQuery);
    
    expect(decomposedCTEs).toHaveLength(3);
    
    // Each CTE should have a different query
    const queries = decomposedCTEs.map(cte => cte.query);
    const uniqueQueries = new Set(queries);
    expect(uniqueQueries.size).toBe(3); // All queries should be different
    
    // Verify specific content
    const usersActiveCte = decomposedCTEs.find(cte => cte.name === 'users_active');
    const ordersRecentCte = decomposedCTEs.find(cte => cte.name === 'orders_recent');
    const userOrdersCte = decomposedCTEs.find(cte => cte.name === 'user_orders');
    
    expect(usersActiveCte?.query).toContain('where "active" = true');
    expect(ordersRecentCte?.query).toContain('where "created_at" >=');
    expect(userOrdersCte?.query).toContain('left join');
    
    // user_orders should depend on both other CTEs
    expect(userOrdersCte?.dependencies).toEqual(['users_active', 'orders_recent']);
  });
});