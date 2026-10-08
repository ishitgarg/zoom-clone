// Sign up / sign in / sign out, per-account dashboards, and the "Share screen" tile.
// Run against a freshly seeded database with backend + frontend running.
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "screenshots";
const browser = await chromium.launch({
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--auto-select-desktop-capture-source=Entire screen"],
});
const logs = [];
const check = (c, m) => { console.log(`${c ? "PASS" : "FAIL"}  ${m}`); if (!c) process.exitCode = 1; };
const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 }, permissions: ["camera", "microphone"] });
const page = await ctx.newPage();
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); });
const email = `riya.${Date.now()}@example.com`;

// Demo user by default
await page.goto(BASE);
await page.waitForSelector("text=Weekly Product Sync");
check(await page.getByRole("link", { name: "Sign Up Free" }).isVisible(), "signed-out header shows Sign In / Sign Up Free");

// Sign-up validation
await page.getByRole("link", { name: "Sign Up Free" }).click();
await page.getByRole("heading", { name: "Sign Up Free" }).waitFor();
await page.getByLabel("Full name").fill("Riya Kapoor");
await page.getByLabel("Email address").fill("not-an-email");
await page.getByLabel("Password", { exact: true }).fill("short");
await page.getByRole("button", { name: "Sign Up", exact: true }).click();
check(await page.getByText("Please enter a valid email address.").isVisible(), "signup rejects invalid email");
check(await page.getByText("Password must be at least 8 characters.").isVisible(), "signup rejects short password");
await page.screenshot({ path: `${OUT}/a-signup-errors.png` });

// Sign up for real
await page.getByLabel("Email address").fill(email);
await page.getByLabel("Password", { exact: true }).fill("secret123");
await page.getByRole("button", { name: "Sign Up", exact: true }).click();
await page.waitForURL(BASE + "/");
await page.getByText("No meetings scheduled.").waitFor();
check(!(await page.getByRole("link", { name: "Sign Up Free" }).isVisible()), "after sign-up the header no longer offers sign-in");
check(await page.getByText("No recent meetings").isVisible(), "new account starts with an empty dashboard");
await page.getByRole("button", { name: "Profile" }).click();
check(await page.getByText(email).isVisible(), "profile menu shows the new account");
await page.screenshot({ path: `${OUT}/a-signed-in.png` });
await page.keyboard.press("Escape");

// New account can schedule and host
await page.getByRole("button", { name: "Schedule", exact: true }).first().click();
await page.getByLabel("Topic").fill("Riya's Planning");
await page.getByRole("button", { name: "Save" }).click();
await page.getByText("Meeting scheduled").waitFor();
await page.getByRole("button", { name: "Done" }).click();
check(await page.locator("section[aria-labelledby=upcoming-heading]").getByText("Riya's Planning").isVisible(), "signed-in user's scheduled meeting appears in Upcoming");
await page.getByRole("button", { name: "New meeting", exact: true }).click();
await page.getByTestId("meeting-room").waitFor({ timeout: 15000 });
check(await page.getByText("Riya Kapoor (You)").isVisible(), "signed-in user hosts with their own name");
check(await page.getByRole("button", { name: "End", exact: true }).isVisible(), "signed-in user is host of their meeting");
await page.getByRole("button", { name: "End", exact: true }).click();
await page.getByRole("button", { name: "End meeting for all" }).click();
await page.getByText("This meeting has ended").waitFor();

// Sign out -> demo account again
await page.goto(BASE);
await page.getByRole("button", { name: "Profile" }).click();
await page.getByRole("menuitem", { name: "Sign Out" }).click();
await page.getByText("You have signed out").waitFor();
await page.waitForSelector("text=Weekly Product Sync");
check(await page.getByRole("link", { name: "Sign Up Free" }).isVisible(), "sign out returns to the demo account");

// Sign in: wrong password, then right one
await page.getByRole("link", { name: "Sign In", exact: true }).click();
await page.getByLabel("Email address").fill(email);
await page.getByLabel("Password", { exact: true }).fill("wrongpass1");
await page.getByRole("button", { name: "Sign In", exact: true }).click();
await page.getByText("Incorrect email or password.").waitFor();
check(true, "wrong password rejected");
await page.screenshot({ path: `${OUT}/a-signin-error.png` });
await page.getByLabel("Password", { exact: true }).fill("secret123");
await page.getByRole("button", { name: "Sign In", exact: true }).click();
await page.waitForURL(BASE + "/");
await page.waitForSelector("text=Riya's Planning");
check(true, "sign in restores the account's own meetings");

// Duplicate sign-up
await page.goto(`${BASE}/signup`);
await page.getByLabel("Full name").fill("Someone");
await page.getByLabel("Email address").fill(email);
await page.getByLabel("Password", { exact: true }).fill("secret123");
await page.getByRole("button", { name: "Sign Up", exact: true }).click();
check(await page.getByText("An account with this email already exists").waitFor().then(() => true).catch(() => false), "duplicate email rejected");

// An invalid stored token falls back to the demo user without errors
await page.evaluate(() => localStorage.setItem("zoom-clone:auth-token", "expired-token"));
await page.goto(BASE);
await page.waitForSelector("text=Weekly Product Sync");
check(await page.getByRole("link", { name: "Sign Up Free" }).isVisible(), "expired sign-in falls back to the demo account");

// Share screen tile
await page.getByRole("button", { name: "Share screen", exact: true }).click();
await page.getByLabel("Meeting ID or invite link").fill("812 345 6789");
await page.getByLabel("Your name").fill("Presenter");
await page.getByRole("button", { name: "Share Screen", exact: true }).click();
await page.getByRole("dialog", { name: "Share your screen" }).waitFor({ timeout: 15000 });
await page.screenshot({ path: `${OUT}/a-share-offer.png` });
await page.getByRole("dialog", { name: "Share your screen" }).getByRole("button", { name: "Share Screen" }).click();
check(await page.getByText("You are screen sharing").waitFor({ timeout: 8000 }).then(() => true).catch(() => false), "Share screen tile joins and starts sharing");

console.log("\n--- errors ---\n" + (logs.filter((l) => !l.includes("status of 401") && !l.includes("status of 409")).join("\n") || "none"));
await browser.close();
