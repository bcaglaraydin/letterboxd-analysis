import { test, expect } from '@playwright/test';
import { mockTriggerMetrics } from '../fixtures/mockApi';

/**
 * Professional Responsive UI Matrix
 * 🧪 Test Strategy:
 * 1. Leverage the TestHarness API (__test_harness) to teleport to key states.
 * 2. Rely on Playwright Projects (configured in playwright.config.ts) for the device matrix.
 * 3. Perform layout-integrity assertions (visibility, overflow, responsive hierarchy).
 */

declare global {
  interface Window {
    __test_harness: {
      reset: () => void;
      teleportToHub: (mode: 'empty' | 'partial' | 'full') => void;
      teleportToRating: (round?: number) => void;
      teleportToGenreResults: (step?: number) => void;
    };
  }
}

test.describe('Responsive Layout Integrity', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Setup API mocks
    await mockTriggerMetrics(page, 'success');

    // 2. Capture console logs for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.text().includes('TEST HARNESS')) {
        console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
      }
    });

    // 2. Navigate with debug flag to enable TestHarness
    await page.goto('/?debug=true', { waitUntil: 'domcontentloaded' });

    // 3. Wait for Harness to initialize (exposed by StateBridge)
    await page.waitForFunction(() => window.__test_harness !== undefined, {
      timeout: 10000,
    });
  });

  // ─── Scenario 1: Game Hub Layout ────────────────────────────
  test('Hub - Professional Layout Verification', async ({ page }) => {
    // Teleport to Partial Hub (1 done, 1 unlocked)
    await page.evaluate(() => window.__test_harness.teleportToHub('partial'));

    // Assertions: The Hub should show games that are completed or unlocked
    // "Rating Intuition" is a completed game card in 'partial' mode
    await expect(page.locator('text=Rating Intuition')).toBeVisible();

    // In 'partial' mode, Genre Ranking is UNLOCKED but not COMPLETED,
    // so it shows as a "Continue" button.
    await expect(page.locator('button:has-text("Continue")')).toBeVisible();

    // Verify no horizontal overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow, 'Horizontal overflow is unacceptable').toBe(false);
  });

  // ─── Scenario 2: Active Gaming (Rating) ─────────────────────
  test('Rating Game - Interactive State Verification', async ({ page }) => {
    // Teleport to Rating Game (Round 1)
    await page.evaluate(() => window.__test_harness.teleportToRating(1));

    // Robust Intro Handling: Wait for "I understand" OR "Reveal Rating"
    // Since both might resolve depending on speed, we handle the intro if visible.
    const introButton = page.locator('button:has-text("I understand")');
    try {
      // Use a short wait for the intro screen to mount if it's going to
      await introButton.waitFor({ state: 'visible', timeout: 2000 });
      await introButton.click();
    } catch {
      // If it doesn't appear, we might have bypassed it or it's already gone
    }

    // Verify critical game elements
    await expect(page.getByTestId('reveal-rating-button').filter({ visible: true })).toBeVisible();

    // Check for movie poster container (relative aspect-2/3)
    const poster = page.locator('.relative.aspect-\\[2\\/3\\]');
    await expect(poster).toBeVisible({ timeout: 10000 });

    // Responsive check: Container should never exceed viewport width
    const box = await poster.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(page.viewportSize()?.width || 0);
  });

  // ─── Scenario 3: Complex Visualizations (Genre Bubbles) ─────
  test('Genre Results - Visualization Rendering', async ({ page }) => {
    // Teleport to Genre Results (Bubble Step)
    await page.evaluate(() => window.__test_harness.teleportToGenreResults(0));

    // Verify visualization renders (look for canvas or the bubble container)
    // We add a slightly longer timeout as bubbles can take a moment to simulate
    const visualization = page.getByTestId('bubble-visualization');
    await expect(visualization).toBeVisible({ timeout: 15000 });

    // Verify no horizontal overflow in bubble view
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow, 'Horizontal overflow in bubble view').toBe(false);
  });

  // ─── Scenario 4: Hub Completionist State ───────────────────
  test('Hub - All Games Completed State', async ({ page }) => {
    // Teleport to Full Hub
    await page.evaluate(() => window.__test_harness.teleportToHub('full'));

    // Verify all 4 game sections are rendered correctly
    await expect(page.locator('text=Rating Intuition')).toBeVisible();
    await expect(page.locator('text=Genre Ranking')).toBeVisible();
    await expect(page.locator('text=Theme Guessing')).toBeVisible();
    await expect(page.locator('text=Viewing Habits')).toBeVisible();

    // Verify no horizontal overflow in full hub
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow, 'Horizontal overflow in full hub').toBe(false);
  });
});
