import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RoomServiceClient } from "livekit-server-sdk";
import type { Env } from "../config/env";

/** Server-side control of LiveKit rooms (tokens are issued in InterviewsService). */
@Injectable()
export class VideoRoomsService {
  private readonly logger = new Logger(VideoRoomsService.name);
  private readonly rooms: RoomServiceClient;

  constructor(config: ConfigService<Env, true>) {
    // The room API is HTTP; LIVEKIT_URL is the WebSocket address browsers connect to.
    const host = config.get("LIVEKIT_URL", { infer: true }).replace(/^ws/, "http");
    this.rooms = new RoomServiceClient(
      host,
      config.get("LIVEKIT_API_KEY", { infer: true }),
      config.get("LIVEKIT_API_SECRET", { infer: true }),
    );
  }

  /**
   * Closes a room, which disconnects everyone still in it. Best effort: the interview is already
   * over in our database, and an unknown room (nobody joined) is fine.
   */
  async close(roomName: string): Promise<void> {
    try {
      await this.rooms.deleteRoom(roomName);
    } catch (error) {
      this.logger.warn(`Could not close room ${roomName}: ${(error as Error).message}`);
    }
  }
}
