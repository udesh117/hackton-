import FormData from "form-data";
import { createHash } from "crypto";
import { getEnvVar } from "../utils/jwt"; // Use our existing helper
import logger from "../utils/logger";

interface VTAnalysisStats {
  malicious: number;
  [key: string]: number;
}

export class AntivirusService {
  private static VT_BASE = "https://www.virustotal.com/api/v3";
  private static API_KEY = getEnvVar("VIRUS_TOTAL_API_KEY");
  private static MAX_POLL_RETRIES = 10;

  /**
   * Returns true if the buffer is definitely infected,
   * false otherwise (including any VT errors).
   */
  public static async isInfected(buffer: Buffer): Promise<boolean> {
    if (!this.API_KEY) {
      logger.error("[AntivirusService] API key not set");
      throw new Error("VIRUS_TOTAL_API_KEY not set");
    }

    const headers = {
      "x-apikey": this.API_KEY,
      accept: "application/json",
    };

    // 1) Compute SHA256
    const sha256 = createHash("sha256").update(buffer).digest("hex");

    // 2) Check for an existing report
    try {
      const existing = await fetch(`${this.VT_BASE}/files/${sha256}`, {
        method: "GET",
        headers,
      });
      if (existing.ok) {
        logger.info("[AntivirusService] existing report found – assuming clean");
        return false;
      }
      if (existing.status !== 404) {
        logger.warn("[AntivirusService] unexpected status – treating as clean", { status: existing.status });
        return false;
      }
    } catch (err: any) {
      logger.warn("[AntivirusService] error fetching existing report – treating as clean", { error: err.message });
      return false;
    }

    // 3) Upload buffer for analysis
    let analysisId: string;
    try {
      const form = new FormData();
      form.append("file", buffer, { filename: "submission.zip" });
      const upload = await fetch(`${this.VT_BASE}/files`, {
        method: "POST",
        headers: {
          "x-apikey": this.API_KEY,
          accept: "application/json",
          ...form.getHeaders(),
        },
        body: form as any,
      });

      if (!upload.ok) {
        logger.warn("[AntivirusService] upload failed – treating as clean", { status: upload.status });
        return false;
      }
      const payload = (await upload.json()) as { data: { id: string } };
      analysisId = payload.data.id;
    } catch (err: any) {
      logger.warn("[AntivirusService] error uploading for analysis – treating as clean", { error: err.message });
      return false;
    }

    // 4) Poll until the scan completes
    for (let i = 0; i < this.MAX_POLL_RETRIES; i++) {
      try {
        const poll = await fetch(`${this.VT_BASE}/analyses/${analysisId}`, {
          method: "GET",
          headers,
        });

        if (!poll.ok) {
          logger.warn("[AntivirusService] poll failed – treating as clean", { status: poll.status });
          return false;
        }

        const body = (await poll.json()) as any;
        const status = body.data?.attributes?.status;

        if (status === "completed") {
          const stats = body.data.attributes.stats as VTAnalysisStats;
          return stats.malicious > 0;
        }
      } catch (err: any) {
        logger.warn("[AntivirusService] error polling analysis – treating as clean", { error: err.message });
        return false;
      }
      // not done yet → wait then retry
      await new Promise((r) => setTimeout(r, 2000)); // Increased wait time for standard VT tier
    }
    // If polling times out, assume clean
    logger.warn("[AntivirusService] Polling timed out. Assuming clean.");
    return false;
  }
}