export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export interface TestUser {
  username: string;
  password: string;
  role?: string;
  description?: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    get username() { return requiredEnv('TMS_USERNAME'); },
    get password() { return requiredEnv('TMS_PASSWORD'); },
    role: 'admin',
    description: 'Admin User'
  },
  
  regular: {
    get username() { return requiredEnv('TMS_USERNAME'); },
    get password() { return requiredEnv('TMS_PASSWORD'); },
    role: 'user',
    description: 'Regular User'
  },
  
  viewer: {
    get username() { return requiredEnv('TEST_VIEWER_USER'); },
    get password() { return requiredEnv('TEST_VIEWER_PASS'); },
    role: 'viewer',
    description: 'Read-only user for tests'
  }
};

export function getTestUser(role: 'admin' | 'regular' | 'viewer' = 'regular'): TestUser {
  const user = TEST_USERS[role];
  if (!user) {
    throw new Error(`Test user with role "${role}" not found`);
  }
  return user;
}
