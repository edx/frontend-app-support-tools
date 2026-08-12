import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';
import { TERMINAL_BATCH_STATES } from './constants';
import { formatDate } from '../utils';

/**
 * Who ran this batch, why, and when it started and stopped. Split out of the
 * already-crowded ProgressPanel. The reason matters most: it is the audit trail for
 * an irreversible action. `modified` is labelled "Finished" only for a terminal
 * batch — for a live one it is just the last time the worker touched the row.
 */
export default function BatchMetadata({ batch }) {
  const intl = useIntl();
  const isFinished = TERMINAL_BATCH_STATES.includes(batch.state);

  const rows = [
    [messages.detailsReason, batch.reason || intl.formatMessage(messages.detailsNoReason)],
    [messages.detailsRequester, batch.requester || '—'],
    [messages.detailsFile, batch.csv_filename || '—'],
    [messages.detailsStarted, formatDate(batch.created)],
    [
      isFinished ? messages.detailsFinished : messages.detailsLastUpdated,
      formatDate(batch.modified),
    ],
    [messages.detailsBatchId, batch.batch_id],
  ];

  return (
    <section className="mb-3" data-testid="bulk-unenroll-batch-details">
      <h4 className="h5">{intl.formatMessage(messages.detailsHeading)}</h4>
      <dl className="row mb-0 small">
        {rows.map(([label, value]) => (
          <div className="col-12 col-md-6 d-flex mb-1" key={label.id}>
            <dt className="text-muted bulk-unenroll-detail-label mr-2">
              {intl.formatMessage(label)}
            </dt>
            <dd className="mb-0" data-testid={`bulk-unenroll-detail-${label.id}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

BatchMetadata.propTypes = {
  batch: PropTypes.shape({
    batch_id: PropTypes.string,
    state: PropTypes.string,
    reason: PropTypes.string,
    requester: PropTypes.string,
    csv_filename: PropTypes.string,
    created: PropTypes.string,
    modified: PropTypes.string,
  }).isRequired,
};
