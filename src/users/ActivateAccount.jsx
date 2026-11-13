import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  ActionRow, Alert, Button, ModalDialog,
} from '@openedx/paragon';

import { postActivateAccount } from './data/api';

/**
 * Lets support confirm an unconfirmed learner's account (LP-1011).
 *
 * The LMS activates the account directly, the same way the learner's activation email link would. The activation key
 * itself is never sent to the browser, so support never handles a link that could be copied or leaked.
 */
export default function ActivateAccount({ username, changeHandler }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const activate = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await postActivateAccount(username);
      setIsModalOpen(false);
      changeHandler();
    } catch (e) {
      setError(e?.customAttributes?.httpErrorResponseData || 'The account could not be activated. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        id="activate-account"
        variant="outline-primary"
        size="sm"
        className="ml-2"
        onClick={() => setIsModalOpen(true)}
      >
        Activate account
      </Button>
      <ModalDialog
        isOpen={isModalOpen}
        onClose={closeModal}
        hasCloseButton
        id="activate-account-modal"
        title="Activate account"
      >
        <ModalDialog.Header className="mb-3 mt-1">
          <ModalDialog.Title className="modal-title">Activate account</ModalDialog.Title>
        </ModalDialog.Header>
        <ModalDialog.Body className="mb-3">
          <Alert variant="warning">
            <p>
              Activate <b>{username}</b> without email confirmation? Only do this once you are sure the learner
              owns this email address.
            </p>
          </Alert>
          {error && <Alert variant="danger" id="activate-account-error">{String(error)}</Alert>}
        </ModalDialog.Body>
        <ModalDialog.Footer>
          <ActionRow>
            <ModalDialog.CloseButton variant="link">Cancel</ModalDialog.CloseButton>
            <Button
              id="activate-account-confirm"
              variant="primary"
              disabled={isSubmitting}
              onClick={activate}
            >
              Activate
            </Button>
          </ActionRow>
        </ModalDialog.Footer>
      </ModalDialog>
    </>
  );
}

ActivateAccount.propTypes = {
  username: PropTypes.string.isRequired,
  changeHandler: PropTypes.func.isRequired,
};
