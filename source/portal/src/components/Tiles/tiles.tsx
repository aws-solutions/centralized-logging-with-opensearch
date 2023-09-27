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
import React, { ReactElement } from "react";

type TilesItemProps = {
  disabled?: boolean;
  label: string | null;
  description: string | ReactElement | null;
  value: string;
};

interface TilesProps {
  displayInRow?: boolean;
  className?: string;
  value: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  items: TilesItemProps[];
}

const Tiles: React.FC<TilesProps> = (props: TilesProps) => {
  const { displayInRow, items, onChange, value } = props;

  return (
    <div className={`gsui-tiles-wrap ${displayInRow ? "row" : ""}`}>
      {items.map((item) => {
        return (
          <label
            key={item.value}
            className={classNames({
              active: item.value === value,
              disabled: item.disabled,
            })}
          >
            <div className="name">
              <input
                disabled={item.disabled}
                checked={item.value === value}
                onChange={onChange}
                value={item.value}
                type="radio"
              />
              <span>{item.label}</span>
            </div>
            <div className="desc">{item.description}</div>
          </label>
        );
      })}
    </div>
  );
};

Tiles.defaultProps = {
  className: "",
};

export default Tiles;
