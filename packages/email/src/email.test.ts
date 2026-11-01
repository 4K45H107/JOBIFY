import { describe, expect, it, vi } from "vitest";
import { formatWhen, renderNotificationEmail } from "./render";
import { unsubscribeToken, verifyUnsubscribeToken } from "./tokens";
import { brevoMailer, parseAddress } from "./transport";

const base = {
  role: "SEEKER" as const,
  name: "Ayesha Rahman",
  webOrigin: "https://jobify.test",
  unsubscribeUrl: "https://jobify.test/unsubscribe?token=abc",
  timeZone: "Asia/Dhaka",
};

describe("renderNotificationEmail", () => {
  it("uses the in-app text, an absolute link and the settings footer", async () => {
    const email = await renderNotificationEmail({
      ...base,
      type: "ASSESSMENT_ASSIGNED",
      payload: { jobTitle: "Frontend Developer", company: "Northwind", applicationId: "app1" },
    });
    expect(email.subject).toBe("Skill test for Frontend Developer");
    expect(email.html).toContain("Hi Ayesha,");
    expect(email.html).toContain("https://jobify.test/applications/app1/test");
    expect(email.html).toContain("Take the test");
    expect(email.html).toContain("https://jobify.test/settings?section=email");
    expect(email.html).toContain(base.unsubscribeUrl);
    expect(email.text).toContain("Northwind asks you to take a short timed test.");
  });

  it("shows the interview time, and says when it was cancelled", async () => {
    const payload = { jobTitle: "QA", company: "Acme", scheduledAt: "2026-11-03T08:30:00.000Z" };
    const scheduled = await renderNotificationEmail({
      ...base,
      type: "INTERVIEW_SCHEDULED",
      payload,
    });
    expect(scheduled.text).toContain("When: Tue 3 Nov, 2:30 pm GMT+6");

    const cancelled = await renderNotificationEmail({
      ...base,
      type: "INTERVIEW_SCHEDULED",
      payload: { ...payload, cancelled: true },
    });
    expect(cancelled.subject).toBe("Interview cancelled");
    expect(cancelled.text).toContain("It was planned for Tue 3 Nov, 2:30 pm GMT+6.");
  });

  it("links employers to their own settings", async () => {
    const email = await renderNotificationEmail({
      ...base,
      role: "EMPLOYER",
      type: "APPLICATION_SUBMITTED",
      payload: { jobTitle: "QA", jobId: "j1", applicant: "Sam" },
    });
    expect(email.html).toContain("https://jobify.test/employer/jobs/j1/applicants");
    expect(email.html).toContain("https://jobify.test/employer/settings?section=email");
  });

  it("escapes text from users", async () => {
    const email = await renderNotificationEmail({
      ...base,
      role: "EMPLOYER",
      type: "APPLICATION_SUBMITTED",
      payload: { jobTitle: "QA", applicant: "<script>x</script>" },
    });
    expect(email.html).not.toContain("<script>x</script>");
  });

  it("formats times in the given zone", () => {
    expect(formatWhen("2026-11-03T08:30:00.000Z", "UTC")).toBe("Tue 3 Nov, 8:30 am UTC");
  });
});

describe("unsubscribe tokens", () => {
  const secret = "s".repeat(40);

  it("round-trips the user and type", () => {
    const token = unsubscribeToken("user1", "INTERVIEW_REMINDER", secret);
    expect(verifyUnsubscribeToken(token, secret)).toEqual({
      userId: "user1",
      type: "INTERVIEW_REMINDER",
    });
  });

  it("rejects tampering, another secret and junk", () => {
    const token = unsubscribeToken("user1", "INTERVIEW_REMINDER", secret);
    expect(verifyUnsubscribeToken(token.replace("user1", "user2"), secret)).toBeNull();
    expect(verifyUnsubscribeToken(token, "x".repeat(40))).toBeNull();
    expect(verifyUnsubscribeToken("user1.NOPE.sig", secret)).toBeNull();
    expect(verifyUnsubscribeToken("garbage", secret)).toBeNull();
  });
});

describe("brevoMailer", () => {
  it("posts to Brevo's API with the sender and returns the message id", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ messageId: "<m1@brevo>" }), { status: 201 }),
    );
    const mailer = brevoMailer("key-123", "Jobify <hi@example.com>", fetchImpl);
    const id = await mailer.send({ to: "a@b.c", subject: "S", html: "<p>H</p>", text: "T" });
    expect(id).toBe("<m1@brevo>");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("key-123");
    expect(JSON.parse(init.body as string)).toMatchObject({
      sender: { name: "Jobify", email: "hi@example.com" },
      to: [{ email: "a@b.c" }],
      subject: "S",
    });
  });

  it("throws on an error response, so the job retries", async () => {
    const fetchImpl = vi.fn(async () => new Response('{"message":"bad"}', { status: 400 }));
    const mailer = brevoMailer("key-123", "hi@example.com", fetchImpl);
    await expect(mailer.send({ to: "a@b.c", subject: "S", html: "", text: "" })).rejects.toThrow(
      "Brevo 400",
    );
  });

  it("parses sender addresses", () => {
    expect(parseAddress('"Jobify" <hi@x.com>')).toEqual({ name: "Jobify", email: "hi@x.com" });
    expect(parseAddress("hi@x.com")).toEqual({ email: "hi@x.com" });
  });
});
