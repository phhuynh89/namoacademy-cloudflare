import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { writeFile } from "fs/promises";
import { createTempEmail, waitForOTP } from "../services/emailService.js";
import { checkEmailExists } from "../services/feloApi.js";
import {
  clickButtonByText,
  fillInputBySelectors,
  fillTextareaByPlaceholder,
  waitForElementBySelectors,
  clickElementBySelectors,
} from "../services/browserService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BOOMLIFY_API_KEY = process.env.BOOMLIFY_API_KEY || "";

/**
 * Initialize browser and navigate to Felo.ai
 */
async function initializeBrowser() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();

  console.log("Navigating to Felo.ai...");
  await page.goto("https://felo.ai/", {
    waitUntil: "networkidle2",
    timeout: 30000,
  });

  await page.waitForTimeout(2000);
  return { browser, page };
}

/**
 * Click Login button
 */
async function clickLoginButton(page) {
  console.log("Looking for Login button...");
  const clicked = await clickButtonByText(page, "login");
  if (clicked) {
    console.log("✓ Clicked Login button");
    await page.waitForTimeout(1500);
  } else {
    console.warn("⚠ Could not find Login button, continuing anyway...");
  }
}

/**
 * Click sign up button
 */
async function clickSignUpButton(page) {
  console.log("Looking for sign up button...");

  const signUpSelectors = [
    'a[href*="signup"]',
    'a[href*="sign-up"]',
    'a[href*="register"]',
    '[data-testid*="signup"]',
    '[data-testid*="sign-up"]',
  ];

  let clicked = await clickElementBySelectors(page, signUpSelectors);
  if (clicked) {
    console.log("✓ Clicked sign up button");
    await page.waitForTimeout(1000);
    return;
  }

  // Fallback: search by text
  clicked = await clickButtonByText(page, "sign up");
  if (!clicked) {
    clicked = await clickButtonByText(page, "get started");
  }
  if (!clicked) {
    clicked = await clickButtonByText(page, "create account");
  }

  if (clicked) {
    console.log("✓ Clicked sign up button");
    await page.waitForTimeout(1000);
  }
}

/**
 * Fill email field
 */
async function fillEmailField(page, email) {
  console.log("Filling in email address...");
  await page.waitForTimeout(1000);

  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[id*="email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email" i]',
  ];

  const filled = await fillInputBySelectors(page, emailSelectors, email);
  if (filled) {
    console.log("✓ Email filled");
  } else {
    throw new Error("Could not find email input field");
  }
}

/**
 * Click "Continue with Email" button
 */
async function clickContinueWithEmail(page) {
  console.log("Looking for 'Continue with Email' button...");
  await page.waitForTimeout(500);

  const submitButtons = await page.$$("button[type='submit']");
  for (const button of submitButtons) {
    try {
      const text = await page.evaluate((el) => {
        return el.textContent || el.innerText || "";
      }, button);

      if (text && text.trim().toLowerCase().includes("continue with email")) {
        const isVisible = await button.isIntersectingViewport();
        if (isVisible) {
          await button.click();
          console.log("✓ Clicked 'Continue with Email' button");
          await page.waitForTimeout(2000);
          return true;
        }
      }
    } catch (e) {
      // Continue
    }
  }

  // Fallback
  const continueButton = await page.$('button[type="submit"]');
  if (continueButton) {
    const isVisible = await continueButton.isIntersectingViewport();
    if (isVisible) {
      await continueButton.click();
      console.log("✓ Clicked submit button (Continue with Email)");
      await page.waitForTimeout(2000);
      return true;
    }
  }

  console.warn("⚠ Could not find 'Continue with Email' button, continuing anyway...");
  return false;
}

/**
 * Fill password field
 */
async function fillPasswordField(page) {
  console.log("Filling in password...");
  await page.waitForTimeout(500);

  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[id*="password"]',
  ];

  const filled = await fillInputBySelectors(page, passwordSelectors, "TempPassword123!");
  if (filled) {
    console.log("✓ Password filled");
  }
}

/**
 * Click appropriate button based on email existence
 */
async function clickRegisterOrLoginButton(page, email) {
  console.log("Checking if email exists in Felo system...");
  const emailExistsResult = await checkEmailExists(email);

  if (emailExistsResult) {
    console.log("✓ Email already exists - will click 'Email login' button");
    const clicked = await clickButtonByText(page, "email login");
    if (clicked) {
      console.log("✓ Clicked 'Email login' button");
      await page.waitForTimeout(2000);
      return { emailLoginClicked: true, registerClicked: false };
    }
  } else {
    console.log("✓ Email does not exist - will click 'Register and verify email' button");
    const clicked = await clickButtonByText(page, "register and verify email");
    if (clicked) {
      console.log("✓ Clicked 'Register and verify email' button");
      await page.waitForTimeout(2000);
      return { emailLoginClicked: false, registerClicked: true };
    }
  }

  return { emailLoginClicked: false, registerClicked: false };
}

/**
 * Submit form fallback
 */
async function submitFormFallback(page) {
  console.log("Submitting registration form...");
  await page.waitForTimeout(500);

  const submitSelectors = ['button[type="submit"]'];

  const clicked = await clickElementBySelectors(page, submitSelectors);
  if (clicked) {
    console.log("✓ Form submitted");
    await page.waitForTimeout(2000);
    return true;
  }

  // Try pressing Enter on password field
  const passwordInput = await page.$('input[type="password"]');
  if (passwordInput) {
    await passwordInput.press("Enter");
    console.log("✓ Submitted by pressing Enter");
    await page.waitForTimeout(2000);
    return true;
  }

  return false;
}

/**
 * Verify OTP
 */
async function verifyOTP(page, emailId) {
  console.log("Waiting for OTP modal...");
  await page.waitForTimeout(2000);

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
    // Try to find any input that might be for OTP
    const inputs = await page.$$("input");
    for (const input of inputs) {
      const placeholder = await page.evaluate((el) => el.placeholder, input);
      const id = await page.evaluate((el) => el.id, input);
      if (
        (placeholder &&
          (placeholder.toLowerCase().includes("code") ||
            placeholder.toLowerCase().includes("otp"))) ||
        (id &&
          (id.toLowerCase().includes("code") || id.toLowerCase().includes("otp")))
      ) {
        console.log("✓ OTP input found by searching");
        const otpCode = await otpPromise;
        console.log(`\n✓ Received OTP: ${otpCode}`);

        console.log("Entering OTP code...");
        await input.click({ clickCount: 3 });
        await input.type(otpCode, { delay: 100 });

        // Click verify button
        const verifyClicked = await clickButtonByText(page, "verify email");
        if (verifyClicked) {
          console.log("✓ Clicked 'Verify email' button");
          await page.waitForTimeout(2000);
        } else {
          // Fallback
          const submitButton = await page.$('button[type="submit"]');
          if (submitButton) {
            const isVisible = await submitButton.isIntersectingViewport();
            if (isVisible) {
              await submitButton.click();
              console.log("✓ Clicked submit button (Verify email)");
              await page.waitForTimeout(2000);
            }
          }
        }
        return true;
      }
    }
    throw new Error("Could not find OTP input field");
  }

  const otpCode = await otpPromise;
  console.log(`\n✓ Received OTP: ${otpCode}`);

  console.log("Entering OTP code...");
  await otpInput.click({ clickCount: 3 });
  await otpInput.type(otpCode, { delay: 100 });

  const verifyClicked = await clickButtonByText(page, "verify email");
  if (verifyClicked) {
    console.log("✓ Clicked 'Verify email' button");
    await page.waitForTimeout(2000);
  } else {
    // Fallback
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      const isVisible = await submitButton.isIntersectingViewport();
      if (isVisible) {
        await submitButton.click();
        console.log("✓ Clicked submit button (Verify email)");
        await page.waitForTimeout(2000);
      }
    }
  }
}

/**
 * Process image URL: extract src parameter, decode, and remove only q and w query params
 */
function processImageUrl(imageUrl) {
  try {
    // Check if URL contains src parameter (livedoc-image.felo.me format)
    if (imageUrl.includes('livedoc-image.felo.me') && imageUrl.includes('src=')) {
      const urlObj = new URL(imageUrl);
      const srcParam = urlObj.searchParams.get('src');
      
      if (srcParam) {
        // Decode the URL (it's double-encoded)
        const decodedUrl = decodeURIComponent(decodeURIComponent(srcParam));
        
        // Parse the decoded URL to remove only q and w parameters
        const decodedUrlObj = new URL(decodedUrl);
        
        // Remove q and w parameters
        decodedUrlObj.searchParams.delete('q');
        decodedUrlObj.searchParams.delete('w');
        
        const processedUrl = decodedUrlObj.toString();
        console.log(`✓ Processed URL: ${processedUrl}`);
        return processedUrl;
      }
    }
    
    // If not the expected format, return original URL
    return imageUrl;
  } catch (error) {
    console.error("Error processing image URL:", error.message);
    return imageUrl; // Return original URL on error
  }
}

/**
 * Download image from URL and save to local file
 */
async function downloadImage(imageUrl, outputPath) {
  try {
    // Process the URL first (extract src, decode, remove query params)
    const processedUrl = processImageUrl(imageUrl);
    
    console.log(`Downloading image from: ${processedUrl}`);
    const response = await fetch(processedUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(outputPath, buffer);
    console.log(`✓ Image saved to: ${outputPath}`);
    return true;
  } catch (error) {
    console.error("Error downloading image:", error.message);
    return false;
  }
}

/**
 * Check for react-flow__nodes box and download the second image if available
 */
async function checkAndDownloadImage(page) {
  console.log("Checking for react-flow__nodes box and image...");
  
  const maxWaitTime = 60000; // 1 minute
  const checkInterval = 3000; // 3 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Check if react-flow__nodes exists
      const reactFlowNodes = await page.$('.react-flow__nodes');
      
      if (reactFlowNodes) {
        // Find all images within react-flow__nodes
        const images = await page.$$('.react-flow__nodes img');
        
        if (images && images.length >= 2) {
          // Get the second image (index 1)
          const secondImage = images[1];
          
          const imageUrl = await page.evaluate((img) => {
            return img.src;
          }, secondImage);

          if (imageUrl) {
            console.log(`✓ Found second image URL: ${imageUrl}`);
            
            // Generate output filename with timestamp
            const timestamp = Date.now();
            const outputPath = join(__dirname, "..", `generated-image-${timestamp}.jpg`);
            
            const downloaded = await downloadImage(imageUrl, outputPath);
            if (downloaded) {
              return outputPath;
            }
          }
        } else if (images && images.length > 0) {
          console.log(`Found ${images.length} image(s), need at least 2. Waiting...`);
        }
      }

      // If not found, wait and retry
      const elapsed = Date.now() - startTime;
      const remaining = Math.floor((maxWaitTime - elapsed) / 1000);
      if (remaining > 0) {
        console.log(`Image not ready yet, retrying in 3s... (${remaining}s remaining)`);
        await page.waitForTimeout(checkInterval);
      }
    } catch (error) {
      console.error("Error checking for image:", error.message);
      await page.waitForTimeout(checkInterval);
    }
  }

  console.warn("⚠ Second image not found within timeout period");
  return null;
}

/**
 * Click the Skip button if it exists after navigation
 */
async function clickSkipButton(page) {
  // Wait before checking for Skip button
  console.log("Waiting before checking for 'Skip' button...");
  await page.waitForTimeout(5000); // Wait 5 seconds
  
  console.log("Checking for 'Skip' button...");

  try {
    // Look for Skip button with specific attributes
    const skipButton = await page.$('button[aria-label="Skip"][data-action="skip"][role="button"]');
    
    if (skipButton) {
      const isVisible = await skipButton.isIntersectingViewport();
      if (isVisible) {
        await skipButton.click();
        console.log("✓ Clicked 'Skip' button");
        await page.waitForTimeout(2000);
        return true;
      }
    }

    // Fallback: search by text content
    const buttons = await page.$$('button[role="button"]');
    for (const button of buttons) {
      try {
        const text = await page.evaluate((btn) => {
          return btn.textContent || btn.innerText || "";
        }, button);

        if (text.trim().toLowerCase() === "skip") {
          const isVisible = await button.isIntersectingViewport();
          if (isVisible) {
            await button.click();
            console.log("✓ Clicked 'Skip' button (by text)");
            await page.waitForTimeout(2000);
            return true;
          }
        }
      } catch (e) {
        // Continue
      }
    }

    console.log("No 'Skip' button found");
    return false;
  } catch (error) {
    console.error("Error checking for Skip button:", error.message);
    return false;
  }
}

/**
 * Click the submit/arrow-right button after image upload
 */
async function clickSubmitButton(page) {
  console.log("Looking for submit button (arrow-right)...");
  await page.waitForTimeout(1000);

  try {
    // First, try to find button by brand class (most specific)
    const brandButtons = await page.$$('button.bg-felo-bg-brand, button[class*="bg-felo-bg-brand"]');
    for (const button of brandButtons) {
      try {
        const buttonInfo = await page.evaluate((btn) => {
          const svg = btn.querySelector('svg.lucide-arrow-right');
          const text = btn.textContent || btn.innerText || "";
          return {
            hasArrowIcon: svg !== null,
            text: text.trim().toLowerCase(),
            isVisible: true
          };
        }, button);
        
        // Must have arrow icon, must NOT have "More" text, and must be visible
        if (buttonInfo.hasArrowIcon && !buttonInfo.text.includes("more")) {
          const isVisible = await button.isIntersectingViewport();
          if (isVisible) {
            // Set up navigation wait before clicking
            const navigationPromise = page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => null);
            
            await button.click();
            console.log("✓ Clicked submit button (by brand class with arrow-right)");
            
            // Wait for navigation and click Skip button if it exists
            await navigationPromise;
            await clickSkipButton(page);
            
            // Check for and download image (runs regardless of Skip button)
            await checkAndDownloadImage(page);
            
            return true;
          }
        }
      } catch (e) {
        // Continue
      }
    }

    // Fallback: find button with arrow-right icon but exclude "More" buttons
    const buttons = await page.$$('button[type="button"]');
    
    for (const button of buttons) {
      try {
        const buttonInfo = await page.evaluate((btn) => {
          const svg = btn.querySelector('svg.lucide-arrow-right');
          const text = btn.textContent || btn.innerText || "";
          const hasBrandClass = btn.classList.contains('bg-felo-bg-brand') || 
                               btn.className.includes('bg-felo-bg-brand');
          return {
            hasArrowIcon: svg !== null,
            text: text.trim().toLowerCase(),
            hasBrandClass: hasBrandClass
          };
        }, button);
        
        // Must have arrow icon, must NOT have "More" text
        if (buttonInfo.hasArrowIcon && !buttonInfo.text.includes("more")) {
          const isVisible = await button.isIntersectingViewport();
          if (isVisible) {
            // Prefer buttons with brand class
            if (buttonInfo.hasBrandClass) {
              // Set up navigation wait before clicking
              const navigationPromise = page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => null);
              
              await button.click();
              console.log("✓ Clicked submit button (arrow-right with brand class)");
              
              // Wait for navigation and click Skip button if it exists
              await navigationPromise;
              await clickSkipButton(page);
              
              // Check for and download image (runs regardless of Skip button)
              await checkAndDownloadImage(page);
              
              return true;
            }
          }
        }
      } catch (e) {
        // Continue
      }
    }

    // Last resort: try any button with arrow-right that doesn't have "More"
    for (const button of buttons) {
      try {
        const buttonInfo = await page.evaluate((btn) => {
          const svg = btn.querySelector('svg.lucide-arrow-right');
          const text = btn.textContent || btn.innerText || "";
          return {
            hasArrowIcon: svg !== null,
            text: text.trim().toLowerCase()
          };
        }, button);
        
        if (buttonInfo.hasArrowIcon && !buttonInfo.text.includes("more")) {
          const isVisible = await button.isIntersectingViewport();
          if (isVisible) {
            // Set up navigation wait before clicking
            const navigationPromise = page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => null);
            
            await button.click();
            console.log("✓ Clicked submit button (arrow-right, no More text)");
            
            // Wait for navigation and click Skip button if it exists
            await navigationPromise;
            await clickSkipButton(page);
            
            // Check for and download image (runs regardless of Skip button)
            await checkAndDownloadImage(page);
            
            return true;
          }
        }
      } catch (e) {
        // Continue
      }
    }

    console.warn("⚠ Could not find submit button");
    return false;
  } catch (error) {
    console.error("Error clicking submit button:", error.message);
    return false;
  }
}

/**
 * Upload image file to file input
 */
async function uploadImageFile(page, imagePath) {
  console.log("Looking for file upload button or input...");
  await page.waitForTimeout(1000);

  try {
    // Method 1: Try clicking the upload button (button with image icon) to trigger file chooser
    const buttons = await page.$$('button[type="button"]');
    let uploadButton = null;
    
    for (const button of buttons) {
      try {
        const hasImageIcon = await page.evaluate((btn) => {
          const svg = btn.querySelector('svg.lucide-image');
          return svg !== null;
        }, button);
        
        if (hasImageIcon) {
          uploadButton = button;
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    if (uploadButton) {
      console.log("Found upload button, using FileChooser API...");
      const fileChooserPromise = page.waitForFileChooser({ timeout: 5000 });
      await uploadButton.click();
      
      try {
        const fileChooser = await fileChooserPromise;
        await fileChooser.accept([imagePath]);
        console.log(`✓ Uploaded image file via FileChooser: ${imagePath}`);
        await page.waitForTimeout(1000);
        
        // Click submit button after upload
        await clickSubmitButton(page);
        return true;
      } catch (chooserError) {
        console.log("FileChooser not triggered from button, trying input directly...");
      }
    }

    // Method 2: Try clicking the file input directly
    const fileInput = await page.$('input[type="file"][accept="image/*"]');
    
    if (fileInput) {
      console.log("Found file input, using FileChooser API...");
      const fileChooserPromise = page.waitForFileChooser({ timeout: 5000 });
      await fileInput.click();
      
      try {
        const fileChooser = await fileChooserPromise;
        await fileChooser.accept([imagePath]);
        console.log(`✓ Uploaded image file via FileChooser: ${imagePath}`);
        await page.waitForTimeout(1000);
        
        // Click submit button after upload
        await clickSubmitButton(page);
        return true;
      } catch (chooserError) {
        console.log("FileChooser not triggered from input either");
      }
    }

    console.warn("⚠ Could not trigger file chooser. File input or button not found.");
    return false;
  } catch (error) {
    console.error("Error uploading image:", error.message);
    return false;
  }
}

/**
 * Check for and click "Claim" div if it exists
 */
async function checkAndClickClaimDiv(page) {
  console.log("Checking for 'Claim' div...");
  await page.waitForTimeout(2000);

  try {
    const divs = await page.$$("div");
    
    for (const div of divs) {
      try {
        const text = await page.evaluate((el) => {
          return el.textContent || el.innerText || "";
        }, div);

        if (text && text.trim().toLowerCase() === "claim") {
          const isVisible = await div.isIntersectingViewport();
          if (isVisible) {
            // Check if it's clickable (has cursor pointer or is a button-like element)
            const isClickable = await page.evaluate((el) => {
              const style = window.getComputedStyle(el);
              return (
                style.cursor === "pointer" ||
                el.onclick !== null ||
                el.getAttribute("role") === "button" ||
                el.classList.contains("cursor-pointer") ||
                el.style.cursor === "pointer"
              );
            }, div);

            // Click if it appears clickable, or if it's visible (be permissive)
            if (isClickable) {
              await div.click();
              console.log("✓ Clicked 'Claim' div");
              await page.waitForTimeout(2000);
              return true;
            } else {
              // Try clicking anyway if it's visible (might be clickable via parent)
              try {
                await div.click();
                console.log("✓ Clicked 'Claim' div (attempted)");
                await page.waitForTimeout(2000);
                return true;
              } catch (clickError) {
                // Continue searching
              }
            }
          }
        }
      } catch (e) {
        // Continue
      }
    }

    // Also check for buttons with "Claim" text
    const claimClicked = await clickButtonByText(page, "claim", true);
    if (claimClicked) {
      console.log("✓ Clicked 'Claim' button");
      await page.waitForTimeout(2000);
      return true;
    }

    console.log("No 'Claim' div or button found");
    return false;
  } catch (error) {
    console.error("Error checking for Claim div:", error.message);
    return false;
  }
}

/**
 * Click AI Image button and enter prompt
 */
async function clickAIImageAndEnterPrompt(page) {
  console.log("Waiting for page to finish loading...");

  await page.waitForTimeout(3000);

  console.log("Looking for 'AI Image' button...");
  
  // Try ID selector first (most reliable)
  let aiImageClicked = false;
  try {
    const aiImageButton = await page.$("#agent-ai_image");
    if (aiImageButton) {
      const isVisible = await aiImageButton.isIntersectingViewport();
      if (isVisible) {
        await aiImageButton.click();
        aiImageClicked = true;
        console.log("✓ Clicked 'AI Image' button (by ID)");
      }
    }
  } catch (e) {
    // Continue to fallback
  }

  // Fallback to text-based search
  if (!aiImageClicked) {
    aiImageClicked = await clickButtonByText(page, "ai image");
    if (aiImageClicked) {
      console.log("✓ Clicked 'AI Image' button (by text)");
    }
  }

  if (aiImageClicked) {
    await page.waitForTimeout(2000);

    console.log("Looking for textarea with prompt placeholder...");
    await page.waitForTimeout(1000);

    const filled = await fillTextareaByPlaceholder(
      page,
      ["enter your prompt", "create a christmas poster"],
      "convert to sketch"
    );
    if (filled) {
      console.log("✓ Entered text 'convert to sketch' in textarea");
      await page.waitForTimeout(1000);
    } else {
      console.warn("⚠ Could not find textarea to enter prompt");
    }

    // Upload image file
    const imagePath = join(__dirname, "..", "qyWQN2s3b3xE8Sl0g733.png");
    await uploadImageFile(page, imagePath);
  } else {
    console.warn("⚠ Could not find 'AI Image' button");
  }
}

/**
 * Main automation function
 */
export async function automateFeloAccountCreation() {
  if (!BOOMLIFY_API_KEY) {
    console.error("Error: BOOMLIFY_API_KEY is not set in .env file");
    console.log("Please create a .env file with your Boomlify API key");
    process.exit(1);
  }

  let browser;
  let page;

  try {
    // Step 1: Create temporary email
    const tempEmail = await createTempEmail();

    // Step 2: Initialize browser
    const browserData = await initializeBrowser();
    browser = browserData.browser;
    page = browserData.page;

    // Step 3: Click Login button
    await clickLoginButton(page);

    // Step 4: Click sign up button
    await clickSignUpButton(page);

    // Step 5: Fill email field
    await fillEmailField(page, tempEmail.address);

    // Step 6: Click "Continue with Email" button
    await clickContinueWithEmail(page);

    // Step 7: Fill password field
    await fillPasswordField(page);

    // Step 8: Click appropriate button (Register or Email login)
    const { emailLoginClicked, registerClicked } = await clickRegisterOrLoginButton(
      page,
      tempEmail.address
    );

    // Step 9: Submit form fallback if needed
    if (!registerClicked && !emailLoginClicked) {
      await submitFormFallback(page);
    }

    // Step 10: Verify OTP if needed
    if (!emailLoginClicked) {
      await verifyOTP(page, tempEmail.id);
    }

    // Step 11: Check for and click "Claim" div if it exists
    await checkAndClickClaimDiv(page);

    // Step 12: Click AI Image and enter prompt
    await clickAIImageAndEnterPrompt(page);

    // Wait a bit to see the result
    await page.waitForTimeout(3000);
    console.log("\n✓ Account creation process completed!");
    console.log(`✓ Email used: ${tempEmail.address}`);

    // Keep browser open for 10 seconds to see the result
    console.log("Keeping browser open for 10 seconds...");
    await page.waitForTimeout(10000);
  } catch (error) {
    console.error("\n✗ Error during automation:", error.message);
    console.error(error.stack);

    // Take screenshot on error
    if (page) {
      try {
        await page.screenshot({
          path: "error-screenshot.png",
          fullPage: true,
        });
        console.log("Screenshot saved as error-screenshot.png");
      } catch (e) {
        // Ignore screenshot errors
      }
    }
  } finally {
    // Uncomment to close browser automatically
    // if (browser) {
    //   await browser.close();
    // }
  }
}

