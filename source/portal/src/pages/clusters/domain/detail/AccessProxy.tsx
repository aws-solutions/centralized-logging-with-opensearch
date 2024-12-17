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
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import {
  buildSGLink,
  buildSubnetLink,
  buildVPCLink,
  defaultStr,
} from "assets/js/utils";
import Button from "components/Button";
import Modal from "components/Modal";
import { appSyncRequestMutation } from "assets/js/request";
import { deleteProxyForOpenSearch } from "graphql/mutations";
import { useTranslation } from "react-i18next";
import { RootState } from "reducer/reducers";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";

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
    }
  };

  if (!domainInfo?.proxyInput?.vpc) {
    return (
      <HeaderPanel title={t("cluster:detail.proxy.name")}>
        <div>N/A</div>
      </HeaderPanel>
    );
  }

  return (
    <div>
      <HeaderWithValueLabel
        headerTitle={t("cluster:detail.proxy.name")}
        action={
          <div>
            {(domainInfo?.proxyStatus === StackStatus.ENABLED ||
              domainInfo?.proxyStatus === StackStatus.ERROR) && (
              <Button
                data-testid="delete-proxy-button"
                onClick={() => {
                  setOpenDeleteModal(true);
                }}
              >
                {t("button.delete")}
              </Button>
            )}
          </div>
        }
        numberOfColumns={4}
        dataList={[
          {
            label: t("cluster:detail.proxy.domain"),
            data: defaultStr(domainInfo?.proxyInput?.customEndpoint, "-"),
          },
          {
            label: t("cluster:detail.proxy.lbDomain"),
            data: defaultStr(domainInfo?.proxyALB, "-"),
          },
          {
            label: t("cluster:detail.proxy.vpc"),
            data: (
              <ExtLink
                to={buildVPCLink(
                  amplifyConfig.aws_project_region,
                  defaultStr(domainInfo?.proxyInput?.vpc?.vpcId)
                )}
              >
                {defaultStr(domainInfo?.proxyInput?.vpc?.vpcId)}
              </ExtLink>
            ),
          },
          {
            label: t("cluster:detail.proxy.publicSecurity"),
            data: (
              <ExtLink
                to={buildSGLink(
                  amplifyConfig.aws_project_region,
                  defaultStr(domainInfo?.proxyInput?.vpc?.securityGroupId)
                )}
              >
                {defaultStr(domainInfo?.proxyInput?.vpc?.securityGroupId)}
              </ExtLink>
            ),
          },
          {
            label: t("cluster:detail.proxy.instanceType"),
            data: defaultStr(domainInfo?.proxyInput?.proxyInstanceType, "-"),
          },
          {
            label: t("cluster:detail.proxy.numberOfInstances"),
            data: defaultStr(domainInfo?.proxyInput?.proxyInstanceNumber, "-"),
          },
          {
            label: t("cluster:detail.proxy.ec2Key"),
            data: defaultStr(domainInfo?.proxyInput?.keyName, "-"),
          },
          {
            label: t("cluster:detail.proxy.publicSubnets"),
            data: (
              <div>
                {domainInfo?.proxyInput?.vpc?.publicSubnetIds
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
            ),
          },
        ]}
      />

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
              data-testid="cancel-delete-button"
              disabled={loadingDelete}
              btnType="text"
              onClick={() => {
                setOpenDeleteModal(false);
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              data-testid="confirm-delete-button"
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
