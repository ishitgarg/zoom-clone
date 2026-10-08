import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3000";
const API = process.env.API ?? "http://localhost:8000/api";
const out = (n) => `${process.env.OUT ?? "screenshots"}/${n}.png`;
const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
const logs = [];
const mk = async (name) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 }, permissions: ["camera", "microphone", "clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`[${name}] ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => logs.push(`[${name}] pageerror: ${e.message}`));
  return page;
};
const check = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) process.exitCode = 1; };

// ---- Dashboard
const host = await mk("host");
await host.goto(BASE);
await host.getByText("Upcoming meetings").waitFor();
await host.waitForSelector("text=Weekly Product Sync");
check(await host.getByText("Engineering Standup").isVisible(), "dashboard shows recent meetings from backend");
await host.screenshot({ path: out("01-dashboard") });

// ---- Join validation (dialog)
await host.getByRole("button", { name: "Join", exact: true }).first().click();
await host.getByLabel("Meeting ID or invite link").fill("1112223334");
await host.getByLabel("Your name").fill("Tester");
await host.getByRole("button", { name: "Join", exact: true }).last().click();
await host.getByText("Meeting not found. Please check the meeting ID and try again.").waitFor();
check(true, "invalid meeting ID rejected with friendly message");
await host.getByLabel("Meeting ID or invite link").fill("abc");
await host.getByRole("button", { name: "Join", exact: true }).last().click();
check(await host.getByText("Enter a valid meeting ID").isVisible(), "malformed meeting ID rejected client-side");
await host.getByLabel("Meeting ID or invite link").fill("8123456789");
await host.getByLabel("Your name").fill("   ");
await host.getByRole("button", { name: "Join", exact: true }).last().click();
check(await host.getByText("Please enter your name.").isVisible(), "empty display name rejected");
await host.screenshot({ path: out("02-join-validation") });
await host.getByRole("button", { name: "Cancel" }).click();

// ---- Schedule
await host.getByRole("button", { name: "Schedule", exact: true }).first().click();
await host.getByLabel("Topic").fill("E2E Planning Session");
await host.getByLabel("Description (optional)").fill("Created by the end-to-end test");
const tomorrow = new Date(Date.now() + 86400000);
const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
await host.getByLabel("Date").fill(iso);
await host.getByLabel("Time").selectOption({ index: 40 });
await host.getByLabel("Hours").selectOption("1");
await host.getByLabel("Minutes").selectOption("15");
await host.screenshot({ path: out("03-schedule-form") });
await host.getByRole("button", { name: "Save" }).click();
await host.getByText("Meeting scheduled").waitFor();
await host.screenshot({ path: out("04-schedule-success") });
const scheduledLink = await host.locator("dialog a[href*='/meeting/']").getAttribute("href");
await host.getByRole("button", { name: "Done" }).click();
check(await host.locator("section[aria-labelledby=upcoming-heading]").getByText("E2E Planning Session").isVisible(), "scheduled meeting appears in Upcoming");
const upcoming = await (await fetch(`${API}/meetings/upcoming`)).json();
const sched = upcoming.find((m) => m.title === "E2E Planning Session");
check(sched && sched.duration_minutes === 75 && sched.description === "Created by the end-to-end test", "scheduled meeting persisted with duration/description");
check(scheduledLink === `${BASE}/meeting/${sched?.meeting_id}`, `scheduled meeting link generated (${scheduledLink})`);

// ---- Instant meeting
await host.getByRole("button", { name: "New meeting", exact: true }).click();
await host.waitForURL(/\/meeting\/\d{10}$/, { timeout: 15000 });
await host.getByTestId("meeting-room").waitFor();
const meetingId = host.url().split("/").pop();
await host.getByText("Waiting for others to join").waitFor();
await host.waitForTimeout(1500);
await host.screenshot({ path: out("05-room-alone") });
const m = await (await fetch(`${API}/meetings/${meetingId}`)).json();
check(m.status === "live" && m.meeting_type === "instant" && m.active_participant_count === 1, "instant meeting stored live with host participant");
const hostVideo = await host.locator("[data-testid=video-tile] video").count();
check(hostVideo === 1, "host sees own camera preview");

// ---- Guest via invite link
const guest = await mk("guest");
await guest.goto(`${BASE}/meeting/${meetingId}`);
await guest.getByLabel("Your name").waitFor();
await guest.waitForTimeout(1200);
await guest.screenshot({ path: out("06-prejoin") });
await guest.getByLabel("Your name").fill("");
await guest.getByRole("button", { name: "Join" }).click();
check(await guest.getByText("Please enter your name.").isVisible(), "prejoin requires name");
await guest.getByLabel("Your name").fill("Priya Guest");
await guest.getByRole("button", { name: "Join" }).click();
await guest.getByTestId("meeting-room").waitFor();
await host.waitForFunction(() => document.querySelectorAll("[data-testid=video-tile]").length === 2, null, { timeout: 10000 });
check(true, "host sees guest join (2 tiles)");
// WebRTC: remote video frames arrive
const remoteOk = await host.waitForFunction(() => [...document.querySelectorAll("[data-testid=video-tile] video")].filter((v) => v.videoWidth > 0 && !v.classList.contains("-scale-x-100")).length >= 1, null, { timeout: 20000 }).then(() => true).catch(() => false);
check(remoteOk, "peer-to-peer video received from guest (WebRTC)");
await host.waitForTimeout(1000);
await host.screenshot({ path: out("07-room-two") });

// ---- Participants panel + host controls
await host.getByRole("button", { name: "Participants" }).click();
await host.getByText("Participants (2)").waitFor();
await host.screenshot({ path: out("08-participants") });
await host.getByRole("button", { name: "Mute All" }).click();
await guest.getByText("The host has muted you").waitFor({ timeout: 8000 });
check(await guest.getByRole("button", { name: "Unmute" }).isVisible(), "mute all mutes guest locally");

// ---- Chat
await guest.getByRole("button", { name: "Chat" }).click();
await guest.getByLabel("Chat message").fill("Hello from the guest!");
await guest.keyboard.press("Enter");
await guest.getByTestId("chat-message").waitFor();
await host.getByRole("button", { name: "Chat" }).click();
await host.getByText("Hello from the guest!").waitFor({ timeout: 8000 });
check(true, "chat message delivered");
await host.screenshot({ path: out("09-chat") });

// ---- Toggle mic/camera, reaction
await guest.getByRole("button", { name: "Stop Video" }).click();
await host.getByRole("button", { name: "Participants" }).click();
await host.waitForFunction(() => document.body.innerText.includes("Priya Guest"), null);
const videoOffSeen = await host.locator("[aria-label='Video off']").first().waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
check(videoOffSeen, "guest video-off state visible to host");
await guest.getByRole("button", { name: "React", exact: true }).click();
await guest.getByRole("button", { name: "Raise Hand" }).click();
const handSeen = await host.locator("[aria-label='Hand raised']").first().waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
check(handSeen, "raise hand visible to host");

// ---- Refresh resumes the session
await guest.reload();
await guest.getByTestId("meeting-room").waitFor({ timeout: 10000 });
const roster = await (await fetch(`${API}/meetings/${meetingId}/participants`)).json();
check(roster.length === 2, "refresh resumes the same participant (no duplicate)");

// ---- Remove participant
await host.getByTestId("participant-row").filter({ hasText: "Priya Guest" }).hover();
await host.getByRole("button", { name: "Remove" }).click();
await host.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
await guest.getByText("You have been removed").waitFor({ timeout: 8000 });
check(true, "removed guest sees removal screen");
await guest.screenshot({ path: out("10-removed") });

// ---- Join by meeting ID from dashboard dialog (third user)
const third = await mk("third");
await third.goto(BASE);
await third.getByRole("button", { name: "Join", exact: true }).first().click();
const formatted = `${meetingId.slice(0, 3)} ${meetingId.slice(3, 6)} ${meetingId.slice(6)}`;
await third.getByLabel("Meeting ID or invite link").fill(formatted);
await third.getByLabel("Your name").fill("Daniel Dialog");
await third.getByRole("button", { name: "Join", exact: true }).last().click();
await third.getByTestId("meeting-room").waitFor({ timeout: 10000 });
check(true, "join by formatted meeting ID works");

// ---- Leave / end
await third.getByRole("button", { name: "Leave", exact: true }).click();
await third.getByRole("button", { name: "Leave meeting" }).click();
await third.getByText("You left the meeting").waitFor();
check(true, "leave meeting shows exit screen");
await third.screenshot({ path: out("11-left") });
await host.getByRole("button", { name: "End", exact: true }).click();
await host.screenshot({ path: out("12-end-menu") });
await host.getByRole("button", { name: "End meeting for all" }).click();
await host.getByText("This meeting has ended").waitFor();
const ended = await (await fetch(`${API}/meetings/${meetingId}`)).json();
check(ended.status === "ended", "end for all marks meeting ended");

// ---- Recent shows it, invite link to unknown meeting
await host.goto(BASE);
await host.waitForSelector("text=Recent meetings");
await host.waitForTimeout(800);
check(await host.locator("section[aria-labelledby=recent-heading]").getByText(`ID ${formatted}`).isVisible(), "ended instant meeting appears in Recent");
await host.goto(`${BASE}/meeting/1231231234`);
await host.getByText("Meeting not found").first().waitFor();
await host.screenshot({ path: out("13-not-found") });
check(true, "invite link to unknown meeting shows not found");

// ---- Scheduled meeting link works & Meetings page
await host.goto(scheduledLink);
await host.getByLabel("Your name").waitFor();
check(await host.getByText("E2E Planning Session").isVisible(), "scheduled meeting invite link opens join screen");
await host.goto(`${BASE}/meetings`);
await host.getByRole("heading", { name: "Meetings" }).waitFor();
await host.waitForTimeout(800);
await host.screenshot({ path: out("14-meetings-page") });

console.log("\n--- console errors/warnings ---\n" + (logs.join("\n") || "none"));
await browser.close();
