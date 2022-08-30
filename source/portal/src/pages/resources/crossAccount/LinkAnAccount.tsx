/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React, { useState } from "react";
import Breadcrumb from "components/Breadcrumb";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import Button from "components/Button";
import { CreateSubAccountLinkMutationVariables } from "API";
import { useHistory } from "react-router-dom";
import HelpPanel from "components/HelpPanel";
import { appSyncRequestMutation } from "assets/js/request";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import { createSubAccountLink } from "graphql/mutations";
import CopyText from "components/CopyText";
import { AmplifyConfigType } from "types";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import {
  buildCrossAccountTemplateLink,
  checkCrossAccountValid,
  CrossAccountFiled,
} from "assets/js/utils";

const LinkAnAccount: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("resource:crossAccount.name"), link: "/resources/cross-account" },
    { name: t("resource:crossAccount.link.name") },
  ];

  const [linkAccountInfo, setLinkAccountInfo] =
    useState<CreateSubAccountLinkMutationVariables>({
      subAccountId: "",
      subAccountName: "",
      subAccountRoleArn: "",
      agentInstallDoc: "",
      agentConfDoc: "",
      subAccountBucketName: "",
      subAccountStackId: "",
      subAccountKMSKeyArn: "",
      region: amplifyConfig.aws_project_region,
      tags: [],
    });

  const [validateError, setValidateError] = useState({
    accountNameEmpty: false,
    accountIdEmpty: false,
    accountIdFormatError: false,
    accountRoleEmpty: false,
    accountRoleFormatError: false,
    installDocEmpty: false,
    installDocFormatError: false,
    configDocEmpty: false,
    configDocFormatError: false,
    s3BucketEmpty: false,
    s3BucketFormatError: false,
    stackIdEmpty: false,
    stackIdFormatError: false,
    stackRegionError: false,
    stackKMSArnEmpty: false,
    stackKMSARnFormatError: false,
  });

  const [loadingCreate, setLoadingCreate] = useState(false);

  const validateStackARN = (stackId: string) => {
    if (stackId) {
      const stackPartArr = stackId.split(":");
      if (stackPartArr.length > 4) {
        return stackPartArr[3] === amplifyConfig.aws_project_region;
      }
    }
    return false;
  };

  const createCrossAccountLink = async () => {
    // Check Account Name
    if (!linkAccountInfo.subAccountName?.trim()) {
      setValidateError((prev) => {
        return {
          ...prev,
          accountNameEmpty: true,
        };
      });
      return;
    }

    // Check Account Id
    if (!linkAccountInfo.subAccountId?.trim()) {
      setValidateError((prev) => {
        return {
          ...prev,
          accountIdEmpty: true,
        };
      });
      return;
    }

    // Check Account Id Format
    if (
      !checkCrossAccountValid(
        CrossAccountFiled.ACCOUNT_ID,
        linkAccountInfo.subAccountId?.trim()
      )
    ) {
      setValidateError((prev) => {
        return {
          ...prev,
          accountIdFormatError: true,
        };
      });
      return;
    }

    // Check Account Role
    if (!linkAccountInfo.subAccountRoleArn?.trim()) {
      setValidateError((prev) => {
        return {
          ...prev,
          accountRoleEmpty: true,
        };
      });
      return;
    }

    // Check Account Role Format
    if (
      !checkCrossAccountValid(
        CrossAccountFiled.CROSS_ACCOUNT_ROLE,
        linkAccountInfo.subAccountRoleArn?.trim(),
        linkAccountInfo.subAccountId
      )
    ) {
      setValidateError((prev) => {
        return {
          ...prev,
          accountRoleFormatError: true,
        };
      });
      return;
    }

    // Check Install Document
    if (!linkAccountInfo.agentInstallDoc?.trim()) {
      setValidateError((prev) => {
        return {
          ...prev,
          installDocEmpty: true,
        };
      });
      return;
    }

    // Check Install Document Format
    if (
      !checkCrossAccountValid(
        CrossAccountFiled.INSATALL_DOC,
        linkAccountInfo.agentInstallDoc?.trim()
      )
    ) {
      setValidateError((prev) => {
        return {
          ...prev,
          installDocFormatError: true,
        };
      });
      return;
    }

    // Check Config Document
    if (!linkAccountInfo.agentConfDoc?.trim()) {
      setValidateError((prev) => {
        return {
          ...prev,
          configDocEmpty: true,
        };
      });
      return;
    }

    // Check Config Document Format
    if (
      !checkCrossAccountValid(
        CrossAccountFiled.CONFIG_DOC,
        linkAccountInfo.agentConfDoc?.trim()
      )
    ) {
      setValidateError((prev) => {
        return {
          ...prev,
          configDocFormatError: true,
        };
      });
      return;
    }

    // Check S3 Bucket
    if (!linkAccountInfo.subAccountBucketName?.trim()) {
      setValidateError((prev) => {
        return {
          ...prev,
          s3BucketEmpty: true,
        };
      });
      return;
    }

    // Check S3 Format
    if (
      !checkCrossAccountValid(
        CrossAccountFiled.S3_BUCKET,
        linkAccountInfo.subAccountBucketName?.trim()
      )
    ) {
      setValidateError((prev) => {
        return {
          ...prev,
          s3BucketFormatError: true,
        };
      });
      return;
    }

    // Check Stack ID
    if (!linkAccountInfo.subAccountStackId?.trim()) {
      setValidateError((prev) => {
        return {
          ...prev,
          stackIdEmpty: true,
        };
      });
      return;
    }

    // Check Stack Id Format
    if (
      !checkCrossAccountValid(
        CrossAccountFiled.STACK_ID,
        linkAccountInfo.subAccountStackId?.trim(),
        linkAccountInfo.subAccountId
      )
    ) {
      setValidateError((prev) => {
        return {
          ...prev,
          stackIdFormatError: true,
        };
      });
      return;
    }

    if (!validateStackARN(linkAccountInfo.subAccountStackId?.trim())) {
      setValidateError((prev) => {
        return {
          ...prev,
          stackRegionError: true,
        };
      });
      return;
    }

    // Check KMS Key
    if (!linkAccountInfo.subAccountKMSKeyArn?.trim()) {
      setValidateError((prev) => {
        return {
          ...prev,
          stackKMSArnEmpty: true,
        };
      });
      return;
    }

    // Check KMS Key Format
    if (
      !checkCrossAccountValid(
        CrossAccountFiled.KMS_KEY,
        linkAccountInfo.subAccountKMSKeyArn?.trim(),
        linkAccountInfo.subAccountId
      )
    ) {
      setValidateError((prev) => {
        return {
          ...prev,
          stackKMSARnFormatError: true,
        };
      });
      return;
    }

    // Trim All Parameter value
    const toTrimObj: { [key: string]: string } = JSON.parse(
      JSON.stringify(linkAccountInfo)
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
      history.push({
        pathname: "/resources/cross-account",
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  const backToListPage = () => {
    history.push({
      pathname: "/resources/cross-account",
    });
  };

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
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
                          amplifyConfig.loghub_version
                        )}
                      >
                        {""}
                      </CopyText>
                      <pre className="ml-20">
                        <code>
                          {buildCrossAccountTemplateLink(
                            amplifyConfig.aws_appsync_region,
                            amplifyConfig.loghub_version
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
                <FormItem
                  optionTitle={t("resource:crossAccount.link.accountName")}
                  optionDesc={t("resource:crossAccount.link.accountNameDesc")}
                  errorText={
                    validateError.accountNameEmpty
                      ? t("resource:crossAccount.link.inputAccountName")
                      : ""
                  }
                >
                  <TextInput
                    value={linkAccountInfo.subAccountName || ""}
                    onChange={(event) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountName: event.target.value,
                        };
                      });
                      setValidateError((prev) => {
                        return {
                          ...prev,
                          accountNameEmpty: false,
                        };
                      });
                    }}
                  />
                </FormItem>
                <FormItem
                  optionTitle={t("resource:crossAccount.link.accountId")}
                  optionDesc={t("resource:crossAccount.link.accountIdDesc")}
                  errorText={
                    validateError.accountIdEmpty
                      ? t("resource:crossAccount.link.inputAccountId")
                      : validateError.accountIdFormatError
                      ? t("resource:crossAccount.link.accountIdFormatError")
                      : ""
                  }
                >
                  <TextInput
                    value={linkAccountInfo.subAccountId || ""}
                    onChange={(event) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountId: event.target.value,
                        };
                      });
                      setValidateError((prev) => {
                        return {
                          ...prev,
                          accountIdEmpty: false,
                          accountIdFormatError: false,
                        };
                      });
                    }}
                  />
                </FormItem>
                <FormItem
                  optionTitle={t("resource:crossAccount.link.accountRoles")}
                  optionDesc={t("resource:crossAccount.link.accountRolesDesc")}
                  errorText={
                    validateError.accountRoleEmpty
                      ? t("resource:crossAccount.link.inputAccountRoles")
                      : validateError.accountRoleFormatError
                      ? t("resource:crossAccount.link.accountRolesFormatError")
                      : ""
                  }
                >
                  <TextInput
                    value={linkAccountInfo.subAccountRoleArn || ""}
                    onChange={(event) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountRoleArn: event.target.value,
                        };
                      });
                      setValidateError((prev) => {
                        return {
                          ...prev,
                          accountRoleEmpty: false,
                          accountRoleFormatError: false,
                        };
                      });
                    }}
                  />
                </FormItem>
                <FormItem
                  optionTitle={t("resource:crossAccount.link.installDocs")}
                  optionDesc={t("resource:crossAccount.link.installDocsDesc")}
                  errorText={
                    validateError.installDocEmpty
                      ? t("resource:crossAccount.link.installDocsDesc")
                      : validateError.installDocFormatError
                      ? t("resource:crossAccount.link.installDocsFormatError")
                      : ""
                  }
                >
                  <TextInput
                    value={linkAccountInfo.agentInstallDoc || ""}
                    onChange={(event) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          agentInstallDoc: event.target.value,
                        };
                      });
                      setValidateError((prev) => {
                        return {
                          ...prev,
                          installDocEmpty: false,
                          installDocFormatError: false,
                        };
                      });
                    }}
                  />
                </FormItem>
                <FormItem
                  optionTitle={t("resource:crossAccount.link.configDocs")}
                  optionDesc={t("resource:crossAccount.link.configDocsDesc")}
                  errorText={
                    validateError.configDocEmpty
                      ? t("resource:crossAccount.link.inputConfigDocs")
                      : validateError.configDocFormatError
                      ? t("resource:crossAccount.link.configDocsFormatError")
                      : ""
                  }
                >
                  <TextInput
                    value={linkAccountInfo.agentConfDoc || ""}
                    onChange={(event) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          agentConfDoc: event.target.value,
                        };
                      });
                      setValidateError((prev) => {
                        return {
                          ...prev,
                          configDocEmpty: false,
                          configDocFormatError: false,
                        };
                      });
                    }}
                  />
                </FormItem>
                <FormItem
                  optionTitle={t("resource:crossAccount.link.s3Bucket")}
                  optionDesc={t("resource:crossAccount.link.s3BucketDesc")}
                  errorText={
                    validateError.s3BucketEmpty
                      ? t("resource:crossAccount.link.inputS3Bucket")
                      : validateError.s3BucketFormatError
                      ? t("resource:crossAccount.link.s3BucketFormatError")
                      : ""
                  }
                >
                  <TextInput
                    value={linkAccountInfo.subAccountBucketName || ""}
                    onChange={(event) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountBucketName: event.target.value,
                        };
                      });
                      setValidateError((prev) => {
                        return {
                          ...prev,
                          s3BucketEmpty: false,
                          s3BucketFormatError: false,
                        };
                      });
                    }}
                  />
                </FormItem>
                <FormItem
                  optionTitle={t("resource:crossAccount.link.stackId")}
                  optionDesc={t("resource:crossAccount.link.stackIdDesc")}
                  errorText={
                    validateError.stackIdEmpty
                      ? t("resource:crossAccount.link.inputStackId")
                      : validateError.stackRegionError
                      ? t("resource:crossAccount.link.stackIdSameRegion")
                      : validateError.stackIdFormatError
                      ? t("resource:crossAccount.link.stackIdFormatError")
                      : ""
                  }
                >
                  <TextInput
                    value={linkAccountInfo.subAccountStackId || ""}
                    onChange={(event) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountStackId: event.target.value,
                        };
                      });
                      setValidateError((prev) => {
                        return {
                          ...prev,
                          stackIdEmpty: false,
                          stackIdFormatError: false,
                          stackRegionError: false,
                        };
                      });
                    }}
                  />
                </FormItem>

                <FormItem
                  optionTitle={t("resource:crossAccount.link.kmsKey")}
                  optionDesc={t("resource:crossAccount.link.kmsKeyDesc")}
                  errorText={
                    validateError.stackKMSArnEmpty
                      ? t("resource:crossAccount.link.inputKmsKey")
                      : validateError.stackKMSARnFormatError
                      ? t("resource:crossAccount.link.kmsKeyFormatError")
                      : ""
                  }
                >
                  <TextInput
                    value={linkAccountInfo.subAccountKMSKeyArn || ""}
                    onChange={(event) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountKMSKeyArn: event.target.value,
                        };
                      });
                      setValidateError((prev) => {
                        return {
                          ...prev,
                          stackKMSArnEmpty: false,
                          stackKMSARnFormatError: false,
                        };
                      });
                    }}
                  />
                </FormItem>
              </HeaderPanel>
              <div className="button-action text-right">
                <Button
                  disabled={loadingCreate}
                  btnType="text"
                  onClick={() => {
                    backToListPage();
                  }}
                >
                  {t("button.cancel")}
                </Button>
                <Button
                  loading={loadingCreate}
                  btnType="primary"
                  onClick={() => {
                    createCrossAccountLink();
                  }}
                >
                  {t("button.link")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default LinkAnAccount;
