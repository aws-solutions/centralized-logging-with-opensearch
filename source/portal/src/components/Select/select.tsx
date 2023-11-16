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
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputBase from "@material-ui/core/InputBase";
import { withStyles, makeStyles } from "@material-ui/core/styles";
import LoadingText from "components/LoadingText";
import Button from "components/Button";
import { useTranslation } from "react-i18next";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import ExtButton from "components/ExtButton";
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

const ItemStatus = ({ status }: any) => {
  const { t } = useTranslation();
  return (
    <>
      {status === "ACTIVE" && (
        <span className="select-item-status green">
          <i className="icon">
            <CheckCircleOutlineIcon fontSize="small" />
          </i>
          {t("status.active")}
        </span>
      )}
      {status === "IN_PROGRESS" && (
        <span className="select-item-status gray">
          <i className="icon">
            <AccessTimeIcon fontSize="small" />
          </i>
          {t("status.inProgress")}
        </span>
      )}
      {status === "IMPORTED" && (
        <span className="select-item-status gray">
          <i className="icon">
            <CheckCircleOutlineIcon fontSize="small" />
          </i>
          {t("status.imported")}
        </span>
      )}
      {status === "FAILED" && (
        <span className="select-item-status red">
          <i className="icon">
            <HighlightOffIcon fontSize="small" />
          </i>
          {t("status.failed")}
        </span>
      )}
    </>
  );
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

export type SelectItem = {
  name: string;
  value: string;
  optTitle?: string;
  description?: string;
  disabled?: boolean | false;
  id?: string;
  status?: string;
};

interface SelectProps {
  optionList: SelectItem[];
  placeholder?: string | null;
  className?: string;
  loading?: boolean;
  value: string;
  onChange?: (event: any) => void;
  hasRefresh?: boolean;
  clickRefresh?: () => void;
  disabled?: boolean;
  isI18N?: boolean;
  allowEmpty?: boolean;
  hasStatus?: boolean;
  createNewLink?: string;
  viewDetailsLink?: string;
  width?: number;
  onBlur?: (event: any) => void;
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
    hasStatus,
    width,
    onBlur,
  } = props;
  const { t } = useTranslation();
  return (
    <div className={`flex gsui-select-wrap ${className}`}>
      <div className="flex-1">
        <Select
          style={{ width: width }}
          disabled={disabled}
          MenuProps={MenuProps}
          displayEmpty
          className="gsui-select"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder || ""}
          input={<BootstrapInput />}
          renderValue={
            allowEmpty || value !== ""
              ? undefined
              : () => <Placeholder>{placeholder}</Placeholder>
          }
        >
          {loading && (
            <div className="pd-10">
              <LoadingText text="loading" />
            </div>
          )}
          {optionList.map((element) => {
            return (
              <MenuItem
                key={element.value}
                value={element.value}
                className="flex flex-1"
                disabled={element.disabled}
              >
                <span className="flex-1">
                  {isI18N ? t(element.name) : element.name}
                </span>
                {hasStatus && <ItemStatus status={element.optTitle} />}
              </MenuItem>
            );
          })}
        </Select>
      </div>
      {hasRefresh && (
        <div className="refresh-button ml-10">
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
      {props.createNewLink && (
        <div className="ml-10">
          <ExtButton to={props.createNewLink}>
            {t("common:button.createNew")}
          </ExtButton>
        </div>
      )}
      {props.viewDetailsLink && (
        <div className="ml-10">
          <ExtButton to={props.viewDetailsLink}>
            {t("common:button.viewDetails")}
          </ExtButton>
        </div>
      )}
    </div>
  );
};

export default GSSelect;
