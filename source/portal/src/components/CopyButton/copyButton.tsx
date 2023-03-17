/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React from "react";
import FilterNoneIcon from "@material-ui/icons/FilterNone";
import Popper from "@material-ui/core/Popper";
import { CopyToClipboard } from "react-copy-to-clipboard";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import Button from "components/Button";
import { TFunctionResult } from "i18next";
import { useTranslation } from "react-i18next";

interface CopyButtonProps {
  disabled?: boolean;
  text: string;
  children: React.ReactChild | TFunctionResult;
}

const CopyButton: React.FC<CopyButtonProps> = (props: CopyButtonProps) => {
  const { disabled, text, children } = props;
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const handleClick = (event: any) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };
  const open = Boolean(anchorEl);
  const id = open ? "simple-popper" : undefined;
  return (
    <div className="gsui-copy-button">
      <ClickAwayListener
        onClickAway={() => {
          setAnchorEl(null);
        }}
      >
        <CopyToClipboard text={text}>
          <Button
            disabled={disabled}
            btnType="default"
            aria-describedby={id}
            onClick={handleClick}
          >
            <FilterNoneIcon className="copy-icon" fontSize="small" /> {children}
          </Button>
        </CopyToClipboard>
      </ClickAwayListener>
      <Popper id={id} placement="top" open={open} anchorEl={anchorEl}>
        <div className="pop-over">{t("copied")}</div>
      </Popper>
    </div>
  );
};

export default CopyButton;
