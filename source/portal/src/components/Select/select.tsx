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
import RefreshIcon from "@material-ui/icons/Refresh";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputBase from "@material-ui/core/InputBase";
import { withStyles, makeStyles } from "@material-ui/core/styles";
import LoadingText from "components/LoadingText";
import Button from "components/Button";
import { useTranslation } from "react-i18next";

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
    // transition: theme.transitions.create(["border-color", "box-shadow"]),
    // Use the system font instead of the default Roboto font.
    "&:focus": {
      borderRadius: 2,
      borderColor: "#aab7b8",
      // boxShadow: "0 0 0 0.2rem rgba(0,123,255,.25)",
    },
  },
}))(InputBase);

export type SelectItem = {
  name: string;
  value: string;
  optTitle?: string;
  description?: string;
};

interface SelectProps {
  optionList: SelectItem[];
  placeholder?: string;
  className?: string;
  loading?: boolean;
  value: string;
  onChange: (event: any) => void;
  hasRefresh?: boolean;
  clickRefresh?: () => void;
  disabled?: boolean;
  isI18N?: boolean;
  allowEmpty?: boolean;
}

const GSSelect: React.FC<SelectProps> = (props: SelectProps) => {
  const {
    optionList,
    placeholder,
    loading,
    className,
    value,
    onChange,
    hasRefresh,
    clickRefresh,
    disabled,
    isI18N,
    allowEmpty,
  } = props;
  const { t } = useTranslation();
  // console.info("optionList:", optionList);
  return (
    <div className={`flex gsui-select-wrap ${className}`}>
      <div className="flex-1">
        <Select
          disabled={disabled}
          MenuProps={MenuProps}
          displayEmpty
          className="gsui-select"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          input={<BootstrapInput />}
          renderValue={
            allowEmpty
              ? undefined
              : value !== ""
              ? undefined
              : () => <Placeholder>{placeholder}</Placeholder>
          }
        >
          {loading && (
            <div className="pd-10">
              <LoadingText text="loading" />
            </div>
          )}
          {optionList.map((element, index) => {
            return (
              <MenuItem key={index} value={element.value}>
                {isI18N ? t(element.name) : element.name}
              </MenuItem>
            );
          })}
        </Select>
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
            {loading ? <LoadingText /> : <RefreshIcon fontSize="small" />}
          </Button>
        </div>
      )}
    </div>
  );
};

export default GSSelect;
