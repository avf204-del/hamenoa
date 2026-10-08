// Shared by the server page and the client form, so it lives in a plain module.

/**
 * The workout lengths offered on the home screen, in minutes: one, two, three
 * and four games. Four games is the most a workout holds today, so nothing
 * longer is offered.
 */
export const MINUTE_CHOICES = [12, 20, 25, 30];
export const DEFAULT_MINUTES = 25;
