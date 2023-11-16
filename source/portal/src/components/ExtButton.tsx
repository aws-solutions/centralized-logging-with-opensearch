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
import React from "react";
import Button from "components/Button";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import { ButtonProps } from "./Button/button";

function openLinkInNewTab(url: string) {
  const newTab = window.open(url, "_blank", "noopener,noreferrer");
  if (newTab) newTab.opener = null;
}

type ExtButtonProps = {
  to: string;
  children: any;
} & ButtonProps

export default function ExtButton(props: ExtButtonProps) {
  const {to, children, ...restProps} = props
  return (
    <Button
      {...restProps}
      btnType="icon"
      onClick={() => {
        openLinkInNewTab(to);
      }}
    >
      <OpenInNewIcon fontSize="small" />
      {children}
    </Button>
  );
}
