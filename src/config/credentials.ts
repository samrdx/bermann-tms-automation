export interface TestUser {
  username: string;
  password: string;
  role?: string;
  description?: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    username: process.env.TMS_USERNAME || 'srodriguez',
    password: process.env.TMS_PASSWORD || 'srodriguez',
    role: 'admin',
    description: 'Admin User'
  },
  
  regular: {
    username: process.env.TMS_USERNAME || 'srodriguez', 
    password: process.env.TMS_PASSWORD || 'srodriguez',
    role: 'user',
    description: 'Regular User'
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