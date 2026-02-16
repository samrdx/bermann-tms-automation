export interface TestUser {
  username: string;
  password: string;
  role?: string;
  description?: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    // Busca SOLO la variable estándar. Si no está (local), usa 'arivas'.
    username: process.env.TMS_USERNAME || 'arivas',
    password: process.env.TMS_PASSWORD || 'arivas',
    role: 'admin',
    description: 'Admin User'
  },
  
  regular: {
    // Como en QA usamos el mismo usuario para todo, repetimos la lógica
    // O puedes crear variables específicas si algún día tienes un user distinto.
    username: process.env.TMS_USERNAME || 'arivas', 
    password: process.env.TMS_PASSWORD || 'arivas',
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