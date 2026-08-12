import { useNavigate } from 'react-router-dom';
import { Button } from '@openedx/paragon';
import { ArrowBack } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import AlertList from '../userMessages/AlertList';
import BatchListPanel from './BatchListPanel';
import messages from './messages';
import { ERROR_TOPIC } from './data/api';
import { BATCH_ID_PARAM } from './constants';
import ROUTES from '../data/constants/routes';

const { SUPPORT_TOOLS_TABS } = ROUTES;

/**
 * Run history, on its own page — split out because the list is a growing archive
 * while uploading is one short task, and together they pushed the file picker below
 * an ever-longer table. Opening a batch hands off to the upload page's progress
 * view, which owns polling, cancel/retry and the per-course table.
 */
export default function CourseBulkUnenrollBatchesPage() {
  const intl = useIntl();
  const navigate = useNavigate();

  const openBatch = (batchId) => navigate(
    `${SUPPORT_TOOLS_TABS.SUB_DIRECTORY.COURSE_BULK_UNENROLL}?${BATCH_ID_PARAM}=${batchId}`,
  );

  return (
    <div className="container-fluid course-bulk-unenroll pb-5">
      <AlertList topic="general" className="mb-3 mt-5" />
      <AlertList topic={ERROR_TOPIC} className="mb-3 mt-5" />

      <section className="course-bulk-unenroll-header">
        <h2 className="font-weight-bold">{intl.formatMessage(messages.batchesPageTitle)}</h2>
      </section>

      <Button
        variant="link"
        className="pl-0 mb-3"
        iconBefore={ArrowBack}
        onClick={() => navigate(SUPPORT_TOOLS_TABS.SUB_DIRECTORY.COURSE_BULK_UNENROLL)}
        data-testid="bulk-unenroll-back-to-upload"
      >
        {intl.formatMessage(messages.backToUpload)}
      </Button>

      <BatchListPanel onOpen={openBatch} />
    </div>
  );
}
