import messages from './messages';

/**
 * One label per state for the status badges on both tables — batch and course
 * states share most of their vocabulary, so one map beats two that would drift.
 * Filter dropdowns do NOT read this: a filter choice can span two states.
 */
const STATE_MESSAGES = {
  validated: messages.stateValidated,
  pending: messages.statePending,
  running: messages.stateRunning,
  succeeded: messages.stateSucceeded,
  partial: messages.statePartial,
  failed: messages.stateFailed,
  cancelled: messages.stateCancelled,
  skipped: messages.stateSkipped,
};

/**
 * Translate a state value. The raw-value fallback is deliberate: a state the
 * backend adds later shows as itself rather than vanishing into a blank cell.
 */
export function stateLabel(intl, value) {
  const message = STATE_MESSAGES[value];
  return message ? intl.formatMessage(message) : value;
}
