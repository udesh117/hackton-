import { Request, Response, NextFunction } from 'express';

// Define the required scoring categories and their allowed range (1-10)
export const SCORING_CRITERIA = {
    score_innovation: { required: true, min: 1, max: 10 },
    score_feasibility: { required: true, min: 1, max: 10 },
    score_execution: { required: true, min: 1, max: 10 },
    score_presentation: { required: true, min: 1, max: 10 },
};

// --- Middleware for Score Range Validation ---
export const validateScoreRanges = (req: Request, res: Response, next: NextFunction) => {
    // Determine if this is a final submission (requires stricter checks)
    const isFinalSubmission = req.url.includes('/submit');
    const payload = req.body;
    const validationErrors = [];

    for (const [key, criteria] of Object.entries(SCORING_CRITERIA)) {
        const score = payload[key];
        
        // 1. Check if required fields are missing for FINAL SUBMISSION
        if (isFinalSubmission && (score === undefined || score === null)) {
            validationErrors.push({ field: key, message: `${key.replace('score_', '')} score is required for final submission.` });
            continue;
        }

        // 2. Check score format and range (for both draft and submit)
        if (score !== undefined && score !== null) {
            const numericScore = Number(score);

            if (isNaN(numericScore) || numericScore < criteria.min || numericScore > criteria.max) {
                validationErrors.push({ 
                    field: key, 
                    message: `${key.replace('score_', '')} score must be a number between ${criteria.min} and ${criteria.max}.` 
                });
            }
        }
    }
    
    // 3. Check if comments are provided for final submission
    if (isFinalSubmission) {
        if (!payload.comments || String(payload.comments).length < 15) { // Minimum 15 characters for detailed comments
            validationErrors.push({ field: 'comments', message: 'Detailed comments (min 15 chars) are required for final submission.' });
        }
    }


    if (validationErrors.length > 0) {
        return res.status(400).json({ message: "Evaluation validation failed.", errors: validationErrors });
    }

    next();
};