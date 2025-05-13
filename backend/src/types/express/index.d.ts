import 'express';

declare global {
  namespace Express {
    namespace Multer {
      // Define the Multer File type if it's not automatically available
      interface File {
        /** Name of the form field associated with this file. */
        fieldname: string;
        /** Name of the file on the uploader's computer. */
        originalname: string;
        /** Value of the `Content-Type` header for this file. */
        mimetype: string;
        /** Size of the file in bytes. */
        size: number;
        /** A Buffer containing the entire file. */
        buffer: Buffer;
        /** The folder to which the file has been saved (if using DiskStorage). */
        destination?: string;
        /** The name of the file within the destination (if using DiskStorage). */
        filename?: string;
        /** The full path to the uploaded file (if using DiskStorage). */
        path?: string;
      }
    }
    // Extend the Request interface
    interface Request {
      files?: { [fieldname: string]: Multer.File[] };
      file?: Multer.File;
      user?: import('../../models/User').IUser; // Assuming IUser is exported from User model
    }
  }
} 