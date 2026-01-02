/**
 * Local CapCut Account Creator Script
 * Runs Puppeteer on local machine and saves CapCut accounts to Cloudflare D1
 */

// Flow for create capcut account

// First, go to https://www.capcut.com/signup

// Then enter email to input has name="signUsername"

// Then click  button has classname: lv_sign_in_panel_wide-primary-button and wait 

// Next enter password to input has type="password"

// Then click button has classname: lv_sign_in_panel_wide-primary-button and wait

// Next enter date of birth

// Enter any year number to: <input aria-invalid="false" maxlength="4" placeholder="Year" class="lv-input lv-input-size-default gate_birthday-picker-input" value="" style="width: 96px;">


// Month dropdown: <div role="combobox" aria-haspopup="listbox" aria-autocomplete="list" aria-expanded="false" tabindex="0" class="lv-select lv-select-single lv-select-size-default gate_birthday-picker-selector" style="flex: 1 1 0%;" aria-controls="lv-select-popup-0"><div title="" class="lv-select-view"><span class="lv-select-view-selector"><input autocomplete="off" tabindex="-1" placeholder="Month" class="lv-select-view-input" value="" style="width: 100%; pointer-events: none;"><span class="lv-select-view-value lv-select-view-value-mirror">Month</span></span><div aria-hidden="true" class="lv-select-suffix"><div class="lv-select-arrow-icon"><svg fill="none" stroke="currentColor" stroke-width="4" viewBox="0 0 48 48" aria-hidden="true" focusable="false" class="lv-icon lv-icon-down"><path d="M39.6 17.443 24.043 33 8.487 17.443"></path></svg></div></div></div></div>

// Day dropdown:  <div role="combobox" aria-haspopup="listbox" aria-autocomplete="list" aria-expanded="false" tabindex="0" class="lv-select lv-select-single lv-select-size-default gate_birthday-picker-selector" style="width: 96px;" aria-controls="lv-select-popup-1"><div title="" class="lv-select-view"><span class="lv-select-view-selector"><input autocomplete="off" tabindex="-1" placeholder="Day" class="lv-select-view-input" value="" style="width: 100%; pointer-events: none;"><span class="lv-select-view-value lv-select-view-value-mirror">Day</span></span><div aria-hidden="true" class="lv-select-suffix"><div class="lv-select-arrow-icon"><svg fill="none" stroke="currentColor" stroke-width="4" viewBox="0 0 48 48" aria-hidden="true" focusable="false" class="lv-icon lv-icon-down"><path d="M39.6 17.443 24.043 33 8.487 17.443"></path></svg></div></div></div></div>

// Then click button has classname: lv_sign_in_panel_wide-primary-button and wait

// Enter otp got from email:

// <div class="default verification_code_input-wrapper"><div class="verification_code_input-number-wrapper"><div class="verification_code_input-number verification_code_input-number-focus"></div><div class="verification_code_input-number"></div><div class="verification_code_input-number"></div></div><div class="verification_code_input-number-divider"></div><div class="verification_code_input-number-wrapper"><div class="verification_code_input-number"></div><div class="verification_code_input-number"></div><div class="verification_code_input-number"></div></div><input maxlength="6" class="lv-input lv-input-size-default" value="" style="width: 100px; opacity: 0; position: absolute;"></div>

// Wait and click button confirm: lv-create-teamspace-confirm

// Save data and credits is 10 

import {
  WORKER_URL,
  PUPPETEER_HEADLESS,
  ACCOUNTS_PER_RUN,
  delay,
  getTempEmail,
  clickButtonByText,
  clickElementBySelectors,
  waitForOTP,
  launchBrowser,
} from './account-creator-utils';

interface CapCutAccountData {
  email: string;
  password: string;
  createdAt: string;
  status: 'created' | 'failed';
  error?: string;
  loginAt?: string;
  credits?: number;
}


/**
 * Save CapCut account to Cloudflare D1 via Worker API
 */
async function saveAccountToD1(accountData: CapCutAccountData): Promise<void> {
  try {
    const response = await fetch(`${WORKER_URL}/api/capcut-accounts/save`, {
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
 * Fill date of birth fields
 */
async function fillDateOfBirth(page: any): Promise<void> {
  console.log('Filling date of birth...');
  await delay(1000);
  
  // Generate a random date of birth (18-30 years old)
  const currentYear = new Date().getFullYear();
  const year = currentYear - Math.floor(Math.random() * 13) - 18; // 18-30 years old
  const month = Math.floor(Math.random() * 12) + 1; // 1-12
  const day = Math.floor(Math.random() * 28) + 1; // 1-28 (safe for all months)
  
  // Fill year
  const yearInput = await page.$('input.gate_birthday-picker-input[placeholder="Year"]');
  if (yearInput) {
    await yearInput.click({ clickCount: 3 });
    await yearInput.type(year.toString(), { delay: 50 });
    console.log(`✓ Year filled: ${year}`);
  } else {
    throw new Error('Could not find year input field');
  }
  
  await delay(500);
  
  // Fill month - click the month dropdown
  const monthDropdowns = await page.$$('div.gate_birthday-picker-selector');
  if (monthDropdowns && monthDropdowns.length >= 1) {
    // First dropdown is month
    await monthDropdowns[0].click();
    await delay(800);
    
    // Wait for dropdown options to appear
    await page.waitForSelector('li[role="option"]', { timeout: 5000 }).catch(() => {});
    
    // Select month from dropdown by name (January, February, March, etc.)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const monthSelected = await page.evaluate((m: number, names: string[], shortNames: string[]) => {
      // Use li[role="option"] or .lv-select-option to match the actual HTML structure
      const options = Array.from(document.querySelectorAll('li[role="option"], .lv-select-option'));
      const targetMonth = names[m - 1];
      const targetShort = shortNames[m - 1];
      
      // First, try to find by exact full month name (January, February, etc.)
      for (const opt of options) {
        const text = ((opt as any).textContent || (opt as any).innerText || '').trim();
        if (text === targetMonth || text.toLowerCase() === targetMonth.toLowerCase()) {
          (opt as HTMLElement).click();
          return true;
        }
      }
      
      // Second, try to find by partial match (contains the month name)
      for (const opt of options) {
        const text = ((opt as any).textContent || (opt as any).innerText || '').trim().toLowerCase();
        if (text.includes(targetMonth.toLowerCase()) || text.includes(targetShort.toLowerCase())) {
          (opt as HTMLElement).click();
          return true;
        }
      }
      
      // Fallback: try by index (0-based, so month - 1)
      if (options[m - 1]) {
        (options[m - 1] as HTMLElement).click();
        return true;
      }
      
      return false;
    }, month, monthNames, monthShortNames);
    
    if (monthSelected) {
      console.log(`✓ Month selected: ${monthNames[month - 1]}`);
    } else {
      throw new Error(`Could not select month: ${monthNames[month - 1]}`);
    }
  } else {
    throw new Error('Could not find month dropdown');
  }
  
  await delay(500);
  
  // Fill day - click the day dropdown (second dropdown)
  if (monthDropdowns && monthDropdowns.length >= 2) {
    await monthDropdowns[1].click();
    await delay(800);
    
    // Wait for dropdown options to appear (day dropdown might use same structure as month)
    await page.waitForSelector('li[role="option"], div[role="option"]', { timeout: 5000 }).catch(() => {});
    
    // Select day from dropdown - try both li and div selectors
    let dayOptions = await page.$$('li[role="option"], .lv-select-option');
    if (!dayOptions || dayOptions.length === 0) {
      dayOptions = await page.$$('div[role="option"]');
    }
    
    if (dayOptions && dayOptions.length >= day) {
      await dayOptions[day - 1].click();
      console.log(`✓ Day selected: ${day}`);
    } else {
      // Fallback: try clicking by text
      const clicked = await page.evaluate((d: number) => {
        // Try both li and div selectors
        let options = Array.from(document.querySelectorAll('li[role="option"], .lv-select-option'));
        if (options.length === 0) {
          options = Array.from(document.querySelectorAll('div[role="option"]'));
        }
        
        const dayOption = options.find((opt: any) => {
          const text = (opt.textContent || opt.innerText || '').trim();
          return text === d.toString();
        });
        if (dayOption) {
          (dayOption as HTMLElement).click();
          return true;
        }
        // Try by index as fallback
        if (options[d - 1]) {
          (options[d - 1] as HTMLElement).click();
          return true;
        }
        return false;
      }, day);
      
      if (clicked) {
        console.log(`✓ Day selected: ${day}`);
      } else {
        throw new Error('Could not select day from dropdown');
      }
    }
  } else {
    throw new Error('Could not find day dropdown');
  }
  
  await delay(500);
}

/**
 * Fill OTP code for CapCut (special input with 6 digits)
 */
async function fillCapCutOTP(page: any, emailId: string): Promise<void> {
  console.log('Waiting for OTP...');
  await delay(2000);
  
  if (!WORKER_URL) {
    throw new Error('WORKER_URL not set, cannot retrieve OTP automatically');
  }
  
  if (!emailId) {
    throw new Error('Email ID not provided, cannot retrieve OTP');
  }
  
  // Wait for OTP from email
  const otpCode = await waitForOTP(emailId, 60000);
  console.log(`✓ Received OTP: ${otpCode}`);
  
  // Find the OTP input (it's hidden with opacity: 0)
  const otpInput = await page.$('input.lv-input[maxlength="6"]');
  if (otpInput) {
    console.log('Entering OTP code...');
    await otpInput.click({ clickCount: 3 });
    await otpInput.type(otpCode, { delay: 100 });
    console.log('✓ OTP entered');
  } else {
    throw new Error('Could not find OTP input field');
  }
  
  await delay(1000);
}

/**
 * Click CapCut primary button
 */
async function clickCapCutPrimaryButton(page: any): Promise<boolean> {
  const button = await page.$('button.lv_sign_in_panel_wide-primary-button');
  if (button) {
    const isVisible = await button.isIntersectingViewport();
    if (isVisible) {
      await button.click();
      console.log('✓ Clicked primary button');
      await delay(2000);
      return true;
    }
  }
  return false;
}

/**
 * Click confirm button for teamspace
 */
async function clickConfirmTeamspaceButton(page: any): Promise<boolean> {
  const button = await page.$('button.lv-create-teamspace-confirm');
  if (button) {
    const isVisible = await button.isIntersectingViewport();
    if (isVisible) {
      await button.click();
      console.log('✓ Clicked confirm teamspace button');
      await delay(2000);
      return true;
    }
  }
  
  // Fallback: try by text
  const clicked = await clickButtonByText(page, 'confirm');
  if (clicked) {
    console.log('✓ Clicked confirm button (by text)');
    await delay(2000);
    return true;
  }
  
  return false;
}

/**
 * Create account on CapCut using Puppeteer
 */
async function createCapCutAccount(
  browser: any,
  email: string,
  password: string,
  emailId: string
): Promise<{ success: boolean; accountId?: string; error?: string }> {
  let page;
  try {
    page = await browser.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Step 1: Navigate directly to signup page
    console.log('Navigating to CapCut signup page...');
    await page.goto('https://www.capcut.com/signup', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await delay(2000);
    
    // Step 2: Fill email in input with name="signUsername"
    console.log('Filling email...');
    const emailInput = await page.$('input[name="signUsername"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type(email, { delay: 50 });
      console.log('✓ Email filled');
    } else {
      throw new Error('Could not find email input field (name="signUsername")');
    }
    
    await delay(500);
    
    // Step 3: Click primary button
    await clickCapCutPrimaryButton(page);
    
    // Step 4: Fill password
    console.log('Filling password...');
    await delay(1000);
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(password, { delay: 50 });
      console.log('✓ Password filled');
    } else {
      throw new Error('Could not find password input field');
    }
    
    await delay(500);
    
    // Step 5: Click primary button again
    await clickCapCutPrimaryButton(page);
    
    // Step 6: Fill date of birth
    await fillDateOfBirth(page);
    
    // Step 7: Click primary button again
    await clickCapCutPrimaryButton(page);
    
    // Step 8: Fill OTP
    await fillCapCutOTP(page, emailId);
    
    // Step 9: Click confirm teamspace button
    await clickConfirmTeamspaceButton(page);
    
    // Wait for navigation
    await delay(3000);
    
    // Check if account was created successfully
    const currentUrl = page.url();
    const pageContent = await page.content();
    
    const successIndicators = [
      currentUrl.includes('dashboard'),
      currentUrl.includes('home'),
      currentUrl.includes('workspace'),
      currentUrl.includes('studio'),
      !currentUrl.includes('signup'),
      !currentUrl.includes('login'),
      pageContent.includes('Welcome') || pageContent.includes('Dashboard') || pageContent.includes('CapCut'),
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
 * Generate password for CapCut (6-20 characters)
 */
function generateCapCutPassword(): string {
  // CapCut requires 6-20 characters
  // Generate a random length between 6-20
  const length = Math.floor(Math.random() * 15) + 6; // 6-20 characters
  
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = lowercase + uppercase + numbers + special;
  
  // Ensure at least one of each type (if length >= 4)
  let password = '';
  if (length >= 4) {
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
  } else {
    // For very short passwords (6 chars), use a mix
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
  }
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
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
    
    // Generate password (6-20 characters for CapCut)
    const password = generateCapCutPassword();
    
    // Get temp email from Boomlify API via Worker
    console.log('Getting temp email from Boomlify API...');
    const { email, emailId } = await getTempEmail();
    
    // Create account on CapCut
    console.log('Creating account on CapCut...');
    const result = await createCapCutAccount(browser, email, password, emailId);
    
    // Prepare account data
    const accountData: CapCutAccountData = {
      email,
      password,
      createdAt: new Date().toISOString(),
      status: result.success ? 'created' : 'failed',
      error: result.error,
      credits: 10, // CapCut accounts start with 10 credits
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
  
  console.log(`\n🚀 Starting CapCut account creation process`);
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

