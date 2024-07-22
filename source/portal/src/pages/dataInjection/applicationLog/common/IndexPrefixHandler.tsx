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

import { defaultStr } from "assets/js/utils";
import Button from "components/Button";
import Modal from "components/Modal";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";

interface IndexPrefixHandlerProps {
  openModal: boolean;
  alertContent: ReactElement | string;
  showContinue?: boolean;
  clickConfirm: () => void;
  clickCancel: () => void;
  clickEditIndex: () => void;
}

const IndexPrefixHandler: React.FC<IndexPrefixHandlerProps> = (
  props: IndexPrefixHandlerProps
) => {
  const { t } = useTranslation();
  const {
    alertContent,
    openModal,
    showContinue,
    clickCancel,
    clickEditIndex,
    clickConfirm,
  } = props;
  return (
    <Modal
      title={defaultStr(t("warning"))}
      fullWidth={false}
      isOpen={openModal}
      closeModal={() => {
        clickCancel();
      }}
      actions={
        <div className="button-action no-pb text-right">
          <Button
            btnType="text"
            onClick={() => {
              clickCancel();
            }}
          >
            {defaultStr(t("button.cancel"))}
          </Button>

          <Button
            btnType="default"
            onClick={() => {
              clickEditIndex();
            }}
          >
            {defaultStr(t("button.edit"))}
          </Button>
          {showContinue && (
            <Button
              btnType="primary"
              onClick={() => {
                clickConfirm();
              }}
            >
              {defaultStr(t("button.continueCreate"))}
            </Button>
          )}
        </div>
      }
    >
      <div className="modal-content">{alertContent}</div>
    </Modal>
  );
};

export default IndexPrefixHandler;
