#!/bin/bash

echo "🔧 Fixing auth test imports..."

# Fix logout.test.ts
sed -i "s|from '../src/|from '../../../src/|g" tests/e2e/auth/logout.test.ts

# Fix login-negative.test.ts
sed -i "s|from '../src/|from '../../../src/|g" tests/e2e/auth/login-negative.test.ts

# Fix full-flow.test.ts
sed -i "s|from '../src/|from '../../../src/|g" tests/e2e/auth/full-flow.test.ts

echo "✅ Auth imports fixed"