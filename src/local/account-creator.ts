/**
 * Local Account Creator Script
 * Runs Puppeteer on local machine and saves accounts to Cloudflare D1
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .dev.vars
const devVarsPath = path.join(process.cwd(), '.dev.vars');
if (fs.existsSync(devVarsPath)) {
  const devVars = fs.readFileSync(devVarsPath, 'utf-8');
  devVars.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    }
  });
}

const TESTMAIL_API_KEY = process.env.TESTMAIL_API_KEY || '';
const TESTMAIL_NAMESPACE = process.env.TESTMAIL_NAMESPACE || '';
const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';
const PUPPETEER_HEADLESS = process.env.PUPPETEER_HEADLESS === 'true' || process.env.PUPPETEER_HEADLESS === '1';
const ACCOUNTS_PER_RUN = parseInt(process.env.ACCOUNTS_PER_RUN || '1', 10);

/**
 * Helper function to wait/delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface AccountData {
  email: string;
  password: string;
  createdAt: string;
  status: 'created' | 'failed';
  error?: string;
  loginAt?: string;
  credits?: number;
}

/**
 * Get a temporary email address from testmail.app
 */
function getTempEmail(): string {
  if (!TESTMAIL_NAMESPACE) {
    throw new Error('TESTMAIL_NAMESPACE is required. Please set it in .dev.vars');
  }
  
  // Generate shorter tag: 8 characters from random string + 4 characters from timestamp
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(36).slice(-4);
  const randomTag = randomPart + timePart;
  
  return `${TESTMAIL_NAMESPACE}.${randomTag}@inbox.testmail.app`;
}

/**
 * Extract tag from testmail.app email address
 */
function extractTagFromEmail(email: string): string | null {
  try {
    const match = email.match(/^[^.]+\.([^@]+)@inbox\.testmail\.app$/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Retrieve emails from testmail.app using the API
 */
async function getEmailsFromTestmail(
  apiKey: string,
  namespace: string,
  tag: string
): Promise<any> {
  try {
    const url = `https://api.testmail.app/api/json?apikey=${apiKey}&namespace=${namespace}&tag=${tag}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Testmail API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to retrieve emails from testmail.app:', error);
    throw error;
  }
}

/**
 * Wait for OTP code from testmail.app
 */
async function waitForOTP(
  apiKey: string,
  namespace: string,
  tag: string,
  timeout: number = 60000
): Promise<string> {
  const startTime = Date.now();
  const checkInterval = 3000;
  
  while (Date.now() - startTime < timeout) {
    try {
      const data = await getEmailsFromTestmail(apiKey, namespace, tag);
      
      if (data && data.emails && data.emails.length > 0) {
        for (const email of data.emails) {
          const subject = email.subject || '';
          const text = email.text || email.html || '';
          const otpMatch = (subject + ' ' + text).match(/\b(\d{4,6})\b/);
          if (otpMatch) {
            const otp = otpMatch[1];
            console.log(`✓ Found OTP in email: ${otp}`);
            return otp;
          }
        }
      }
      
      await delay(checkInterval);
    } catch (error) {
      console.log('Waiting for OTP email...');
      await delay(checkInterval);
    }
  }
  
  throw new Error('OTP not received within timeout period');
}

/**
 * Save account to Cloudflare D1 via Worker API
 */
async function saveAccountToD1(accountData: AccountData): Promise<void> {
  try {
    const response = await fetch(`${WORKER_URL}/api/accounts/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(accountData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save account: ${response.status} ${errorText}`);
    }
    
    console.log('✓ Account saved to D1 database');
  } catch (error) {
    console.error('Failed to save account to D1:', error);
    throw error;
  }
}

/**
 * Helper: Click button by text content
 */
async function clickButtonByText(page: any, text: string): Promise<boolean> {
  try {
    const clicked = await page.evaluate((searchText: string) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find((btn: any) => {
        const btnText = (btn.textContent || btn.innerText || '').toLowerCase();
        return btnText.includes(searchText.toLowerCase());
      });
      if (button) {
        (button as HTMLButtonElement).click();
        return true;
      }
      return false;
    }, text);
    return clicked;
  } catch (error) {
    return false;
  }
}

/**
 * Helper: Click element by selectors
 */
async function clickElementBySelectors(page: any, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isIntersectingViewport();
        if (isVisible) {
          await element.click();
          return true;
        }
      }
    } catch (e) {
      continue;
    }
  }
  return false;
}

/**
 * Helper: Fill input by selectors
 */
async function fillInputBySelectors(page: any, selectors: string[], value: string): Promise<boolean> {
  for (const selector of selectors) {
    try {
      const input = await page.$(selector);
      if (input) {
        await input.click({ clickCount: 3 });
        await input.type(value, { delay: 50 });
        return true;
      }
    } catch (e) {
      continue;
    }
  }
  return false;
}

/**
 * Click Login button
 */
async function clickLoginButton(page: any): Promise<void> {
  console.log('Looking for Login button...');
  const clicked = await clickButtonByText(page, 'login');
  if (clicked) {
    console.log('✓ Clicked Login button');
    await delay(1500);
  } else {
    console.warn('⚠ Could not find Login button, continuing anyway...');
  }
}

/**
 * Click sign up button
 */
async function clickSignUpButton(page: any): Promise<void> {
  console.log('Looking for sign up button...');
  
  const signUpSelectors = [
    'a[href*="signup"]',
    'a[href*="sign-up"]',
    'a[href*="register"]',
    '[data-testid*="signup"]',
    '[data-testid*="sign-up"]',
  ];
  
  let clicked = await clickElementBySelectors(page, signUpSelectors);
  if (clicked) {
    console.log('✓ Clicked sign up button');
    await delay(1000);
    return;
  }
  
  clicked = await clickButtonByText(page, 'sign up');
  if (!clicked) {
    clicked = await clickButtonByText(page, 'get started');
  }
  if (!clicked) {
    clicked = await clickButtonByText(page, 'create account');
  }
  
  if (clicked) {
    console.log('✓ Clicked sign up button');
    await delay(1000);
  }
}

/**
 * Fill email field
 */
async function fillEmailField(page: any, email: string): Promise<void> {
  console.log('Filling in email address...');
  await delay(1000);
  
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[id*="email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email" i]',
  ];
  
  const filled = await fillInputBySelectors(page, emailSelectors, email);
  if (filled) {
    console.log('✓ Email filled');
  } else {
    throw new Error('Could not find email input field');
  }
}

/**
 * Click "Continue with Email" button
 */
async function clickContinueWithEmail(page: any): Promise<boolean> {
  console.log('Looking for \'Continue with Email\' button...');
  await delay(500);
  
  const submitButtons = await page.$$('button[type="submit"]');
  for (const button of submitButtons) {
    try {
      const text = await page.evaluate((el: any) => {
        return el.textContent || el.innerText || '';
      }, button);
      
      if (text && text.trim().toLowerCase().includes('continue with email')) {
        const isVisible = await button.isIntersectingViewport();
        if (isVisible) {
          await button.click();
          console.log('✓ Clicked \'Continue with Email\' button');
          await delay(2000);
          return true;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  const continueButton = await page.$('button[type="submit"]');
  if (continueButton) {
    const isVisible = await continueButton.isIntersectingViewport();
    if (isVisible) {
      await continueButton.click();
      console.log('✓ Clicked submit button (Continue with Email)');
      await delay(2000);
      return true;
    }
  }
  
  console.warn('⚠ Could not find \'Continue with Email\' button, continuing anyway...');
  return false;
}

/**
 * Fill password field
 */
async function fillPasswordField(page: any, password: string): Promise<void> {
  console.log('Filling in password...');
  await delay(500);
  
  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[id*="password"]',
  ];
  
  const filled = await fillInputBySelectors(page, passwordSelectors, password);
  if (filled) {
    console.log('✓ Password filled');
  }
}

/**
 * Click appropriate button (Register or Email login)
 */
async function clickRegisterOrLoginButton(page: any): Promise<{ emailLoginClicked: boolean; registerClicked: boolean }> {
  console.log('Looking for registration/login button...');
  
  let clicked = await clickButtonByText(page, 'register and verify email');
  if (clicked) {
    console.log('✓ Clicked \'Register and verify email\' button');
    await delay(2000);
    return { emailLoginClicked: false, registerClicked: true };
  }
  
  clicked = await clickButtonByText(page, 'email login');
  if (clicked) {
    console.log('✓ Clicked \'Email login\' button');
    await delay(2000);
    return { emailLoginClicked: true, registerClicked: false };
  }
  
  return { emailLoginClicked: false, registerClicked: false };
}

/**
 * Submit form fallback
 */
async function submitFormFallback(page: any): Promise<boolean> {
  console.log('Submitting registration form...');
  await delay(500);
  
  const submitSelectors = ['button[type="submit"]'];
  const clicked = await clickElementBySelectors(page, submitSelectors);
  if (clicked) {
    console.log('✓ Form submitted');
    await delay(2000);
    return true;
  }
  
  const passwordInput = await page.$('input[type="password"]');
  if (passwordInput) {
    await passwordInput.press('Enter');
    console.log('✓ Submitted by pressing Enter');
    await delay(2000);
    return true;
  }
  
  return false;
}

/**
 * Wait for element by selectors
 */
async function waitForElementBySelectors(
  page: any,
  selectors: string[],
  timeout: number = 30000
): Promise<any> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isIntersectingViewport();
          if (isVisible) {
            return element;
          }
        }
      } catch (e) {
        continue;
      }
    }
    await delay(500);
  }
  
  return null;
}

/**
 * Verify OTP
 */
async function verifyOTP(
  page: any,
  email: string
): Promise<boolean> {
  console.log('Waiting for OTP modal...');
  await delay(2000);
  
  if (!TESTMAIL_API_KEY) {
    console.warn('⚠ TESTMAIL_API_KEY not set, cannot retrieve OTP automatically');
    return false;
  }
  
  const tag = extractTagFromEmail(email);
  if (!tag) {
    console.warn('⚠ Could not extract tag from email address');
    return false;
  }
  
  const otpPromise = waitForOTP(TESTMAIL_API_KEY, TESTMAIL_NAMESPACE, tag, 60000);
  
  const otpInputSelectors = [
    'input[type="text"][maxlength="6"]',
    'input[type="text"][maxlength="4"]',
    'input[type="number"]',
    'input[id*="otp"]',
    'input[id*="code"]',
    'input[name*="otp"]',
    'input[name*="code"]',
    'input[placeholder*="code" i]',
    'input[placeholder*="OTP" i]',
  ];
  
  const otpInput = await waitForElementBySelectors(page, otpInputSelectors, 30000);
  
  if (!otpInput) {
    const inputs = await page.$$('input');
    for (const input of inputs) {
      try {
        const placeholder = await page.evaluate((el: any) => el.placeholder, input);
        const id = await page.evaluate((el: any) => el.id, input);
        if (
          (placeholder &&
            (placeholder.toLowerCase().includes('code') ||
              placeholder.toLowerCase().includes('otp'))) ||
          (id &&
            (id.toLowerCase().includes('code') || id.toLowerCase().includes('otp')))
        ) {
          console.log('✓ OTP input found by searching');
          const otpCode = await otpPromise;
          console.log(`\n✓ Received OTP: ${otpCode}`);
          
          console.log('Entering OTP code...');
          await input.click({ clickCount: 3 });
          await input.type(otpCode, { delay: 100 });
          
          const verifyClicked = await clickButtonByText(page, 'verify email');
          if (verifyClicked) {
            console.log('✓ Clicked \'Verify email\' button');
            await delay(2000);
          } else {
            const submitButton = await page.$('button[type="submit"]');
            if (submitButton) {
              const isVisible = await submitButton.isIntersectingViewport();
              if (isVisible) {
                await submitButton.click();
                console.log('✓ Clicked submit button (Verify email)');
                await delay(2000);
              }
            }
          }
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    throw new Error('Could not find OTP input field');
  }
  
  const otpCode = await otpPromise;
  console.log(`\n✓ Received OTP: ${otpCode}`);
  
  console.log('Entering OTP code...');
  await otpInput.click({ clickCount: 3 });
  await otpInput.type(otpCode, { delay: 100 });
  
  const verifyClicked = await clickButtonByText(page, 'verify email');
  if (verifyClicked) {
    console.log('✓ Clicked \'Verify email\' button');
    await delay(2000);
  } else {
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      const isVisible = await submitButton.isIntersectingViewport();
      if (isVisible) {
        await submitButton.click();
        console.log('✓ Clicked submit button (Verify email)');
        await delay(2000);
      }
    }
  }
  
  return true;
}

/**
 * Check for and click "Claim" div if it exists
 */
async function checkAndClickClaimDiv(page: any): Promise<boolean> {
  console.log('Checking for \'Claim\' div...');
  await delay(2000);
  
  try {
    const clicked = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      for (const div of divs as any[]) {
        const text = (div.textContent || div.innerText || '').trim().toLowerCase();
        if (text === 'claim') {
          const style = window.getComputedStyle(div);
          const isClickable = 
            style.cursor === 'pointer' ||
            div.onclick !== null ||
            div.getAttribute('role') === 'button' ||
            div.classList.contains('cursor-pointer');
          
          if (isClickable || div.offsetParent !== null) {
            div.click();
            return true;
          }
        }
      }
      
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const button of buttons as any[]) {
        const text = (button.textContent || button.innerText || '').trim().toLowerCase();
        if (text === 'claim') {
          button.click();
          return true;
        }
      }
      
      return false;
    });
    
    if (clicked) {
      console.log('✓ Clicked \'Claim\' div/button');
      await delay(2000);
      return true;
    }
    
    console.log('No \'Claim\' div or button found');
    return false;
  } catch (error) {
    console.error('Error checking for Claim div:', error);
    return false;
  }
}

/**
 * Create account on felo.ai using Puppeteer
 */
async function createFeloAccount(
  browser: any,
  email: string,
  password: string
): Promise<{ success: boolean; accountId?: string; error?: string }> {
  let page;
  try {
    page = await browser.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Step 1: Navigate to felo.ai
    console.log('Navigating to felo.ai...');
    await page.goto('https://felo.ai/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await delay(2000);
    
    // Step 2: Click Login button
    await clickLoginButton(page);
    
    // Step 3: Click sign up button
    await clickSignUpButton(page);
    
    // Step 4: Fill email field
    await fillEmailField(page, email);
    
    // Step 5: Click "Continue with Email" button
    await clickContinueWithEmail(page);
    
    // Step 6: Fill password field
    await fillPasswordField(page, password);
    
    // Step 7: Click appropriate button (Register or Email login)
    const { emailLoginClicked, registerClicked } = await clickRegisterOrLoginButton(page);
    
    // Step 8: Submit form fallback if needed
    if (!registerClicked && !emailLoginClicked) {
      await submitFormFallback(page);
    }
    
    // Step 9: Verify OTP if needed (only for new registrations)
    if (!emailLoginClicked && registerClicked) {
      try {
        await verifyOTP(page, email);
      } catch (error) {
        console.warn('⚠ OTP verification failed or skipped:', error);
      }
    }
    
    // Step 10: Wait for navigation
    await delay(3000);
    
    // Step 11: Check for and click "Claim" div if it exists
    await checkAndClickClaimDiv(page);
    
    // Wait a bit more for page to settle
    await delay(2000);
    
    // Check if account was created successfully
    const currentUrl = page.url();
    const pageContent = await page.content();
    
    const successIndicators = [
      currentUrl.includes('dashboard'),
      currentUrl.includes('home'),
      !currentUrl.includes('signup'),
      !currentUrl.includes('login'),
      pageContent.includes('Welcome') || pageContent.includes('Dashboard'),
    ];
    
    const accountId = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const content = (script as any).textContent || '';
        const match = content.match(/account[_-]?id["\s:=]+([a-zA-Z0-9_-]+)/i);
        if (match) return match[1];
      }
      return null;
    });
    
    const success = successIndicators.some(indicator => indicator === true);
    
    return {
      success,
      accountId: accountId || undefined,
      error: success ? undefined : 'Account creation may have failed - could not verify success'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * Launch browser with proper configuration
 */
async function launchBrowser(): Promise<any> {
  // Prepare launch args
  const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
  
  if (!PUPPETEER_HEADLESS) {
    launchArgs.push('--start-maximized');
  } else {
    // Additional flags for headless mode in CI environments
    launchArgs.push(
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer'
    );
  }
  
  return await puppeteer.launch({
    headless: PUPPETEER_HEADLESS,
    defaultViewport: null,
    args: launchArgs,
  });
}

/**
 * Create a single account
 */
async function createSingleAccount(): Promise<{ success: boolean; email?: string; error?: string }> {
  let browser;
  
  try {
    // Launch browser for this account
    console.log(`Launching browser in ${PUPPETEER_HEADLESS ? 'headless' : 'visible'} mode...`);
    browser = await launchBrowser();
    
    // Generate password
    const password = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15) + 'A1!';
    
    // Get temp email from testmail.app
    console.log('Getting temp email from testmail.app...');
    const email = getTempEmail();
    console.log(`Generated email: ${email}`);
    
    // Create account on felo.ai
    console.log('Creating account on felo.ai...');
    const result = await createFeloAccount(browser, email, password);
    
    // Prepare account data
    const accountData: AccountData = {
      email,
      password,
      createdAt: new Date().toISOString(),
      status: result.success ? 'created' : 'failed',
      error: result.error,
    };
    
    // Save to D1 database via Worker API
    console.log('Saving account to D1 database...');
    await saveAccountToD1(accountData);
    
    // Close browser after account creation
    console.log('Closing browser...');
    await browser.close();
    browser = null;
    
    if (result.success) {
      console.log('\n✓ Account created successfully!');
      console.log(`✓ Email: ${accountData.email}`);
      console.log(`✓ Created at: ${accountData.createdAt}`);
      return { success: true, email: accountData.email };
    } else {
      console.log('\n✗ Account creation failed');
      console.log(`✗ Error: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n✗ Error during account creation:', errorMessage);
    
    // Ensure browser is closed even on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Main function
 */
async function main() {
  if (!TESTMAIL_NAMESPACE) {
    console.error('Error: TESTMAIL_NAMESPACE is not set in .dev.vars file');
    process.exit(1);
  }
  
  console.log(`\n🚀 Starting account creation process`);
  console.log(`📊 Accounts to create: ${ACCOUNTS_PER_RUN}`);
  console.log(`🌐 Worker URL: ${WORKER_URL}`);
  console.log(`👻 Headless mode: ${PUPPETEER_HEADLESS ? 'Yes' : 'No'}`);
  console.log(`🔄 Browser will be closed after each account\n`);
  
  const results = { success: 0, failed: 0 };
  
  try {
    // Create multiple accounts (each with its own browser instance)
    for (let i = 1; i <= ACCOUNTS_PER_RUN; i++) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Creating account ${i} of ${ACCOUNTS_PER_RUN}`);
      console.log(`${'='.repeat(50)}`);
      
      const result = await createSingleAccount();
      
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }
      
      // Add a small delay between accounts to avoid rate limiting
      if (i < ACCOUNTS_PER_RUN) {
        console.log('\n⏳ Waiting 2 seconds before next account...');
        await delay(2000);
      }
    }
    
    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 Summary');
    console.log(`${'='.repeat(50)}`);
    console.log(`✅ Successful: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Total: ${ACCOUNTS_PER_RUN}`);
    console.log(`${'='.repeat(50)}\n`);
    
    // Exit with error code if any failed
    if (results.failed > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n✗ Error during account creation:', error);
    process.exit(1);
  }
}

// Run the script
main();

