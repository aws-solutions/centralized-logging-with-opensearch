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
import React, { ReactElement, useState } from "react";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";

interface ExpandableSectionProps {
  defaultExpanded?: boolean;
  headerText: string;
  children: ReactElement;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = (
  props: ExpandableSectionProps
) => {
  const { defaultExpanded, headerText, children } = props;
  const [showAdvanceSetting, setShowAdvanceSetting] = useState(
    defaultExpanded ?? true
  );
  return (
    <div className="gsui-expendable-section">
      <div className="addtional-settings">
        <span
          onClick={() => {
            setShowAdvanceSetting(!showAdvanceSetting);
          }}
        >
          <i className="icon">
            {showAdvanceSetting && <ArrowDropDownIcon fontSize="large" />}
            {!showAdvanceSetting && (
              <ArrowDropDownIcon className="reverse-90" fontSize="large" />
            )}
          </i>
          {headerText}
        </span>
      </div>

      <div className={showAdvanceSetting ? "" : "hide"}>{children}</div>
    </div>
  );
};

export default ExpandableSection;
