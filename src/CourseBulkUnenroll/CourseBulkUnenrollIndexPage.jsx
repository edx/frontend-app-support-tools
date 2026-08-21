import {
  useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Form, Spinner } from '@openedx/paragon';
import { ArrowBack } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import AlertList from '../userMessages/AlertList';
import UserMessagesContext from '../userMessages/UserMessagesContext';
import ConfirmModal from './ConfirmModal';
import PreviewPanel from './PreviewPanel';
import ProgressPanel from './ProgressPanel';
import UploadPanel from './UploadPanel';
import messages from './messages';
import usePolledBatchStatus from './data/hooks';
import {
  cancelBulkUnenrollBatch, confirmBulkUnenrollBatch, retryBulkUnenrollBatch, uploadBulkUnenrollFile,
  ERROR_TOPIC,
} from './data/api';
import { ALL_FILTER_VALUE, BATCH_ID_PARAM, CONFIRM_COMPLETE_DELAY_MS } from './constants';
import ROUTES from '../data/constants/routes';

const { SUPPORT_TOOLS_TABS } = ROUTES;

export default function CourseBulkUnenrollIndexPage() {
  const intl = useIntl();
  const { add, clear } = useContext(UserMessagesContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // In the URL so a run survives a reload and can be handed to a colleague — a
  // batch can take hours, and the tab is not the only handle.
  const batchId = searchParams.get(BATCH_ID_PARAM);

  const [preview, setPreview] = useState(null);
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitState, setSubmitState] = useState('default');
  const [isBusy, setIsBusy] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [courseFilter, setCourseFilter] = useState(ALL_FILTER_VALUE);
  const [coursePage, setCoursePage] = useState(1);
  const [lookupValue, setLookupValue] = useState('');
  const confirmButtonRef = useRef(null);

  const {
    batch, error: statusError, isLoading, refresh,
  } = usePolledBatchStatus(batchId, {
    // An empty filter means "all": send no param rather than an empty one.
    state: courseFilter || undefined,
    page: coursePage,
  });

  // Narrowing can leave the page past the end, showing an empty table over a
  // non-empty batch.
  const handleCourseFilterChange = (value) => {
    setCourseFilter(value);
    setCoursePage(1);
  };

  // UserMessagesProvider rebuilds `add`/`clear` every render, so depending on their
  // identity would make `showApiError` unstable and loop the error effect below
  // forever. Hold them in a ref and keep the callback stable.
  const messagesApi = useRef({ add, clear });
  messagesApi.current = { add, clear };

  const showApiError = useCallback((result) => {
    messagesApi.current.clear(ERROR_TOPIC);
    result.error.forEach((entry) => messagesApi.current.add(entry));
  }, []);

  useEffect(() => {
    if (statusError?.isApiError) { showApiError(statusError); }
  }, [statusError, showApiError]);

  const handleUpload = async (file) => {
    const result = await uploadBulkUnenrollFile(file, intl);
    if (result?.isApiError) {
      showApiError(result);
      return;
    }
    clear(ERROR_TOPIC);
    setPreview(result);
  };

  // The success beat below is on a timer; clear it if the page goes away first.
  const completeTimerRef = useRef(null);
  useEffect(() => () => {
    if (completeTimerRef.current) { clearTimeout(completeTimerRef.current); }
  }, []);

  const handleConfirm = async () => {
    setSubmitState('pending');
    const result = await confirmBulkUnenrollBatch(preview.batch_id, reason.trim(), intl);
    if (result?.isApiError) {
      setSubmitState('default');
      showApiError(result);
      return;
    }
    clear(ERROR_TOPIC);
    // Hold on `complete` so the operator sees the action land before the page moves.
    setSubmitState('complete');
    completeTimerRef.current = setTimeout(() => {
      setSubmitState('default');
      setIsModalOpen(false);
      setPreview(null);
      setSearchParams({ [BATCH_ID_PARAM]: preview.batch_id });
    }, CONFIRM_COMPLETE_DELAY_MS);
  };

  const runMutation = async (fn) => {
    setIsMutating(true);
    const result = await fn(batchId, intl);
    setIsMutating(false);
    if (result?.isApiError) {
      showApiError(result);
      return;
    }
    clear(ERROR_TOPIC);
    // Cancel and retry change state immediately; don't wait for the next poll.
    refresh();
  };

  const handleStartOver = () => {
    setPreview(null);
    setReason('');
    setReasonTouched(false);
    setCourseFilter(ALL_FILTER_VALUE);
    setCoursePage(1);
    clear(ERROR_TOPIC);
    setSearchParams({});
  };

  // Same transition however the batch was chosen. Clearing the error topic matters:
  // a "no batch found" alert from a previous attempt would outlive the next one.
  const openBatch = (id) => {
    setPreview(null);
    setCourseFilter(ALL_FILTER_VALUE);
    setCoursePage(1);
    messagesApi.current.clear(ERROR_TOPIC);
    setSearchParams({ [BATCH_ID_PARAM]: id });
  };

  const handleLookup = (event) => {
    event.preventDefault();
    const trimmed = lookupValue.trim();
    if (!trimmed) { return; }
    openBatch(trimmed);
    setLookupValue('');
  };

  const reasonIsBlank = reason.trim().length === 0;

  return (
    <div className="container-fluid course-bulk-unenroll pb-5">
      <AlertList topic="general" className="mb-3 mt-5" />
      <AlertList topic={ERROR_TOPIC} className="mb-3 mt-5" />

      <section className="course-bulk-unenroll-header">
        <h2 className="font-weight-bold">{intl.formatMessage(messages.pageTitle)}</h2>
      </section>
      <p className="course-bulk-unenroll-section-description text-gray-700 mb-4.5">
        {intl.formatMessage(messages.pageDescription)}
      </p>

      {/* Opening a batch by URL or lookup fetches before it can render anything.
          Without this the page is blank in the meantime — every branch below is
          false while `batch` is still null. */}
      {batchId && !batch && !statusError && (
        <div className="d-flex align-items-center" data-testid="bulk-unenroll-loading">
          <Spinner animation="border" className="mr-2" screenReaderText="loading" />
          {intl.formatMessage(messages.progressHeading)}
        </div>
      )}

      {batchId && batch && (
        <>
          {/* Same affordance, wording and placement as the history page: watching
              a batch is a detour, and the way out is a back link at the top
              rather than something the operator has to scroll past the table to
              find. It drops the batch from the URL, which is what returns the
              page to the file picker. */}
          <Button
            variant="link"
            className="pl-0 mb-3"
            iconBefore={ArrowBack}
            onClick={handleStartOver}
            data-testid="bulk-unenroll-back-to-upload"
          >
            {intl.formatMessage(messages.backToUpload)}
          </Button>
          <ProgressPanel
            batch={batch}
            isLoading={isLoading}
            courseFilter={courseFilter}
            onCourseFilterChange={handleCourseFilterChange}
            page={coursePage}
            onPageChange={setCoursePage}
            onCancel={() => runMutation(cancelBulkUnenrollBatch)}
            onRetry={() => runMutation(retryBulkUnenrollBatch)}
            isMutating={isMutating}
          />
        </>
      )}

      {!batchId && !preview && (
        <>
          <UploadPanel onUploaded={handleUpload} isBusy={isBusy} setIsBusy={setIsBusy} />

          {/* The run history lives on its own page: it only grows, and keeping it
              here pushed the file picker below an ever-longer table. */}
          <Button
            variant="link"
            className="pl-0 mt-3"
            onClick={() => navigate(SUPPORT_TOOLS_TABS.SUB_DIRECTORY.COURSE_BULK_UNENROLL_BATCHES)}
            data-testid="bulk-unenroll-view-history"
          >
            {intl.formatMessage(messages.viewBatchHistory)}
          </Button>

          <hr className="my-4" />

          <Form onSubmit={handleLookup} data-testid="bulk-unenroll-lookup-form">
            <header className="course-bulk-unenroll-section-title mb-3">
              {intl.formatMessage(messages.lookupHeading)}
            </header>
            <Form.Group>
              <Form.Label htmlFor="bulk-unenroll-lookup">
                {intl.formatMessage(messages.lookupLabel)}
              </Form.Label>
              <Form.Control
                id="bulk-unenroll-lookup"
                value={lookupValue}
                onChange={(event) => setLookupValue(event.target.value)}
                data-testid="bulk-unenroll-lookup-input"
              />
            </Form.Group>
            <Button type="submit" variant="outline-primary" data-testid="bulk-unenroll-lookup-button">
              {intl.formatMessage(messages.lookupButton)}
            </Button>
          </Form>
        </>
      )}

      {!batchId && preview && (
        <>
          <PreviewPanel
            courses={preview.courses ?? []}
            errors={preview.errors ?? []}
            totalLearners={preview.totals?.active ?? 0}
          />

          <Form.Group className="mt-4">
            <Form.Label htmlFor="bulk-unenroll-reason">
              {intl.formatMessage(messages.reasonLabel)}
            </Form.Label>
            <Form.Control
              id="bulk-unenroll-reason"
              value={reason}
              isInvalid={reasonTouched && reasonIsBlank}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setReasonTouched(true)}
              data-testid="bulk-unenroll-reason-input"
            />
            <Form.Text>{intl.formatMessage(messages.reasonHelpText)}</Form.Text>
            {reasonTouched && reasonIsBlank && (
              <Form.Control.Feedback type="invalid" hasIcon={false} data-testid="bulk-unenroll-reason-error">
                {intl.formatMessage(messages.reasonRequired)}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <div className="py-4 my-2 d-flex justify-content-end align-items-center">
            <Button
              variant="outline-primary"
              className="mr-3"
              onClick={handleStartOver}
              data-testid="bulk-unenroll-preview-start-over"
            >
              {intl.formatMessage(messages.startOver)}
            </Button>
            <Button
              ref={confirmButtonRef}
              variant="danger"
              disabled={reasonIsBlank}
              onClick={() => setIsModalOpen(true)}
              data-testid="bulk-unenroll-open-confirm"
            >
              {intl.formatMessage(messages.confirmButton)}
            </Button>
          </div>

          <ConfirmModal
            isOpen={isModalOpen}
            onConfirm={handleConfirm}
            onCancel={() => setIsModalOpen(false)}
            courseCount={(preview.courses ?? []).length}
            learnerCount={preview.totals?.active ?? 0}
            submitState={submitState}
            positionRef={confirmButtonRef}
          />
        </>
      )}
    </div>
  );
}
