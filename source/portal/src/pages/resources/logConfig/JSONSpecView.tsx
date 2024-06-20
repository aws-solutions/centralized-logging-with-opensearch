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

import React, { useState } from "react";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import { identity } from "lodash";
import { Alert } from "assets/js/alert";
import { IsJsonString } from "assets/js/utils";
import { useTranslation } from "react-i18next";

type Schema = {
  type: string;
  format?: string;
  timeKey?: boolean;
  properties?: {
    [key: string]: Schema;
  };
  items?: Schema;
};

interface JSONSpecViewProps {
  schema: any;
  data: any;
  configTimeKey: string;
}

type TreeNode = {
  key: string;
  type: string;
  value?: any;
  format?: string;
  timeKey?: boolean;
  isExpanded?: boolean;
  children?: TreeNode[];
};

interface TreeComponentProps {
  disabled?: boolean;
  node: TreeNode;
  level: number;
  configTimeKey: string;
}

function schemaToTree(schema: Schema, jsonData: any, key = "root"): TreeNode {
  const treeNode: TreeNode = {
    key,
    type: schema.type,
    value: jsonData,
    format: schema.format ?? "",
    timeKey: schema.timeKey,
  };

  if (schema.type === "object" && schema.properties) {
    treeNode.children = Object.keys(schema.properties).map((subKey) =>
      schemaToTree(
        schema?.properties?.[subKey] as any,
        jsonData?.[subKey] || null,
        subKey
      )
    );
  } else if (schema.type === "array" && schema.items) {
    if (jsonData) {
      treeNode.children = jsonData?.map((itemData: any) =>
        schemaToTree(schema.items as any, itemData, `items`)
      );
    } else {
      schemaToTree(schema.items as any, null, `items`);
    }
  }
  return treeNode;
}

const TreeComponent: React.FC<TreeComponentProps> = ({
  node,
  level,
  configTimeKey,
}) => {
  const { t } = useTranslation();
  const [localNode, setLocalNode] = useState({
    ...node,
    isExpanded: false,
  });
  const toggleExpand = () => {
    const newNode = { ...localNode, isExpanded: !localNode.isExpanded };
    setLocalNode(newNode);
  };

  return (
    <div className={level === 1 ? "json-border-bottom" : ""}>
      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        <div style={{ marginLeft: 20 * level, display: "inline-flex" }}>
          <div style={{ display: "inline-flex", width: 30 }}>
            {localNode.children && (
              <span
                style={{
                  display: "inline-flex",
                  cursor: "pointer",
                }}
                onClick={toggleExpand}
              >
                {localNode.isExpanded ? (
                  <ArrowDropDownIcon fontSize="medium" />
                ) : (
                  <ArrowDropDownIcon fontSize="medium" className="reverse-90" />
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1">{localNode.key}</div>
        <div style={{ width: 180 }}>
          <div>{localNode.type}</div>
        </div>
        <div style={{ width: 180 }}>
          <div>{localNode.format ?? ""}</div>
        </div>
        <div style={{ width: 120 }}>
          <div>
            {level === 1 && localNode.key === configTimeKey
              ? t("yes")
              : t("no")}
          </div>
        </div>
      </div>
      {localNode.isExpanded &&
        localNode.children?.map((childNode, idx) => (
          <TreeComponent
            key={identity(idx + childNode.type + childNode.value)}
            node={childNode}
            level={level + 1}
            configTimeKey={configTimeKey}
          />
        ))}
    </div>
  );
};

const JSONSpecView: React.FC<JSONSpecViewProps> = (
  props: JSONSpecViewProps
) => {
  const { t } = useTranslation();
  const { schema, data, configTimeKey } = props;
  if (!schema || !data) {
    return "-";
  }
  if (!IsJsonString(data)) {
    Alert("JSON Invalid");
    return "-";
  }
  const jsonData = JSON.parse(data);
  return (
    <div className="m-w-75p">
      <div className="flex json-format-header">
        <div className="json-name">{t("resource:config.detail.specName")}</div>
        <div className="json-type">{t("resource:config.detail.specType")}</div>
        <div className="json-time-format">
          {t("resource:config.detail.timeFormat")}
        </div>
        <div className="json-time-key">
          {t("resource:config.parsing.timeKey")}
        </div>
      </div>
      {Object.keys(schema.properties).map((key) => (
        <TreeComponent
          configTimeKey={configTimeKey}
          key={key}
          level={1}
          node={schemaToTree(schema.properties[key], jsonData[key], key)}
        />
      ))}
    </div>
  );
};

export default JSONSpecView;
