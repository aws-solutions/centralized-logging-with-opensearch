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
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { appSyncRequestQuery } from "assets/js/request";
import { getSubAccountLink } from "graphql/queries";
import LoadingText from "components/LoadingText";
import { SubAccountLink } from "API";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import { handleErrorMessage } from "assets/js/alert";

const CrossAccountDetail: React.FC = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [curAccount, setCurAccount] = useState<SubAccountLink>();
  const [loadingData, setLoadingData] = useState(true);
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("resource:crossAccount.name"), link: "/resources/cross-account" },
    {
      name: curAccount?.subAccountName || "",
    },
  ];

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
                  </HeaderPanel>
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
