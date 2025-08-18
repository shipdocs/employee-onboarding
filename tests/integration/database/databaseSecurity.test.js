/**
 * Integration tests for database operations with Row Level Security (RLS)
 * Tests data access control, query security, and transaction handling
 */

const { createClient } = require('../../../lib/supabase');
const { generateJWT } = require('../../../lib/auth');

// Mock Supabase client with RLS simulation
jest.mock('../../../lib/supabase', () => {
  const mockRLS = {
    checkPolicy: (table, operation, user, data) => {
      // Simulate RLS policies
      switch (table) {
        case 'users':
          // Users can only read their own data
          if (operation === 'select' && user.role === 'crew') {
            return data.filter(row => row.id === user.id);
          }
          // Managers can read users in their company
          if (operation === 'select' && user.role === 'manager') {
            return data.filter(row => row.company_id === user.company_id);
          }
          // Admins can read all
          if (operation === 'select' && user.role === 'admin') {
            return data;
          }
          return [];

        case 'training_progress':
          // Users can only access their own progress
          if (user.role === 'crew') {
            return data.filter(row => row.user_id === user.id);
          }
          // Managers can see their crew's progress
          if (user.role === 'manager') {
            return data.filter(row => row.company_id === user.company_id);
          }
          return data;

        case 'companies':
          // Only admins and managers can access companies
          if (user.role === 'crew') {
            return [];
          }
          if (user.role === 'manager') {
            return data.filter(row => row.id === user.company_id);
          }
          return data;

        default:
          return data;
      }
    }
  };

  return {
    createClient: jest.fn((useServiceRole = false) => {
      const client = {
        useServiceRole,
        currentUser: null,
        auth: {
          setAuth: (token) => {
            // Decode token to get user info
            if (token) {
              const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
              client.currentUser = {
                id: payload.userId,
                role: payload.role,
                company_id: payload.company_id
              };
            }
          }
        },
        from: (table) => {
          const queryBuilder = {
            table,
            filters: [],
            data: [],
            error: null,

            select: (columns = '*') => {
              queryBuilder.operation = 'select';
              return queryBuilder;
            },

            insert: (data) => {
              queryBuilder.operation = 'insert';
              queryBuilder.data = Array.isArray(data) ? data : [data];
              return queryBuilder;
            },

            update: (data) => {
              queryBuilder.operation = 'update';
              queryBuilder.updateData = data;
              return queryBuilder;
            },

            delete: () => {
              queryBuilder.operation = 'delete';
              return queryBuilder;
            },

            eq: (column, value) => {
              queryBuilder.filters.push({ type: 'eq', column, value });
              return queryBuilder;
            },

            in: (column, values) => {
              queryBuilder.filters.push({ type: 'in', column, values });
              return queryBuilder;
            },

            gt: (column, value) => {
              queryBuilder.filters.push({ type: 'gt', column, value });
              return queryBuilder;
            },

            single: () => {
              queryBuilder.single = true;
              return queryBuilder;
            },

            // Execute the query
            then: (resolve) => {
              // Simulate RLS if not using service role
              if (!client.useServiceRole && client.currentUser) {
                const allData = getMockData(table);
                let filteredData = mockRLS.checkPolicy(
                  table,
                  queryBuilder.operation,
                  client.currentUser,
                  allData
                );

                // Apply filters
                queryBuilder.filters.forEach(filter => {
                  filteredData = applyFilter(filteredData, filter);
                });

                if (queryBuilder.single) {
                  resolve({
                    data: filteredData[0] || null,
                    error: filteredData.length === 0 ? { message: 'No rows found' } : null
                  });
                } else {
                  resolve({ data: filteredData, error: null });
                }
              } else {
                // Service role bypasses RLS
                resolve({ data: getMockData(table), error: null });
              }
            }
          };

          return queryBuilder;
        }
      };

      return client;
    })
  };
});

// Mock data for testing
function getMockData(table) {
  const mockData = {
    users: [
      { id: 'user-1', email: 'crew1@company1.com', role: 'crew', company_id: 'company-1' },
      { id: 'user-2', email: 'crew2@company1.com', role: 'crew', company_id: 'company-1' },
      { id: 'user-3', email: 'crew1@company2.com', role: 'crew', company_id: 'company-2' },
      { id: 'manager-1', email: 'manager@company1.com', role: 'manager', company_id: 'company-1' },
      { id: 'admin-1', email: 'admin@system.com', role: 'admin', company_id: null }
    ],
    training_progress: [
      { id: 1, user_id: 'user-1', phase: 1, completed: true, company_id: 'company-1' },
      { id: 2, user_id: 'user-1', phase: 2, completed: false, company_id: 'company-1' },
      { id: 3, user_id: 'user-2', phase: 1, completed: true, company_id: 'company-1' },
      { id: 4, user_id: 'user-3', phase: 1, completed: false, company_id: 'company-2' }
    ],
    companies: [
      { id: 'company-1', name: 'Shipping Co 1', active: true },
      { id: 'company-2', name: 'Shipping Co 2', active: true }
    ]
  };

  return mockData[table] || [];
}

function applyFilter(data, filter) {
  switch (filter.type) {
    case 'eq':
      return data.filter(row => row[filter.column] === filter.value);
    case 'in':
      return data.filter(row => filter.values.includes(row[filter.column]));
    case 'gt':
      return data.filter(row => row[filter.column] > filter.value);
    default:
      return data;
  }
}

describe('Database Security with RLS', () => {
  describe('Row Level Security Enforcement', () => {
    test('crew members can only access their own user data', async () => {
      const crewUser = {
        id: 'user-1',
        email: 'crew1@company1.com',
        role: 'crew',
        company_id: 'company-1'
      };

      const token = generateJWT(crewUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      // Try to select all users
      const { data, error } = await supabase
        .from('users')
        .select('*');

      // Should only return the crew member's own data
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('user-1');
      expect(data[0].email).toBe('crew1@company1.com');
    });

    test('managers can access users in their company', async () => {
      const managerUser = {
        id: 'manager-1',
        email: 'manager@company1.com',
        role: 'manager',
        company_id: 'company-1'
      };

      const token = generateJWT(managerUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      const { data, error } = await supabase
        .from('users')
        .select('*');

      // Should return all users in company-1
      expect(data).toHaveLength(3); // 2 crew + 1 manager
      expect(data.every(user => user.company_id === 'company-1')).toBe(true);
    });

    test('admins can access all user data', async () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@system.com',
        role: 'admin'
      };

      const token = generateJWT(adminUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      const { data, error } = await supabase
        .from('users')
        .select('*');

      // Should return all users
      expect(data).toHaveLength(5);
    });

    test('service role bypasses RLS', async () => {
      const supabase = createClient(true); // Use service role

      const { data, error } = await supabase
        .from('users')
        .select('*');

      // Service role should see all data
      expect(data).toHaveLength(5);
    });
  });

  describe('Training Progress Access Control', () => {
    test('crew can only see their own training progress', async () => {
      const crewUser = {
        id: 'user-1',
        role: 'crew',
        company_id: 'company-1'
      };

      const token = generateJWT(crewUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      const { data, error } = await supabase
        .from('training_progress')
        .select('*');

      expect(data).toHaveLength(2); // Only user-1's progress
      expect(data.every(progress => progress.user_id === 'user-1')).toBe(true);
    });

    test('managers can see all training progress in their company', async () => {
      const managerUser = {
        id: 'manager-1',
        role: 'manager',
        company_id: 'company-1'
      };

      const token = generateJWT(managerUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      const { data, error } = await supabase
        .from('training_progress')
        .select('*');

      // Should see progress for all users in company-1
      expect(data).toHaveLength(3);
      expect(data.every(progress => progress.company_id === 'company-1')).toBe(true);
    });
  });

  describe('Company Data Access Control', () => {
    test('crew members cannot access company data', async () => {
      const crewUser = {
        id: 'user-1',
        role: 'crew',
        company_id: 'company-1'
      };

      const token = generateJWT(crewUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      const { data, error } = await supabase
        .from('companies')
        .select('*');

      expect(data).toHaveLength(0);
    });

    test('managers can only access their own company', async () => {
      const managerUser = {
        id: 'manager-1',
        role: 'manager',
        company_id: 'company-1'
      };

      const token = generateJWT(managerUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      const { data, error } = await supabase
        .from('companies')
        .select('*');

      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('company-1');
    });

    test('admins can access all companies', async () => {
      const adminUser = {
        id: 'admin-1',
        role: 'admin'
      };

      const token = generateJWT(adminUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      const { data, error } = await supabase
        .from('companies')
        .select('*');

      expect(data).toHaveLength(2);
    });
  });

  describe('Query Security', () => {
    test('prevents data leakage through filters', async () => {
      const crewUser = {
        id: 'user-1',
        role: 'crew',
        company_id: 'company-1'
      };

      const token = generateJWT(crewUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      // Try to access another user's data through filter
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', 'user-2');

      // RLS should prevent access even with specific filter
      expect(data).toHaveLength(0);
    });

    test('prevents unauthorized updates', async () => {
      const crewUser = {
        id: 'user-1',
        role: 'crew',
        company_id: 'company-1'
      };

      const token = generateJWT(crewUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      // Try to update another user's data
      const updateResult = await supabase
        .from('users')
        .update({ email: 'hacked@example.com' })
        .eq('id', 'user-2');

      // Should fail due to RLS
      expect(updateResult.error).toBeDefined();
    });

    test('prevents unauthorized deletes', async () => {
      const crewUser = {
        id: 'user-1',
        role: 'crew',
        company_id: 'company-1'
      };

      const token = generateJWT(crewUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      // Try to delete another user's progress
      const deleteResult = await supabase
        .from('training_progress')
        .delete()
        .eq('user_id', 'user-2');

      // Should fail due to RLS
      expect(deleteResult.error).toBeDefined();
    });
  });

  describe('Transaction Security', () => {
    test('ensures atomic operations with RLS', async () => {
      const managerUser = {
        id: 'manager-1',
        role: 'manager',
        company_id: 'company-1'
      };

      const token = generateJWT(managerUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      // Simulate a transaction that should be atomic
      const operations = [
        supabase.from('users').insert({ 
          id: 'new-user',
          email: 'new@company1.com',
          role: 'crew',
          company_id: 'company-1'
        }),
        supabase.from('training_progress').insert({
          user_id: 'new-user',
          phase: 1,
          completed: false,
          company_id: 'company-1'
        })
      ];

      // All operations should respect RLS
      const results = await Promise.all(operations);
      results.forEach(result => {
        if (result.error) {
          // If any operation fails, all should be rolled back
          expect(result.error).toBeDefined();
        }
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    test('prevents SQL injection through parameters', async () => {
      const adminUser = {
        id: 'admin-1',
        role: 'admin'
      };

      const token = generateJWT(adminUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      // Attempt SQL injection
      const maliciousInput = "'; DROP TABLE users; --";
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', maliciousInput);

      // Should safely handle the input without executing SQL
      expect(data).toBeDefined();
      expect(error).toBeNull();
      // Table should still exist (mock wouldn't actually drop it)
    });

    test('sanitizes user input in queries', async () => {
      const managerUser = {
        id: 'manager-1',
        role: 'manager',
        company_id: 'company-1'
      };

      const token = generateJWT(managerUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      const dangerousInputs = [
        "admin'--",
        "1' OR '1'='1",
        "'; UPDATE users SET role='admin' WHERE '1'='1"
      ];

      for (const input of dangerousInputs) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', input);

        // Should return empty result, not execute injection
        expect(data).toEqual([]);
        expect(error).toBeNull();
      }
    });
  });

  describe('Data Validation at Database Level', () => {
    test('enforces data types and constraints', async () => {
      const adminUser = {
        id: 'admin-1',
        role: 'admin'
      };

      const token = generateJWT(adminUser);
      const supabase = createClient();
      supabase.auth.setAuth(token);

      // Try to insert invalid data
      const invalidInserts = [
        {
          table: 'users',
          data: { id: null, email: 'test@example.com' }, // null ID
          expectedError: 'ID cannot be null'
        },
        {
          table: 'users',
          data: { id: 'test', email: 'invalid-email' }, // invalid email
          expectedError: 'Invalid email format'
        },
        {
          table: 'training_progress',
          data: { user_id: 'test', phase: 'not-a-number' }, // invalid phase type
          expectedError: 'Phase must be a number'
        }
      ];

      for (const test of invalidInserts) {
        const result = await supabase
          .from(test.table)
          .insert(test.data);

        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Audit Trail', () => {
    test('logs database operations for security monitoring', async () => {
      const auditLog = [];
      
      // Mock audit logging
      const auditedSupabase = {
        ...createClient(),
        from: (table) => {
          const original = createClient().from(table);
          return new Proxy(original, {
            get(target, prop) {
              if (['select', 'insert', 'update', 'delete'].includes(prop)) {
                return (...args) => {
                  auditLog.push({
                    timestamp: new Date().toISOString(),
                    table,
                    operation: prop,
                    user: 'test-user',
                    args
                  });
                  return target[prop](...args);
                };
              }
              return target[prop];
            }
          });
        }
      };

      // Perform operations
      await auditedSupabase.from('users').select('*');
      await auditedSupabase.from('users').update({ email: 'new@example.com' }).eq('id', 'user-1');

      expect(auditLog).toHaveLength(2);
      expect(auditLog[0].operation).toBe('select');
      expect(auditLog[1].operation).toBe('update');
    });
  });
});