import { test, expect } from '@playwright/test';

test('should get a successful response from the root route', async ({ page }) => {
  const response = await page.goto('/');
  expect(response.ok()).toBe(true);
  const body = await response.text();
  expect(body).toBe('Hello from the example app!');
});

test('should get a successful response from the /test route', async ({ page }) => {
  const response = await page.goto('/test');
  expect(response.ok()).toBe(true);
  const body = await response.text();
  expect(body).toBe('This is a test route.');
});
