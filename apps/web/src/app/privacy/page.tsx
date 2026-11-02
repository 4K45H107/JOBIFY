import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Jobify stores, why, where, and how to have it deleted.",
};

const CONTACT = "fahad11.ahmed11@gmail.com";
const UPDATED = "2 November 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-medium">{title}</h2>
      {children}
    </section>
  );
}

/** Public, linked from the sign-in pages and required by Google sign-in. */
export default function PrivacyPage() {
  return (
    <div className="min-h-dvh">
      <header className="bg-chrome px-4 py-4 text-chrome-fg md:px-6">
        <Link href="/" className="font-brand text-2xl md:text-[32px]">
          Jobify.
        </Link>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 leading-relaxed md:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-medium">Privacy policy</h1>
          <p className="text-fg-subtle">Last updated {UPDATED}</p>
        </div>

        <p>
          Jobify is a portfolio project: a rebuild of a university team project (CSE408, BUET), run
          by one developer. It is a working demo, not a commercial service. This page explains what
          it stores about you, why, where, and how to have it deleted.
        </p>

        <Section title="What Jobify stores">
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Your account:</strong> name, email address, whether you&apos;re a job seeker
              or an employer, and your password as a one-way hash (never the password itself).
            </li>
            <li>
              <strong>If you sign in with Google:</strong> the name and email address Google shares,
              and your Google account id, so we recognise you next time. Jobify asks Google only for
              your basic profile and email; it can&apos;t read your Gmail, contacts or files.
            </li>
            <li>
              <strong>Your profile:</strong> what you add, such as headline, skills, education, job
              preferences, a photo and a CV.
            </li>
            <li>
              <strong>Job activity:</strong> jobs you save or view, your applications (contact
              details, answers to the employer&apos;s questions, a copy of your CV), skill test
              answers and scores, and interviews. Employers: your company, jobs and team.
            </li>
            <li>
              <strong>Notifications and email:</strong> the notifications you receive, your email
              settings, and a log of which emails were sent.
            </li>
            <li>
              <strong>Sign-in sessions:</strong> a record of each signed-in browser (with its
              browser name), so you can stay signed in and be signed out everywhere if needed.
            </li>
          </ul>
          <p>
            Video interviews run live between the two people and are <strong>not recorded</strong>.
          </p>
        </Section>

        <Section title="How it's used">
          <ul className="list-disc space-y-2 pl-6">
            <li>To run Jobify: show jobs, recommend matches, and let you apply and interview.</li>
            <li>
              <strong>When you apply to a job,</strong> that employer sees your application: contact
              details, CV, answers and test score. Nobody else does.
            </li>
            <li>
              To email you about your account (verification, password reset) and, if you leave them
              on, updates such as interview reminders. You can turn update emails off in your
              Profile or with the link in each email.
            </li>
          </ul>
          <p>
            Your data is <strong>never sold</strong>, and Jobify shows no ads. It uses cookies only
            to keep you signed in and to remember your theme; there are no tracking or advertising
            cookies.
          </p>
        </Section>

        <Section title="Where it's kept">
          <p>Jobify runs on these services, which store or process data on its behalf:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Neon</strong>: the database and uploaded files (CVs, photos, logos), in
              Singapore.
            </li>
            <li>
              <strong>Render</strong>: the application server and its short-lived queue.
            </li>
            <li>
              <strong>Vercel</strong>: the website.
            </li>
            <li>
              <strong>LiveKit Cloud</strong>: video interview calls (not recorded).
            </li>
            <li>
              <strong>Brevo</strong>: sending emails.
            </li>
            <li>
              <strong>Google</strong>: only if you choose to sign in with Google.
            </li>
          </ul>
          <p>Uploaded files are private and only shared through short-lived links.</p>
        </Section>

        <Section title="Keeping and deleting your data">
          <p>
            Your data stays while your account exists. To have your account and everything linked to
            it deleted, or to ask what Jobify holds about you, email{" "}
            <a href={`mailto:${CONTACT}`} className="text-link underline">
              {CONTACT}
            </a>{" "}
            from the address on your account.
          </p>
          <p>
            The demo accounts and companies shown in Jobify are made up; they don&apos;t belong to
            real people.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy:{" "}
            <a href={`mailto:${CONTACT}`} className="text-link underline">
              {CONTACT}
            </a>
            .
          </p>
        </Section>
      </main>
    </div>
  );
}
