import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware to check validation results and halt if errors exist
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Return only the first error for cleaner responses
    const firstError = errors.array()[0];
    // express-validator's ValidationError may have different shapes depending on versions
    // Safely extract the field name using a type-guard fallback
    const field = (firstError as any).param ?? (firstError as any).path ?? (firstError as any).location ?? null;

    res.status(400).json({ 
      message: 'Validation failed', 
      error: firstError.msg, 
      field
    });
  };
};

// --- Validation Schemas ---

export const signupValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required.'),
  body('lastName').trim().notEmpty().withMessage('Last name is required.'),
  body('email').isEmail().withMessage('A valid email address is required.'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain a number.')
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password cannot be empty.')
];