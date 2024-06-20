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
import classnames from "classnames";
import React, { useEffect, useState } from "react";

import { Alert, Color } from "@material-ui/lab";

import Modal from "components/Modal";
import Button from "components/Button";
import { useTranslation } from "react-i18next";

const CommonAlert: React.FC = () => {
  const { t } = useTranslation();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertHideCls, setAlertHideCls] = useState(false);
  const [alertProps, setAlertProps] = useState({
    alertTitle: "",
    alertTxt: "",
    alertType: "error",
    hasReload: false,
  });
  useEffect(() => {
    window.addEventListener("showAlertMsg", showAlertMsg);
    return () => {
      window.removeEventListener("showAlertMsg", showAlertMsg);
    };
  }, []);

  const alertCls = classnames({
    "common-alert": true,
    "common-alert-hide": alertHideCls,
  });

  const showAlertMsg = (event: any) => {
    setAlertProps({
      alertTitle: event.detail.alertTitle,
      alertTxt: event.detail.alertTxt,
      alertType: event.detail.alertType,
      hasReload: event.detail.hasReload,
    });
    setAlertVisible(true);
  };

  if (alertProps.hasReload) {
    return (
      <div className="re-sign-in">
        <Modal
          fullWidth={false}
          closeModal={() => {
            console.info("close");
          }}
          isOpen={true}
          actions={
            <div className="button-action no-pb text-right">
              <Button
                btnType="primary"
                onClick={() => {
                  window.location.reload();
                }}
              >
                {t("button.reload")}
              </Button>
            </div>
          }
          title={alertProps.alertTitle}
        >
          <div className="mt-10 pd-20">
            <Alert variant="outlined" severity="warning">
              {alertProps.alertTxt}
            </Alert>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className={alertCls}>
      {alertVisible && (
        <Modal
          fullWidth={false}
          closeModal={() => {
            setAlertVisible(false);
            setAlertHideCls(false);
          }}
          isOpen={true}
          actions={
            <div className="button-action no-pb text-right">
              <Button
                onClick={() => {
                  setAlertVisible(false);
                  setAlertHideCls(false);
                }}
              >
                {t("button.close")}
              </Button>
            </div>
          }
          title={alertProps.alertTitle || t("oops")}
        >
          <div className="mt-10 pd-20 min-width-400">
            <Alert variant="outlined" severity={alertProps.alertType as Color}>
              {alertProps.alertTxt}
            </Alert>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CommonAlert;
