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
import HeaderPanel from "components/HeaderPanel";
import { CFLocationList, CFOSAgentList } from "mock/data";
import { useTranslation } from "react-i18next";
import { ApplicationLogType, SupportPlugin } from "types";
import ExtLink from "components/ExtLink";
import Alert from "components/Alert";
import { DestinationType, ServiceType } from "API";
import { CloudFrontTaskProps } from "../serviceLog/create/cloudfront/CreateCloudFront";
import { ELBTaskProps } from "../serviceLog/create/elb/CreateELB";
import { AlertType } from "components/Alert/alert";

interface LogProcessingProps {
  pipelineTask: CloudFrontTaskProps | ELBTaskProps | ApplicationLogType;
  changePluginSelect: (plugin: SupportPlugin, selected: boolean) => void;
}

const EnrichedFields: React.FC<LogProcessingProps> = (
  props: LogProcessingProps
) => {
  const { t } = useTranslation();
  const { pipelineTask, changePluginSelect } = props;
  const [locationList, setLocationList] = useState(CFLocationList);
  const [osList, setOsList] = useState(CFOSAgentList);

  return (
    <HeaderPanel
      title={t("servicelog:cloudfront.enrichedFields")}
      desc={t("servicelog:cloudfront.enrichedFieldsDesc")}
    >
      <div>
        {pipelineTask.type === ServiceType.CloudFront &&
          pipelineTask.destinationType === DestinationType.KDS && (
            <Alert content={t("servicelog:cloudfront.logProcessNotSupport")} />
          )}
      </div>

      <div>
        <div className="cf-check-title">
          <label className="item">
            <input
              checked={pipelineTask.params?.geoPlugin}
              disabled={pipelineTask.destinationType === DestinationType.KDS}
              type="checkbox"
              onChange={(event) => {
                changePluginSelect(SupportPlugin.Geo, event.target.checked);
              }}
            />
            {t("servicelog:cloudfront.location")} <i>-{t("optional")}</i>
          </label>
          <div className="description">
            {t("servicelog:cloudfront.locationDesc")}
          </div>
        </div>
        <div className="cf-check-list">
          {locationList.map((element, index) => {
            return (
              <label className="item" key={element.value}>
                <input
                  disabled={true}
                  checked={pipelineTask.params?.geoPlugin}
                  type="checkbox"
                  onChange={(event) => {
                    setLocationList((prev) => {
                      const tmpList = JSON.parse(JSON.stringify(prev));
                      tmpList[index].isChecked = event.target.checked;
                      return tmpList;
                    });
                  }}
                />
                {element.name}
              </label>
            );
          })}
        </div>
        <div className="cf-check-title mt-10">
          <label className="item">
            <input
              type="checkbox"
              checked={pipelineTask.params?.userAgentPlugin}
              disabled={pipelineTask.destinationType === DestinationType.KDS}
              onChange={(event) => {
                changePluginSelect(
                  SupportPlugin.UserAgent,
                  event.target.checked
                );
              }}
            />
            {t("servicelog:cloudfront.osAgent")} <i>-{t("optional")}</i>
          </label>
          <div className="description">
            {t("servicelog:cloudfront.osAgentDesc")}
          </div>
        </div>
        <div className="cf-check-list">
          {osList.map((element, index) => {
            return (
              <label className="item" key={element.value}>
                <input
                  disabled={true}
                  checked={pipelineTask.params?.userAgentPlugin}
                  type="checkbox"
                  onChange={(event) => {
                    setOsList((prev) => {
                      const tmpList = JSON.parse(JSON.stringify(prev));
                      tmpList[index].isChecked = event.target.checked;
                      return tmpList;
                    });
                  }}
                />
                {element.name}
              </label>
            );
          })}
        </div>
        <div className="mt-10">
          <Alert
            type={AlertType.Normal}
            content={
              <div>
                {t("maxmindCopyRight")}
                <ExtLink to="https://www.maxmind.com">
                  https://www.maxmind.com
                </ExtLink>
              </div>
            }
          />
        </div>
      </div>
    </HeaderPanel>
  );
};

export default EnrichedFields;
