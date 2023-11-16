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
import React, { useState, useEffect, ReactElement } from "react";
import classNames from "classnames";
import LoadingText from "components/LoadingText";
import IndeterminateCheckbox, {
  CHECKED,
  INDETERMINATE,
  UNCHECKED,
} from "components/IndeterminateCheckbox";
import Checkbox from "components/CheckBox";
import { useTranslation } from "react-i18next";
import ReportProblemOutlinedIcon from "@material-ui/icons/ReportProblemOutlined";
interface ColumnDefProps {
  id: string;
  header: ReactElement | string | null;
  width?: number;
  cell: (item: any) => any;
}

enum SelectType {
  CHECKBOX = "checkbox",
  RADIO = "radio",
  NONE = "none",
}

interface TablePanelProps {
  trackId: string | number;
  isReload?: boolean;
  defaultSelectItem?: any[];
  defaultDisabledIds?: (string | null)[];
  title?: string | ReactElement;
  desc?: string;
  className?: string;
  actions: ReactElement;
  selectType: SelectType;
  filter?: ReactElement;
  columnDefinitions: ColumnDefProps[];
  items: any[];
  pagination: ReactElement;
  loading?: boolean;
  changeSelected: (item: any[]) => void;
  loadingText?: string;
  emptyText?: string;
  errorText?: string;
  hideFilterAndPagination?: boolean;
  hideTitle?: boolean;
  noPadding?: boolean;
}

const TablePanel: React.FC<TablePanelProps> = (props: TablePanelProps) => {
  const {
    trackId,
    isReload,
    defaultSelectItem,
    defaultDisabledIds,
    title,
    desc,
    selectType,
    // className,
    changeSelected,
    columnDefinitions,
    actions,
    filter,
    items,
    pagination,
    loading,
    emptyText,
    hideFilterAndPagination,
    hideTitle,
    noPadding,
  } = props;
  const { t } = useTranslation();
  const [dataList, setDataList] = useState<any>(items);
  const [selectItemsIds, setSelectItemsIds] = useState<string[]>(
    defaultSelectItem?.map((element) => element.id) || []
  );
  const [checkAllStatus, setCheckAllStatus] = useState(UNCHECKED);

  useEffect(() => {
    console.info("items:", items);
    setDataList(items);
    if (items.length === 0) {
      setCheckAllStatus(UNCHECKED);
    }
  }, [items]);

  useEffect(() => {
    if (isReload) {
      setSelectItemsIds([]);
    }
  }, [isReload]);

  const handleSelectAll = (e: any) => {
    console.info("e.target.checked:", e.target.checked);
    if (e.target.checked === true) {
      setCheckAllStatus(CHECKED);
      setSelectItemsIds(
        items.map((item) => {
          if (!defaultDisabledIds?.includes(item.id)) {
            return item.id;
          }
        })
      );
    } else {
      setCheckAllStatus(UNCHECKED);
      setSelectItemsIds([]);
    }
  };

  const handleClick = (e: any) => {
    const { id, checked } = e.target;
    setSelectItemsIds([...selectItemsIds, id]);
    if (!checked) {
      setSelectItemsIds(selectItemsIds.filter((item) => item !== id));
    }
  };

  useEffect(() => {
    if (selectItemsIds.length >= dataList.length && dataList.length !== 0) {
      setCheckAllStatus(CHECKED);
    } else {
      if (
        selectItemsIds.length > 0 &&
        selectItemsIds.length < dataList.length
      ) {
        setCheckAllStatus(INDETERMINATE);
      } else {
        setCheckAllStatus(UNCHECKED);
      }
    }
    if (selectType === SelectType.CHECKBOX) {
      const tmpSelectedItemList: any = [];
      if (selectItemsIds && selectItemsIds.length > 0) {
        items.forEach((element) => {
          if (selectItemsIds.includes(element.id)) {
            tmpSelectedItemList.push(element);
          }
        });
      }
      changeSelected(tmpSelectedItemList);
    }
  }, [selectItemsIds, items]);

  useEffect(() => {
    if (selectType === SelectType.RADIO) {
      setSelectItemsIds(defaultSelectItem?.map((element) => element.id) || []);
    }
  }, [defaultSelectItem]);

  return (
    <div
      className={
        noPadding ? "no-padding gsui-table-pannel" : "gsui-table-pannel"
      }
    >
      {!hideFilterAndPagination && !hideTitle && (
        <div className="table-header">
          {title && <div className="title">{title}</div>}
          <div className="action">{actions}</div>
        </div>
      )}
      {desc && <div className="desc">{desc}</div>}
      {!hideFilterAndPagination && (
        <div className="table-header">
          <div className="filter">{filter}</div>
          <div className="pagination">{pagination}</div>
        </div>
      )}

      <div>
        <div
          className={classNames({
            "gsui-table": true,
            invalid: props.errorText,
          })}
        >
          <table role="table" width="100%">
            <thead>
              <tr>
                <>
                  {selectType !== SelectType.NONE && (
                    <th className="body-cell-input">
                      <div>
                        {selectType === SelectType.CHECKBOX && (
                          <IndeterminateCheckbox
                            disabled={loading || false}
                            value={checkAllStatus}
                            onChange={(event) => {
                              handleSelectAll(event);
                            }}
                          />
                        )}
                      </div>
                    </th>
                  )}
                  {columnDefinitions.map((element: any) => {
                    return (
                      <th
                        className="body-cell"
                        key={element[trackId] ?? element.id}
                        style={{ width: element.width }}
                      >
                        <div className="content">{element.header}</div>
                      </th>
                    );
                  })}
                </>
              </tr>
            </thead>
            <tbody>
              {dataList.map((element: any, index: number) => {
                return (
                  <tr
                    onClick={() => {
                      if (selectType === SelectType.RADIO) {
                        changeSelected([element]);
                        setDataList((prev: any) => {
                          const tmpList = JSON.parse(JSON.stringify(prev));
                          tmpList.forEach((tmpItem: any) => {
                            tmpItem.isChecked = false;
                          });
                          tmpList[index].isChecked = true;
                          return tmpList;
                        });
                      }
                    }}
                    key={element[trackId] ?? element.id}
                    className={classNames({
                      selected:
                        selectItemsIds.includes(element.id) ||
                        element.isChecked,
                    })}
                  >
                    {selectType !== SelectType.NONE && (
                      <td className="body-cell-input">
                        <div>
                          {selectType === SelectType.CHECKBOX && (
                            <Checkbox
                              key={element[trackId] ?? element.id}
                              type="checkbox"
                              name={element.id}
                              id={element.id}
                              handleClick={(e) => {
                                handleClick(e);
                              }}
                              disabled={defaultDisabledIds?.includes(
                                element.id
                              )}
                              isChecked={
                                selectItemsIds.includes(element.id) ||
                                defaultDisabledIds?.includes(element.id) ||
                                false
                              }
                            />
                          )}
                          {selectType === SelectType.RADIO && (
                            <input
                              name="tableItem"
                              type="radio"
                              checked={
                                element?.isChecked ||
                                selectItemsIds.includes(element.id) ||
                                false
                              }
                              onChange={(event) => {
                                console.info("event:", event);
                              }}
                            />
                          )}
                        </div>
                      </td>
                    )}
                    {columnDefinitions.map((item: any) => {
                      return (
                        <td
                          className="body-cell"
                          key={item[trackId] ?? item.id}
                        >
                          <div>{item.cell(element)}</div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {props.errorText && (
          <div
            className={classNames({
              "gsui-formitem-wrap": true,
              invalid: props.errorText,
            })}
          >
            <div className="form-text error-text">
              <i className="icon">
                <ReportProblemOutlinedIcon fontSize="small" />
              </i>
              {props.errorText}
            </div>
          </div>
        )}
        {loading && (
          <div className="table-loading">
            <LoadingText text={t("loading")} />
          </div>
        )}
        {!loading && dataList.length === 0 && (
          <div className="table-empty">
            {emptyText ? emptyText : t("noData")}
          </div>
        )}
      </div>
    </div>
  );
};

TablePanel.defaultProps = {
  className: "",
};

export { SelectType, TablePanel };
