import PropTypes from 'prop-types';
import {
  Icon, ModalCloseButton, ModalLayer, StatefulButton,
} from '@openedx/paragon';
import { CheckCircleOutline, SpinnerSimple } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

/**
 * The last line of defence before an irreversible action. Chrome follows
 * CourseTeamManagement's `CoursesChangesModal`. The learner count is deliberately
 * oversized: at this scale the difference between 4,200 and 4,200,000 is the whole
 * decision, and a number set in body text is easy to skim past.
 */
export default function ConfirmModal({
  isOpen, onConfirm, onCancel, courseCount, learnerCount, submitState, positionRef,
}) {
  const intl = useIntl();
  const isSettling = submitState === 'pending' || submitState === 'complete';

  return (
    <ModalLayer
      isOpen={isOpen}
      onClose={onCancel}
      positionRef={positionRef}
      isBlocking={isSettling}
    >
      <div
        role="dialog"
        aria-label={intl.formatMessage(messages.confirmModalTitle)}
        className="p-4 bg-white mx-auto my-5 border rounded-sm change-confirm-modal bulk-unenroll-confirm-modal"
        data-testid="bulk-unenroll-confirm-modal"
      >
        <div className="d-flex justify-content-start align-items-center mb-3">
          <h2 className="text-lg font-semibold">{intl.formatMessage(messages.confirmModalTitle)}</h2>
        </div>
        <div className="mb-3 section-divider-1" />

        <p className="mb-1 bulk-unenroll-confirm-count" data-testid="bulk-unenroll-confirm-count">
          {learnerCount.toLocaleString()}
        </p>
        <p className="mb-3">
          {intl.formatMessage(messages.confirmModalBody, {
            courses: courseCount.toLocaleString(),
          })}
        </p>
        <div className="mb-3 section-divider-2" />

        <div className="d-flex justify-content-end align-items-center">
          <ModalCloseButton
            className="mr-3"
            variant="outline-primary"
            disabled={isSettling}
            data-testid="bulk-unenroll-confirm-cancel"
            onClick={onCancel}
          >
            {intl.formatMessage(messages.confirmModalCancel)}
          </ModalCloseButton>
          <StatefulButton
            variant="danger"
            state={submitState}
            onClick={onConfirm}
            data-testid="bulk-unenroll-confirm-submit"
            icons={{
              pending: <Icon src={SpinnerSimple} className="icon-spin" />,
              complete: <Icon src={CheckCircleOutline} />,
            }}
            labels={{
              default: intl.formatMessage(messages.confirmModalConfirm),
              pending: intl.formatMessage(messages.confirmModalConfirming),
              complete: intl.formatMessage(messages.confirmModalConfirmed),
            }}
          />
        </div>
      </div>
    </ModalLayer>
  );
}

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  courseCount: PropTypes.number.isRequired,
  learnerCount: PropTypes.number.isRequired,
  submitState: PropTypes.string.isRequired,
  positionRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
};

ConfirmModal.defaultProps = {
  positionRef: undefined,
};
