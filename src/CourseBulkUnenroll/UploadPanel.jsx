import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Spinner } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';
import { MAX_FILE_BYTES, MAX_ROWS } from './constants';

// Form.Control.Feedback self-registers with Paragon's descriptor list; Form.Text
// does not, so the help text keeps an explicit id handed to the control.
const HELP_TEXT_ID = 'bulk-unenroll-file-help';

/**
 * Step 1: pick a CSV and upload it. A plain file input rather than Paragon's
 * Dropzone — no existing drag-and-drop pattern here, and the native control is
 * keyboard- and screen-reader-accessible for free.
 */
export default function UploadPanel({ onUploaded, isBusy, setIsBusy }) {
  const intl = useIntl();
  const [file, setFile] = useState(null);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setLocalError(intl.formatMessage(messages.noFileSelected));
      return;
    }
    setLocalError(null);
    setIsBusy(true);
    try {
      await onUploaded(file);
    } catch {
      // The API layer returns request failures rather than rejecting, so anything
      // here is an unexpected fault in the `onUploaded` prop. Still surface it: a
      // spinning button strands the operator with nothing but a reload.
      setLocalError(intl.formatMessage(messages.uploadError));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit} data-testid="bulk-unenroll-upload-form">
      {/* controlId gives the group the input's id, which Form.Label picks up as
          htmlFor and Form.Control.Feedback extends with its own descriptor id.
          react-bootstrap renders type="file" as .form-control-file and merges
          .is-invalid from the group's isInvalid. aria-invalid stays explicit:
          no Paragon form control emits it. */}
      <Form.Group controlId="bulk-unenroll-file" isInvalid={!!localError}>
        <Form.Label>
          {intl.formatMessage(messages.fileLabel)}
        </Form.Label>
        <Form.Control
          type="file"
          accept=".csv,text/csv"
          aria-invalid={localError ? true : undefined}
          aria-describedby={HELP_TEXT_ID}
          data-testid="bulk-unenroll-file-input"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setLocalError(null);
          }}
        />
        <Form.Text id={HELP_TEXT_ID}>
          {intl.formatMessage(messages.fileHelpText, {
            maxRows: MAX_ROWS,
            maxMegabytes: Math.round(MAX_FILE_BYTES / (1024 * 1024)),
          })}
        </Form.Text>
        {localError && (
          <Form.Control.Feedback
            type="invalid"
            hasIcon={false}
            data-testid="bulk-unenroll-file-error"
          >
            {localError}
          </Form.Control.Feedback>
        )}
      </Form.Group>
      <Button type="submit" variant="primary" disabled={isBusy} data-testid="bulk-unenroll-upload-button">
        {isBusy && <Spinner animation="border" size="sm" className="mr-2" screenReaderText="loading" />}
        {intl.formatMessage(isBusy ? messages.uploadingButton : messages.uploadButton)}
      </Button>
    </Form>
  );
}

UploadPanel.propTypes = {
  onUploaded: PropTypes.func.isRequired,
  isBusy: PropTypes.bool.isRequired,
  setIsBusy: PropTypes.func.isRequired,
};
