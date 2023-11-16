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
import React, { useState, useEffect, useCallback } from "react";
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getSubAccountLink } from "graphql/queries";
import LoadingText from "components/LoadingText";
import { SubAccountLink } from "API";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import { handleErrorMessage } from "assets/js/alert";
import Button from "components/Button";
import {
  FieldValidator,
  buildCrossAccountTemplateLink,
  pipFieldValidator,
  validateRequiredText,
  validateWithRegex,
} from "assets/js/utils";
import { updateSubAccountLink } from "graphql/mutations";
import cloneDeep from "lodash.clonedeep";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import CopyText from "components/CopyText";
import Alert, { AlertType } from "components/Alert/alert";

let validateFBUploadSNSTopicArn: FieldValidator<string>;

const CrossAccountDetail: React.FC = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [curAccount, setCurAccount] = useState<SubAccountLink>();
  const [copyAccount, setCopyAccount] = useState<SubAccountLink>();
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [accountFBUploadSNSArnError, setAccountFBUploadSNSArnError] =
    useState("");
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  validateFBUploadSNSTopicArn = useCallback(
    pipFieldValidator(
      validateRequiredText(
        t("resource:crossAccount.link.inputFBConfigUploadSNSTopicArn")
      ),
      validateWithRegex(
        new RegExp(
          `^arn:(aws-cn|aws):sns:\\w+-\\w+-\\d:${
            curAccount?.subAccountId || "\\d{12}"
          }:.+`
        )
      )(t("resource:crossAccount.link.fbConfigUploadSNSTopicArnFormatError"))
    ),
    [i18n.language]
  );

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("resource:crossAccount.name"), link: "/resources/cross-account" },
    {
      name: curAccount?.subAccountName || "",
    },
  ];

  const backToListPage = () => {
    navigate("/resources/cross-account");
  };

  const updateCrossAccountLink = async () => {
    const validateErrorText = validateFBUploadSNSTopicArn(
      curAccount?.subAccountFlbConfUploadingEventTopicArn ?? ""
    );
    setAccountFBUploadSNSArnError(validateErrorText);
    if (validateErrorText) {
      return;
    }
    // Trim All Parameter value
    const toTrimObj: { [key: string]: string } = JSON.parse(
      JSON.stringify(curAccount)
    );
    console.info("toTrimObj:", toTrimObj);
    toTrimObj.subAccountFlbConfUploadingEventTopicArn =
      toTrimObj.subAccountFlbConfUploadingEventTopicArn
        ?.trim()
        ?.replace(/[\t\r]/g, "");

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
        subAccountId: decodeURIComponent(id || ""),
      });
      console.info("resData:", resData);
      const dataAccount: SubAccountLink = resData.data.getSubAccountLink;
      console.info("dataAccount:", dataAccount);
      setCurAccount(dataAccount);
      setCopyAccount(cloneDeep(dataAccount));
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
    <div>
      <div className="lh-main-content">
        <SideMenu />
        <div className="lh-container">
          <div className="lh-content">
            <Breadcrumb list={breadCrumbList} />
            {loadingData ? (
              <LoadingText />
            ) : (
              <div className="m-w-800">
                <PagePanel title={curAccount?.subAccountName || ""}>
                  <HeaderPanel title={t("resource:crossAccount.detail")}>
                    <>
                      {!copyAccount?.subAccountFlbConfUploadingEventTopicArn && (
                        <div className="cross-account mb-10">
                          <Alert
                            content={t(
                              "resource:crossAccount.link.stepOneUpdateTipsDesc"
                            )}
                            type={AlertType.Normal}
                          />
                          <div className="deploy-steps">
                            <div>
                              {t("resource:crossAccount.link.stepOne1")}
                            </div>
                            <div>{`${t(
                              "resource:crossAccount.link.stepOne2"
                            )} ${amplifyConfig.aws_project_region}`}</div>
                            <div>
                              {t("resource:crossAccount.link.stepOne3Update")}
                            </div>
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
                            <div>
                              {t("resource:crossAccount.link.stepOne5")}
                            </div>
                            <div>
                              {t("resource:crossAccount.link.stepOne6")}
                            </div>
                          </div>
                        </div>
                      )}
                    </>

                    <FormItem
                      optionTitle={t("resource:crossAccount.link.accountName")}
                      optionDesc=""
                    >
                      <TextInput
                        readonly
                        value={curAccount?.subAccountName || ""}
                        onChange={(event) => {
                          console.info(event);
                        }}
                      />
                    </FormItem>
                    <FormItem
                      optionTitle={t("resource:crossAccount.link.accountId")}
                      optionDesc=""
                    >
                      <TextInput
                        readonly
                        value={curAccount?.subAccountId || ""}
                        onChange={(event) => {
                          console.info(event);
                        }}
                      />
                    </FormItem>
                    <FormItem
                      optionTitle={t("resource:crossAccount.link.accountRoles")}
                      optionDesc=""
                    >
                      <TextInput
                        readonly
                        value={curAccount?.subAccountRoleArn || ""}
                        onChange={(event) => {
                          console.info(event);
                        }}
                      />
                    </FormItem>
                    <FormItem
                      optionTitle={t("resource:crossAccount.link.installDocs")}
                      optionDesc=""
                    >
                      <TextInput
                        readonly
                        value={curAccount?.agentInstallDoc || ""}
                        onChange={(event) => {
                          console.info(event);
                        }}
                      />
                    </FormItem>
                    <FormItem
                      optionTitle={t("resource:crossAccount.link.configDocs")}
                      optionDesc=""
                    >
                      <TextInput
                        readonly
                        value={curAccount?.agentConfDoc || ""}
                        onChange={(event) => {
                          console.info(event);
                        }}
                      />
                    </FormItem>
                    <FormItem
                      optionTitle={t("resource:crossAccount.link.s3Bucket")}
                      optionDesc=""
                    >
                      <TextInput
                        readonly
                        value={curAccount?.subAccountBucketName || ""}
                        onChange={(event) => {
                          console.info(event);
                        }}
                      />
                    </FormItem>
                    <FormItem
                      optionTitle={t("resource:crossAccount.link.stackId")}
                      optionDesc=""
                    >
                      <TextInput
                        readonly
                        value={curAccount?.subAccountStackId || ""}
                        onChange={(event) => {
                          console.info(event);
                        }}
                      />
                    </FormItem>
                    <FormItem
                      optionTitle={t("resource:crossAccount.link.kmsKey")}
                      optionDesc=""
                    >
                      <TextInput
                        readonly
                        value={curAccount?.subAccountKMSKeyArn || ""}
                        onChange={(event) => {
                          console.info(event);
                        }}
                      />
                    </FormItem>
                    <FormItem
                      optionTitle={t(
                        "resource:crossAccount.link.iamInstanceProfileArn"
                      )}
                      optionDesc=""
                    >
                      <TextInput
                        readonly
                        value={
                          curAccount?.subAccountIamInstanceProfileArn || ""
                        }
                        onChange={(event) => {
                          console.info(event);
                        }}
                      />
                    </FormItem>
                    <FormItem
                      optionTitle={t(
                        "resource:crossAccount.link.fbConfigUploadSNSTopicArn"
                      )}
                      optionDesc=""
                      errorText={accountFBUploadSNSArnError}
                    >
                      <TextInput
                        value={
                          curAccount?.subAccountFlbConfUploadingEventTopicArn ||
                          ""
                        }
                        onChange={(event) => {
                          setAccountFBUploadSNSArnError("");
                          setCurAccount((prev: any) => {
                            return {
                              ...prev,
                              subAccountFlbConfUploadingEventTopicArn:
                                event.target.value,
                            };
                          });
                        }}
                      />
                    </FormItem>
                  </HeaderPanel>
                  <div className="button-action text-right">
                    <Button
                      disabled={loadingSave}
                      btnType="text"
                      onClick={() => {
                        backToListPage();
                      }}
                    >
                      {t("button.cancel")}
                    </Button>
                    <Button
                      loading={loadingSave}
                      btnType="primary"
                      onClick={() => {
                        updateCrossAccountLink();
                      }}
                    >
                      {t("button.save")}
                    </Button>
                  </div>
                </PagePanel>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrossAccountDetail;
