import { test, expect } from '@playwright/test';

test.describe('Genre Ranking Game Rendering', () => {
  test('genre ranking items should not disappear during reorder', async ({ page }) => {
    // 1. Setup API mocks (optional, since we teleport, but good to have)
    await page.route('**/analysis*', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ready' } });
    });

    // 2. Navigate with debug flag to enable TestHarness
    await page.goto('/?debug=true', { waitUntil: 'domcontentloaded' });

    // 3. Wait for Harness to initialize
    await page.waitForFunction(() => window.__test_harness !== undefined, {
      timeout: 10000,
    });

    // 4. Teleport directly to Genre Ranking
    await page.evaluate(() => window.__test_harness.teleportToGenreRanking());

    // 5. Wait for the genre ranking screen by checking text
    // "How would you rank your genres?"
    await page.waitForSelector('text="How would you rank your genres?"', { timeout: 10000 });

    // We expect 5 genre items to be rendered.
    // Draggable slots use .touch-none class in DraggableRankingList.
    const items = page.locator('.touch-none');
    await expect(items).toHaveCount(5);

    // 6. Perform a drag and drop action
    // We will drag the first item to the position of the third item.
    const firstItem = items.nth(0);
    const thirdItem = items.nth(2);

    // Force drag and drop using bounding box for precision
    const firstBox = await firstItem.boundingBox();
    const thirdBox = await thirdItem.boundingBox();

    if (firstBox && thirdBox) {
      await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
      await page.mouse.down();
      // Move in steps to ensure framer-motion catches it
      await page.mouse.move(thirdBox.x + thirdBox.width / 2, thirdBox.y + thirdBox.height / 2, {
        steps: 5,
      });
      await page.mouse.up();
    } else {
      await firstItem.dragTo(thirdItem);
    }

    // 7. Verify all 5 items STILL exist and none vanished.
    await expect(items).toHaveCount(5);
  });
});
