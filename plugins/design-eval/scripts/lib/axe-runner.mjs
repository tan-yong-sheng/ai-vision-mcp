import { chromium } from "playwright";
import { injectAxe, checkAxe } from "axe-playwright";

/**
 * Run axe-core accessibility scan on a URL
 * @param {string} url - URL to scan
 * @param {Object} options - Options object
 * @param {string} [options.email] - Email for login (optional)
 * @param {string} [options.password] - Password for login (optional)
 * @returns {Promise<Object>} Axe scan results
 */
export async function runAxeScan(url, options = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to URL
    await page.goto(url, { waitUntil: "networkidle" });

    // If credentials provided, attempt login
    if (options.email && options.password) {
      await attemptLogin(page, options.email, options.password);
    }

    // Inject and run axe-core
    await injectAxe(page);
    const results = await checkAxe(page);

    return {
      url,
      timestamp: new Date().toISOString(),
      violations: results.violations || [],
      passes: results.passes || [],
      incomplete: results.incomplete || [],
      inapplicable: results.inapplicable || [],
      summary: {
        total_violations: (results.violations || []).length,
        critical: (results.violations || []).filter(v => v.impact === "critical").length,
        serious: (results.violations || []).filter(v => v.impact === "serious").length,
        moderate: (results.violations || []).filter(v => v.impact === "moderate").length,
        minor: (results.violations || []).filter(v => v.impact === "minor").length
      }
    };
  } finally {
    await browser.close();
  }
}

/**
 * Attempt to login on a page
 * Tries common login patterns
 * @param {Page} page - Playwright page object
 * @param {string} email - Email to use
 * @param {string} password - Password to use
 */
async function attemptLogin(page, email, password) {
  try {
    // Try common email input patterns
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="Email" i]'
    ];

    let emailInput = null;
    for (const selector of emailSelectors) {
      emailInput = await page.$(selector);
      if (emailInput) break;
    }

    if (emailInput) {
      await emailInput.fill(email);
    }

    // Try common password input patterns
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
      'input[placeholder*="password" i]',
      'input[placeholder*="Password" i]'
    ];

    let passwordInput = null;
    for (const selector of passwordSelectors) {
      passwordInput = await page.$(selector);
      if (passwordInput) break;
    }

    if (passwordInput) {
      await passwordInput.fill(password);
    }

    // Try to find and click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      'button:has-text("Submit")',
      'input[type="submit"]'
    ];

    for (const selector of submitSelectors) {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        await page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});
        break;
      }
    }
  } catch (error) {
    console.warn(`Login attempt failed: ${error.message}`);
  }
}

/**
 * Format axe violations by severity
 * @param {Array} violations - Axe violations array
 * @returns {Object} Violations grouped by impact
 */
export function groupViolationsBySeverity(violations) {
  return {
    critical: violations.filter(v => v.impact === "critical"),
    serious: violations.filter(v => v.impact === "serious"),
    moderate: violations.filter(v => v.impact === "moderate"),
    minor: violations.filter(v => v.impact === "minor")
  };
}
