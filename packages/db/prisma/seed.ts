/**
 * Demo data for local development and the public demo.
 * Re-running is safe: every table is truncated first.
 *
 * Demo logins (password for all: Password123!)
 *   seeker@jobify.dev    job seeker with applications, saved jobs, an interview
 *   employer@jobify.dev  admin of "Northwind Labs", with applicants to review
 *   admin@jobify.dev     platform admin
 */
import path from "node:path";
import { fakerEN as faker } from "@faker-js/faker";
import argon2 from "argon2";
import { config } from "dotenv";
import {
  ApplicationStage,
  CompanySize,
  EmploymentStatus,
  JobType,
  NotificationType,
  Prisma,
  QuestionKind,
  UserRole,
  Workplace,
} from "../src/generated/prisma/client";
import { createPrismaClient } from "../src/index";
import { createCvUploader } from "./seed-files";

config({ path: path.resolve(__dirname, "../../../.env"), quiet: true });

const DEMO_PASSWORD = "Password123!";
faker.seed(408);

const prisma = createPrismaClient(process.env.DATABASE_URL!);

const SKILLS = [
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Node.js",
  "NestJS",
  "Python",
  "Django",
  "Go",
  "Java",
  "Spring",
  "C++",
  "SQL",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Docker",
  "Kubernetes",
  "AWS",
  "GraphQL",
  "Figma",
  "UI Design",
  "Machine Learning",
  "Data Analysis",
  "Excel",
  "Communication",
  "Project Management",
  "Sales",
  "Marketing",
  "Copywriting",
];

const COMPANIES = [
  {
    name: "Northwind Labs",
    industry: "Software",
    size: CompanySize.SIZE_201_1000,
    hq: "Dhaka, Bangladesh",
  },
  {
    name: "Brightpath Analytics",
    industry: "Data & AI",
    size: CompanySize.SIZE_51_200,
    hq: "Bengaluru, India",
  },
  {
    name: "Cobalt Systems",
    industry: "Cloud Infrastructure",
    size: CompanySize.SIZE_1001_10000,
    hq: "Singapore",
  },
  {
    name: "Lumen Health",
    industry: "Healthcare",
    size: CompanySize.SIZE_201_1000,
    hq: "Berlin, Germany",
  },
  {
    name: "Harbor Finance",
    industry: "Fintech",
    size: CompanySize.SIZE_51_200,
    hq: "London, United Kingdom",
  },
  {
    name: "Pixelforge Studio",
    industry: "Design",
    size: CompanySize.SIZE_11_50,
    hq: "Dhaka, Bangladesh",
  },
  {
    name: "Greenline Logistics",
    industry: "Logistics",
    size: CompanySize.SIZE_10000_PLUS,
    hq: "Rotterdam, Netherlands",
  },
  {
    name: "Atlas Learning",
    industry: "Education",
    size: CompanySize.SIZE_11_50,
    hq: "Toronto, Canada",
  },
];

const JOB_TITLES: { title: string; skills: string[] }[] = [
  { title: "Frontend Developer", skills: ["TypeScript", "React", "Next.js"] },
  { title: "Backend Developer", skills: ["Node.js", "NestJS", "PostgreSQL"] },
  { title: "Full Stack Engineer", skills: ["TypeScript", "React", "Node.js", "SQL"] },
  { title: "Software Engineer", skills: ["Java", "Spring", "SQL"] },
  { title: "Data Scientist", skills: ["Python", "Machine Learning", "SQL"] },
  { title: "ML Engineer", skills: ["Python", "Machine Learning", "Docker"] },
  { title: "DevOps Engineer", skills: ["Docker", "Kubernetes", "AWS"] },
  { title: "Product Designer", skills: ["Figma", "UI Design"] },
  { title: "Data Analyst", skills: ["SQL", "Excel", "Data Analysis"] },
  { title: "Project Manager", skills: ["Project Management", "Communication"] },
  { title: "Marketing Specialist", skills: ["Marketing", "Copywriting"] },
  { title: "Sales Executive", skills: ["Sales", "Communication"] },
];

const LOCATIONS = [
  { country: "Bangladesh", city: "Dhaka" },
  { country: "Bangladesh", city: "Chattogram" },
  { country: "India", city: "Bengaluru" },
  { country: "Singapore", city: "Singapore" },
  { country: "Germany", city: "Berlin" },
  { country: "United Kingdom", city: "London" },
  { country: "Canada", city: "Toronto" },
];

const MCQ_BANK = [
  {
    prompt: "What is the SI unit of power?",
    options: ["Joule", "Watt", "Newton", "Pascal"],
    correctIndex: 1,
  },
  {
    prompt: "Which HTTP status code means 'Not Found'?",
    options: ["200", "301", "404", "500"],
    correctIndex: 2,
  },
  {
    prompt: "Which data structure is FIFO?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    correctIndex: 1,
  },
  {
    prompt: "What does SQL stand for?",
    options: [
      "Structured Query Language",
      "Simple Query Language",
      "Sequential Query Logic",
      "Server Query Language",
    ],
    correctIndex: 0,
  },
  {
    prompt: "Big-O of binary search on a sorted array?",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correctIndex: 1,
  },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);

async function truncateAll() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

async function main() {
  await truncateAll();
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  // Skills
  await prisma.skill.createMany({ data: SKILLS.map((name) => ({ name })) });
  const skillId = new Map((await prisma.skill.findMany()).map((s) => [s.name, s.id] as const));

  // Platform admin
  await prisma.user.create({
    data: {
      email: "admin@jobify.dev",
      passwordHash,
      role: UserRole.ADMIN,
      emailVerifiedAt: new Date(),
    },
  });

  // Companies, each with an admin and a recruiter
  const companies: { id: string; name: string; employerIds: string[] }[] = [];
  for (const [i, c] of COMPANIES.entries()) {
    const isDemo = i === 0;
    const company = await prisma.company.create({
      data: {
        name: c.name,
        slug: slugify(c.name),
        industry: c.industry,
        size: c.size,
        foundedYear: faker.number.int({ min: 1995, max: 2020 }),
        website: `https://${slugify(c.name)}.example.com`,
        headquarters: c.hq,
        description: faker.company.catchPhrase() + ". " + faker.lorem.paragraph(),
        mission: faker.company.buzzPhrase(),
        branches: {
          create: faker.helpers.arrayElements(LOCATIONS, 2).map((l) => ({
            name: `${l.city} office`,
            city: l.city,
            country: l.country,
          })),
        },
      },
    });

    const employerIds: string[] = [];
    for (const role of ["ADMIN", "RECRUITER"] as const) {
      const fullName = faker.person.fullName();
      const email =
        isDemo && role === "ADMIN"
          ? "employer@jobify.dev"
          : faker.internet
              .email({
                firstName: fullName.split(" ")[0],
                provider: `${slugify(c.name)}.example.com`,
              })
              .toLowerCase();
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.EMPLOYER,
          emailVerifiedAt: new Date(),
          employerProfile: {
            create: {
              fullName,
              designation: role === "ADMIN" ? "Head of Talent" : "Technical Recruiter",
            },
          },
          companyMembership: { create: { companyId: company.id, role, status: "ACTIVE" } },
        },
      });
      employerIds.push(user.id);
    }
    companies.push({ id: company.id, name: company.name, employerIds });
  }

  // A pending join request on the demo company, for the approval flow
  await prisma.user.create({
    data: {
      email: "new.recruiter@example.com",
      passwordHash,
      role: UserRole.EMPLOYER,
      employerProfile: { create: { fullName: "Tanvir Hasan", designation: "Recruiter" } },
      companyMembership: {
        create: { companyId: companies[0]!.id, role: "RECRUITER", status: "PENDING" },
      },
    },
  });

  // Jobs
  const jobs: { id: string; companyIdx: number; postedById: string; title: string }[] = [];
  for (let i = 0; i < 60; i++) {
    const companyIdx = i < 12 ? 0 : faker.number.int({ min: 0, max: companies.length - 1 });
    const company = companies[companyIdx]!;
    const template = faker.helpers.arrayElement(JOB_TITLES);
    const location = faker.helpers.arrayElement(LOCATIONS);
    const salaryMin = faker.number.int({ min: 30, max: 120 }) * 1000;
    const postedById = faker.helpers.arrayElement(company.employerIds);
    const job = await prisma.job.create({
      data: {
        companyId: company.id,
        postedById,
        title: template.title,
        type: faker.helpers.weightedArrayElement([
          { value: JobType.FULL_TIME, weight: 6 },
          { value: JobType.PART_TIME, weight: 1 },
          { value: JobType.CONTRACT, weight: 1 },
          { value: JobType.INTERNSHIP, weight: 1 },
        ]),
        workplace: faker.helpers.arrayElement(Object.values(Workplace)),
        country: location.country,
        city: location.city,
        salaryMin,
        salaryMax: salaryMin + faker.number.int({ min: 10, max: 40 }) * 1000,
        ageMin: faker.helpers.maybe(() => 18, { probability: 0.3 }),
        ageMax: faker.helpers.maybe(() => 45, { probability: 0.2 }),
        description: faker.lorem.paragraphs(3, "\n\n"),
        deadline: faker.helpers.maybe(() => daysFromNow(faker.number.int({ min: 7, max: 60 })), {
          probability: 0.6,
        }),
        createdAt: daysAgo(faker.number.int({ min: 0, max: 45 })),
        skills: { create: template.skills.map((name) => ({ skillId: skillId.get(name)! })) },
        screeningQuestions: {
          create: [
            {
              prompt: "Are you legally authorized to work in this country?",
              kind: QuestionKind.YES_NO,
              position: 0,
            },
            {
              prompt: "How many years of experience do you have in this field?",
              kind: QuestionKind.NUMBER,
              position: 1,
            },
          ],
        },
      },
    });
    jobs.push({ id: job.id, companyIdx, postedById, title: template.title });
  }

  // MCQ assessments on the first 8 demo-company jobs and some others
  const assessed = jobs.filter((_, i) => i < 8 || i % 5 === 0);
  const assessmentByJob = new Map<string, string>();
  for (const job of assessed) {
    const a = await prisma.assessment.create({
      data: {
        jobId: job.id,
        kind: "MCQ",
        title: `${job.title} skill test`,
        timeLimitMin: 15,
        mcqQuestions: {
          create: faker.helpers
            .arrayElements(MCQ_BANK, 4)
            .map((q, position) => ({ ...q, position })),
        },
      },
    });
    assessmentByJob.set(job.id, a.id);
  }

  // Seekers, each with a generated one-page PDF CV in object storage
  const uploadCv = await createCvUploader();
  const seekerIds: string[] = [];
  const cvKeys = new Map<string, string>();
  const seekerNames = new Map<string, string>();
  const seekerEmails = new Map<string, string>();
  for (let i = 0; i < 20; i++) {
    const isDemo = i === 0;
    const fullName = isDemo ? "Ayesha Rahman" : faker.person.fullName();
    const template = faker.helpers.arrayElement(JOB_TITLES);
    const user = await prisma.user.create({
      data: {
        email: isDemo
          ? "seeker@jobify.dev"
          : faker.internet.email({ firstName: fullName.split(" ")[0] }).toLowerCase(),
        passwordHash,
        role: UserRole.SEEKER,
        emailVerifiedAt: new Date(),
        seekerProfile: {
          create: {
            fullName,
            headline: isDemo
              ? "Frontend developer, BUET CSE graduate"
              : `${template.title} | ${faker.word.adjective()} problem solver`,
            phone: faker.phone.number({ style: "international" }),
            birthdate: faker.date.birthdate({ mode: "age", min: 21, max: 40 }),
            location: isDemo
              ? "Dhaka, Bangladesh"
              : `${faker.helpers.arrayElement(LOCATIONS).city}`,
            education: isDemo
              ? "BSc in CSE, BUET"
              : faker.helpers.arrayElement([
                  "BSc in CSE",
                  "BBA",
                  "MSc in Data Science",
                  "BSc in EEE",
                ]),
            about: faker.lorem.paragraph(),
            employmentStatus: faker.helpers.arrayElement(Object.values(EmploymentStatus)),
            currentPosition: faker.helpers.maybe(() => faker.person.jobTitle(), {
              probability: 0.6,
            }),
            experienceYears: faker.number.int({ min: 0, max: 10 }),
          },
        },
        jobPreference: {
          create: {
            titles: isDemo ? ["Frontend Developer", "Full Stack Engineer"] : [template.title],
            locations: isDemo ? ["Dhaka"] : [faker.helpers.arrayElement(LOCATIONS).city],
            jobTypes: [JobType.FULL_TIME],
            workplace: [Workplace.REMOTE, Workplace.HYBRID],
            minSalary: 40_000,
          },
        },
        skills: {
          create: (isDemo ? ["TypeScript", "React", "Next.js", "Figma"] : template.skills).map(
            (name) => ({
              skillId: skillId.get(name)!,
            }),
          ),
        },
      },
    });
    seekerIds.push(user.id);
    seekerNames.set(user.id, fullName);
    seekerEmails.set(user.id, user.email);
    if (uploadCv) {
      const cvKey = await uploadCv(user.id, [
        fullName,
        isDemo ? "Frontend Developer" : template.title,
        `Email: ${user.email}`,
        "Experience: generated demo CV for the Jobify seed data.",
      ]);
      await prisma.seekerProfile.update({ where: { userId: user.id }, data: { cvKey } });
      cvKeys.set(user.id, cvKey);
    }
  }

  // Saved jobs and recently viewed jobs
  for (const seekerId of seekerIds) {
    const saved = faker.helpers.arrayElements(jobs, { min: 2, max: 6 });
    await prisma.savedJob.createMany({
      data: saved.map((j) => ({ userId: seekerId, jobId: j.id })),
    });
    const viewed = faker.helpers.arrayElements(jobs, { min: 3, max: 10 });
    await prisma.jobView.createMany({
      data: viewed.map((j, k) => ({ userId: seekerId, jobId: j.id, viewedAt: daysAgo(k) })),
    });
  }
  await prisma.jobAlert.create({
    data: {
      userId: seekerIds[0]!,
      name: "Frontend roles in Dhaka",
      query: "Frontend Developer",
      filters: { city: "Dhaka", workplace: ["REMOTE", "HYBRID"] },
    },
  });

  // Applications across stages. Demo-company jobs get several applicants each.
  const stagePath: ApplicationStage[] = ["APPLIED", "TESTING", "SHORTLISTED", "INTERVIEW"];
  let applicationCount = 0;
  for (const [s, seekerId] of seekerIds.entries()) {
    const targets =
      s === 0
        ? jobs.slice(0, 5)
        : faker.helpers.arrayElements(jobs.slice(0, 20), { min: 1, max: 4 });
    for (const job of targets) {
      const finalStage =
        s === 0 && job === jobs[0]
          ? ApplicationStage.INTERVIEW
          : faker.helpers.weightedArrayElement([
              { value: ApplicationStage.APPLIED, weight: 3 },
              { value: ApplicationStage.TESTING, weight: 2 },
              { value: ApplicationStage.SHORTLISTED, weight: 2 },
              { value: ApplicationStage.INTERVIEW, weight: 1 },
              { value: ApplicationStage.REJECTED, weight: 2 },
            ]);
      const createdAt = daysAgo(faker.number.int({ min: 1, max: 20 }));
      const app = await prisma.application.create({
        data: {
          jobId: job.id,
          seekerId,
          cvKey: cvKeys.get(seekerId) ?? "",
          contact: {
            fullName: seekerNames.get(seekerId) ?? "Applicant",
            email: seekerEmails.get(seekerId) ?? `applicant${s}@example.com`,
            phone: faker.phone.number({ style: "international" }),
          },
          stage: finalStage,
          createdAt,
        },
      });
      applicationCount++;

      // Stage history up to the final stage
      const reached =
        finalStage === ApplicationStage.REJECTED
          ? [...stagePath.slice(0, faker.number.int({ min: 1, max: 3 })), ApplicationStage.REJECTED]
          : stagePath.slice(0, stagePath.indexOf(finalStage) + 1);
      await prisma.applicationStageChange.createMany({
        data: reached.map((toStage, k) => ({
          applicationId: app.id,
          fromStage: k === 0 ? null : reached[k - 1]!,
          toStage,
          changedById: k === 0 ? seekerId : job.postedById,
          createdAt: new Date(createdAt.getTime() + k * 3_600_000),
        })),
      });

      // A graded MCQ attempt once the applicant has gone past TESTING
      const assessmentId = assessmentByJob.get(job.id);
      if (
        assessmentId &&
        reached.includes(ApplicationStage.TESTING) &&
        finalStage !== ApplicationStage.TESTING
      ) {
        await prisma.attempt.create({
          data: {
            assessmentId,
            applicationId: app.id,
            startedAt: createdAt,
            submittedAt: new Date(createdAt.getTime() + 600_000),
            score: faker.helpers.arrayElement([25, 50, 75, 100]),
            answers: [],
          },
        });
      }

      if (finalStage === ApplicationStage.INTERVIEW) {
        await prisma.interview.create({
          data: {
            applicationId: app.id,
            createdById: job.postedById,
            stage:
              s === 0
                ? "Final round"
                : faker.helpers.arrayElement(["Preli Exam", "Technical round", "HR round"]),
            scheduledAt:
              s === 0
                ? new Date(Date.now() + 2 * 3_600_000)
                : daysFromNow(faker.number.int({ min: 1, max: 14 })),
            durationMin: faker.helpers.arrayElement([30, 45, 60]),
            roomName: `interview-${app.id}`,
          },
        });
      }
    }
  }

  // Notifications for the demo accounts
  const demoEmployerId = companies[0]!.employerIds[0]!;
  await prisma.notification.createMany({
    data: [
      {
        userId: seekerIds[0]!,
        type: NotificationType.INTERVIEW_SCHEDULED,
        payload: { jobTitle: jobs[0]!.title, company: companies[0]!.name },
      },
      {
        userId: seekerIds[0]!,
        type: NotificationType.ASSESSMENT_ASSIGNED,
        payload: { jobTitle: jobs[1]!.title, company: companies[0]!.name },
      },
      {
        userId: demoEmployerId,
        type: NotificationType.COMPANY_JOIN_REQUESTED,
        payload: { name: "Tanvir Hasan", designation: "Recruiter", company: companies[0]!.name },
      },
      {
        userId: demoEmployerId,
        type: NotificationType.APPLICATION_SUBMITTED,
        payload: { applicant: "Ayesha Rahman", jobTitle: jobs[0]!.title },
        readAt: new Date(),
      },
    ] satisfies Prisma.NotificationCreateManyInput[],
  });

  console.log(
    `Seeded ${companies.length} companies, ${jobs.length} jobs, ${seekerIds.length} seekers, ` +
      `${applicationCount} applications, ${assessed.length} assessments.\n` +
      `Demo logins (password ${DEMO_PASSWORD}): seeker@jobify.dev, employer@jobify.dev, admin@jobify.dev`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
