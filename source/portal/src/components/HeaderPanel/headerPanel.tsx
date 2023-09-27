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
import React, { ReactElement } from "react";
import classNames from "classnames";
import { InfoBarTypes } from "reducer/appReducer";
import InfoSpan from "components/InfoSpan";

interface HeaderPanelProps {
  infoType?: InfoBarTypes;
  count?: number;
  className?: string;
  action?: ReactElement;
  title: string | null;
  desc?: string | ReactElement | ReactElement[] | null;
  children?: ReactElement | ReactElement[];
  contentNoPadding?: boolean;
  marginBottom?: number;
}

export const HeaderPanel: React.FC<HeaderPanelProps> = (
  props: HeaderPanelProps
) => {
  const {
    infoType,
    title,
    count,
    desc,
    action,
    children,
    contentNoPadding,
    marginBottom,
  } = props;

  // btn, btn-lg, btn-primary
  return (
    <div className="gsui-header-panel" style={{ marginBottom: marginBottom }}>
      <div className="header">
        <div className="header-title">
          <div className="sub-title">
            {title}
            {count ? <span>({count})</span> : ""}
            {infoType && <InfoSpan spanType={infoType} />}
          </div>
          {desc && <div className="sub-desc">{desc}</div>}
        </div>
        {action && <div className="action">{action}</div>}
      </div>
      <div
        className={classNames({
          content: true,
          "no-padding": contentNoPadding,
        })}
      >
        {children}
      </div>
    </div>
  );
};

HeaderPanel.defaultProps = {
  className: "",
};

export default HeaderPanel;
