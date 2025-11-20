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
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getSubAccountLink } from "graphql/queries";
import { SubAccountLink } from "API";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import { handleErrorMessage } from "assets/js/alert";
import Button from "components/Button";
import { buildCrossAccountTemplateLink, defaultStr } from "assets/js/utils";
import { updateSubAccountLink } from "graphql/mutations";
import { AmplifyConfigType } from "types";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import CopyText from "components/CopyText";
import Alert, { AlertType } from "components/Alert/alert";
import CommonLayout from "pages/layout/CommonLayout";
import LinkAccountComp from "./LinkAccountComp";
import { AppDispatch } from "reducer/store";
import {
  setAccountData,
  validateMemberAccount,
  validateMemberAccountInput,
} from "reducer/linkMemberAccount";

const CrossAccountDetail: React.FC = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  // const [curAccount, setCurAccount] = useState<SubAccountLink>();
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const memberAccount = useSelector((state: RootState) => state.memberAccount);
  const dispatch = useDispatch<AppDispatch>();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("resource:crossAccount.name"), link: "/resources/cross-account" },
    {
      name: defaultStr(memberAccount.data?.subAccountName),
    },
  ];

  const backToListPage = () => {
    navigate("/resources/cross-account");
  };

  const updateCrossAccountLink = async () => {
    // Trim All Parameter value
    const toTrimObj: { [key: string]: string } = JSON.parse(
      JSON.stringify(memberAccount.data)
    );
    console.info("toTrimObj:", toTrimObj);

    try {
      setLoadingSave(true);
      const createRes = await appSyncRequestMutation(
        updateSubAccountLink,
        toTrimObj
      );
      console.info("createRes:", createRes);
      setLoadingSave(false);
      navigate("/resources/cross-account");
    } catch (error: any) {
      setLoadingSave(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  const getAccountDetail = async () => {
    setLoadingData(true);
    try {
      const resData: any = await appSyncRequestQuery(getSubAccountLink, {
        subAccountId: decodeURIComponent(defaultStr(id)),
      });
      console.info("resData:", resData);
      const dataAccount: SubAccountLink = resData.data.getSubAccountLink;
      console.info("dataAccount:", dataAccount);
      dispatch(setAccountData(dataAccount));
      setLoadingData(false);
    } catch (error: any) {
      setLoadingData(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  useEffect(() => {
    getAccountDetail();
  }, []);

  return (
    <CommonLayout breadCrumbList={breadCrumbList} loadingData={loadingData}>
      <div className="m-w-800">
        <PagePanel title={defaultStr(memberAccount.data?.subAccountName)}>
          <HeaderPanel title={t("resource:crossAccount.detail")}>
            <div className="cross-account mb-10">
              <Alert
                content={t(
                  "resource:crossAccount.link.stepOneUpdateTipsDesc"
                )}
                type={AlertType.Normal}
              />
              <div className="deploy-steps">
                <div>{t("resource:crossAccount.link.stepOne1")}</div>
                <div>{`${t("resource:crossAccount.link.stepOne2")} ${
                  amplifyConfig.aws_project_region
                }`}</div>
                <div>{t("resource:crossAccount.link.stepOne3Update")}</div>
                <div className="pl-20">
                  <CopyText
                    text={buildCrossAccountTemplateLink(
                      amplifyConfig.solution_version,
                      amplifyConfig.solution_name,
                      amplifyConfig.template_base_url
                    )}
                  >
                    {""}
                  </CopyText>
                  <pre className="ml-20">
                    <code>
                      {buildCrossAccountTemplateLink(
                        amplifyConfig.solution_version,
                        amplifyConfig.solution_name,
                        amplifyConfig.template_base_url
                      )}
                    </code>
                  </pre>
                </div>
                <div className="mt-m10">
                  {t("resource:crossAccount.link.stepOne4")}
                </div>
                <div>{t("resource:crossAccount.link.stepOne5")}</div>
              </div>
            </div>
            <LinkAccountComp isEdit />
          </HeaderPanel>
          <div className="button-action text-right">
            <Button
              data-testid="cancel-button"
              disabled={loadingSave}
              btnType="text"
              onClick={() => {
                backToListPage();
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              data-testid="save-button"
              loading={loadingSave}
              btnType="primary"
              onClick={() => {
                if (!validateMemberAccountInput(memberAccount)) {
                  dispatch(validateMemberAccount());
                  return;
                }
                updateCrossAccountLink();
              }}
            >
              {t("button.save")}
            </Button>
          </div>
        </PagePanel>
      </div>
    </CommonLayout>
  );
};

export default CrossAccountDetail;
