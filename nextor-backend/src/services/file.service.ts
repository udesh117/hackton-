import { supabase } from "../lib/supabaseClient";
import { AntivirusService } from "./antivirus.service"; // Use our new AV service
import logger from "../utils/logger";

export class FileService {
    // Bucket names (Adapted for Nextor - MUST be created in Supabase Storage)
    public static BUCKET_SUBMISSIONS = "hackonx-submissions";

    public static async scanBuffer(buffer: Buffer): Promise<void> {
        logger.debug("[FileService] Scanning buffer of size", buffer.length);
        const infected = await AntivirusService.isInfected(buffer);
        if (infected) {
            logger.error("[FileService] File is infected!");
            throw new Error("FileService: buffer flagged as infected");
        }
        logger.debug("[FileService] Buffer is clean");
    }

    /**
     * Core direct upload pipeline: scan → upload → get public URL
     */
    private static async directUpload(bucket: string, key: string, buffer: Buffer, mimeType: string, upsert: boolean = false): Promise<string> {
        // 1) virus scan
        await this.scanBuffer(buffer);

        // 2) upload to bucket
        const { error } = await supabase.storage
            .from(bucket)
            .upload(key, buffer, {
                contentType: mimeType,
                cacheControl: "3600",
                upsert: upsert,
            });
        
        if (error) {
            logger.error("[directUpload] upload error=", error);
            throw new Error(`Upload failed: ${error.message}`);
        }

        // 3) get public URL
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(key);
        if (!urlData?.publicUrl) throw new Error("Could not generate public URL");

        return urlData.publicUrl;
    }

    /**
     * Dedicated function for Submissions ZIP upload.
     */
    public static async uploadSubmissionZip(teamId: string, filename: string, buffer: Buffer, mimeType: string): Promise<string> {
        // Path: hackonx-submissions/{teamId}/{filename}
        const key = `${teamId}/${filename}`;
        return this.directUpload(this.BUCKET_SUBMISSIONS, key, buffer, mimeType, true); // Use upsert: true for replacement
    }
    
    // Placeholder for other file ops if needed later
    public static async downloadFile(bucket: string, key: string): Promise<Buffer> {
            const { data, error } = await supabase.storage.from(bucket).download(key);
            if (error || !data) throw new Error(`Download failed: ${error?.message ?? "no data"}`);
            const arr = await data.arrayBuffer();
      return Buffer.from(arr);
    }
}