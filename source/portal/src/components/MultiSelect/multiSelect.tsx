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
import React, { useState, useEffect } from "react";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputBase from "@material-ui/core/InputBase";
import { withStyles, makeStyles } from "@material-ui/core/styles";
import LoadingText from "components/LoadingText";
import CloseIcon from "@material-ui/icons/Close";
import Button from "components/Button";
import { SelectItem } from "components/Select/select";
import ButtonRefresh from "components/ButtonRefresh";

export const MenuProps: any = {
  getContentAnchorEl: null,
  anchorOrigin: {
    vertical: "bottom",
    horizontal: "left",
  },
};

const usePlaceholderStyles = makeStyles(() => ({
  placeholder: {
    color: "#aaa",
  },
}));

const Placeholder = ({ children }: any) => {
  const classes = usePlaceholderStyles();
  return <div className={classes.placeholder}>{children}</div>;
};

const BootstrapInput = withStyles((theme) => ({
  root: {
    "label + &": {
      marginTop: theme.spacing(3),
    },
  },
  input: {
    borderRadius: 2,
    position: "relative",
    backgroundColor: theme.palette.background.paper,
    border: "1px solid #aab7b8",
    fontSize: 14,
    padding: "6px 10px 6px 10px",
    "&:focus": {
      borderRadius: 2,
      borderColor: "#aab7b8",
    },
  },
}))(InputBase);

interface SelectProps {
  optionList: SelectItem[];
  placeholder?: string | null;
  className?: string;
  loading?: boolean;
  value: string[];
  onChange: (event: any) => void;
  hasRefresh?: boolean;
  clickRefresh?: () => void;
  defaultSelectItems?: string[];
}

const MultiSelect: React.FC<SelectProps> = (props: SelectProps) => {
  const {
    optionList,
    placeholder,
    loading,
    className,
    value,
    onChange,
    hasRefresh,
    clickRefresh,
    defaultSelectItems,
  } = props;
  const [selected, setSelected] = useState<string[]>(
    defaultSelectItems ? [...defaultSelectItems, ...value] : value
  );

  const handleChange = (event: any) => {
    console.info("AAABBB:event:", event.target.value);
    setSelected(event.target.value);
    onChange(event.target.value);
  };

  useEffect(() => {
    if (value.length <= 0) {
      if (defaultSelectItems && defaultSelectItems.length > 0) {
        setSelected(defaultSelectItems);
      } else {
        setSelected([]);
      }
    } else {
      setSelected(value);
    }
  }, [value]);

  return (
    <div className={`flex gsui-multi-select-wrap ${className}`}>
      <div className="flex-1">
        <Select
          className="gsui-multi-select"
          multiple
          displayEmpty
          value={selected}
          onChange={handleChange}
          input={<BootstrapInput />}
          MenuProps={MenuProps}
          renderValue={() => <Placeholder>{placeholder}</Placeholder>}
        >
          {loading ? (
            <div className="pd-10">
              <LoadingText text="loading" />
            </div>
          ) : (
            optionList.map((element) => (
              <MenuItem
                disabled={defaultSelectItems?.includes(element.value)}
                key={element.value}
                value={element.value}
                style={{ margin: 0, padding: 0 }}
              >
                <div
                  style={{
                    width: "100%",
                    display: "block",
                    padding: "5px 10px 5px 35px",
                    cursor: "pointer",
                    borderBottom: "1px solid #eaeded",
                  }}
                >
                  {/* <Checkbox /> */}
                  <input
                    onChange={(event) => {
                      console.info(event);
                    }}
                    style={{ position: "absolute", margin: "6px 0 0 -20px" }}
                    type="checkbox"
                    checked={selected.indexOf(element.value) > -1}
                  />
                  {element.name}
                </div>
              </MenuItem>
            ))
          )}
        </Select>
        <div>
          {optionList &&
            optionList.length > 0 &&
            selected.map((item: string) => {
              return (
                <div className="gsui-multi-select-item-box" key={item}>
                  <div className="item-content">
                    <div className="item-title">
                      {optionList.find((element) => element.value === item)
                        ?.optTitle || ""}
                    </div>
                    <div>{item}</div>
                  </div>
                  {!defaultSelectItems?.includes(item) && (
                    <div
                      className="icon-remove"
                      onClick={() => {
                        const tmpSelected = JSON.parse(
                          JSON.stringify(selected)
                        );
                        tmpSelected.splice(selected.indexOf(item), 1);
                        setSelected(tmpSelected);
                        onChange(tmpSelected);
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {hasRefresh && (
        <div className="refresh-button">
          <Button
            disabled={loading}
            btnType="icon"
            onClick={() => {
              if (loading) {
                return;
              }
              if (clickRefresh) {
                clickRefresh();
              }
            }}
          >
            <ButtonRefresh loading={loading} fontSize="small" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
