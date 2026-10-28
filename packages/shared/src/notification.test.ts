import { describe, expect, it } from "vitest";
import { describeNotification, NotificationType } from "./notification";

describe("describeNotification", () => {
  it("links employers to the applicants of the job", () => {
    expect(
      describeNotification(
        "APPLICATION_SUBMITTED",
        { jobId: "j1", jobTitle: "Frontend Developer", applicant: "Ayesha" },
        "EMPLOYER",
      ),
    ).toEqual({
      title: "New applicant for Frontend Developer",
      body: "Ayesha applied.",
      href: "/employer/jobs/j1/applicants",
    });
  });

  it("describes stage changes in plain words", () => {
    const n = describeNotification(
      "APPLICATION_STAGE_CHANGED",
      { jobTitle: "Data Analyst", company: "Lumen", stage: "SHORTLISTED" },
      "SEEKER",
    );
    expect(n.body).toBe("Your application for Data Analyst has been shortlisted.");
  });

  it("sends interview notifications to the right area for each role", () => {
    expect(describeNotification("INTERVIEW_SCHEDULED", {}, "SEEKER").href).toBe("/interviews");
    expect(describeNotification("INTERVIEW_SCHEDULED", {}, "EMPLOYER").href).toBe(
      "/employer/interviews",
    );
  });

  it("never throws on old or partial payloads", () => {
    for (const type of NotificationType.options) {
      const n = describeNotification(type, {}, "SEEKER");
      expect(n.title.length).toBeGreaterThan(0);
      expect(n.href.startsWith("/")).toBe(true);
    }
  });
});
