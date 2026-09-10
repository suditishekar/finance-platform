import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Dashboard API',
      version: '1.0.0',
      description: 'Backend API for a finance dashboard with role-based access control',
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste the token received from /auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'analyst', 'viewer'] },
            status: { type: 'string', enum: ['active', 'inactive'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        FinancialRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            amount: { type: 'number' },
            type: { type: 'string', enum: ['income', 'expense'] },
            category: { type: 'string' },
            date: { type: 'string', format: 'date' },
            notes: { type: 'string' },
            createdBy: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        ReconciliationMismatch: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            internal: { $ref: '#/components/schemas/FinancialRecord' },
            external: { type: 'object' },
            differences: { type: 'array', items: { type: 'string', enum: ['amount', 'type', 'category'] } },
          },
        },
        ReconciliationResult: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                totalInternalRecords: { type: 'integer' },
                totalExternalRecords: { type: 'integer' },
                matchedCount: { type: 'integer' },
                missingInternally: { type: 'integer' },
                missingExternally: { type: 'integer' },
                mismatchedCount: { type: 'integer' },
              },
            },
            matched: { type: 'array', items: { type: 'string', format: 'uuid' } },
            missingInternally: { type: 'array', items: { type: 'object' } },
            missingExternally: { type: 'array', items: { type: 'object' } },
            mismatched: { type: 'array', items: { $ref: '#/components/schemas/ReconciliationMismatch' } },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Register, login, and get current user' },
      { name: 'Users', description: 'User management — Admin only' },
      { name: 'Records', description: 'Financial records CRUD' },
      { name: 'Dashboard', description: 'Summary and analytics endpoints' },
      { name: 'Reconciliation', description: 'Compare PostgreSQL transactions with supplied reference data' },
    ],
    paths: {
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string', example: 'Sudit Admin' },
                    email: { type: 'string', example: 'admin@zorvyn.com' },
                    password: { type: 'string', example: 'secret123' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User created, returns JWT token' },
            409: { description: 'Email already in use' },
            422: { description: 'Validation error' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and receive a JWT token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'admin@zorvyn.com' },
                    password: { type: 'string', example: 'secret123' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful, returns JWT token' },
            401: { description: 'Invalid credentials' },
            403: { description: 'Account deactivated' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get the currently authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Current user details' },
            401: { description: 'Not authenticated' },
          },
        },
      },
      '/users': {
        get: {
          tags: ['Users'],
          summary: 'List all users — Admin only',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Array of users' },
            403: { description: 'Forbidden' },
          },
        },
        post: {
          tags: ['Users'],
          summary: 'Create a user — Admin only',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password', 'role'],
                  properties: {
                    name: { type: 'string', example: 'Finance Analyst' },
                    email: { type: 'string', example: 'analyst@example.com' },
                    password: { type: 'string', example: 'secret123' },
                    role: { type: 'string', enum: ['admin', 'analyst', 'viewer'] },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User created without password or token data' },
            403: { description: 'Forbidden' },
            409: { description: 'Email already in use' },
            422: { description: 'Validation error' },
          },
        },
      },
      '/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Get a single user by ID — Admin only',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'User found' },
            404: { description: 'User not found' },
          },
        },
        patch: {
          tags: ['Users'],
          summary: 'Update a user role or status — Admin only',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    role: { type: 'string', enum: ['admin', 'analyst', 'viewer'] },
                    status: { type: 'string', enum: ['active', 'inactive'] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'User updated' },
            404: { description: 'User not found' },
          },
        },
        delete: {
          tags: ['Users'],
          summary: 'Permanently delete a user — Admin only',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'User deleted without password or token data' },
            404: { description: 'User not found' },
          },
        },
      },
      '/records': {
        get: {
          tags: ['Records'],
          summary: 'List financial records — Admin, Analyst',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-01-01' },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-12-31' },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'Paginated list of records' },
            403: { description: 'Forbidden' },
          },
        },
        post: {
          tags: ['Records'],
          summary: 'Create a financial record — Admin only',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount', 'type', 'category', 'date'],
                  properties: {
                    amount: { type: 'number', example: 1500 },
                    type: { type: 'string', enum: ['income', 'expense'], example: 'income' },
                    category: { type: 'string', example: 'Salary' },
                    date: { type: 'string', format: 'date', example: '2026-04-01' },
                    notes: { type: 'string', example: 'April salary' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Record created' },
            403: { description: 'Forbidden' },
            422: { description: 'Validation error' },
          },
        },
      },
      '/records/{id}': {
        get: {
          tags: ['Records'],
          summary: 'Get a single record — Admin, Analyst',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Record found' },
            404: { description: 'Record not found' },
          },
        },
        patch: {
          tags: ['Records'],
          summary: 'Update a record — Admin only',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    amount: { type: 'number' },
                    type: { type: 'string', enum: ['income', 'expense'] },
                    category: { type: 'string' },
                    date: { type: 'string', format: 'date' },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Record updated' },
            404: { description: 'Record not found' },
          },
        },
        delete: {
          tags: ['Records'],
          summary: 'Soft delete a record — Admin only',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Record deleted' },
            404: { description: 'Record not found' },
          },
        },
      },
      '/dashboard/summary': {
        get: {
          tags: ['Dashboard'],
          summary: 'Total income, expenses, and net balance — All roles',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'from', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Optional range start; requires to' },
            { name: 'to', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Optional range end; requires from' },
          ],
          responses: {
            200: { description: 'Summary totals' },
            422: { description: 'Invalid date range' },
          },
        },
      },
      '/dashboard/daily-summary': {
        get: {
          tags: ['Dashboard'],
          summary: 'Daily income, expense, net, and count summary — All roles',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' }, example: '2026-01-01' },
            { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' }, example: '2026-01-31' },
          ],
          responses: {
            200: { description: 'Chronological daily summary rows' },
            422: { description: 'Invalid or reversed date range' },
          },
        },
      },
      '/dashboard/monthly-summary': {
        get: {
          tags: ['Dashboard'],
          summary: 'Monthly income, expense, net, and count summary — All roles',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' }, example: '2026-01-01' },
            { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' }, example: '2026-12-31' },
          ],
          responses: {
            200: { description: 'Chronological monthly summary rows' },
            422: { description: 'Invalid or reversed date range' },
          },
        },
      },
      '/dashboard/category-analysis': {
        get: {
          tags: ['Dashboard'],
          summary: 'Category totals and income/expense breakdown — All roles',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' }, example: '2026-01-01' },
            { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' }, example: '2026-12-31' },
          ],
          responses: {
            200: { description: 'Category analysis rows with type breakdowns' },
            422: { description: 'Invalid or reversed date range' },
          },
        },
      },
      '/dashboard/trend-analysis': {
        get: {
          tags: ['Dashboard'],
          summary: 'Chronological income, expense, and net trends — All roles',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' }, example: '2026-01-01' },
            { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' }, example: '2026-12-31' },
          ],
          responses: {
            200: { description: 'Chronological trend rows suitable for charting' },
            422: { description: 'Invalid or reversed date range' },
          },
        },
      },
      '/dashboard/by-category': {
        get: {
          tags: ['Dashboard'],
          summary: 'Totals grouped by category — All roles',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Category breakdown' },
          },
        },
      },
      '/dashboard/trends': {
        get: {
          tags: ['Dashboard'],
          summary: 'Monthly income and expense trends — All roles',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'months', in: 'query', schema: { type: 'integer', default: 6 }, description: 'Number of past months to include (max 24)' },
          ],
          responses: {
            200: { description: 'Monthly trends data' },
          },
        },
      },
      '/dashboard/recent': {
        get: {
          tags: ['Dashboard'],
          summary: 'Most recent transactions — All roles',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Number of records to return (max 50)' },
          ],
          responses: {
            200: { description: 'Recent activity list' },
          },
        },
      },
      '/reconciliation/compare': {
        post: {
          tags: ['Reconciliation'],
          summary: 'Compare active internal transactions with supplied reference data',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['referenceTransactions'],
                  properties: {
                    referenceTransactions: {
                      type: 'array',
                      maxItems: 10000,
                      items: {
                        type: 'object',
                        required: ['id', 'amount', 'type', 'category'],
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          amount: { type: 'number', example: 1500 },
                          type: { type: 'string', enum: ['income', 'expense'] },
                          category: { type: 'string', example: 'Salary' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Reconciliation summary and mismatch details' },
            401: { description: 'Authentication required' },
            403: { description: 'Admin or analyst role required' },
            422: { description: 'Malformed reference transaction data' },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
