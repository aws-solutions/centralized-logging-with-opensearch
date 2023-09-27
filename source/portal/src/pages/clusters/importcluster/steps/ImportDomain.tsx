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
import HeaderPanel from "components/HeaderPanel";
import { ImportedDomainType } from "../ImportCluster";
import { CreateLogMethod } from "assets/js/const";
import { useTranslation } from "react-i18next";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import { DomainRelevantResource, ResourceStatus } from "API";
import {
  buildNaclLink,
  buildRouteTableLink,
  buildSGLink,
  buildVPCPeeringLink,
} from "assets/js/utils";
import IndicatorWithLink from "components/IndicatorWithLink";

interface ImportDomainProps {
  importedCluster: ImportedDomainType;
  importedRes: DomainRelevantResource[];
}

enum HeaderPanelStatus {
  Loading = "loading",
  Success = "success",
  Error = "error",
  Normal = "normal",
  Pending = "pending",
}

const ImportDomain: React.FC<ImportDomainProps> = (
  props: ImportDomainProps
) => {
  const { importedCluster, importedRes } = props;
  const { t } = useTranslation();
  const statusMap: {
    [key: string]: HeaderPanelStatus;
  } = {
    [ResourceStatus.UPDATED]: HeaderPanelStatus.Success,
    [ResourceStatus.CREATED]: HeaderPanelStatus.Success,
    [ResourceStatus.ERROR]: HeaderPanelStatus.Error,
    [ResourceStatus.REVERSED]: HeaderPanelStatus.Pending,
    default: HeaderPanelStatus.Success,
  };

  const [vpcPeeringStatus, setVpcPeeringStatus] = useState<HeaderPanelStatus>(
    HeaderPanelStatus.Loading
  );
  const [vpcPeeringDetail, setVpcPeeringDetail] = useState<string[]>([]);

  const [domainSGStatus, setDomainSGStatus] = useState<HeaderPanelStatus>(
    HeaderPanelStatus.Loading
  );
  const [domainSGDetail, setDomainSGDetail] = useState<string[]>([]);

  const [domainNACLStatus, setDomainNACLStatus] = useState<HeaderPanelStatus>(
    HeaderPanelStatus.Loading
  );
  const [domainNACLDetail, setDomainNACLDetail] = useState<string[]>([]);

  const [domainRouteTableStatus, setDomainRouteTableStatus] =
    useState<HeaderPanelStatus>(HeaderPanelStatus.Loading);
  const [domainRouteTableDetail, setDomainRouteTableDetail] = useState<
    string[]
  >([]);

  const [solutionRouteTableStatus, setSoLutionRouteTableStatus] =
    useState<HeaderPanelStatus>(HeaderPanelStatus.Loading);
  const [solutionRouteTableDetail, setSoLutionRouteTableDetail] = useState<
    string[]
  >([]);

  const updateVpcPeering = () => {
    const vpcPeeringDetailItem = importedRes.find(
      (detail) => detail.name === "VPCPeering"
    );
    if (vpcPeeringDetailItem) {
      const { values, status } = vpcPeeringDetailItem;
      const tmp_status =
        statusMap[status ?? ResourceStatus.CREATED] || statusMap.default;
      setVpcPeeringStatus(tmp_status);
      setVpcPeeringDetail((values ?? []).filter(Boolean).map(String));
    }
  };

  const updateSGDetail = () => {
    const domainSGDetailItem = importedRes.find(
      (detail) => detail.name === "OpenSearchSecurityGroup"
    );
    if (domainSGDetailItem) {
      const { values, status } = domainSGDetailItem;
      const tmp_status =
        statusMap[status ?? ResourceStatus.CREATED] || statusMap.default;
      setDomainSGStatus(tmp_status);
      setDomainSGDetail((values ?? []).filter(Boolean).map(String));
    }
  };

  const updateNACLDetail = () => {
    const domainNACLDetailItem = importedRes.find(
      (detail) => detail.name === "OpenSearchNetworkACL"
    );
    if (domainNACLDetailItem) {
      const { values, status } = domainNACLDetailItem;
      const tmp_status =
        statusMap[status ?? ResourceStatus.CREATED] || statusMap.default;
      setDomainNACLStatus(tmp_status);
      setDomainNACLDetail((values ?? []).filter(Boolean).map(String));
      console.info("domainNACLDetail:", domainNACLDetail);
    }
  };

  const updateDomainRouteTableDetail = () => {
    const domainRouteTableDetailItem = importedRes.find(
      (detail) => detail.name === "OpenSearchRouteTables"
    );
    if (domainRouteTableDetailItem) {
      const { values, status } = domainRouteTableDetailItem;
      const tmp_status =
        statusMap[status ?? ResourceStatus.CREATED] || statusMap.default;
      setDomainRouteTableStatus(tmp_status);
      setDomainRouteTableDetail((values ?? []).filter(Boolean).map(String));
    }
  };

  const updateSolutionRouteTableDetail = () => {
    const solutionRouteTableDetailItem = importedRes.find(
      (detail) => detail.name === "SolutionRouteTables"
    );
    if (solutionRouteTableDetailItem) {
      const { values, status } = solutionRouteTableDetailItem;
      const tmp_status =
        statusMap[status ?? ResourceStatus.CREATED] || statusMap.default;
      setSoLutionRouteTableStatus(tmp_status);
      setSoLutionRouteTableDetail((values ?? []).filter(Boolean).map(String));
    }
  };

  const updateRelatedResources = async () => {
    try {
      // Update the resources details
      updateVpcPeering();
      updateSGDetail();
      updateNACLDetail();
      updateDomainRouteTableDetail();
      updateSolutionRouteTableDetail();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (importedRes) {
      updateRelatedResources();
    }
  }, [importedRes]);

  return (
    <div>
      <HeaderPanel title={t("cluster:import.selectDomain.osDomain")}>
        <>
          {importedCluster.creationMethod === CreateLogMethod.Automatic && (
            <div>
              <IndicatorWithLink
                indicatorStatus={vpcPeeringStatus}
                details={vpcPeeringDetail}
                displayName="cluster:imported.setupVpcPeer"
                buildLink={buildVPCPeeringLink}
              />
              <IndicatorWithLink
                indicatorStatus={domainSGStatus}
                details={domainSGDetail}
                displayName="cluster:imported.updateSG"
                buildLink={buildSGLink}
              />
              <IndicatorWithLink
                indicatorStatus={domainNACLStatus}
                details={domainNACLDetail}
                displayName="cluster:imported.updateDomainNACL"
                buildLink={buildNaclLink}
              />
              <IndicatorWithLink
                indicatorStatus={domainRouteTableStatus}
                details={domainRouteTableDetail}
                displayName="cluster:imported.updateDomainRouteTable"
                buildLink={buildRouteTableLink}
              />
              <IndicatorWithLink
                indicatorStatus={solutionRouteTableStatus}
                details={solutionRouteTableDetail}
                displayName="cluster:imported.updateSolutionRouteTable"
                buildLink={buildRouteTableLink}
              />
            </div>
          )}
          {importedCluster.domainStatus &&
          (domainRouteTableStatus === "error" ||
            solutionRouteTableStatus === "error" ||
            domainNACLStatus === "error" ||
            domainSGStatus === "error" ||
            vpcPeeringStatus === "error") ? (
            <div className="mt-20">
              <Alert
                type={AlertType.Error}
                content={`${
                  domainRouteTableStatus === "error"
                    ? `${t("cluster:imported.domainRouteTableError")}\n`
                    : ""
                }${
                  solutionRouteTableStatus === "error"
                    ? `${t("cluster:imported.solutionRouteTableError")}\n`
                    : ""
                }${
                  domainNACLStatus === "error"
                    ? `${t("cluster:imported.domainNACLError")}\n`
                    : ""
                }${
                  domainSGStatus === "error"
                    ? `${t("cluster:imported.domainSGError")}\n`
                    : ""
                }${
                  vpcPeeringStatus === "error"
                    ? `${t("cluster:imported.vpcPeeringError")}\n`
                    : ""
                }`}
              ></Alert>
            </div>
          ) : (
            <Alert content={t("cluster:imported.done")} />
          )}
        </>
      </HeaderPanel>
    </div>
  );
};

export default ImportDomain;
