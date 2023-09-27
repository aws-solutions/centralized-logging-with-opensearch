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
import OpenInNewIcon from "@material-ui/icons/OpenInNew";

interface ExtLinkProps {
  to: string;
  children: any;
}

const INTERNAL_LINK_LIST = [
  "/clusters/import-opensearch-cluster",
  "/resources/log-config",
  "/resources/cross-account",
];

const extLink: React.FC<ExtLinkProps> = (props: ExtLinkProps) => {
  const { to, children } = props;
  if (to.startsWith("http") || INTERNAL_LINK_LIST.indexOf(to) >= 0) {
    return (
      <a target="_blank" className="gsui-extlink" href={to} rel="noreferrer">
        {children}
        <OpenInNewIcon className="icon" fontSize="small" />
      </a>
    );
  }
  return (
    <a
      target="_blank"
      className="gsui-extlink"
      href={`//${to}`}
      rel="noreferrer"
    >
      {children}
      <OpenInNewIcon className="icon" fontSize="small" />
    </a>
  );
};

export default extLink;
