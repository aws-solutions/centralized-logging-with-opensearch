/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { SubAccountLink } from "API";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import Button from "components/Button";
import Modal from "components/Modal";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface UpdateSubAccountModalProps {
  accountInfo: SubAccountLink | null;
  showModal: boolean;
  closeModal: (close: boolean) => void;
}

const UpdateSubAccountModal: React.FC<UpdateSubAccountModalProps> = (
  props: UpdateSubAccountModalProps
) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accountInfo, showModal, closeModal } = props;
  return (
    <Modal
      title={t("alert")}
      fullWidth={false}
      isOpen={showModal}
      closeModal={() => {
        closeModal(false);
      }}
      actions={
        <div className="button-action no-pb text-right">
          <Button
            btnType="text"
            onClick={() => {
              closeModal(false);
            }}
          >
            {t("button.cancel")}
          </Button>
          <Button
            btnType="primary"
            onClick={() => {
              closeModal(false);
              navigate(
                `/resources/cross-account/detail/${accountInfo?.subAccountId}`
              );
            }}
          >
            {t("button.confirm")}
          </Button>
        </div>
      }
    >
      <div className="modal-content alert-content">
        <Alert
          noMargin
          type={AlertType.Warning}
          content={
            <div>
              <p>
                <strong>{t("resource:crossAccount.updateAlert")}</strong>
              </p>
            </div>
          }
        />
      </div>
    </Modal>
  );
};

export default UpdateSubAccountModal;
