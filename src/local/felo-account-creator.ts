/**
 * Local Felo Account Creator Script
 * Runs Puppeteer on local machine and saves Felo accounts to Cloudflare D1
 */

import {
  WORKER_URL,
  PUPPETEER_HEADLESS,
  ACCOUNTS_PER_RUN,
  delay,
  getTempEmail,
  clickButtonByText,
  clickElementBySelectors,
  clickSignUpButton,
  fillEmailField,
  fillPasswordField,
  submitFormFallback,
  verifyOTP,
  launchBrowser,
} from './account-creator-utils';

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
  password: string,
  emailId: string
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
        await verifyOTP(page, emailId, 'verify email');
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
    
    // Get temp email from Boomlify API via Worker
    console.log('Getting temp email from Boomlify API...');
    const { email, emailId } = await getTempEmail();
    
    // Create account on felo.ai
    console.log('Creating account on felo.ai...');
    const result = await createFeloAccount(browser, email, password, emailId);
    
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
  if (!WORKER_URL) {
    console.error('Error: WORKER_URL is not set in .dev.vars file');
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

