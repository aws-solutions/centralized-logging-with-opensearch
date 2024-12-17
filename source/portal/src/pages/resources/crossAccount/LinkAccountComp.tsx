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

import { displayI18NMessage } from "assets/js/utils";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import React from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import {
  accountIdChanged,
  accountNameChanged,
  configDocChanged,
  configDocWindowsChanged,
  installDocChanged,
  installDocWindowsChanged,
  instanceProfileChanged,
  kmsArnChanged,
  roleArnChanged,
  s3BucketChanged,
  stackIdChanged,
  statusCheckDocChanged,
} from "reducer/linkMemberAccount";
import { RootState } from "reducer/reducers";
import { AppDispatch } from "reducer/store";

interface LinkAccountCompProps {
  isEdit?: boolean;
}

const LinkAccountComp: React.FC<LinkAccountCompProps> = (
  props: LinkAccountCompProps
) => {
  const { t } = useTranslation();
  const { isEdit } = props;
  const memberAccount = useSelector((state: RootState) => state.memberAccount);
  const dispatch = useDispatch<AppDispatch>();
  return (
    <div>
      <FormItem
        optionTitle={t("resource:crossAccount.link.accountName")}
        optionDesc={t("resource:crossAccount.link.accountNameDesc")}
        errorText={displayI18NMessage(memberAccount.nameError)}
      >
        <TextInput
          disabled={isEdit}
          value={memberAccount.data.subAccountName}
          onChange={(event) => {
            dispatch(accountNameChanged(event.target.value));
          }}
        />
      </FormItem>
      <FormItem
        optionTitle={t("resource:crossAccount.link.accountId")}
        optionDesc={t("resource:crossAccount.link.accountIdDesc")}
        errorText={displayI18NMessage(memberAccount.idError)}
      >
        <TextInput
          disabled={isEdit}
          value={memberAccount.data.subAccountId}
          onChange={(event) => {
            dispatch(accountIdChanged(event.target.value));
          }}
        />
      </FormItem>
      <FormItem
        optionTitle={t("resource:crossAccount.link.accountRoles")}
        optionDesc={t("resource:crossAccount.link.accountRolesDesc")}
        errorText={displayI18NMessage(memberAccount.roleArnError)}
      >
        <TextInput
          disabled={isEdit}
          value={memberAccount.data.subAccountRoleArn}
          onChange={(event) => {
            dispatch(roleArnChanged(event.target.value));
          }}
        />
      </FormItem>
      <FormItem
        optionTitle={t("resource:crossAccount.link.installDocs")}
        optionDesc={t("resource:crossAccount.link.installDocsDesc")}
        errorText={displayI18NMessage(memberAccount.installDocError)}
      >
        <TextInput
          value={memberAccount.data.agentInstallDoc}
          onChange={(event) => {
            dispatch(installDocChanged(event.target.value));
          }}
        />
      </FormItem>
      <FormItem
        optionTitle={t("resource:crossAccount.link.configDocs")}
        optionDesc={t("resource:crossAccount.link.configDocsDesc")}
        errorText={displayI18NMessage(memberAccount.configDocError)}
      >
        <TextInput
          disabled={isEdit}
          value={memberAccount.data.agentConfDoc}
          onChange={(event) => {
            dispatch(configDocChanged(event.target.value));
          }}
        />
      </FormItem>
      <FormItem
        optionTitle={t("resource:crossAccount.link.installDocsWindows")}
        optionDesc={t("resource:crossAccount.link.installDocsDescWindows")}
        errorText={displayI18NMessage(memberAccount.installDocWindowsError)}
      >
        <TextInput
          value={memberAccount.data.windowsAgentInstallDoc}
          onChange={(event) => {
            dispatch(installDocWindowsChanged(event.target.value));
          }}
        />
      </FormItem>
      <FormItem
        optionTitle={t("resource:crossAccount.link.configDocsWindows")}
        optionDesc={t("resource:crossAccount.link.configDocsDescWindows")}
        errorText={displayI18NMessage(memberAccount.configDocWindowsError)}
      >
        <TextInput
          value={memberAccount.data.windowsAgentConfDoc}
          onChange={(event) => {
            dispatch(configDocWindowsChanged(event.target.value));
          }}
        />
      </FormItem>
      <FormItem
        optionTitle={t("resource:crossAccount.link.statusCheckDoc")}
        optionDesc={t("resource:crossAccount.link.statusCheckDocDesc")}
        errorText={displayI18NMessage(memberAccount.statusCheckDocError)}
      >
        <TextInput
          value={memberAccount.data.agentStatusCheckDoc}
          onChange={(event) => {
            dispatch(statusCheckDocChanged(event.target.value));
          }}
        />
      </FormItem>
      <FormItem
        optionTitle={t("resource:crossAccount.link.s3Bucket")}
        optionDesc={t("resource:crossAccount.link.s3BucketDesc")}
        errorText={displayI18NMessage(memberAccount.s3BucketError)}
      >
        <TextInput
          disabled={isEdit}
          value={memberAccount.data.subAccountBucketName}
          onChange={(event) => {
            dispatch(s3BucketChanged(event.target.value));
          }}
        />
      </FormItem>
      <FormItem
        optionTitle={t("resource:crossAccount.link.stackId")}
        optionDesc={t("resource:crossAccount.link.stackIdDesc")}
        errorText={displayI18NMessage(memberAccount.stackIdError)}
      >
        <TextInput
          disabled={isEdit}
          value={memberAccount.data.subAccountStackId}
          onChange={(event) => {
            dispatch(stackIdChanged(event.target.value));
          }}
        />
      </FormItem>

      <FormItem
        optionTitle={t("resource:crossAccount.link.kmsKey")}
        optionDesc={t("resource:crossAccount.link.kmsKeyDesc")}
        errorText={displayI18NMessage(memberAccount.kmsArnError)}
      >
        <TextInput
          disabled={isEdit}
          value={memberAccount.data.subAccountKMSKeyArn}
          onChange={(event) => {
            dispatch(kmsArnChanged(event.target.value));
          }}
        />
      </FormItem>

      <FormItem
        optionTitle={t("resource:crossAccount.link.iamInstanceProfileArn")}
        optionDesc={t("resource:crossAccount.link.iamInstanceProfileArnDesc")}
        errorText={displayI18NMessage(memberAccount.instanceProfileError)}
      >
        <TextInput
          disabled={isEdit}
          value={memberAccount.data.subAccountIamInstanceProfileArn}
          onChange={(event) => {
            dispatch(instanceProfileChanged(event.target.value));
          }}
        />
      </FormItem>
    </div>
  );
};

export default LinkAccountComp;
