import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3000";
const API = process.env.API ?? "http://localhost:8000/api";
const browser = await chromium.launch({
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--auto-select-desktop-capture-source=Entire screen", "--enable-usermedia-screen-capturing"],
});
const logs = [];
const check = (c, m) => { console.log(`${c ? "PASS" : "FAIL"}  ${m}`); if (!c) process.exitCode = 1; };
const mk = async (name) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 }, permissions: ["camera", "microphone"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push(`[${name}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") logs.push(`[${name}] ${m.text()}`); });
  return page;
};

// Settings dialog persists preferences and they're applied when joining
const a = await mk("a");
await a.goto(BASE);
await a.getByRole("button", { name: "Settings" }).click();
await a.getByLabel("Default display name in meetings").fill("Alex (Settings)");
await a.getByRole("button", { name: "Audio" }).click();
await a.getByLabel("Mute my microphone when joining a meeting").check();
await a.getByRole("button", { name: "Save" }).click();
await a.getByText("Settings saved").waitFor();
check(true, "settings dialog saves");

// Profile menu
await a.getByRole("button", { name: "Profile" }).click();
check(await a.getByText("alex.morgan@example.com").isVisible(), "profile menu shows default user");
await a.screenshot({ path: `${process.env.OUT ?? "screenshots"}/x-profile.png` });
await a.keyboard.press("Escape");

// Start an upcoming (scheduled) meeting as host -> live, joined muted with saved name
await a.locator("section[aria-labelledby=upcoming-heading]").getByRole("button", { name: "Start" }).first().click();
await a.getByTestId("meeting-room").waitFor({ timeout: 15000 });
check(await a.getByRole("button", { name: "Unmute" }).isVisible(), "join-muted preference applied");
check(await a.getByText("Alex (Settings) (You)").isVisible(), "display-name preference applied");
const code = a.url().split("/").pop();
const m = await (await fetch(`${API}/meetings/${code}`)).json();
check(m.status === "live" && m.meeting_type === "scheduled", "starting a scheduled meeting makes it live");

// Guest joins, host leaves -> guest becomes host
const b = await mk("b");
await b.goto(`${BASE}/meeting/${code}`);
await b.getByLabel("Your name").fill("Bea");
await b.getByRole("button", { name: "Join" }).click();
await b.getByTestId("meeting-room").waitFor();
check(await b.getByRole("button", { name: "Leave", exact: true }).isVisible(), "attendee sees Leave (not End)");

// Screen share from host
const shareBtn = a.getByRole("button", { name: "Share", exact: true });
await shareBtn.click();
const shared = await a.getByText("You are screen sharing").waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
check(shared, "host can share screen");
if (shared) {
  const seen = await b.getByText("You are viewing Alex (Settings)'s screen").waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  check(seen, "guest sees screen share banner + speaker layout");
  await b.waitForTimeout(1500);
  await b.screenshot({ path: `${process.env.OUT ?? "screenshots"}/x-share-guest.png` });
  await a.getByRole("button", { name: "Stop Share" }).first().click();
  await b.getByText("You are viewing").waitFor({ state: "detached", timeout: 8000 });
  check(true, "stop share propagates");
}

// Speaker view toggle
await a.getByRole("button", { name: "View", exact: true }).click();
await a.getByRole("menuitemradio", { name: "Speaker" }).click();
await a.waitForTimeout(800);
await a.screenshot({ path: `${process.env.OUT ?? "screenshots"}/x-speaker.png` });
await a.getByRole("button", { name: "View", exact: true }).click();
check(await a.getByRole("menuitemradio", { name: "Speaker" }).getAttribute("aria-checked") === "true", "speaker view selected from View menu");
await a.keyboard.press("Escape");

// Reaction
await b.getByRole("button", { name: "React", exact: true }).click();
await b.getByRole("button", { name: "React with 👍" }).click();
const reacted = await a.getByText("👍").waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
check(reacted, "reaction shown to other participant");

// Host leaves -> Bea becomes host
await a.getByRole("button", { name: "End", exact: true }).click();
await a.getByRole("button", { name: "Leave meeting" }).click();
await a.getByText("You left the meeting").waitFor();
await b.getByRole("button", { name: "End", exact: true }).waitFor({ timeout: 8000 });
check(true, "host role transferred to remaining participant");

// Rejoin as the owner reclaims host
await a.getByRole("button", { name: "Rejoin" }).click();
await a.getByTestId("meeting-room").waitFor({ timeout: 15000 });
await b.getByRole("button", { name: "Leave", exact: true }).waitFor({ timeout: 8000 });
check(await a.getByRole("button", { name: "End", exact: true }).isVisible(), "owner rejoins as host");

// Delete an upcoming meeting from dashboard
const c = await mk("c");
await c.goto(BASE);
await c.waitForSelector("text=Customer Demo: Acme Corp");
await c.getByRole("button", { name: "More options for Customer Demo: Acme Corp" }).click();
await c.getByRole("menuitem", { name: "Delete meeting" }).click();
await c.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
await c.getByText("Meeting deleted").waitFor();
await c.waitForTimeout(300);
check(!(await c.locator("section[aria-labelledby=upcoming-heading]").getByText("Customer Demo: Acme Corp").isVisible()), "delete removes meeting from Upcoming");
const gone = await fetch(`${API}/meetings/8567890123/participants`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ display_name: "x" }) });
check(gone.status === 410, "cancelled meeting cannot be joined");

console.log("\n--- errors ---\n" + (logs.join("\n") || "none"));
await browser.close();
