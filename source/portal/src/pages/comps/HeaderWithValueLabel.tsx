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
import classNames from "classnames";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import React, { ReactElement } from "react";
import { identity } from "lodash";
import { InfoBarTypes } from "reducer/appReducer";

export type LabelValueDataItem = {
  label?: string | null;
  data: ReactElement | string | number | null;
};

interface HeaderWithValueLabelProps {
  numberOfColumns?: number;
  headerTitle?: string;
  dataList?: (LabelValueDataItem | null)[];
  fixedDataList?: LabelValueDataItem[][];
  additionalData?: LabelValueDataItem;
  infoType?: InfoBarTypes;
}

const HeaderWithValueLabel: React.FC<HeaderWithValueLabelProps> = (
  props: HeaderWithValueLabelProps
) => {
  const {
    headerTitle,
    numberOfColumns = 4,
    dataList,
    fixedDataList,
    additionalData,
    infoType,
  } = props;
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${numberOfColumns}, 1fr)`,
  };

  return (
    <>
      <HeaderPanel title={headerTitle ?? ""} infoType={infoType}>
        <div style={gridStyle}>
          {fixedDataList ? (
            <>
              {fixedDataList?.map((element, index) => (
                <div
                  key={identity(index)}
                  className={classNames({
                    "flex-1": true,
                    "border-left-c": index % numberOfColumns !== 0,
                    "no-padding-left": index % numberOfColumns === 0,
                  })}
                >
                  {element.map((item, idx) => (
                    <ValueWithLabel
                      key={identity(idx)}
                      label={item?.label ?? ""}
                    >
                      <>{item?.data}</>
                    </ValueWithLabel>
                  ))}
                </div>
              ))}
            </>
          ) : (
            <>
              {dataList?.map((element, index) => (
                <div
                  key={identity(index)}
                  className={classNames({
                    "flex-1": true,
                    "border-left-c": index % numberOfColumns !== 0,
                    "no-padding-left": index % numberOfColumns === 0,
                  })}
                >
                  <ValueWithLabel label={element?.label ?? ""}>
                    <>{element?.data}</>
                  </ValueWithLabel>
                </div>
              ))}
            </>
          )}
        </div>
        {additionalData ? (
          <div className="flex-1 no-padding-left">
            <ValueWithLabel label={additionalData?.label ?? ""}>
              <>{additionalData?.data} </>
            </ValueWithLabel>
          </div>
        ) : (
          <></>
        )}
      </HeaderPanel>
    </>
  );
};

export default HeaderWithValueLabel;
