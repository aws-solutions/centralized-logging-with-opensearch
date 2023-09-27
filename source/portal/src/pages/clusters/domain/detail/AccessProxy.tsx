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
import React, { useState } from "react";
import { DomainDetails, StackStatus } from "API";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import CopyText from "components/CopyText";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { buildSGLink, buildSubnetLink, buildVPCLink } from "assets/js/utils";
import Button from "components/Button";
import Modal from "components/Modal";
import { appSyncRequestMutation } from "assets/js/request";
import { deleteProxyForOpenSearch } from "graphql/mutations";
import { useTranslation } from "react-i18next";
import { RootState } from "reducer/reducers";

interface OverviewProps {
  domainInfo: DomainDetails | undefined | null;
  reloadDetailInfo: () => void;
}
const AccessProxy: React.FC<OverviewProps> = ({
  domainInfo,
  reloadDetailInfo,
}: OverviewProps) => {
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const { t } = useTranslation();
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const confirmRemoveNginxProxy = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteProxyForOpenSearch, {
        id: domainInfo?.id,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModal(false);
      reloadDetailInfo();
    } catch (error) {
      setLoadingDelete(false);
      console.error(error);
    }
  };

  return (
    <div>
      <HeaderPanel
        title={t("cluster:detail.proxy.name")}
        action={
          <div>
            {(domainInfo?.proxyStatus === StackStatus.ENABLED ||
              domainInfo?.proxyStatus === StackStatus.ERROR) && (
              <Button
                onClick={() => {
                  setOpenDeleteModal(true);
                }}
              >
                {t("button.delete")}
              </Button>
            )}
          </div>
        }
      >
        {domainInfo?.proxyInput?.vpc ? (
          <div className="flex value-label-span">
            <div className="flex-1">
              <ValueWithLabel label={t("cluster:detail.proxy.domain")}>
                <CopyText text={domainInfo?.proxyInput?.customEndpoint || ""}>
                  {domainInfo?.proxyInput?.customEndpoint || "-"}
                </CopyText>
              </ValueWithLabel>
              <ValueWithLabel label={t("cluster:detail.proxy.publicSubnets")}>
                <div>
                  {domainInfo.proxyInput?.vpc?.publicSubnetIds
                    ?.split(",")
                    .map((element) => {
                      return element ? (
                        <div key={element}>
                          <ExtLink
                            to={buildSubnetLink(
                              amplifyConfig.aws_project_region,
                              element
                            )}
                          >
                            {element}
                          </ExtLink>
                        </div>
                      ) : (
                        ""
                      );
                    })}
                </div>
              </ValueWithLabel>
            </div>
            <div className="flex-1 border-left-c">
              <ValueWithLabel label={t("cluster:detail.proxy.lbDomain")}>
                <CopyText text={domainInfo.proxyALB || ""}>
                  {domainInfo.proxyALB || "-"}
                </CopyText>
              </ValueWithLabel>
              <ValueWithLabel label={t("cluster:detail.proxy.ec2Key")}>
                <CopyText text={domainInfo?.proxyInput?.keyName || ""}>
                  {domainInfo?.proxyInput?.keyName || "-"}
                </CopyText>
              </ValueWithLabel>
            </div>
            <div className="flex-1 border-left-c">
              <ValueWithLabel label={t("cluster:detail.proxy.vpc")}>
                <CopyText text={domainInfo?.proxyInput?.vpc?.vpcId || ""}>
                  <ExtLink
                    to={buildVPCLink(
                      amplifyConfig.aws_project_region,
                      domainInfo?.proxyInput?.vpc?.vpcId || ""
                    )}
                  >
                    {domainInfo?.proxyInput?.vpc?.vpcId || ""}
                  </ExtLink>
                </CopyText>
              </ValueWithLabel>
            </div>
            <div className="flex-1 border-left-c">
              <ValueWithLabel label={t("cluster:detail.proxy.publicSecurity")}>
                <div>
                  <CopyText
                    text={domainInfo?.proxyInput?.vpc?.securityGroupId || ""}
                  >
                    <ExtLink
                      to={buildSGLink(
                        amplifyConfig.aws_project_region,
                        domainInfo?.proxyInput?.vpc?.securityGroupId || ""
                      )}
                    >
                      {domainInfo?.proxyInput?.vpc?.securityGroupId || ""}
                    </ExtLink>
                  </CopyText>
                </div>
              </ValueWithLabel>
            </div>
          </div>
        ) : (
          <div>N/A</div>
        )}
      </HeaderPanel>

      <Modal
        title={t("cluster:detail.proxy.remove")}
        fullWidth={false}
        isOpen={openDeleteModal}
        closeModal={() => {
          setOpenDeleteModal(false);
        }}
        actions={
          <div className="button-action no-pb text-right">
            <Button
              disabled={loadingDelete}
              btnType="text"
              onClick={() => {
                setOpenDeleteModal(false);
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              loading={loadingDelete}
              btnType="primary"
              onClick={() => {
                confirmRemoveNginxProxy();
              }}
            >
              {t("button.delete")}
            </Button>
          </div>
        }
      >
        <div className="modal-content">
          {t("cluster:detail.proxy.removeTips")}
          {"? "}
        </div>
      </Modal>
    </div>
  );
};

export default AccessProxy;
