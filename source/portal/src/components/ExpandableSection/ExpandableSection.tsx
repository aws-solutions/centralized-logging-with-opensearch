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
import React, { ReactElement, useEffect, useState } from "react";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import { useDispatch } from "react-redux";
import { AppDispatch } from "reducer/store";
import { showAdvancedSettingChanged } from "reducer/createOpenSearch";

interface ExpandableSectionProps {
  defaultExpanded?: boolean;
  headerText: string;
  children: ReactElement;
  isOpenSearch?: boolean;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = (
  props: ExpandableSectionProps
) => {
  const { defaultExpanded, headerText, children, isOpenSearch } = props;
  const dispatch = useDispatch<AppDispatch>();
  const [showAdvanceSetting, setShowAdvanceSetting] = useState(
    defaultExpanded ?? true
  );
  useEffect(() => {
    setShowAdvanceSetting(defaultExpanded ?? true);
  }, [defaultExpanded]);

  return (
    <div className="gsui-expendable-section">
      <div className="addtional-settings">
        <span
          role="none"
          onClick={() => {
            setShowAdvanceSetting(!showAdvanceSetting);
            if (isOpenSearch) {
              dispatch(showAdvancedSettingChanged(!showAdvanceSetting));
            }
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

      <div data-testid="content" className={showAdvanceSetting ? "" : "hide"}>
        {children}
      </div>
    </div>
  );
};

export default ExpandableSection;
