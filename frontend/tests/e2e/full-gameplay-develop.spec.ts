import { test, expect, Page, Locator } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * End-to-End Browser Automation Test for Develop Server
 * URL: https://d11ttpkrg0j5am.cloudfront.net
 *
 * Plays through the entire game flow from start to finish deterministically,
 * capturing sequential screenshots at every key phase and recording video.
 */

const screenshotsSubfolder = process.env.PLAYWRIGHT_SCREENSHOTS_DIR || 'screenshots';
const SCREENSHOTS_DIR = path.resolve(process.cwd(), 'playwright-artifacts', screenshotsSubfolder);

async function snap(page: Page, stepNumber: number, stepName: string) {
  const prefix = String(stepNumber).padStart(2, '0');
  const filename = `${prefix}-${stepName}.png`;
  const fullPath = path.join(SCREENSHOTS_DIR, filename);

  // Ensure directory exists
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  // Wait a moment for motion animations to settle
  await page.waitForTimeout(600);
  await page.screenshot({ path: fullPath, fullPage: false });
  console.log(`📸 [${prefix}] Captured screenshot: ${filename}`);
}

async function waitAndClickEnabled(locator: Locator, timeout = 25000) {
  const visible = locator.filter({ visible: true }).first();
  await visible.waitFor({ state: 'visible', timeout });
  // Wait until disabled attribute is removed
  await visible.evaluate((el: HTMLElement) => {
    return new Promise<void>((resolve) => {
      const check = () => {
        if (!el.hasAttribute('disabled') && !el.classList.contains('cursor-not-allowed')) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  });
  await visible.page().waitForTimeout(200);
  await visible.click();
}

async function advanceHubIfVisible(page: Page, stepCountRef: { current: number }, hubName: string) {
  const hubBtn = page
    .locator('button:has-text("Continue"), button:has-text("Reveal Cinematic Identity")')
    .filter({ visible: true })
    .first();
  const isHub = await hubBtn
    .waitFor({ state: 'visible', timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  if (isHub) {
    console.log(`Advancing through Game Hub (${hubName})...`);
    await snap(page, stepCountRef.current++, `hub-${hubName}`);
    await waitAndClickEnabled(hubBtn, 10000);
    await page.waitForTimeout(1000);
  }
}

test.describe('Letterboxd Taste Test - Full End-to-End Live Game Run', () => {
  test.setTimeout(600000); // 10 minutes for full playthrough

  test('Complete journey from landing to final recap card on Develop Server', async ({ page }) => {
    const stepCountRef = { current: 1 };
    console.log('🚀 Starting E2E playthrough on Develop Server...');

    // ─────────────────────────────────────────────────────────────
    // STAGE 1: LANDING PAGE & USERNAME ENTRY
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 1: Landing Page ---');
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('text=The').first()).toBeVisible();
    await snap(page, stepCountRef.current++, 'landing-page');

    const usernameInput = page.locator('input[placeholder*="Letterboxd username"]');
    await expect(usernameInput).toBeVisible();
    await usernameInput.fill('bcaglaraydin');

    const startButton = page.locator('button:has-text("Start")');
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // ─────────────────────────────────────────────────────────────
    // STAGE 2: PRE-ANALYSIS DIALOGUE & QUESTIONS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 2: Pre-Analysis Flow ---');

    // Entry dialogue 1
    const whatDoingButton = page.locator('button:has-text("What are we doing exactly?")');
    await waitAndClickEnabled(whatDoingButton, 20000);
    await snap(page, stepCountRef.current++, 'pre-analysis-dialogue-1');

    // Entry dialogue 2
    const letsStartButton = page.locator('button:has-text("Let\'s start")');
    await waitAndClickEnabled(letsStartButton, 20000);
    await snap(page, stepCountRef.current++, 'pre-analysis-dialogue-2');

    // Answer questions or exit early when backend is ready
    let onQuestions = true;
    let questionsAnswered = 0;
    while (onQuestions && questionsAnswered < 15) {
      // Check if we reached the final "We're ready to start" dialogue
      const readyStartBtn = page.locator('button:has-text("Let\'s start")');
      const readyVisible = await readyStartBtn.isVisible().catch(() => false);
      if (readyVisible) {
        console.log('Backend ready screen reached!');
        await snap(page, stepCountRef.current++, 'pre-analysis-ready');
        await waitAndClickEnabled(readyStartBtn);
        onQuestions = false;
        break;
      }

      // Check if early exit option has appeared
      const earlyExitOption = page.locator('button:has-text("Can I stop doing this?")');
      const canExit = await earlyExitOption.isVisible().catch(() => false);
      if (canExit) {
        console.log('Early exit option appeared, clicking it...');
        await snap(page, stepCountRef.current++, 'pre-analysis-early-exit-prompt');
        await earlyExitOption.click();

        // Confirmation screen
        const yesExitBtn = page.locator('button:has-text("Yes")');
        await waitAndClickEnabled(yesExitBtn, 10000);

        // Final ready screen
        const readyBtn = page.locator('button:has-text("Let\'s start")');
        await waitAndClickEnabled(readyBtn, 15000);
        await snap(page, stepCountRef.current++, 'pre-analysis-ready');
        onQuestions = false;
        break;
      }

      // Wait 2.2s to bypass the fast-click prank timer (>2000ms)
      await page.waitForTimeout(2200);

      // Find question option buttons
      const optionButtons = page.locator('div.grid button');
      const count = await optionButtons.count();
      if (count > 0) {
        console.log(`Answering question #${questionsAnswered + 1}...`);
        await snap(page, stepCountRef.current++, `pre-analysis-question-${questionsAnswered + 1}`);
        await optionButtons.first().click();
        questionsAnswered++;
      } else {
        await page.waitForTimeout(500);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STAGE 3: RATING INTUITION GAME
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 3: Rating Intuition Game ---');
    // Intro curtain
    const startRatingGameBtn = page.locator(
      'button:has-text("I understand"), button:has-text("Start Rating Round")',
    );
    await waitAndClickEnabled(startRatingGameBtn, 20000);
    await snap(page, stepCountRef.current++, 'rating-game-intro');

    // 5 rounds of rating guessing
    for (let round = 1; round <= 5; round++) {
      console.log(`Playing Rating Game Round ${round}/5...`);
      // Wait for reveal button to be visible
      const revealBtn = page.getByTestId('reveal-rating-button').filter({ visible: true }).first();
      await revealBtn.waitFor({ state: 'visible', timeout: 20000 });

      // Select 4 stars reliably
      const star = page
        .locator('.hidden.md\\:block .cursor-pointer, .cursor-pointer')
        .filter({ visible: true })
        .nth(3);
      await star.scrollIntoViewIfNeeded();
      await star.hover({ force: true });
      await page.waitForTimeout(200);
      await star.click({ force: true });
      await page.waitForTimeout(300);

      if (await revealBtn.isDisabled()) {
        const fallbackStar = page.locator('.cursor-pointer').filter({ visible: true }).nth(3);
        await fallbackStar.click({ force: true });
        await page.waitForTimeout(300);
      }

      await snap(page, stepCountRef.current++, `rating-round-${round}-guessed`);
      await waitAndClickEnabled(revealBtn);

      // Feedback overlay
      const continueFeedback = page.locator('button:has-text("Continue")');
      await waitAndClickEnabled(continueFeedback, 15000);
      await snap(page, stepCountRef.current++, `rating-round-${round}-feedback`);
    }

    // PostGameScreen (Rating)
    console.log('Navigating Rating PostGameScreen...');
    // Step 0: Intro (High score "Let's go" OR Low score "I know." -> "Thank you")
    const letsGoBtn = page.locator('button:has-text("Let\'s go")');
    const iKnowBtn = page.locator('button:has-text("I know.")');

    const isHighScore = await Promise.race([
      letsGoBtn
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => true)
        .catch(() => false),
      iKnowBtn
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => false)
        .catch(() => false),
    ]);

    if (isHighScore) {
      await snap(page, stepCountRef.current++, 'rating-postgame-intro-highscore');
      await waitAndClickEnabled(letsGoBtn);
    } else {
      await snap(page, stepCountRef.current++, 'rating-postgame-intro-lowscore-1');
      await waitAndClickEnabled(iKnowBtn);
      const thankYouBtn = page.locator('button:has-text("Thank you")');
      await waitAndClickEnabled(thankYouBtn);
      await snap(page, stepCountRef.current++, 'rating-postgame-intro-lowscore-2');
    }

    // Step 1: Averages
    const averagesNext = page.locator('button:has-text("Next")');
    await waitAndClickEnabled(averagesNext, 15000);
    await snap(page, stepCountRef.current++, 'rating-postgame-averages');

    // Step 2: Histogram
    const histogramNext = page.locator('button:has-text("Next")');
    await waitAndClickEnabled(histogramNext, 15000);
    await snap(page, stepCountRef.current++, 'rating-postgame-histogram');

    // Step 3: Deviations (Guilty Pleasures etc) if present
    let inDeviations = true;
    let devIndex = 1;
    while (inDeviations && devIndex <= 8) {
      const seeSummaryBtn = page
        .locator('button:has-text("See Summary")')
        .filter({ visible: true })
        .first();
      const isSeeSummary = await seeSummaryBtn.isVisible().catch(() => false);
      if (isSeeSummary) {
        await snap(page, stepCountRef.current++, `rating-postgame-deviation-${devIndex}`);
        await seeSummaryBtn.click();
        await page.waitForTimeout(800);
        inDeviations = false;
        break;
      }

      const continueDev = page
        .locator('button:has-text("Continue")')
        .filter({ visible: true })
        .first();
      const isContinue = await continueDev.isVisible().catch(() => false);
      if (isContinue) {
        await snap(page, stepCountRef.current++, `rating-postgame-deviation-${devIndex}`);
        await continueDev.click();
        devIndex++;
        await page.waitForTimeout(800);
      } else {
        inDeviations = false;
      }
    }

    // Step 4: Summary Recap (if on summary step)
    const journeyRecapBtn = page
      .locator('button:has-text("Continue to Journey")')
      .filter({ visible: true })
      .first();
    const isSummaryVisible = await journeyRecapBtn
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (isSummaryVisible) {
      await snap(page, stepCountRef.current++, 'rating-postgame-summary');
      await waitAndClickEnabled(journeyRecapBtn);
    }

    // ─────────────────────────────────────────────────────────────
    // STAGE 4: GAME HUB 1 -> GENRE GAME
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 4: Game Hub 1 (Unlocking Genre) ---');
    await advanceHubIfVisible(page, stepCountRef, '1-genre-unlocked');

    // ─────────────────────────────────────────────────────────────
    // STAGE 5: GENRE GAME
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 5: Genre Game ---');
    // Genre Intro Dialogue
    const genreFunBtn = page.locator('button:has-text("It\'s actually really fun!")');
    await waitAndClickEnabled(genreFunBtn, 20000);
    await snap(page, stepCountRef.current++, 'genre-intro-1');

    const genreIntroContinue = page.locator('button:has-text("Continue")');
    await waitAndClickEnabled(genreIntroContinue, 20000);
    await snap(page, stepCountRef.current++, 'genre-intro-2');

    // Genre Ranking
    const lockItInBtn = page
      .locator('button:has-text("Lock It In")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(lockItInBtn, 20000);
    await snap(page, stepCountRef.current++, 'genre-ranking-submitted');

    // Wait for reveal animation to finish and Continue button to appear
    const rankingContinueBtn = page
      .locator('button:has-text("Continue")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(rankingContinueBtn, 25000);
    await snap(page, stepCountRef.current++, 'genre-ranking-revealed');

    // Genre Matching Intro
    const matchingStartBtn = page
      .locator('button:has-text("Start")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(matchingStartBtn, 20000);
    await snap(page, stepCountRef.current++, 'genre-matching-intro');

    // Genre Matching Game (dynamic until Complete)
    let matchingFilmIndex = 1;
    while (matchingFilmIndex <= 10) {
      console.log(`Matching genres for Film ${matchingFilmIndex}...`);
      await page.waitForTimeout(800);

      // Select 2 genre chips
      const chips = page.locator('button.cursor-pointer').filter({ visible: true });
      const chipCount = await chips.count();
      if (chipCount >= 2) {
        await chips.nth(0).click();
        await chips.nth(1).click();
      }

      await snap(page, stepCountRef.current++, `genre-matching-film-${matchingFilmIndex}-selected`);
      const lockMatchingBtn = page
        .locator('button:has-text("Lock It In")')
        .filter({ visible: true })
        .first();
      await waitAndClickEnabled(lockMatchingBtn);

      // Wait for Next Film or Complete button to appear
      const completeBtn = page
        .locator('button:has-text("Complete")')
        .filter({ visible: true })
        .first();
      const nextBtn = page
        .locator('button:has-text("Next Film")')
        .filter({ visible: true })
        .first();

      const whichBtn = await Promise.race([
        completeBtn.waitFor({ state: 'visible', timeout: 25000 }).then(() => 'complete'),
        nextBtn.waitFor({ state: 'visible', timeout: 25000 }).then(() => 'next'),
      ]);

      if (whichBtn === 'complete') {
        await snap(page, stepCountRef.current++, 'genre-matching-complete');
        await waitAndClickEnabled(completeBtn, 15000);
        break;
      } else {
        await waitAndClickEnabled(nextBtn, 15000);
      }
      matchingFilmIndex++;
    }

    // Genre PostGameScreen
    // FakeScoreInteraction (if present)
    const prankDisappointment = page.locator('button:has-text("I\'m a disappointment.")');
    const successThankYou = page.locator('button:has-text("Thank you")');

    const hasScoreInteraction = await Promise.race([
      prankDisappointment
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => 'prank')
        .catch(() => null),
      successThankYou
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => 'success')
        .catch(() => null),
    ]);

    if (hasScoreInteraction === 'prank') {
      await snap(page, stepCountRef.current++, 'genre-prank-dialogue-1');
      await waitAndClickEnabled(prankDisappointment, 20000);
      const thatsGreat = page.locator('button:has-text("That\'s great.")');
      await snap(page, stepCountRef.current++, 'genre-prank-dialogue-2');
      await waitAndClickEnabled(thatsGreat, 20000);
      const prankContinue = page.locator('button:has-text("Continue")');
      await snap(page, stepCountRef.current++, 'genre-prank-dialogue-3');
      await waitAndClickEnabled(prankContinue, 20000);
    } else if (hasScoreInteraction === 'success') {
      await waitAndClickEnabled(successThankYou, 15000);
    }

    // PersonalGenreBubbles
    const bubblesNext = page.locator('button:has-text("Next")').filter({ visible: true }).first();
    await waitAndClickEnabled(bubblesNext, 25000);
    await snap(page, stepCountRef.current++, 'genre-bubbles');

    // TasteGapLine
    const tasteGapFinish = page
      .locator('button:has-text("Finish")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(tasteGapFinish, 25000);
    await snap(page, stepCountRef.current++, 'genre-taste-gap');

    // ─────────────────────────────────────────────────────────────
    // STAGE 6: GAME HUB 2 -> THEME EXPERIENCE
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 6: Game Hub 2 (Unlocking Theme) ---');
    await advanceHubIfVisible(page, stepCountRef, '2-theme-unlocked');

    // ─────────────────────────────────────────────────────────────
    // STAGE 7: THEME EXPERIENCE
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 7: Theme Experience ---');
    // Intro Dialogue
    const themeUnknownBtn = page.locator(
      'button:has-text("Wait, what themes?"), button:has-text("Of course I am")',
    );
    await waitAndClickEnabled(themeUnknownBtn, 20000);
    await snap(page, stepCountRef.current++, 'theme-intro-1');

    const themeIntroContinue = page.locator('button:has-text("Continue")');
    await waitAndClickEnabled(themeIntroContinue, 20000);
    await snap(page, stepCountRef.current++, 'theme-intro-2');

    // Theme Guessing Rounds (dynamic until sorting card appears)
    let tr = 1;
    while (tr <= 8) {
      const sortingCardCheck = page.locator('.cursor-grab').filter({ visible: true });
      if (await sortingCardCheck.isVisible().catch(() => false)) break;

      const input = page
        .locator('input[placeholder*="guess"], input[placeholder*="movie"], input.font-sans')
        .filter({ visible: true })
        .first();
      const hasInput = await input
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!hasInput) break;

      console.log(`Theme Guessing Round ${tr}...`);
      for (let attempt = 0; attempt < 4; attempt++) {
        const continueBtn = page.locator('button:has-text("Continue")').filter({ visible: true });
        const isRevealed = await continueBtn.isVisible().catch(() => false);
        if (isRevealed) break;

        await input.fill(`Guess attempt ${attempt + 1}`);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(600);
      }

      const revealedContinue = page
        .locator('button:has-text("Continue")')
        .filter({ visible: true })
        .first();
      await waitAndClickEnabled(revealedContinue, 20000);
      await snap(page, stepCountRef.current++, `theme-guessing-round-${tr}-revealed`);
      tr++;
    }

    // Theme Sorting Minigame
    console.log('Swiping Theme Sorting Minigame...');
    const sortingCard = page.locator('.cursor-grab').filter({ visible: true }).first();
    await sortingCard.waitFor({ state: 'visible', timeout: 20000 });
    await snap(page, stepCountRef.current++, 'theme-sorting-minigame');

    // Swipe all sorting cards to the right (Favorite)
    let swipeCount = 0;
    while (swipeCount < 15) {
      const card = page.locator('.cursor-grab').filter({ visible: true }).first();
      const isCardVisible = await card.isVisible().catch(() => false);
      if (!isCardVisible) break;

      const box = await card.boundingBox();
      if (box) {
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 450, startY, { steps: 15 });
        await page.mouse.up();
        await page.waitForTimeout(800);
      }
      swipeCount++;
    }

    // Theme Results Screen
    const themeResultsContinue = page
      .locator('button:has-text("Continue")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(themeResultsContinue, 20000);
    await snap(page, stepCountRef.current++, 'theme-results');

    // ─────────────────────────────────────────────────────────────
    // STAGE 8: GAME HUB 3 -> TASTE POSITIONING
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 8: Game Hub 3 (Unlocking Taste) ---');
    await advanceHubIfVisible(page, stepCountRef, '3-taste-unlocked');

    // ─────────────────────────────────────────────────────────────
    // STAGE 9: TASTE POSITIONING
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 9: Taste Positioning ---');
    // Taste Intro Q1
    const tasteIntroQ1 = page.locator(
      'button:has-text("Popularity usually means compromise"), button:has-text("If many people love it")',
    );
    await waitAndClickEnabled(tasteIntroQ1, 20000);
    await snap(page, stepCountRef.current++, 'taste-intro-q1');

    // Taste Intro Q2
    const tasteIntroQ2 = page.locator(
      'button:has-text("Niche films"), button:has-text("Popular films")',
    );
    await waitAndClickEnabled(tasteIntroQ2, 20000);
    await snap(page, stepCountRef.current++, 'taste-intro-q2');

    // Taste Step 1 Slider
    const tasteLockIn1 = page
      .locator('button:has-text("Lock In")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(tasteLockIn1, 20000);
    await snap(page, stepCountRef.current++, 'taste-step-1-locked');

    const tasteContinue1 = page
      .locator('button:has-text("Continue")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(tasteContinue1, 20000);

    // Taste Step 2 Intro Q1 & Q2
    const tasteStep2Intro1 = page.locator(
      'button:has-text("Not much"), button:has-text("To some extent, yes")',
    );
    await waitAndClickEnabled(tasteStep2Intro1, 20000);

    const tasteStep2Intro2 = page.locator(
      'button:has-text("I often rate differently"), button:has-text("I tend to agree")',
    );
    await waitAndClickEnabled(tasteStep2Intro2, 20000);

    // Taste Step 2 Slider
    const tasteLockIn2 = page
      .locator('button:has-text("Lock In")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(tasteLockIn2, 20000);
    await snap(page, stepCountRef.current++, 'taste-step-2-locked');

    const analyzeResultsBtn = page
      .locator('button:has-text("Analyze Results"), button:has-text("Continue")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(analyzeResultsBtn, 20000);

    // Taste Reveal Sequence (Continue / Next Phase / Finalize Analysis)
    let inTasteReveal = true;
    while (inTasteReveal) {
      const finalizeBtn = page
        .locator('button:has-text("Finalize Analysis")')
        .filter({ visible: true });
      const isFinalize = await finalizeBtn.isVisible().catch(() => false);
      if (isFinalize) {
        await snap(page, stepCountRef.current++, 'taste-reveal-final-scatter');
        await finalizeBtn.click();
        inTasteReveal = false;
        break;
      }

      const nextPhaseOrContinue = page
        .locator('button:has-text("Next Phase"), button:has-text("Continue")')
        .filter({ visible: true });
      await waitAndClickEnabled(nextPhaseOrContinue.first(), 15000);
      await page.waitForTimeout(800);
    }

    // ─────────────────────────────────────────────────────────────
    // STAGE 10: GAME HUB 4 -> VIEWING HABITS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 10: Game Hub 4 (Unlocking Habits) ---');
    await advanceHubIfVisible(page, stepCountRef, '4-habits-unlocked');

    // ─────────────────────────────────────────────────────────────
    // STAGE 11: VIEWING HABITS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 11: Viewing Habits ---');
    // Habits Intro Greeting
    const notBadBtn = page.locator(
      'button:has-text("Not bad"), button:has-text("Not entertaining")',
    );
    await waitAndClickEnabled(notBadBtn, 20000);
    await snap(page, stepCountRef.current++, 'habits-intro-greeting');

    // Comparison round: select the movie or this experience
    const compareOptionBtn = page
      .locator('div.h-40 button, button:has-text("This experience")')
      .first();
    const hasCompare = await compareOptionBtn
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (hasCompare) {
      await waitAndClickEnabled(compareOptionBtn, 15000);
      await snap(page, stepCountRef.current++, 'habits-intro-compare');
    }

    // Dialogue continues: click Continue buttons until we transition to the round
    for (let c = 0; c < 5; c++) {
      const isDuration = await page
        .locator('text=Which distribution of movie durations')
        .isVisible()
        .catch(() => false);
      const isActor = await page
        .locator('text=Which actor have you watched the most')
        .isVisible()
        .catch(() => false);
      if (isDuration || isActor) {
        console.log('Transitioned out of habits intro dialogue into rounds!');
        break;
      }

      const continueBtn = page
        .locator('button:has-text("Continue")')
        .filter({ visible: true })
        .first();
      const isVisible = await continueBtn
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (isVisible) {
        await waitAndClickEnabled(continueBtn, 20000);
        await page.waitForTimeout(600);
      } else {
        break;
      }
    }

    // Actor round (if present and not skipped)
    const actorCard = page
      .locator('div[role="button"]:has(img), div.cursor-pointer:has(img)')
      .filter({ visible: true })
      .first();
    const hasActorRound = await actorCard
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    if (hasActorRound) {
      console.log('Playing Favorite Actor Round...');
      await snap(page, stepCountRef.current++, 'habits-actor-round');
      await actorCard.click();
      await page.waitForTimeout(600);
      await snap(page, stepCountRef.current++, 'habits-actor-guessed');

      const seeTop8Btn = page
        .locator('button:has-text("See Top 8"), button:has-text("Continue")')
        .filter({ visible: true })
        .first();
      await waitAndClickEnabled(seeTop8Btn, 20000);
      await page.waitForTimeout(600);
      await snap(page, stepCountRef.current++, 'habits-actor-top8-revealed');

      const actorContinue2 = page
        .locator('button:has-text("Continue")')
        .filter({ visible: true })
        .first();
      await waitAndClickEnabled(actorContinue2, 20000);
    }

    // Duration Batch Round:
    console.log('Playing Duration Batch Round...');
    await page
      .locator('text=Which distribution of movie durations')
      .waitFor({ state: 'visible', timeout: 25000 });
    const durationCard = page
      .locator('div.cursor-pointer, div[role="button"]')
      .filter({ visible: true })
      .first();
    await durationCard.waitFor({ state: 'visible', timeout: 20000 });
    await durationCard.click();
    await snap(page, stepCountRef.current++, 'habits-duration-selected');

    const submitDurationBtn = page
      .locator('button:has-text("Submit")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(submitDurationBtn, 15000);

    const continueDurationBtn = page
      .locator('button:has-text("Continue")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(continueDurationBtn, 25000);
    await snap(page, stepCountRef.current++, 'habits-duration-complete');

    // Map Intro Dialogue
    const mapIntroContinue = page
      .locator('button:has-text("Continue")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(mapIntroContinue, 20000);
    await snap(page, stepCountRef.current++, 'habits-map-intro');

    // World Map Round
    const seeCountryAnalysis = page
      .locator('button:has-text("See Country Analysis")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(seeCountryAnalysis, 25000);
    await snap(page, stepCountRef.current++, 'habits-world-map');

    // Country Breakdown
    const countryBreakdownContinue = page
      .locator('button:has-text("Continue")')
      .filter({ visible: true })
      .first();
    await waitAndClickEnabled(countryBreakdownContinue, 20000);
    await snap(page, stepCountRef.current++, 'habits-country-breakdown');

    // ─────────────────────────────────────────────────────────────
    // STAGE 12: HUB FINAL OR TASTE SOULMATES -> OUTRO
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 12: Advancing to Final Outro ---');
    await advanceHubIfVisible(page, stepCountRef, 'all-completed');

    const soulmatesFavorites = page.locator('text=Do these films look familiar to you?');
    const hasSoulmates = await soulmatesFavorites
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (hasSoulmates) {
      console.log('Taste Soulmates active! Navigating soulmates...');
      await snap(page, stepCountRef.current++, 'soulmates-favorites');
      const yesBtn = page.locator('button:has-text("Yes!")');
      await waitAndClickEnabled(yesBtn);

      const showThemBtn = page.locator(
        'button:has-text("Show them to me"), button:has-text("Continue")',
      );
      await waitAndClickEnabled(showThemBtn, 20000);
      await snap(page, stepCountRef.current++, 'soulmates-matches-list');

      const journeySummaryBtn = page.locator('button:has-text("See My Journey Summary")');
      await waitAndClickEnabled(journeySummaryBtn, 20000);
    }

    // ─────────────────────────────────────────────────────────────
    // STAGE 13: OUTRO DIALOGUE & FINAL RECAP CARD
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- STAGE 13: Outro & Journey Recap ---');
    const seeYouBtn = page.locator('button:has-text("See you!")');
    await waitAndClickEnabled(seeYouBtn, 35000);
    await snap(page, stepCountRef.current++, 'outro-dialogue');

    // Journey Recap Hero Screen
    const recapTitle = page.locator('h1:has-text("Cinematic Identity")');
    await recapTitle.waitFor({ state: 'visible', timeout: 35000 });
    await expect(page.locator('button:has-text("Share / Save Image")')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('button:has-text("Analyze Another Profile")')).toBeVisible({
      timeout: 15000,
    });

    // Settle for final full render
    await page.waitForTimeout(2000);
    await snap(page, stepCountRef.current++, 'final-cinematic-identity-card');

    console.log('\n🎉 FULL PLAYTHROUGH COMPLETED SUCCESSFULLY FROM START TO FINISH!');
  });
});
