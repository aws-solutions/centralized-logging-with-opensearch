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

interface PagePanelProps {
  className?: string;
  title: string | null;
  desc?: string | null;
  actions?: ReactElement;
  children?: ReactElement | ReactElement[];
}

export const PagePanel: React.FC<PagePanelProps> = (props: PagePanelProps) => {
  const { title, desc, actions, children } = props;

  // btn, btn-lg, btn-primary
  return (
    <div className="gsui-page-panel">
      <div className="title">
        <div className="page-title">{title}</div>
        <div className="actions">{actions}</div>
      </div>
      {desc && <div className="page-desc">{desc}</div>}
      <div>{children}</div>
    </div>
  );
};

PagePanel.defaultProps = {
  className: "",
};

export default PagePanel;
