import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  EmployerProfile,
  EmployerProfileUpdate,
  JobPreference,
  SeekerProfile,
  SeekerProfileUpdate,
} from "@jobify/shared";
import { fileUrl, userFileKey } from "../files/file-keys";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

const EMPTY_PREFERENCES: JobPreference = {
  titles: [],
  locations: [],
  jobTypes: [],
  workplace: [],
  minSalary: null,
};

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getSeeker(userId: string): Promise<SeekerProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        seekerProfile: true,
        jobPreference: true,
        skills: { include: { skill: true }, orderBy: { skill: { name: "asc" } } },
      },
    });
    const profile = user?.seekerProfile;
    if (!user || !profile) throw new NotFoundException("Seeker profile not found");

    const prefs = user.jobPreference;
    return {
      fullName: profile.fullName,
      email: user.email,
      headline: profile.headline,
      phone: profile.phone,
      birthdate: profile.birthdate?.toISOString().slice(0, 10) ?? null,
      location: profile.location,
      education: profile.education,
      about: profile.about,
      employmentStatus: profile.employmentStatus,
      currentPosition: profile.currentPosition,
      experienceYears: profile.experienceYears,
      cvUrl: fileUrl(profile.cvKey),
      photoUrl: fileUrl(profile.photoKey),
      skills: user.skills.map((s) => s.skill.name),
      preferences: prefs
        ? {
            titles: prefs.titles,
            locations: prefs.locations,
            jobTypes: prefs.jobTypes,
            workplace: prefs.workplace,
            minSalary: prefs.minSalary,
          }
        : EMPTY_PREFERENCES,
    };
  }

  async updateSeeker(userId: string, input: SeekerProfileUpdate): Promise<SeekerProfile> {
    const { birthdate, ...rest } = input;
    await this.prisma.seekerProfile.update({
      where: { userId },
      data: {
        ...rest,
        ...(birthdate !== undefined && { birthdate: birthdate ? new Date(birthdate) : null }),
      },
    });
    return this.getSeeker(userId);
  }

  /** Replaces the seeker's skills. Unknown skills are created (matched case-insensitively). */
  async setSkills(userId: string, names: string[]): Promise<SeekerProfile> {
    await this.prisma.$transaction(async (tx) => {
      const skillIds: string[] = [];
      for (const name of names) {
        const existing = await tx.skill.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
        });
        skillIds.push((existing ?? (await tx.skill.create({ data: { name } }))).id);
      }
      await tx.seekerSkill.deleteMany({ where: { userId } });
      await tx.seekerSkill.createMany({ data: skillIds.map((skillId) => ({ userId, skillId })) });
    });
    return this.getSeeker(userId);
  }

  async setPreferences(userId: string, input: JobPreference): Promise<SeekerProfile> {
    await this.prisma.jobPreference.upsert({
      where: { userId },
      create: { userId, ...input },
      update: input,
    });
    return this.getSeeker(userId);
  }

  async searchSkills(q: string): Promise<string[]> {
    const skills = await this.prisma.skill.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
      take: 20,
    });
    return skills.map((s) => s.name);
  }

  /** Stores a new CV or photo and removes the one it replaces. */
  async replaceSeekerFile(
    userId: string,
    kind: "cv" | "photo",
    file: { buffer: Buffer; contentType: string; ext: string },
  ): Promise<SeekerProfile> {
    const key = userFileKey(userId, kind, file.ext);
    await this.storage.put(key, file.buffer, file.contentType);
    const field = kind === "cv" ? "cvKey" : "photoKey";
    const before = await this.prisma.seekerProfile.findUniqueOrThrow({ where: { userId } });
    await this.prisma.seekerProfile.update({ where: { userId }, data: { [field]: key } });
    if (before[field]) await this.storage.delete(before[field]);
    return this.getSeeker(userId);
  }

  async removeSeekerCv(userId: string): Promise<SeekerProfile> {
    const before = await this.prisma.seekerProfile.findUniqueOrThrow({ where: { userId } });
    await this.prisma.seekerProfile.update({ where: { userId }, data: { cvKey: null } });
    if (before.cvKey) await this.storage.delete(before.cvKey);
    return this.getSeeker(userId);
  }

  async getEmployer(userId: string): Promise<EmployerProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employerProfile: true },
    });
    const profile = user?.employerProfile;
    if (!user || !profile) throw new NotFoundException("Employer profile not found");
    return {
      fullName: profile.fullName,
      email: user.email,
      designation: profile.designation,
      phone: profile.phone,
      photoUrl: fileUrl(profile.photoKey),
    };
  }

  async updateEmployer(userId: string, input: EmployerProfileUpdate): Promise<EmployerProfile> {
    await this.prisma.employerProfile.update({ where: { userId }, data: input });
    return this.getEmployer(userId);
  }

  async replaceEmployerPhoto(
    userId: string,
    file: { buffer: Buffer; contentType: string; ext: string },
  ): Promise<EmployerProfile> {
    const key = userFileKey(userId, "photo", file.ext);
    await this.storage.put(key, file.buffer, file.contentType);
    const before = await this.prisma.employerProfile.findUniqueOrThrow({ where: { userId } });
    await this.prisma.employerProfile.update({ where: { userId }, data: { photoKey: key } });
    if (before.photoKey) await this.storage.delete(before.photoKey);
    return this.getEmployer(userId);
  }
}
