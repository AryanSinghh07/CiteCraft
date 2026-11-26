/** True when an error means the backend is missing a table or function (a migration or deploy wasn't run). */
export const isSetupError = (error: unknown) =>
  error instanceof Error &&
  /schema cache|PGRST20[25]|does not exist|function .* not found|Requested function was not found|have not been deployed/i.test(error.message);
