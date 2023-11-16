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
import React, { useCallback, useState } from "react";
import Breadcrumb from "components/Breadcrumb";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import Button from "components/Button";
import { CreateSubAccountLinkMutationVariables } from "API";
import { useNavigate } from "react-router-dom";
import HelpPanel from "components/HelpPanel";
import { appSyncRequestMutation } from "assets/js/request";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import { createSubAccountLink } from "graphql/mutations";
import CopyText from "components/CopyText";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import {
  buildCrossAccountTemplateLink,
  FieldValidator,
  pipFieldValidator,
  validateRequiredText,
  validateWithRegex,
  validateS3BucketName,
  createFieldValidator,
} from "assets/js/utils";
import { handleErrorMessage } from "assets/js/alert";
import { RootState } from "reducer/reducers";

let validateAccountName: FieldValidator<string>;
let validateAccountId: FieldValidator<string>;
let validateAccountRole: FieldValidator<string>;
let validateInstallDoc: FieldValidator<string>;
let validateConfigDoc: FieldValidator<string>;
let validateS3Bucket: FieldValidator<string>;
let validateStackId: FieldValidator<string>;
let validateKMSArn: FieldValidator<string>;
let validateInstanceProfileArn: FieldValidator<string>;
let validateFBUploadSNSTopicArn: FieldValidator<string>;

export const validateLinedAccount = (
  state: CreateSubAccountLinkMutationVariables
) =>
  validateAccountName(state.subAccountName) === "" &&
  validateAccountId(state.subAccountId) === "" &&
  validateAccountRole(state.subAccountRoleArn) === "" &&
  validateInstallDoc(state.agentInstallDoc) === "" &&
  validateConfigDoc(state.agentConfDoc) === "" &&
  validateS3Bucket(state.subAccountBucketName) === "" &&
  validateStackId(state.subAccountStackId) === "" &&
  validateKMSArn(state.subAccountKMSKeyArn) === "" &&
  validateInstanceProfileArn(state.subAccountIamInstanceProfileArn) === "" &&
  validateFBUploadSNSTopicArn(state.subAccountFlbConfUploadingEventTopicArn) ===
    "";

const LinkAnAccount: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("resource:crossAccount.name"), link: "/resources/cross-account" },
    { name: t("resource:crossAccount.link.name") },
  ];

  const validateStackARN = (stackId: string) => {
    if (stackId) {
      const stackPartArr = stackId.split(":");
      if (stackPartArr.length > 4) {
        return stackPartArr[3] === amplifyConfig.aws_project_region;
      }
    }
    return false;
  };

  const validateStackInSameRegion = createFieldValidator((text: string) =>
    validateStackARN(text)
  );

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
      subAccountIamInstanceProfileArn: "", // New
      subAccountFlbConfUploadingEventTopicArn: "",
      tags: [],
    });

  const [accountNameError, setAccountNameError] = useState("");
  const [accountIdError, setAccountIdError] = useState("");
  const [accountRoleArnError, setAccountRoleArnError] = useState("");
  const [accountInstallDocError, setAccountInstallDocError] = useState("");
  const [accountConfigDocError, setAccountConfigDocError] = useState("");
  const [accountS3BucketError, setAccountS3BucketError] = useState("");
  const [accountStackIdError, setAccountStackIdError] = useState("");
  const [accountKMSArnError, setAccountKMSArnError] = useState("");
  const [accountInstanceProfileError, setAccountInstanceProfileError] =
    useState("");
  const [accountFBUploadSNSArnError, setAccountFBUploadSNSArnError] =
    useState("");

  validateAccountName = useCallback(
    validateRequiredText(t("resource:crossAccount.link.inputAccountName")),
    [i18n.language]
  );

  validateAccountId = useCallback(
    pipFieldValidator(
      validateRequiredText(t("resource:crossAccount.link.inputAccountId")),
      validateWithRegex(/^\d{12}$/)(
        t("resource:crossAccount.link.accountIdFormatError")
      )
    ),
    [i18n.language]
  );

  validateAccountRole = useCallback(
    pipFieldValidator(
      validateRequiredText(t("resource:crossAccount.link.inputAccountRoles")),
      validateWithRegex(
        new RegExp(
          `^arn:(aws-cn|aws):iam::${
            linkAccountInfo.subAccountId || "\\d{12}"
          }:role\\/.+`
        )
      )(t("resource:crossAccount.link.accountRolesFormatError"))
    ),
    [i18n.language]
  );

  validateInstallDoc = useCallback(
    pipFieldValidator(
      validateRequiredText(t("resource:crossAccount.link.installDocsDesc")),
      validateWithRegex(/.*FluentBitDocumentInstallation-\w+/)(
        t("resource:crossAccount.link.installDocsFormatError")
      )
    ),
    [i18n.language]
  );

  validateConfigDoc = useCallback(
    pipFieldValidator(
      validateRequiredText(t("resource:crossAccount.link.inputConfigDocs")),
      validateWithRegex(/.*FluentBitConfigDownloading-\w+/)(
        t("resource:crossAccount.link.configDocsFormatError")
      )
    ),
    [i18n.language]
  );

  validateS3Bucket = useCallback(
    pipFieldValidator(
      validateRequiredText(t("resource:crossAccount.link.inputS3Bucket")),
      validateS3BucketName(t("resource:crossAccount.link.s3BucketFormatError"))
    ),
    [i18n.language]
  );

  validateStackId = useCallback(
    pipFieldValidator(
      validateRequiredText(t("resource:crossAccount.link.inputStackId")),
      validateStackInSameRegion(
        t("resource:crossAccount.link.stackIdSameRegion")
      ),
      validateWithRegex(
        new RegExp(
          `^arn:(aws-cn|aws):cloudformation:\\w+-\\w+-\\d+:${
            linkAccountInfo.subAccountId || "\\d{12}"
          }:stack\\/\\S+`
        )
      )(t("resource:crossAccount.link.stackIdFormatError"))
    ),
    [i18n.language]
  );

  validateKMSArn = useCallback(
    pipFieldValidator(
      validateRequiredText(t("resource:crossAccount.link.inputKmsKey")),
      validateWithRegex(
        new RegExp(
          `^arn:(aws-cn|aws):kms:\\w+-\\w+-\\d:${
            linkAccountInfo.subAccountId || "\\d{12}"
          }:key\\/\\S+`
        )
      )(t("resource:crossAccount.link.kmsKeyFormatError"))
    ),
    [i18n.language]
  );

  validateInstanceProfileArn = useCallback(
    pipFieldValidator(
      validateRequiredText(
        t("resource:crossAccount.link.inputIamInstanceProfileArn")
      ),
      validateWithRegex(
        new RegExp(
          `^arn:(aws-cn|aws):iam::${
            linkAccountInfo.subAccountId || "\\d{12}"
          }:instance-profile\\/.+`
        )
      )(t("resource:crossAccount.link.iamInstanceProfileArnFormatError"))
    ),
    [i18n.language]
  );

  validateFBUploadSNSTopicArn = useCallback(
    pipFieldValidator(
      validateRequiredText(
        t("resource:crossAccount.link.inputFBConfigUploadSNSTopicArn")
      ),
      validateWithRegex(
        new RegExp(
          `^arn:(aws-cn|aws):sns:\\w+-\\w+-\\d:${
            linkAccountInfo.subAccountId || "\\d{12}"
          }:.+`
        )
      )(t("resource:crossAccount.link.fbConfigUploadSNSTopicArnFormatError"))
    ),
    [i18n.language]
  );

  const [loadingCreate, setLoadingCreate] = useState(false);

  const createCrossAccountLink = async () => {
    const isLinkedAccountValid = validateLinedAccount(linkAccountInfo);
    setAccountNameError(validateAccountName(linkAccountInfo.subAccountName));
    setAccountIdError(validateAccountId(linkAccountInfo.subAccountId));
    setAccountRoleArnError(
      validateAccountRole(linkAccountInfo.subAccountRoleArn)
    );
    setAccountInstallDocError(
      validateInstallDoc(linkAccountInfo.agentInstallDoc)
    );
    setAccountConfigDocError(validateConfigDoc(linkAccountInfo.agentConfDoc));
    setAccountS3BucketError(
      validateS3Bucket(linkAccountInfo.subAccountBucketName)
    );
    setAccountStackIdError(validateStackId(linkAccountInfo.subAccountStackId));
    setAccountKMSArnError(validateKMSArn(linkAccountInfo.subAccountKMSKeyArn));
    setAccountInstanceProfileError(
      validateInstanceProfileArn(
        linkAccountInfo.subAccountIamInstanceProfileArn
      )
    );
    setAccountFBUploadSNSArnError(
      validateFBUploadSNSTopicArn(
        linkAccountInfo.subAccountFlbConfUploadingEventTopicArn
      )
    );
    if (!isLinkedAccountValid) {
      return false;
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
                <FormItem
                  optionTitle={t("resource:crossAccount.link.accountName")}
                  optionDesc={t("resource:crossAccount.link.accountNameDesc")}
                  errorText={accountNameError}
                >
                  <TextInput
                    value={linkAccountInfo.subAccountName || ""}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountName: event.target.value,
                        };
                      });
                      setAccountNameError(
                        validateAccountName(event.target.value)
                      );
                    }}
                  />
                </FormItem>
                <FormItem
                  optionTitle={t("resource:crossAccount.link.accountId")}
                  optionDesc={t("resource:crossAccount.link.accountIdDesc")}
                  errorText={accountIdError}
                >
                  <TextInput
                    value={linkAccountInfo.subAccountId || ""}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountId: event.target.value,
                        };
                      });
                      setAccountIdError(validateAccountId(event.target.value));
                    }}
                  />
                </FormItem>
                <FormItem
                  optionTitle={t("resource:crossAccount.link.accountRoles")}
                  optionDesc={t("resource:crossAccount.link.accountRolesDesc")}
                  errorText={accountRoleArnError}
                >
                  <TextInput
                    value={linkAccountInfo.subAccountRoleArn || ""}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountRoleArn: event.target.value,
                        };
                      });
                      setAccountRoleArnError(
                        validateAccountRole(event.target.value)
                      );
                    }}
                  />
                </FormItem>
                <FormItem
                  optionTitle={t("resource:crossAccount.link.installDocs")}
                  optionDesc={t("resource:crossAccount.link.installDocsDesc")}
                  errorText={accountInstallDocError}
                >
                  <TextInput
                    value={linkAccountInfo.agentInstallDoc || ""}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          agentInstallDoc: event.target.value,
                        };
                      });
                      setAccountInstallDocError(
                        validateInstallDoc(event.target.value)
                      );
                    }}
                  />
                </FormItem>
                <FormItem
                  optionTitle={t("resource:crossAccount.link.configDocs")}
                  optionDesc={t("resource:crossAccount.link.configDocsDesc")}
                  errorText={accountConfigDocError}
                >
                  <TextInput
                    value={linkAccountInfo.agentConfDoc || ""}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          agentConfDoc: event.target.value,
                        };
                      });
                      setAccountConfigDocError(
                        validateConfigDoc(event.target.value)
                      );
                    }}
                  />
                </FormItem>
                <FormItem
                  optionTitle={t("resource:crossAccount.link.s3Bucket")}
                  optionDesc={t("resource:crossAccount.link.s3BucketDesc")}
                  errorText={accountS3BucketError}
                >
                  <TextInput
                    value={linkAccountInfo.subAccountBucketName || ""}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountBucketName: event.target.value,
                        };
                      });
                      setAccountS3BucketError(
                        validateS3Bucket(event.target.value)
                      );
                    }}
                  />
                </FormItem>
                <FormItem
                  optionTitle={t("resource:crossAccount.link.stackId")}
                  optionDesc={t("resource:crossAccount.link.stackIdDesc")}
                  errorText={accountStackIdError}
                >
                  <TextInput
                    value={linkAccountInfo.subAccountStackId || ""}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountStackId: event.target.value,
                        };
                      });
                      setAccountStackIdError(
                        validateStackId(event.target.value)
                      );
                    }}
                  />
                </FormItem>

                <FormItem
                  optionTitle={t("resource:crossAccount.link.kmsKey")}
                  optionDesc={t("resource:crossAccount.link.kmsKeyDesc")}
                  errorText={accountKMSArnError}
                >
                  <TextInput
                    value={linkAccountInfo.subAccountKMSKeyArn || ""}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountKMSKeyArn: event.target.value,
                        };
                      });
                      setAccountKMSArnError(validateKMSArn(event.target.value));
                    }}
                  />
                </FormItem>

                <FormItem
                  optionTitle={t(
                    "resource:crossAccount.link.iamInstanceProfileArn"
                  )}
                  optionDesc={t(
                    "resource:crossAccount.link.iamInstanceProfileArnDesc"
                  )}
                  errorText={accountInstanceProfileError}
                >
                  <TextInput
                    value={
                      linkAccountInfo.subAccountIamInstanceProfileArn || ""
                    }
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountIamInstanceProfileArn: event.target.value,
                        };
                      });
                      setAccountInstanceProfileError(
                        validateInstanceProfileArn(event.target.value)
                      );
                    }}
                  />
                </FormItem>

                <FormItem
                  optionTitle={t(
                    "resource:crossAccount.link.fbConfigUploadSNSTopicArn"
                  )}
                  optionDesc={t(
                    "resource:crossAccount.link.fbConfigUploadSNSTopicArnDesc"
                  )}
                  errorText={accountFBUploadSNSArnError}
                >
                  <TextInput
                    value={
                      linkAccountInfo.subAccountFlbConfUploadingEventTopicArn ||
                      ""
                    }
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setLinkAccountInfo((prev) => {
                        return {
                          ...prev,
                          subAccountFlbConfUploadingEventTopicArn:
                            event.target.value,
                        };
                      });
                      setAccountFBUploadSNSArnError(
                        validateFBUploadSNSTopicArn(event.target.value)
                      );
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
