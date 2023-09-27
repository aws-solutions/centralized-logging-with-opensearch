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

import { buildCfnLink } from "assets/js/utils";
import ClickableRichTooltip from "components/ClickableRichTooltip";
import ExtLink from "components/ExtLink";
import { PipelineStatus } from "API";
import React from "react";
import { useTranslation } from "react-i18next";
import Status from "components/Status/Status";

interface PipelineStatusCompProps {
  error?: string | null;
  stackId?: string | null;
  status?: string | null;
}

const PipelineStatusComp: React.FC<PipelineStatusCompProps> = (
  props: PipelineStatusCompProps
) => {
  const { t } = useTranslation();
  const { error, stackId, status } = props;
  return (
    <ClickableRichTooltip
      content={
        <div style={{ maxWidth: "30em" }}>
          {error}. {t("moreDetailsGoToCloudformation")}
          {
            <ExtLink
              to={buildCfnLink(stackId?.split(":")[3] || "", stackId || "")}
            >
              <> {t("page")}.</>
            </ExtLink>
          }
        </div>
      }
      placement="left"
      disabled={status !== PipelineStatus.ERROR}
    >
      <div className="pr">
        <Status
          isLink={status === PipelineStatus.ERROR}
          status={status || ""}
        />
      </div>
    </ClickableRichTooltip>
  );
};

export default PipelineStatusComp;
