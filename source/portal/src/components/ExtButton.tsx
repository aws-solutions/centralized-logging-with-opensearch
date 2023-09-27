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

function openLinkInNewTab(url: string) {
  const newTab = window.open(url, "_blank", "noopener,noreferrer");
  if (newTab) newTab.opener = null;
}

interface ExtButtonProps {
  to: string;
  children: any;
}

export default function ExtButton(props: ExtButtonProps) {
  return (
    <Button
      btnType="icon"
      onClick={() => {
        openLinkInNewTab(props.to);
      }}
    >
      <OpenInNewIcon fontSize="small" />
      {props.children}
    </Button>
  );
}
