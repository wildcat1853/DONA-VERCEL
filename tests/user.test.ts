import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@db';
import { user } from '@schemas';
import { eq } from 'drizzle-orm';

describe('User Schema', () => {
  // Ensure database is ready
  beforeAll(async () => {
    // Wait for database connection
    try {
      // Add a simple query to test connection
      await db.query.user.findFirst();
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  });

  it('should set isOnboarding to true by default when creating a new user', async () => {
    // Create a test user
    const testUser = await db.insert(user).values({
      name: 'Test User',
      email: 'test@example.com',
    }).returning();

    // Fetch the created user
    const createdUser = await db.query.user.findFirst({
      where: eq(user.id, testUser[0].id),
    });

    // Verify default value
    expect(createdUser?.isOnboarding).toBe('true');

    // Clean up
    await db.delete(user).where(eq(user.id, testUser[0].id));
  });
});
