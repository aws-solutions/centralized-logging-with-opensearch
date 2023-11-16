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

import { PopperPlacementType } from "@material-ui/core";
import React, { ReactElement, useState } from "react";
import RichTooltip from "components/RichTooltip";

interface Props {
  content: ReactElement | (() => ReactElement);
  children: ReactElement;
  disabled?: boolean;
  arrow?: boolean;
  placement?: PopperPlacementType;
}

const ClickableRichTooltip = ({
  placement,
  arrow,
  content,
  children,
  disabled = false,
}: Props) => {
  const [open, setOpen] = useState(false);

  if (disabled) {
    return React.cloneElement(children, { ...children.props, disabled: true });
  }

  const existingOnClick = children.props.onClick;
  const newOnClick = (e: MouseEvent) => {
    setOpen(!open);
    existingOnClick && existingOnClick(e);
  };

  const contentNode = typeof content === "function" ? content() : content;

  return (
    <RichTooltip
      open={open}
      onClose={() => setOpen(false)}
      arrow={arrow}
      placement={placement}
      content={contentNode}
    >
      {React.cloneElement(children, { ...children.props, onClick: newOnClick })}
    </RichTooltip>
  );
};

export default ClickableRichTooltip;
