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
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "components/Button";
import { useNavigate } from "react-router-dom";
import { appSyncRequestMutation } from "assets/js/request";
import HeaderPanel from "components/HeaderPanel";
import { createSubAccountLink } from "graphql/mutations";
import CopyText from "components/CopyText";
import { AmplifyConfigType } from "types";
import { useDispatch, useSelector } from "react-redux";
import { buildCrossAccountTemplateLink } from "assets/js/utils";
import { handleErrorMessage } from "assets/js/alert";
import { RootState } from "reducer/reducers";
import CommonLayout from "pages/layout/CommonLayout";
import LinkAccountComp from "./LinkAccountComp";
import {
  setAccountRegion,
  validateMemberAccount,
  validateMemberAccountInput,
} from "reducer/linkMemberAccount";
import { useMemberAccount } from "assets/js/hooks/useMemberAccount";
import { AppDispatch } from "reducer/store";

const LinkAnAccount: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("resource:crossAccount.name"), link: "/resources/cross-account" },
    { name: t("resource:crossAccount.link.name") },
  ];

  const [loadingCreate, setLoadingCreate] = useState(false);
  const memberAccount = useMemberAccount();
  const appDispatch = useDispatch<AppDispatch>();

  const createCrossAccountLink = async () => {
    // Trim All Parameter value
    const toTrimObj: { [key: string]: string } = JSON.parse(
      JSON.stringify(memberAccount.data)
    );
    console.info("toTrimObj:", toTrimObj);
    Object.keys(toTrimObj).forEach(
      (key) =>
        (toTrimObj[key] =
          typeof toTrimObj?.[key] === "string"
            ? toTrimObj?.[key].trim().replace(/[\t\r]/g, "")
            : toTrimObj[key])
    );
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createSubAccountLink,
        toTrimObj
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      navigate("/resources/cross-account");
    } catch (error: any) {
      setLoadingCreate(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  const backToListPage = () => {
    navigate("/resources/cross-account");
  };

  useEffect(() => {
    appDispatch(setAccountRegion(amplifyConfig.aws_project_region));
  }, [amplifyConfig.aws_project_region]);

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="m-w-800">
        <HeaderPanel title={t("resource:crossAccount.link.stepOneTitle")}>
          <div className="cross-account">
            <div className="deploy-desc">
              {t("resource:crossAccount.link.stepOneTipsDesc")}
            </div>
            <div className="deploy-steps">
              <div>{t("resource:crossAccount.link.stepOne1")}</div>
              <div>{`${t("resource:crossAccount.link.stepOne2")} ${
                amplifyConfig.aws_project_region
              }`}</div>
              <div>{t("resource:crossAccount.link.stepOne3")}</div>
              <div className="pl-20">
                <CopyText
                  text={buildCrossAccountTemplateLink(
                    amplifyConfig.aws_appsync_region,
                    amplifyConfig.solution_version,
                    amplifyConfig.template_bucket,
                    amplifyConfig.solution_name
                  )}
                >
                  {""}
                </CopyText>
                <pre className="ml-20">
                  <code>
                    {buildCrossAccountTemplateLink(
                      amplifyConfig.aws_appsync_region,
                      amplifyConfig.solution_version,
                      amplifyConfig.template_bucket,
                      amplifyConfig.solution_name
                    )}
                  </code>
                </pre>
              </div>
              <div className="mt-m10">
                {t("resource:crossAccount.link.stepOne4")}
              </div>
            </div>
          </div>
        </HeaderPanel>
        <HeaderPanel title={t("resource:crossAccount.link.stepTwoTitle")}>
          <LinkAccountComp />
        </HeaderPanel>
        <div className="button-action text-right">
          <Button
            data-testid="cancel-link-button"
            disabled={loadingCreate}
            btnType="text"
            onClick={() => {
              backToListPage();
            }}
          >
            {t("button.cancel")}
          </Button>
          <Button
            data-testid="confirm-link-button"
            loading={loadingCreate}
            btnType="primary"
            onClick={() => {
              if (!validateMemberAccountInput(memberAccount)) {
                appDispatch(validateMemberAccount());
                return;
              }
              createCrossAccountLink();
            }}
          >
            {t("button.add")}
          </Button>
        </div>
      </div>
    </CommonLayout>
  );
};

export default LinkAnAccount;
