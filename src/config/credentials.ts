export interface TestUser {
    username: string;
    password: string;
    role?: string;
    description?: string;
  }
  
  export const TEST_USERS: Record<string, TestUser> = {
    admin: {
      username: process.env.TEST_ADMIN_USER || 'admin_test',
      password: process.env.TEST_ADMIN_PASS || 'Admin123!',
      role: 'admin',
      description: 'Usuario administrador para tests'
    },
    
    regular: {
      // CI/CD uses USERNAME_DEV and PASSWORD_DEV
      // Local dev can use TEST_REGULAR_USER and TEST_REGULAR_PASS
      username: process.env.TEST_REGULAR_USER || process.env.USERNAME_DEV || 'user_test',
      password: process.env.TEST_REGULAR_PASS || process.env.PASSWORD_DEV || 'User123!',
      role: 'user',
      description: 'Usuario regular para tests'
    },
    
    viewer: {
      username: process.env.TEST_VIEWER_USER || 'viewer_test',
      password: process.env.TEST_VIEWER_PASS || 'Viewer123!',
      role: 'viewer',
      description: 'Usuario solo lectura para tests'
    }
  };
  
  export function getTestUser(role: 'admin' | 'regular' | 'viewer' = 'regular'): TestUser {
    const user = TEST_USERS[role];
    if (!user) {
      throw new Error(`Test user with role "${role}" not found`);
    }
    return user;
  }