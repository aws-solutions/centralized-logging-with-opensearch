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

import React, { FC, useState } from "react";
import { IsJsonString } from "assets/js/utils";
import { Alert } from "assets/js/alert";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import Select from "components/Select";
import { FB_TYPE_LIST } from "assets/js/const";
import TextInput from "components/TextInput";
import Button from "components/Button";
import { useTranslation } from "react-i18next";
import FormItem from "components/FormItem";
import InfoSpan from "components/InfoSpan";
import { InfoBarTypes } from "reducer/appReducer";
import { appSyncRequestQuery } from "assets/js/request";
import { checkTimeFormat } from "graphql/queries";
import cloneDeep from "lodash.clonedeep";
import { identity } from "lodash";

type TreeNode = {
  key: string;
  type: string;
  value?: any;
  format?: string;
  timeKey?: boolean;
  isValid?: number; // -1 not valid, 1 valid, 0 none
  isValidating?: boolean;
  isExpanded?: boolean;
  children?: TreeNode[];
};

type Schema = {
  type: string;
  format?: string;
  timeKey?: boolean;
  properties?: {
    [key: string]: Schema;
  };
  items?: Schema;
};

const defaultChildNode: TreeNode = {
  key: "",
  type: "string",
  format: "",
  timeKey: false,
};

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

function treeToSchema(node: TreeNode): any {
  if (node.type === "object" && node.children) {
    const properties: any = {};
    for (const child of node.children) {
      properties[child.key] = treeToSchema(child);
    }
    return {
      type: node.type,
      format: node.format,
      timeKey: node.timeKey,
      properties: properties,
    };
  } else if (node.type === "array") {
    if (node.children && node.children.length > 0) {
      return {
        type: node.type,
        format: node.format,
        timeKey: node.timeKey,
        items: treeToSchema(node.children[0]),
      };
    } else {
      return {
        type: node.type,
        format: node.format,
        timeKey: node.timeKey,
        items: {}, // 默认为空对象，或您可以设定一个默认类型
      };
    }
  } else {
    return { type: node.type, format: node.format, timeKey: node.timeKey }; // 对于其他基本类型，我们只返回类型
  }
}

interface TreeComponentProps {
  disabled?: boolean;
  node: TreeNode;
  updateNode: (updatedNode: TreeNode) => void;
  deleteNode?: () => void;
  level: number;
}

const TreeComponent: React.FC<TreeComponentProps> = ({
  disabled,
  node,
  level,
  updateNode,
  deleteNode,
}) => {
  const { t } = useTranslation();
  // set isExpanded = true by default
  const [localNode, setLocalNode] = useState({ ...node, isExpanded: true });

  const handleKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newNode = { ...localNode, key: event.target.value };
    setLocalNode(newNode);
    updateNode(newNode);
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Reset all field when type changed.
    const newNode = {
      ...localNode,
      type: event.target.value,
      format: "",
      isValid: 0,
      timeKey: false,
    };
    setLocalNode(newNode);
    updateNode(newNode);
  };

  const handleTimeFormatChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newNode = { ...localNode, format: event.target.value, isValid: 0 };
    setLocalNode(newNode);
    updateNode(newNode);
  };

  const handleFormatValidate = async (value: string, format: string) => {
    // Set validating status
    const validatingNode = { ...localNode, isValidating: true };
    setLocalNode(validatingNode);
    updateNode(validatingNode);

    const resData: any = await appSyncRequestQuery(checkTimeFormat, {
      timeStr: value,
      formatStr: format,
    });

    const isValid = resData?.data?.checkTimeFormat?.isMatch ? 1 : -1;
    const validatedNode = {
      ...localNode,
      isValidating: false,
      isValid: isValid,
    };
    setLocalNode(validatedNode);
    updateNode(validatedNode);
  };

  const toggleExpand = () => {
    const newNode = { ...localNode, isExpanded: !localNode.isExpanded };
    setLocalNode(newNode);
    updateNode(newNode);
  };

  const addChildNode = () => {
    const newNode = { ...localNode };
    if (newNode.children) {
      newNode.children.push({ ...defaultChildNode });
    } else {
      newNode.children = [{ ...defaultChildNode }];
    }
    setLocalNode(newNode);
    updateNode(newNode);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        <div style={{ width: 20 }}>{level}...</div>
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
        <div className="flex-1">
          <TextInput
            disabled={disabled}
            value={localNode.key}
            onChange={handleKeyChange}
          />
        </div>
        <div style={{ width: 180 }}>
          {localNode.children ? (
            <div style={{ paddingTop: 5, paddingLeft: 8 }}>
              {localNode.type}
            </div>
          ) : (
            <Select
              width={180}
              optionList={FB_TYPE_LIST}
              value={localNode.type}
              onChange={handleTypeChange}
            />
          )}
          {localNode.type === "date" && (
            <div style={{ width: 420 }}>
              <FormItem
                successText={
                  localNode.isValid === 1
                    ? t("resource:config.parsing.formatSuccess")
                    : ""
                }
                errorText={
                  localNode.isValid === -1
                    ? t("resource:config.parsing.formatError")
                    : ""
                }
              >
                <div className="flex">
                  <b>{t("resource:config.parsing.timeFormat")}</b>
                  <InfoSpan spanType={InfoBarTypes.CONFIG_TIME_FORMAT} />
                </div>
                <div className="flex" style={{ gap: 5 }}>
                  <div style={{ width: 180 }}>
                    <TextInput
                      value={localNode.format ?? ""}
                      onChange={handleTimeFormatChange}
                    />
                  </div>
                  <Button
                    loadingColor="#ccc"
                    loading={localNode.isValidating}
                    onClick={() => {
                      handleFormatValidate(
                        localNode.value,
                        localNode.format ?? ""
                      );
                    }}
                  >
                    {t("button.validate")}
                  </Button>
                </div>
              </FormItem>
            </div>
          )}
        </div>
        <div style={{ width: 120 }}>
          {!localNode.children && (
            <TextInput
              readonly
              value={
                (["string"].includes(typeof node.value) ? node.value : "") ||
                (node.value ? JSON.stringify(node.value ?? "") : "")
              }
              onChange={() => {
                console.info("change value");
              }}
            />
          )}
        </div>
        <div style={{ width: 120 }}>
          {deleteNode && (
            <Button onClick={deleteNode}>{t("button.remove")}</Button>
          )}
        </div>

        {/* 只有非叶子节点才显示展开/收起和添加子节点按钮 */}
      </div>
      {localNode.isExpanded &&
        localNode.children?.map((childNode, idx) => (
          <TreeComponent
            key={identity(idx + childNode.type + childNode.value)}
            node={childNode}
            updateNode={(newChildNode) => {
              const newChildren = [...(localNode.children || [])];
              newChildren[idx] = newChildNode;
              setLocalNode({ ...localNode, children: newChildren });
              updateNode({ ...localNode, children: newChildren });
            }}
            deleteNode={() => {
              const newChildren = cloneDeep([...(localNode.children || [])]);
              newChildren.splice(idx, 1);
              const newProps = { ...localNode, children: newChildren };
              if (newChildren.length === 0) {
                // 如果子节点列表为空，就删除该属性
                delete (newProps as any).children;
              }
              setLocalNode(newProps);
              updateNode(newProps);
            }}
            level={level + 1} //  level + 1
          />
        ))}
      <div>
        {localNode.children && localNode.isExpanded && (
          <div
            style={{
              marginLeft: 80 + 20 * level,
              display: "block",
              marginBottom: 10,
            }}
          >
            <Button onClick={addChildNode}>{t("button.addNewItem")}</Button>
          </div>
        )}
      </div>
    </div>
  );
};

const JSONInputRenderer: FC<{
  schema: any;
  data: any;
  changeSchema: (schema: any) => void;
}> = ({ schema, data, changeSchema }) => {
  if (!schema || !data) {
    return false;
  }
  if (!IsJsonString(data)) {
    Alert("JSON Invalid");
    return false;
  }
  const schemaData = schemaToTree(schema, JSON.parse(data));
  return (
    <div style={{ maxWidth: 960 }}>
      <TreeComponent
        disabled
        level={0}
        node={schemaData}
        updateNode={(node) => {
          const tmpSchema = treeToSchema(node);
          changeSchema(tmpSchema);
        }}
      />
    </div>
  );
};

export default JSONInputRenderer;
