/**
 * Shared utilities for account creator scripts
 * Contains common functions used by both Felo and CapCut account creators
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

export const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';
export const PUPPETEER_HEADLESS = process.env.PUPPETEER_HEADLESS === 'true' || process.env.PUPPETEER_HEADLESS === '1';
export const ACCOUNTS_PER_RUN = parseInt(process.env.ACCOUNTS_PER_RUN || '1', 10);

/**
 * Helper function to wait/delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get a temporary email address from Boomlify API via Worker
 * Returns both email and email ID for later message retrieval
 */
export async function getTempEmail(): Promise<{ email: string; emailId: string }> {
  if (!WORKER_URL) {
    throw new Error('WORKER_URL is required. Please set it in .dev.vars');
  }
  
  try {
    const url = `${WORKER_URL}/api/boomlify/temp-mail`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(`Boomlify API error: ${response.status} - ${errorData.message || response.statusText}`);
    }
    
    const data = await response.json() as { 
      success?: boolean;
      email?: { 
        id?: string; 
        address?: string; 
        expires_at?: string;
      }; 
      credits_remaining?: number;
    };
    
    if (!data.success || !data.email || !data.email.address || !data.email.id) {
      throw new Error('No email address or ID returned from Boomlify API');
    }
    
    console.log(`✓ Got temp email from Boomlify: ${data.email.address}`);
    console.log(`  Email ID: ${data.email.id}`);
    console.log(`  Expires at: ${data.email.expires_at}`);
    if (data.credits_remaining !== undefined) {
      console.log(`  Credits remaining: ${data.credits_remaining}`);
    }
    
    return {
      email: data.email.address,
      emailId: data.email.id,
    };
  } catch (error) {
    console.error('Failed to get temp email from Boomlify API:', error);
    throw error;
  }
}

/**
 * Retrieve messages from Boomlify API via Worker
 */
export async function getMessagesFromBoomlify(emailId: string): Promise<any> {
  if (!WORKER_URL) {
    throw new Error('WORKER_URL is required. Please set it in .dev.vars');
  }
  
  try {
    const url = `${WORKER_URL}/api/boomlify/messages/${emailId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(`Boomlify API error: ${response.status} - ${errorData.message || response.statusText}`);
    }
    
    const data = await response.json() as any;
    return data;
  } catch (error) {
    console.error('Failed to retrieve messages from Boomlify API:', error);
    throw error;
  }
}

/**
 * Wait for OTP code from Boomlify API via Worker
 */
export async function waitForOTP(
  emailId: string,
  timeout: number = 60000
): Promise<string> {
  const startTime = Date.now();
  const checkInterval = 3000;
  
  while (Date.now() - startTime < timeout) {
    try {
      const data = await getMessagesFromBoomlify(emailId) as {
        success?: boolean;
        messages?: Array<{
          id?: string;
          subject?: string;
          text?: string;
          html?: string;
          from?: string;
          to?: string;
          created_at?: string;
          [key: string]: any;
        }>;
        email?: {
          id: string;
          address: string;
          message_count: number;
        };
      };
      
      // Check if response is successful and has messages
      if (data.success && data.messages && data.messages.length > 0) {
        for (const message of data.messages) {
          const subject = message.subject || '';
          const text = message.text || message.html || '';
          const fullText = (subject + ' ' + text).toLowerCase();
          
          // Look for OTP patterns: 4-6 digit codes
          const otpMatch = fullText.match(/\b(\d{4,6})\b/);
          if (otpMatch) {
            const otp = otpMatch[1];
            console.log(`✓ Found OTP in email: ${otp}`);
            return otp;
          }
        }
      }
      
      // Log progress
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.floor((timeout - (Date.now() - startTime)) / 1000);
      if (elapsed % 9 === 0) { // Log every 9 seconds (every 3 checks)
        console.log(`Waiting for OTP email... (${remaining}s remaining)`);
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
 * Helper: Click button by text content
 */
export async function clickButtonByText(page: any, text: string): Promise<boolean> {
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
export async function clickElementBySelectors(page: any, selectors: string[]): Promise<boolean> {
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
export async function fillInputBySelectors(page: any, selectors: string[], value: string): Promise<boolean> {
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
 * Fill email field
 */
export async function fillEmailField(page: any, email: string): Promise<void> {
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
 * Fill password field
 */
export async function fillPasswordField(page: any, password: string): Promise<void> {
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
 * Submit form fallback
 */
export async function submitFormFallback(page: any): Promise<boolean> {
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
export async function waitForElementBySelectors(
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
 * @param page - Puppeteer page object
 * @param emailId - Email ID from Boomlify
 * @param verifyButtonText - Text to search for verify button (default: 'verify')
 */
export async function verifyOTP(
  page: any,
  emailId: string,
  verifyButtonText: string = 'verify'
): Promise<boolean> {
  console.log('Waiting for OTP modal...');
  await delay(2000);
  
  if (!WORKER_URL) {
    console.warn('⚠ WORKER_URL not set, cannot retrieve OTP automatically');
    return false;
  }
  
  if (!emailId) {
    console.warn('⚠ Email ID not provided, cannot retrieve OTP');
    return false;
  }
  
  const otpPromise = waitForOTP(emailId, 60000);
  
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
          
          const verifyClicked = await clickButtonByText(page, verifyButtonText);
          if (verifyClicked) {
            console.log(`✓ Clicked '${verifyButtonText}' button`);
            await delay(2000);
          } else {
            const submitButton = await page.$('button[type="submit"]');
            if (submitButton) {
              const isVisible = await submitButton.isIntersectingViewport();
              if (isVisible) {
                await submitButton.click();
                console.log('✓ Clicked submit button (Verify)');
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
  
  const verifyClicked = await clickButtonByText(page, verifyButtonText);
  if (verifyClicked) {
    console.log(`✓ Clicked '${verifyButtonText}' button`);
    await delay(2000);
  } else {
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      const isVisible = await submitButton.isIntersectingViewport();
      if (isVisible) {
        await submitButton.click();
        console.log('✓ Clicked submit button (Verify)');
        await delay(2000);
      }
    }
  }
  
  return true;
}

/**
 * Click sign up button
 */
export async function clickSignUpButton(page: any): Promise<void> {
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
 * Launch browser with proper configuration
 */
export async function launchBrowser(): Promise<any> {
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

