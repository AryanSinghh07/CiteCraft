import { MAX_TICKET_FILE_BYTES, MAX_TICKET_FILES, TICKET_FILE_TYPES } from './types';

/** Throws a user-friendly error if ticket attachments break the limits. */
export function validateTicketFiles(files: File[]): void {
  if (files.length > MAX_TICKET_FILES) {
    throw new Error(`You can attach up to ${MAX_TICKET_FILES} files.`);
  }
  for (const file of files) {
    if (!TICKET_FILE_TYPES.includes(file.type)) {
      throw new Error(`${file.name}: only images, PDF and text files can be attached.`);
    }
    if (file.size > MAX_TICKET_FILE_BYTES) {
      throw new Error(`${file.name} is larger than 5 MB.`);
    }
  }
}
